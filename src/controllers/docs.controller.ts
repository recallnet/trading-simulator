import { Request, Response, NextFunction } from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from '../config/swagger';

/**
 * Documentation Controller
 * Handles API documentation endpoints
 */
export class DocsController {
  /**
   * Setup configuration for Swagger UI
   */
  static readonly swaggerUiOptions = {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    }
  };

  /**
   * Get API documentation - Serves the Swagger UI
   * This is a placeholder method for route configuration - the actual UI is handled by swagger-ui-express
   * 
   * @openapi
   * /api/docs:
   *   get:
   *     tags:
   *       - Documentation
   *     summary: API documentation UI
   *     description: Interactive API documentation using Swagger UI
   *     responses:
   *       200:
   *         description: HTML page with Swagger UI
   *         content:
   *           text/html:
   *             schema:
   *               type: string
   */
  static getApiDocs = swaggerUi.setup(swaggerSpec, DocsController.swaggerUiOptions);
  
  /**
   * Middleware for serving swagger-ui assets
   */
  static serveAssets = swaggerUi.serve;
  
  /**
   * Get raw OpenAPI specification in JSON format
   * 
   * @openapi
   * /api/docs/spec:
   *   get:
   *     tags:
   *       - Documentation
   *     summary: OpenAPI specification
   *     description: Get the raw OpenAPI specification in JSON format for programmatic consumption
   *     responses:
   *       200:
   *         description: OpenAPI specification in JSON format
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *       500:
   *         description: Server error
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static getApiSpec(req: Request, res: Response, next: NextFunction) {
    try {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerSpec);
    } catch (error) {
      next(error);
    }
  }
} 