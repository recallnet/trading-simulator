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

This API uses Bearer token authentication. All protected endpoints require the following header:

- **Authorization**: Bearer your-api-key

Where "your-api-key" is the API key provided during team registration.

### Authentication Examples

**cURL Example:**

\`\`\`bash
curl -X GET "https://api.example.com/api/account/balances" \\
  -H "Authorization: Bearer abc123def456_ghi789jkl012" \\
  -H "Content-Type: application/json"
\`\`\`

**JavaScript Example:**

\`\`\`javascript
const fetchData = async () => {
  const apiKey = 'abc123def456_ghi789jkl012';
  const response = await fetch('https://api.example.com/api/account/balances', {
    headers: {
      'Authorization': \`Bearer \${apiKey}\`,
      'Content-Type': 'application/json'
    }
  });
  
  return await response.json();
};
\`\`\`

For convenience, we provide an API client that handles authentication automatically. See \`docs/examples/api-client.ts\`.
      `,
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
      license: {
        name: 'ISC License',
        url: 'https://opensource.org/licenses/ISC',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.server.port}`,
        description: 'Local development server',
      },
      {
        url: 'https://api.example.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description:
            'API key provided in the Authorization header using Bearer token authentication',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
            status: {
              type: 'integer',
              description: 'HTTP status code',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp of when the error occurred',
            },
          },
        },
        Trade: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique trade ID',
            },
            teamId: {
              type: 'string',
              description: 'Team ID that executed the trade',
            },
            competitionId: {
              type: 'string',
              description: 'ID of the competition this trade is part of',
            },
            fromToken: {
              type: 'string',
              description: 'Token address that was sold',
            },
            toToken: {
              type: 'string',
              description: 'Token address that was bought',
            },
            fromAmount: {
              type: 'number',
              description: 'Amount of fromToken that was sold',
            },
            toAmount: {
              type: 'number',
              description: 'Amount of toToken that was received',
            },
            price: {
              type: 'number',
              description: 'Price at which the trade was executed',
            },
            success: {
              type: 'boolean',
              description: 'Whether the trade was successfully completed',
            },
            error: {
              type: 'string',
              description: 'Error message if the trade failed',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp of when the trade was executed',
            },
            fromChain: {
              type: 'string',
              description: 'Blockchain type of the source token',
            },
            toChain: {
              type: 'string',
              description: 'Blockchain type of the destination token',
            },
            fromSpecificChain: {
              type: 'string',
              description: 'Specific chain for the source token',
            },
            toSpecificChain: {
              type: 'string',
              description: 'Specific chain for the destination token',
            },
          },
        },
        TokenBalance: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              description: 'Token address',
            },
            amount: {
              type: 'number',
              description: 'Token balance amount',
            },
            chain: {
              type: 'string',
              description: 'Chain the token belongs to',
            },
            specificChain: {
              type: 'string',
              description: 'Specific chain for EVM tokens',
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Auth',
        description: 'Authentication endpoints',
      },
      {
        name: 'Account',
        description: 'Account management endpoints',
      },
      {
        name: 'Trade',
        description: 'Trading endpoints',
      },
      {
        name: 'Price',
        description: 'Price information endpoints',
      },
      {
        name: 'Competition',
        description: 'Competition endpoints',
      },
      {
        name: 'Admin',
        description: 'Admin endpoints',
      },
      {
        name: 'Health',
        description: 'Health check endpoints',
      },
    ],
  },
  apis: ['./src/routes/*.ts'], // Path to the API routes files
};

// Generate OpenAPI specification
const swaggerSpec = swaggerJsdoc(swaggerOptions);

export { swaggerSpec };
