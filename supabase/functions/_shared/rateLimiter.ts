// Rate limiting utility for edge functions
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (req: Request) => string;
}

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private storage = new Map<string, RateLimitInfo>();

  async checkLimit(req: Request, config: RateLimitConfig): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = config.keyGenerator ? config.keyGenerator(req) : this.getDefaultKey(req);
    const now = Date.now();
    
    // Clean up expired entries
    this.cleanup();
    
    const current = this.storage.get(key);
    
    if (!current || now >= current.resetTime) {
      // First request or window has reset
      this.storage.set(key, {
        count: 1,
        resetTime: now + config.windowMs
      });
      
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs
      };
    }
    
    if (current.count >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: current.resetTime
      };
    }
    
    // Increment count
    current.count++;
    this.storage.set(key, current);
    
    return {
      allowed: true,
      remaining: config.maxRequests - current.count,
      resetTime: current.resetTime
    };
  }

  private getDefaultKey(req: Request): string {
    // Use a combination of IP and User-Agent as default key
    const url = new URL(req.url);
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    
    // Hash the combination to create a key
    return `${ip}:${userAgent.substring(0, 50)}`;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, info] of this.storage.entries()) {
      if (now >= info.resetTime) {
        this.storage.delete(key);
      }
    }
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();

// Helper function to create rate limit response
export function createRateLimitResponse(resetTime: number): Response {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  return new Response(
    JSON.stringify({ 
      error: 'Rate limit exceeded',
      resetTime: new Date(resetTime).toISOString()
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
      }
    }
  );
}