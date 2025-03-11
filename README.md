# Solana Trading Simulator

A robust server application for hosting simulated Solana blockchain trading competitions where teams can practice trading without risking real assets.

## Project Overview

The Solana Trading Simulator is a standalone server designed to host trading competitions on the Solana blockchain using simulated balances. Teams can connect via unique API keys, execute trades, track their portfolio performance, and compete against other teams.

### Key Features

- Team registration with secure API key authentication
- Real-time token price tracking from multiple sources (Jupiter, Raydium, Solana)
- Simulated trading with realistic slippage and market conditions
- Balance and portfolio management
- Competition management with leaderboards
- Comprehensive API for trading and account management
- Rate limiting and security features

## Current Development Status

The application follows an MVC (Model-View-Controller) architecture with a robust service layer. Here's the current development status:

- ✅ Core architecture and project structure implementation
- ✅ Database persistence layer with PostgreSQL
- ✅ Repository pattern for data access
- ✅ Service layer for business logic
- ✅ Controller layer for handling API requests
- ✅ Authentication middleware with API key validation
- ✅ Rate limiting middleware
- ✅ Route definitions for all API endpoints
- ✅ Price tracking service with multiple providers
- ✅ Balance management service
- ✅ Trade simulation engine
- ✅ Competition management service
- ⏳ Comprehensive testing (in progress)
- ⏳ Documentation (in progress)
- ⏳ Integration with front-end (planned)

## Technical Architecture

The application uses a layered architecture:

```
┌─────────────────┐
│   Controllers   │ ◄── HTTP Request/Response handling
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Services     │ ◄── Business logic implementation
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Repositories   │ ◄── Data access layer
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Database     │ ◄── PostgreSQL persistence
└─────────────────┘
```

### Key Components

- **Services**: Core business logic implementation
  - `PriceTracker`: Multi-source price data fetching
  - `BalanceManager`: Team balance tracking
  - `TradeSimulator`: Trade execution and processing
  - `CompetitionManager`: Competition lifecycle management
  - `TeamManager`: Team registration and authentication

- **Controllers**: API endpoint handlers
  - `AccountController`: Balance and portfolio information
  - `AdminController`: Admin operations for competition management
  - `AuthController`: Authentication operations
  - `CompetitionController`: Competition status and leaderboards
  - `PriceController`: Price information access
  - `TradeController`: Trade execution and quotes

- **Repositories**: Data access layer
  - `TeamRepository`: Team data management
  - `BalanceRepository`: Balance record management
  - `TradeRepository`: Trade history management
  - `CompetitionRepository`: Competition data management
  - `PriceRepository`: Price history storage

## Technology Stack

- **Backend**: Node.js with TypeScript and Express
- **Database**: PostgreSQL 
- **Caching**: In-memory caching with future Redis integration planned
- **API Security**: HMAC authentication for API requests
- **Rate Limiting**: Tiered rate limits based on endpoint sensitivity

## Getting Started

### Prerequisites

- Node.js (v16+)
- PostgreSQL (v13+)
- npm or yarn

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/recallnet/trading-sim
   cd trading-sim
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up the environment and database (automated setup):
   ```
   npm run setup
   ```
   This command:
   - Generates secure random values for JWT_SECRET, API_KEY_SECRET, and HMAC_SECRET
   - Creates or updates the .env file with these values
   - Initializes the database schema with all necessary tables
   - Applies all required migrations automatically

   Alternatively, you can run the steps separately:
   ```
   npm run generate:secrets  # Generate security secrets
   npm run db:init           # Initialize the database with full schema
   ```

4. Start the development server:
   ```
   npm run dev
   ```

The server will be available at http://localhost:3000 by default.

## Admin Setup Guide

As the administrator of this application, you'll need to properly configure the system before teams can use it. This section covers the essential setup steps.

### Environment Configuration

The application uses environment variables for configuration. Create a `.env` file in the root directory based on `.env.example`.

#### Security Secret Generation

Three critical security secrets need to be generated for your deployment:

1. **JWT_SECRET**: Used for admin authentication
2. **API_KEY_SECRET**: Used when generating API keys for teams
3. **HMAC_SECRET**: Used for verifying request signatures

You can generate these secrets automatically by running:

