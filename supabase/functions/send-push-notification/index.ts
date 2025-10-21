import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';
import { rateLimiter, createRateLimitResponse } from '../_shared/rateLimiter.ts';
import { EdgeSecurityLogger, validateInput, createSecureErrorResponse } from '../_shared/securityUtils.ts';
import { validateCronRequest } from '../_shared/cronAuth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'null',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

interface PushNotificationRequest {
  user_id?: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
}

interface FCMMessage {
  to?: string;
  notification: {
    title: string;
    body: string;
    badge?: number;
  };
  data?: Record<string, string>;
  priority: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Authenticate the request with enhanced CRON validation
  const cronSecret = Deno.env.get('CRON_SECRET');
  const authResult = await validateCronRequest(req, cronSecret);
  
  if (!authResult.valid) {
    EdgeSecurityLogger.logAuthAttempt(req, 'send-push-notification', false, undefined, { reason: authResult.error });
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...authResult.headers, 'Content-Type': 'application/json' },
    });
  }

  EdgeSecurityLogger.logAuthAttempt(req, 'send-push-notification', true);

  // Rate limiting - max 50 requests per minute per IP
  const rateLimit = await rateLimiter.checkLimit(req, {
    maxRequests: 50,
    windowMs: 60 * 1000, // 1 minute
  });

  if (!rateLimit.allowed) {
    EdgeSecurityLogger.logSuspiciousActivity(req, 'send-push-notification', 'Rate limit exceeded');
    return createRateLimitResponse(rateLimit.resetTime);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const fcmServerKey = Deno.env.get('FCM_SERVER_KEY');
    
    if (!fcmServerKey) {
      console.error('FCM_SERVER_KEY not found in environment variables');
      return new Response(
        JSON.stringify({ error: 'FCM server key not configured' }),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestData: PushNotificationRequest = await req.json();
    const { user_id, title, body, data, badge } = requestData;

    // Validate input
    const validation = validateInput(requestData, ['title', 'body']);
    if (!validation.valid) {
      EdgeSecurityLogger.logSuspiciousActivity(req, 'send-push-notification', 'Invalid input', { errors: validation.errors });
      return createSecureErrorResponse('Invalid request data', 400);
    }

    // Log the notification attempt
    EdgeSecurityLogger.logEvent(req, {
      userId: user_id,
      event: 'push_notification.send',
      functionName: 'send-push-notification',
      details: { title: title.substring(0, 50), hasUserId: !!user_id }
    });

    console.log('Sending push notification:', { user_id, title, body });

    // Get push notification tokens for the user(s)
    let tokensQuery = supabase.from('push_notification_tokens').select('token, platform');
    
    if (user_id) {
      tokensQuery = tokensQuery.eq('user_id', user_id);
    }

    const { data: tokens, error: tokensError } = await tokensQuery;

    if (tokensError) {
      console.error('Error fetching push tokens:', tokensError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch push tokens' }),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    if (!tokens || tokens.length === 0) {
      console.log('No push tokens found for user:', user_id);
      return new Response(
        JSON.stringify({ message: 'No push tokens found', sent: 0 }),
        { 
          status: 200, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    let sentCount = 0;
    const errors: any[] = [];

    // Send to each token
    for (const tokenData of tokens) {
      try {
        const message: FCMMessage = {
          to: tokenData.token,
          notification: {
            title,
            body,
            ...(badge !== undefined && { badge })
          },
          data: data ? Object.fromEntries(
            Object.entries(data).map(([key, value]) => [key, String(value)])
          ) : undefined,
          priority: 'high'
        };

        const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Authorization': `key=${fcmServerKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message),
        });

        const fcmResult = await fcmResponse.json();
        
        if (fcmResponse.ok && fcmResult.success === 1) {
          sentCount++;
          console.log(`Push notification sent successfully to token: ${tokenData.token.substring(0, 20)}...`);
        } else {
          console.error(`Failed to send push notification to token: ${tokenData.token.substring(0, 20)}...`, fcmResult);
          errors.push({
            token: tokenData.token.substring(0, 20) + '...',
            error: fcmResult
          });

          // If the token is invalid, remove it from the database
          if (fcmResult.results && fcmResult.results[0] && 
              (fcmResult.results[0].error === 'NotRegistered' || 
               fcmResult.results[0].error === 'InvalidRegistration')) {
            console.log(`Removing invalid token: ${tokenData.token.substring(0, 20)}...`);
            await supabase
              .from('push_notification_tokens')
              .delete()
              .eq('token', tokenData.token);
          }
        }
      } catch (error) {
        console.error(`Error sending push notification to token: ${tokenData.token.substring(0, 20)}...`, error);
        errors.push({
          token: tokenData.token.substring(0, 20) + '...',
          error: (error as Error).message
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Push notifications processed`,
        sent: sentCount,
        total: tokens.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );

  } catch (error) {
    console.error('Error in send-push-notification function:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }
};

serve(handler);