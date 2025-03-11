import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import { ApiError } from './errorHandler';
import { config } from '../config';

// Define rate limiters for different endpoints
const tradeLimiter = new RateLimiterMemory({
  points: 100, // 100 requests
  duration: 60, // per 60 seconds
});

const priceLimiter = new RateLimiterMemory({
  points: 300, // 300 requests
  duration: 60, // per 60 seconds
});

const accountLimiter = new RateLimiterMemory({
  points: 30, // 30 requests
  duration: 60, // per 60 seconds
});

const globalLimiter = new RateLimiterMemory({
  points: 3000, // 3000 requests
  duration: 60, // per 60 seconds
});

const hourlyLimiter = new RateLimiterMemory({
  points: 10000, // 10000 requests
  duration: 3600, // per hour
});

/**
 * Rate limiting middleware
 * Enforces API rate limits based on endpoint and team
 */
export const rateLimiterMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Skip rate limiting for health check endpoint
    if (req.path === '/health') {
      return next();
    }

    // Get team ID from request (set by auth middleware)
    const teamId = req.teamId || 'anonymous';
    
    // Apply global rate limit first
    await globalLimiter.consume(`global`);
    
    // Apply hourly rate limit
    await hourlyLimiter.consume(`hourly:${teamId}`);
    
    // Apply endpoint-specific rate limits
    if (req.path.startsWith('/api/trade')) {
      await tradeLimiter.consume(`${req.path}:${teamId}`);
    } else if (req.path.startsWith('/api/price')) {
      await priceLimiter.consume(`${req.path}:${teamId}`);
    } else if (req.path.startsWith('/api/account')) {
      await accountLimiter.consume(`${req.path}:${teamId}`);
    }
    
    // If we get here, all rate limits passed
    next();
  } catch (error) {
    // Type guard to ensure error is a RateLimiterRes
    if (error && typeof error === 'object' && 'msBeforeNext' in error) {
      const rateLimiterRes = error as RateLimiterRes;
      
      // Calculate time until reset
      const secs = Math.round(rateLimiterRes.msBeforeNext / 1000) || 1;
      
      // Set rate limit headers
      res.set('Retry-After', String(secs));
      res.set('X-RateLimit-Reset', String(Date.now() + rateLimiterRes.msBeforeNext));
      
      // Return rate limit error
      next(new ApiError(429, `Rate limit exceeded. Try again in ${secs} seconds.`));
    } else {
      // Handle unexpected errors
      next(new ApiError(500, 'Rate limiting error'));
    }
  }
}; 