```bash
npm run generate:secrets
```

This will:
- Create a `.env` file if it doesn't exist (based on `.env.example`)
- Generate strong random values for all three secrets
- Update only the security-related values in your existing `.env` file (if it already exists)
- Display the generated values for your reference

Alternatively, if you prefer to generate them manually:

```bash
# Using Node.js to generate random 64-character hexadecimal strings
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run this command three times to generate three different values, and update your `.env` file:

```
JWT_SECRET=your_generated_jwt_secret_here
API_KEY_SECRET=your_generated_api_key_secret_here
HMAC_SECRET=your_generated_hmac_secret_here
```

⚠️ **IMPORTANT**: 
- Use different secrets for development and production environments
- Never commit these secrets to version control
- Store backups of these values securely - if lost, all teams would need new API credentials
- In production, consider using a secret manager service rather than .env files

#### How These Secrets Work

- **JWT_SECRET**: Used by the application to sign and verify JSON Web Tokens for admin authentication sessions
- **API_KEY_SECRET**: Used as a seed when generating unique API keys for teams (through the team registration endpoint)
- **HMAC_SECRET**: Used in the validation process for API request signatures

### Database Configuration

Configure your PostgreSQL connection:

```
DB_HOST=your_database_host
DB_PORT=5432
DB_USERNAME=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=solana_trading_simulator
```

For production, use a dedicated database with proper security measures.

### Starting the Application

For production deployment:

1. Build the application:
   ```
   npm run build
   ```

2. Start the production server:
   ```
   npm start
   ```

For development:
```
npm run dev
```

### Creating an Admin Account

The first time you run the application, you'll need to create an admin account (if not already seeded):

1. Access the admin registration endpoint (only available before any admin exists):
   ```
   POST /api/admin/setup
   {
     "username": "admin",
     "password": "secure-password",
     "email": "admin@example.com"
   }
   ```

2. Save the credentials securely - you'll need them to access the admin dashboard.

### Registering Teams

As an admin, you can register teams through the admin API:

1. Login as admin to get your JWT token:
   ```
   POST /api/auth/login
   {
     "username": "admin",
     "password": "your-password"
   }
   ```

2. Register a new team (using your JWT token in the Authorization header):
   ```
   POST /api/admin/teams/register
   {
     "teamName": "Team Alpha",
     "email": "team@example.com", 
     "contactPerson": "John Doe"
   }
   ```

3. The response will include the team's API key and secret:
   ```json
   {
     "success": true,
     "team": {
       "id": "uuid",
       "name": "Team Alpha",
       "email": "team@example.com",
       "contactPerson": "John Doe",
       "apiKey": "generated-api-key",
       "apiSecret": "generated-api-secret",
       "createdAt": "2023-01-01T00:00:00Z"
     }
   }
   ```

4. Securely share these credentials with the team (this is the only time the full secret will be shown)

### Managing Competitions

Once teams are registered, you can manage competitions:

1. Start a competition:
   ```
   POST /api/admin/competition/start
   {
     "name": "Trading Competition Q2 2023",
     "description": "Quarterly trading competition",
     "teamIds": ["team-id-1", "team-id-2", "team-id-3"]
   }
   ```

2. End a competition:
   ```
   POST /api/admin/competition/end
   {
     "competitionId": "competition-id"
   }
   ```

3. View performance reports:
   ```
   GET /api/admin/reports/performance?competitionId=competition-id
   ```

### Production Deployment Considerations

For production deployments:

1. **Security**:
   - Use HTTPS with a valid SSL certificate
   - Set up a reverse proxy (Nginx/Apache) in front of the application
   - Configure proper firewall rules
   - Consider using a Web Application Firewall (WAF)

2. **Performance**:
   - Configure a production-ready PostgreSQL instance
   - Set up Redis for improved caching (optional but recommended)
   - Consider deploying behind a load balancer for high availability

3. **Monitoring**:
   - Implement application monitoring (e.g., Prometheus, Grafana)
   - Set up logging and log aggregation
   - Configure alerts for system health issues

### Database Setup

The application requires a PostgreSQL database. Database schema files are located in `src/database/init.sql`.

To manually initialize the database with the complete schema:

```bash
# Connect to PostgreSQL
psql -U your_username -d your_database_name

