/**
 * Enterprise Rate Limiting System
 * Implements sliding window rate limiting with memory store
 */

interface RateLimitWindow {
  requests: number[];
  resetTime: number;
}

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime?: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
}

export class RateLimiter {
  private windows = new Map<string, RateLimitWindow>();
  private configs: Map<string, RateLimitConfig> = new Map();

  constructor() {
    this.initializeConfigs();
    this.startCleanupInterval();
  }

  private initializeConfigs() {
    // Default rate limits
    this.configs.set('default', { windowMs: 60000, maxRequests: 60 }); // 60 requests per minute
    this.configs.set('/login', { windowMs: 60000, maxRequests: 5 }); // 5 login attempts per minute
    this.configs.set('/auth/forgot-password', { windowMs: 300000, maxRequests: 3 }); // 3 password resets per 5 minutes
    this.configs.set('/api', { windowMs: 60000, maxRequests: 100 }); // 100 API calls per minute
    
    // Admin routes - more restrictive
    this.configs.set('/admin', { windowMs: 60000, maxRequests: 30 });
    
    // Tenant routes - moderate limits
    this.configs.set('/tenant-dashboard', { windowMs: 60000, maxRequests: 120 });
  }

  async checkLimit(clientIP: string, path: string): Promise<RateLimitResult> {
    if (!clientIP || clientIP === 'unknown') {
      // Allow requests with unknown IP but log them
      console.warn('Rate limiter: Unknown IP detected');
      return { allowed: true, limit: 0, remaining: 0 };
    }

    const config = this.getConfigForPath(path);
    const key = `${clientIP}:${path}`;
    const now = Date.now();
    
    let window = this.windows.get(key);
    
    if (!window) {
      window = {
        requests: [],
        resetTime: now + config.windowMs,
      };
      this.windows.set(key, window);
    }

    // Remove expired requests
    window.requests = window.requests.filter(
      timestamp => timestamp > now - config.windowMs
    );

    const currentCount = window.requests.length;
    
    if (currentCount >= config.maxRequests) {
      return {
        allowed: false,
        limit: config.maxRequests,
        remaining: 0,
        resetTime: Math.min(...window.requests) + config.windowMs,
      };
    }

    // Add current request
    window.requests.push(now);
    
    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - window.requests.length,
    };
  }

  private getConfigForPath(path: string): RateLimitConfig {
    // Find the most specific config
    const sortedPaths = Array.from(this.configs.keys())
      .filter(configPath => path.startsWith(configPath))
      .sort((a, b) => b.length - a.length);
    
    if (sortedPaths.length > 0) {
      return this.configs.get(sortedPaths[0])!;
    }
    
    return this.configs.get('default')!;
  }

  private startCleanupInterval() {
    // Clean up expired windows every 5 minutes
    setInterval(() => {
      const now = Date.now();
      
      for (const [key, window] of this.windows.entries()) {
        window.requests = window.requests.filter(
          timestamp => timestamp > now - 300000 // Keep requests from last 5 minutes
        );
        
        if (window.requests.length === 0 && window.resetTime < now) {
          this.windows.delete(key);
        }
      }
    }, 300000); // 5 minutes
  }

  // Administrative functions
  async resetLimit(clientIP: string, path?: string): Promise<void> {
    if (path) {
      const key = `${clientIP}:${path}`;
      this.windows.delete(key);
    } else {
      // Reset all limits for this IP
      for (const key of this.windows.keys()) {
        if (key.startsWith(`${clientIP}:`)) {
          this.windows.delete(key);
        }
      }
    }
  }

  async getCurrentUsage(clientIP: string): Promise<Array<{ path: string; requests: number; limit: number }>> {
    const usage: Array<{ path: string; requests: number; limit: number }> = [];
    
    for (const [key, window] of this.windows.entries()) {
      if (key.startsWith(`${clientIP}:`)) {
        const path = key.split(':').slice(1).join(':');
        const config = this.getConfigForPath(path);
        const now = Date.now();
        
        const recentRequests = window.requests.filter(
          timestamp => timestamp > now - config.windowMs
        );
        
        usage.push({
          path,
          requests: recentRequests.length,
          limit: config.maxRequests,
        });
      }
    }
    
    return usage;
  }

  // Security monitoring
  async getTopOffenders(limit: number = 10): Promise<Array<{ ip: string; totalRequests: number; paths: string[] }>> {
    const ipStats = new Map<string, { totalRequests: number; paths: Set<string> }>();
    
    for (const [key, window] of this.windows.entries()) {
      const [ip, ...pathParts] = key.split(':');
      const path = pathParts.join(':');
      
      if (!ipStats.has(ip)) {
        ipStats.set(ip, { totalRequests: 0, paths: new Set() });
      }
      
      const stats = ipStats.get(ip)!;
      stats.totalRequests += window.requests.length;
      stats.paths.add(path);
    }
    
    return Array.from(ipStats.entries())
      .map(([ip, stats]) => ({
        ip,
        totalRequests: stats.totalRequests,
        paths: Array.from(stats.paths),
      }))
      .sort((a, b) => b.totalRequests - a.totalRequests)
      .slice(0, limit);
  }

  // Configuration management
  updateConfig(path: string, config: RateLimitConfig): void {
    this.configs.set(path, config);
  }

  getConfig(path: string): RateLimitConfig | undefined {
    return this.configs.get(path);
  }

  getAllConfigs(): Map<string, RateLimitConfig> {
    return new Map(this.configs);
  }
}