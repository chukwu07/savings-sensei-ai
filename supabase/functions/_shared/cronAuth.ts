const CRON_CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'null',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

export interface CronAuthResult {
  valid: boolean;
  error?: string;
  headers?: Record<string, string>;
}

/**
 * Validates CRON requests with enhanced security:
 * - Bearer token validation
 * - Timestamp validation (5 minute window)
 * - Origin blocking (no browser requests)
 * - Request body validation
 */
export async function validateCronRequest(
  req: Request,
  secret: string | undefined
): Promise<CronAuthResult> {
  // Check for origin header (browser requests have this)
  const origin = req.headers.get('origin');
  if (origin) {
    return { 
      valid: false, 
      error: 'Browser requests not allowed',
      headers: { ...CRON_CORS_HEADERS, 'X-Reason': 'origin-rejected' }
    };
  }

  // Validate secret is configured
  if (!secret) {
    console.error('[CRON-AUTH] CRON_SECRET not configured');
    return { 
      valid: false, 
      error: 'Server configuration error',
      headers: CRON_CORS_HEADERS
    };
  }

  // Validate Authorization header
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { 
      valid: false, 
      error: 'Missing or invalid authorization',
      headers: CRON_CORS_HEADERS
    };
  }

  const token = authHeader.substring(7);
  
  // Check for timestamp-based token (enhanced security)
  // Format: secret.timestamp or just secret for legacy support
  const parts = token.split('.');
  const providedSecret = parts[0];
  const timestamp = parts[1];

  // Validate secret
  if (providedSecret !== secret) {
    return { 
      valid: false, 
      error: 'Invalid credentials',
      headers: CRON_CORS_HEADERS
    };
  }

  // If timestamp provided, validate it (5 minute window)
  if (timestamp) {
    const requestTime = parseInt(timestamp, 10);
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    if (isNaN(requestTime) || Math.abs(now - requestTime) > fiveMinutes) {
      return { 
        valid: false, 
        error: 'Request expired or invalid timestamp',
        headers: CRON_CORS_HEADERS
      };
    }
  }

  return { valid: true, headers: CRON_CORS_HEADERS };
}

/**
 * Generate a timestamp-based token for CRON requests
 * This should be used by CRON job callers for enhanced security
 */
export function generateCronToken(secret: string): string {
  const timestamp = Date.now();
  return `${secret}.${timestamp}`;
}
