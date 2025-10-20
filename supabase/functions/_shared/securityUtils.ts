// Security utilities for edge functions
interface SecurityLogEvent {
  userId?: string;
  event: string;
  details: Record<string, any>;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  functionName?: string;
}

export class EdgeSecurityLogger {
  static logEvent(req: Request, event: Omit<SecurityLogEvent, 'timestamp' | 'ipAddress' | 'userAgent'>): void {
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    const securityEvent: SecurityLogEvent = {
      ...event,
      timestamp: new Date().toISOString(),
      ipAddress: ip,
      userAgent: userAgent.substring(0, 200), // Limit length
    };

    console.log('🔒 EDGE SECURITY EVENT:', JSON.stringify(securityEvent, null, 2));
  }

  static logAuthAttempt(req: Request, functionName: string, success: boolean, userId?: string, details?: Record<string, any>): void {
    this.logEvent(req, {
      userId,
      event: 'auth.attempt',
      functionName,
      details: {
        success,
        ...details,
      },
    });
  }

  static logSuspiciousActivity(req: Request, functionName: string, reason: string, details?: Record<string, any>): void {
    this.logEvent(req, {
      event: 'security.suspicious',
      functionName,
      details: {
        reason,
        ...details,
      },
    });
  }
}

export function validateInput(data: any, requiredFields: string[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for required fields
  for (const field of requiredFields) {
    if (!data || data[field] === undefined || data[field] === null || data[field] === '') {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Basic sanitization checks
  if (data) {
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        // Check for potential XSS attempts
        if (value.includes('<script') || value.includes('javascript:') || value.includes('data:text/html')) {
          errors.push(`Potentially malicious content in field: ${key}`);
        }
        
        // Check for SQL injection attempts
        if (/(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b)/i.test(value)) {
          errors.push(`Potentially malicious SQL content in field: ${key}`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function createSecureErrorResponse(message: string, status: number = 500): Response {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Filter sensitive patterns from error messages
  let sanitizedMessage = message
    // Redact secrets and credentials
    .replace(/\b(password|key|secret|token|api_key|bearer)\b/gi, '[REDACTED]')
    // Remove file paths and stack traces
    .replace(/\/[\w\/.\\-]+\.(ts|js|tsx|jsx)/g, '[FILE]')
    .replace(/at \w+\.[\w.]+/g, 'at [FUNCTION]')
    .replace(/line \d+/gi, 'line [N]')
    // Remove database identifiers
    .replace(/\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|TABLE|COLUMN)\b/gi, '[SQL]')
    // Remove URLs and endpoints
    .replace(/https?:\/\/[^\s]+/g, '[URL]')
    // Remove error codes that might reveal internal structure
    .replace(/\b[A-Z0-9]{8,}\b/g, '[CODE]');

  // Use generic message for production or if sensitive content detected
  const isDevelopment = Deno.env.get('ENVIRONMENT') === 'development';
  const hasSensitiveContent = /\b(database|postgres|supabase|stripe|openai|api)\b/i.test(sanitizedMessage);
  
  const clientMessage = (!isDevelopment || hasSensitiveContent)
    ? 'An error occurred. Please try again later.'
    : sanitizedMessage;

  // Always log the full error server-side for debugging
  console.error('[Internal Error]:', message);

  return new Response(
    JSON.stringify({ 
      error: clientMessage,
      timestamp: new Date().toISOString()
    }),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      }
    }
  );
}