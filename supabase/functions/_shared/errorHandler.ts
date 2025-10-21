import { EdgeSecurityLogger } from './securityUtils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export class EdgeError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: any
  ) {
    super(message);
  }
}

export function handleEdgeFunctionError(
  error: unknown,
  functionName: string,
  req: Request
): Response {
  // Log full error server-side only
  console.error(`[${functionName}] Error:`, error);
  
  EdgeSecurityLogger.logEvent(req, {
    event: `${functionName}.error`,
    details: {
      error: error instanceof Error ? error.message : String(error),
      code: error instanceof EdgeError ? error.code : undefined
    }
  });

  // Return sanitized error to client
  let statusCode = 500;
  let clientMessage = 'An error occurred. Please try again.';

  if (error instanceof EdgeError) {
    statusCode = error.statusCode;
    clientMessage = error.message;
  } else if (error instanceof Error) {
    // Map known error patterns to safe messages
    if (error.message.includes('rate limit')) {
      statusCode = 429;
      clientMessage = 'Too many requests. Please try again later.';
    } else if (error.message.includes('unauthorized') || error.message.includes('Unauthorized')) {
      statusCode = 401;
      clientMessage = 'Authentication required.';
    } else if (error.message.includes('forbidden') || error.message.includes('Forbidden')) {
      statusCode = 403;
      clientMessage = 'Access denied.';
    }
  }

  return new Response(
    JSON.stringify({ 
      error: clientMessage,
      timestamp: new Date().toISOString()
    }),
    {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}
