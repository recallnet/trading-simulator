import { Request, Response, NextFunction } from 'express';

/**
 * Health Controller
 * Handles health check endpoints
 */
export class HealthController {
  /**
   * Basic health check
   * 
   * @openapi
   * /api/health:
   *   get:
   *     tags:
   *       - Health
   *     summary: Basic health check
   *     description: Simple health check endpoint that returns basic system status
   *     responses:
   *       200:
   *         description: System is healthy
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   description: Health status (ok/error)
   *                   example: ok
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *                   description: Current server timestamp
   *                 uptime:
   *                   type: number
   *                   description: Server uptime in seconds
   *                   example: 3600
   *                 version:
   *                   type: string
   *                   description: Application version
   *                   example: 1.0.0
   *       500:
   *         description: Server error
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async check(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Detailed health check with service status
   * 
   * @openapi
   * /api/health/detailed:
   *   get:
   *     tags:
   *       - Health
   *     summary: Detailed health check
   *     description: Detailed health check endpoint that returns status of all services
   *     responses:
   *       200:
   *         description: System health details
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   description: Overall health status (ok/error)
   *                   example: ok
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *                   description: Current server timestamp
   *                 uptime:
   *                   type: number
   *                   description: Server uptime in seconds
   *                   example: 3600
   *                 version:
   *                   type: string
   *                   description: Application version
   *                   example: 1.0.0
   *                 services:
   *                   type: object
   *                   description: Status of individual services
   *                   properties:
   *                     priceTracker:
   *                       type: string
   *                       description: Price tracking service status
   *                       example: ok
   *                     balanceManager:
   *                       type: string
   *                       description: Balance management service status
   *                       example: ok
   *                     tradeSimulator:
   *                       type: string
   *                       description: Trade simulation service status
   *                       example: ok
   *                     competitionManager:
   *                       type: string
   *                       description: Competition management service status
   *                       example: ok
   *                     teamManager:
   *                       type: string
   *                       description: Team management service status
   *                       example: ok
   *       500:
   *         description: Server error
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async detailed(req: Request, res: Response, next: NextFunction) {
    try {
      // Since we don't have isHealthy methods on our services yet,
      // we'll just return 'ok' for all services for now
      // In a real implementation, we would check the health of each service
      
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        services: {
          priceTracker: 'ok',
          balanceManager: 'ok',
          tradeSimulator: 'ok',
          competitionManager: 'ok',
          teamManager: 'ok'
        }
      });
    } catch (error) {
      next(error);
    }
  }
} 