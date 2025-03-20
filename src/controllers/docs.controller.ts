import { Request, Response, NextFunction } from 'express';

/**
 * Documentation Controller
 * Handles API documentation endpoints
 */
export class DocsController {
  /**
   * Get API documentation
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async getApiDocs(req: Request, res: Response, next: NextFunction) {
    try {
      // In a real implementation, we would serve Swagger/OpenAPI documentation
      // For now, we'll just return a simple JSON object with API endpoints
      
      const apiDocs = {
        info: {
          title: 'Solana Trading Simulator API',
          version: '1.0.0',
          description: 'API for the Solana Trading Simulator'
        },
        endpoints: {
          auth: {
            login: {
              method: 'POST',
              path: '/api/auth/login',
              description: 'Login with API key and secret'
            },
            validate: {
              method: 'POST',
              path: '/api/auth/validate',
              description: 'Validate API credentials'
            }
          },
          account: {
            getBalances: {
              method: 'GET',
              path: '/api/account/balances',
              description: 'Get balances for the authenticated team'
            },
            getPortfolio: {
              method: 'GET',
              path: '/api/account/portfolio',
              description: 'Get portfolio information for the authenticated team'
            },
            getTrades: {
              method: 'GET',
              path: '/api/account/trades',
              description: 'Get trade history for the authenticated team'
            }
          },
          trade: {
            executeTrade: {
              method: 'POST',
              path: '/api/trade/execute',
              description: 'Execute a trade'
            },
            getQuote: {
              method: 'GET',
              path: '/api/trade/quote',
              description: 'Get a quote for a trade'
            }
          },
          price: {
            getCurrentPrice: {
              method: 'GET',
              path: '/api/price/current',
              description: 'Get the current price for a token',
              requiresAuth: true
            },
            getPriceHistory: {
              method: 'GET',
              path: '/api/price/history',
              description: 'Get the price history for a token',
              requiresAuth: true
            },
            getTokenInfo: {
              method: 'GET',
              path: '/api/price/token-info',
              description: 'Get detailed token information including specific chain',
              requiresAuth: true
            }
          },
          competition: {
            getLeaderboard: {
              method: 'GET',
              path: '/api/competition/leaderboard',
              description: 'Get the leaderboard for a competition'
            },
            getStatus: {
              method: 'GET',
              path: '/api/competition/status',
              description: 'Get the status of the current competition'
            },
            getRules: {
              method: 'GET',
              path: '/api/competition/rules',
              description: 'Get the rules for the competition'
            }
          },
          admin: {
            registerTeam: {
              method: 'POST',
              path: '/api/admin/teams/register',
              description: 'Register a new team'
            },
            startCompetition: {
              method: 'POST',
              path: '/api/admin/competition/start',
              description: 'Start a competition'
            },
            endCompetition: {
              method: 'POST',
              path: '/api/admin/competition/end',
              description: 'End a competition'
            },
            getPerformanceReports: {
              method: 'GET',
              path: '/api/admin/reports/performance',
              description: 'Get performance reports'
            }
          },
          health: {
            check: {
              method: 'GET',
              path: '/api/health',
              description: 'Basic health check'
            },
            detailed: {
              method: 'GET',
              path: '/api/health/detailed',
              description: 'Detailed health check with service status'
            }
          }
        }
      };
      
      res.status(200).json(apiDocs);
    } catch (error) {
      next(error);
    }
  }
} 