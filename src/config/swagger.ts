import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './index';

// Basic Swagger configuration
const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Trading Simulator API',
      version: '1.0.0',
      description: `API for the Trading Simulator - a platform for simulated cryptocurrency trading competitions
      
## Authentication Guide

This API requires three authentication headers for all protected endpoints:

- **X-API-Key**: Your team's API key (provided during registration)
- **X-Timestamp**: Current timestamp in ISO format (e.g., \`2023-03-15T17:30:45.123Z\`)
- **X-Signature**: HMAC-SHA256 signature of the request data

### Calculating the Signature

When testing endpoints in this documentation UI, you'll need to manually calculate the signature:

1. Concatenate: \`METHOD + PATH + TIMESTAMP + BODY_STRING\`
   - Example: \`GET/api/account/balances2023-10-15T14:30:00.000Z{}\`
   - For GET requests with no body, use \`{}\` in the signature calculation
   - For POST requests, use the JSON string of your request body

2. ⚠️ **IMPORTANT PATH HANDLING**:
   - Use ONLY the base path without query parameters for signature calculation
   - Example: For \`/api/price?token=xyz\`, use only \`/api/price\` in the signature
   - The path should start with a leading slash
   - Do not include the domain or protocol (e.g., use \`/api/trade/execute\` not \`http://localhost:3000/api/trade/execute\`)

3. Sign using HMAC-SHA256 with your API secret
   - You can use online tools to calculate this, or the provided API client

4. Enter all three values in the Authorize dialog

### Example with Node.js

\`\`\`javascript
const crypto = require('crypto');

// Your credentials
const apiKey = 'sk_1b2c3d4e5f...';
const apiSecret = 'a1b2c3d4e5f6...';

// Request details
const method = 'GET';
const fullPath = '/api/account/balances?limit=10'; // Full path with query params
const pathForSignature = fullPath.split('?')[0];  // Remove query params for signature
const timestamp = new Date().toISOString();
const body = {}; // Empty for GET requests

// Calculate signature
const data = method + pathForSignature + timestamp + JSON.stringify(body);
const signature = crypto
  .createHmac('sha256', apiSecret)
  .update(data)
  .digest('hex');

console.log('X-API-Key:', apiKey);
console.log('X-Timestamp:', timestamp);
console.log('X-Signature:', signature);
console.log('Path used for signature:', pathForSignature);
\`\`\`

For convenience, we provide an API client that handles this automatically. See \`docs/examples/api-client.ts\`.
      `,
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      },
      license: {
        name: 'ISC License',
        url: 'https://opensource.org/licenses/ISC'
      }
    },
    servers: [
      {
        url: `http://localhost:${config.server.port}`,
        description: 'Local development server'
      },
      {
        url: 'https://api.example.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key'
        },
        TimestampAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Timestamp'
        },
        SignatureAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Signature'
        },
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            },
            status: {
              type: 'integer',
              description: 'HTTP status code'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp of when the error occurred'
            }
          }
        },
        Trade: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique trade ID'
            },
            teamId: {
              type: 'string',
              description: 'Team ID that executed the trade'
            },
            fromToken: {
              type: 'string',
              description: 'Token address that was sold'
            },
            toToken: {
              type: 'string',
              description: 'Token address that was bought'
            },
            fromAmount: {
              type: 'string',
              description: 'Amount of fromToken that was sold'
            },
            toAmount: {
              type: 'string',
              description: 'Amount of toToken that was received'
            },
            executionPrice: {
              type: 'string',
              description: 'Price at which the trade was executed'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp of when the trade was executed'
            }
          }
        },
        TokenBalance: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              description: 'Token address'
            },
            chain: {
              type: 'string',
              description: 'Chain the token belongs to'
            },
            specificChain: {
              type: 'string',
              description: 'Specific chain for EVM tokens'
            },
            balance: {
              type: 'string',
              description: 'Token balance'
            },
            value: {
              type: 'string',
              description: 'USD value of the token balance'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Auth',
        description: 'Authentication endpoints'
      },
      {
        name: 'Account',
        description: 'Account management endpoints'
      },
      {
        name: 'Trade',
        description: 'Trading endpoints'
      },
      {
        name: 'Price',
        description: 'Price information endpoints'
      },
      {
        name: 'Competition',
        description: 'Competition endpoints'
      },
      {
        name: 'Admin',
        description: 'Admin endpoints'
      },
      {
        name: 'Health',
        description: 'Health check endpoints'
      }
    ]
  },
  apis: ['./src/routes/*.ts'], // Path to the API routes files
};

// Generate OpenAPI specification
const swaggerSpec = swaggerJsdoc(swaggerOptions);

export { swaggerSpec }; 