# Run the initialization script
\i /path/to/src/database/init.sql
```

Or use the provided setup script which handles both initialization and migrations:
```
npm run db:init
```

#### Database Management Tools

For development, you can use these commands to manage your database:

```bash
# Initialize database with full schema (including all migrations)
npm run db:init

# Check database status and schema
npm run db:check

# Clean the database (truncate all tables and reset sequences)
npm run db:clean

# Reset the database (clean tables + re-initialize schema)
npm run db:reset

# Run specific migrations (if upgrading an existing installation)
npm run db:migrate:admin  # Adds admin support to the database
```

⚠️ **WARNING**: The clean and reset commands will delete all data in your database tables. They only work when `NODE_ENV=development` to prevent accidental data loss in production environments.

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with API key and secret
- `POST /api/auth/validate` - Validate API credentials

### Account Management
- `GET /api/account/balances` - Get current balances
- `GET /api/account/portfolio` - Get portfolio value and composition
- `GET /api/account/trades` - Get trade history

### Trading Operations
- `POST /api/trade/execute` - Execute a trade
- `GET /api/trade/quote` - Get quote for a potential trade

### Price Information
- `GET /api/price/current` - Get current price for a token
- `GET /api/price/history` - Get price history

### Competition Information
- `GET /api/competition/leaderboard` - Get competition leaderboard
- `GET /api/competition/status` - Get current competition status
- `GET /api/competition/rules` - Get competition rules

### Admin Operations
- `POST /api/admin/teams/register` - Register a new team
- `POST /api/admin/competition/start` - Start a new competition
- `POST /api/admin/competition/end` - End the current competition
- `GET /api/admin/reports/performance` - Get performance reports

## Security

All protected API endpoints require:
- API Key in request header (`X-API-Key`)
- Request timestamp in header (`X-Timestamp`)
- HMAC signature in header (`X-Signature`)

Signature calculation:
```
Signature = HMAC-SHA256(requestMethod + path + timestamp + requestBody, apiSecret)
```

### Rate Limiting

The application implements tiered rate limiting:
- 100 requests per minute for trade operations
- 300 requests per minute for price queries
- 30 requests per minute for balance/portfolio checks
- 3,000 requests per minute across all endpoints
- 10,000 requests per hour per team

These values can be customized in the `.env` file.

## API Documentation

For teams participating in trading competitions, we provide comprehensive API documentation and code examples to help you get started quickly.

### Documentation Resources

- **[API Documentation](docs/API_DOCUMENTATION.md)**: Detailed documentation of all API endpoints, authentication requirements, and response formats.
- **[API Examples](docs/examples/)**: TypeScript code examples demonstrating how to interact with the API.
- **[Postman Guide](docs/POSTMAN_GUIDE.md)**: Step-by-step instructions for setting up and using Postman with the Trading Simulator API.

### Authentication

All API requests require HMAC authentication with the following headers:

- `X-API-Key`: Your team's API key
- `X-Timestamp`: Current timestamp in ISO format
- `X-Signature`: HMAC-SHA256 signature
- `Content-Type`: `application/json`

For details on generating the signature and examples in TypeScript, see the [API Documentation](docs/API_DOCUMENTATION.md).

### Example Client

We provide a [TypeScript client class](docs/examples/api-client.ts) that handles authentication and requests for you. Usage example:

```typescript
import { TradingSimulatorClient } from './api-client';

const client = new TradingSimulatorClient(
  'your-api-key',
  'your-api-secret'
);

// Get account balances
const balances = await client.getBalances();
console.log('Balances:', balances);
```

### Running the Examples

To run the provided examples:

1. Install dependencies:
   ```bash
   cd docs/examples
   npm install typescript ts-node @types/node
   ```

2. Update the examples with your team's API credentials.

3. Run an example:
   ```bash
   npx ts-node get-balances-example.ts
   ```

For more information, see the [examples README](docs/examples/README.md).

## Next Steps

The following features are planned for upcoming development:

1. Complete comprehensive test suite
2. Enhance error handling and logging
3. Implement scheduled tasks for portfolio snapshots
4. Add more advanced analytics for team performance
5. Integrate with a front-end application for visualization
6. Add user notifications for significant events
7. Implement Redis for improved caching and performance

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 