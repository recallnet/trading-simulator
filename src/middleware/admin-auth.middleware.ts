import { Request, Response, NextFunction } from 'express';
import { ApiError } from './errorHandler';
import jwt from 'jsonwebtoken';
import { config } from '../config';

// Type for decoded JWT token
interface DecodedToken {
  id: string;
  isAdmin: boolean;
  name: string;
  iat: number;
  exp: number;
}

// Extend Express Request interface to include admin property
declare global {
  namespace Express {
    interface Request {
      admin?: {
        id: string;
        name: string;
      };
    }
  }
}

/**
 * Admin Authentication Middleware
 * Verifies JWT token for admin access
 */
export const adminAuthMiddleware = async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  try {
    // Skip auth check for admin setup route
    if (req.path === '/setup' && req.method === 'POST') {
      return next();
    }
    
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Access denied. Valid Bearer token required.');
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      // Verify token
      const decoded = jwt.verify(token, config.security.jwtSecret) as DecodedToken;
      
      // Verify this is an admin token
      if (!decoded.isAdmin) {
        throw new ApiError(403, 'Access denied. Admin privileges required.');
      }
      
      // Add admin info to request object
      req.admin = {
        id: decoded.id,
        name: decoded.name
      };
      
      next();
    } catch (error) {
      if ((error as any).name === 'TokenExpiredError') {
        throw new ApiError(401, 'Access denied. Token expired.');
      }
      throw new ApiError(401, 'Access denied. Invalid token.');
    }
  } catch (error) {
    next(error);
  }
}; 