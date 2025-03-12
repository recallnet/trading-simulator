import express from 'express';
import cors from 'cors';
import { config } from './config';
import errorHandler from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth.middleware';
import { rateLimiterMiddleware } from './middleware/rate-limiter.middleware';
import { services } from './services';
import { initializeDatabase } from './database';

// Import routes
import * as authRoutes from './routes/auth.routes';
import * as accountRoutes from './routes/account.routes';
import * as tradeRoutes from './routes/trade.routes';
import * as priceRoutes from './routes/price.routes';
import * as competitionRoutes from './routes/competition.routes';
import * as adminRoutes from './routes/admin.routes';
import * as healthRoutes from './routes/health.routes';
import * as docsRoutes from './routes/docs.routes';

// Create Express app
const app = express();

// Configure middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply rate limiting middleware
app.use(rateLimiterMiddleware);

// Apply authentication middleware to protected routes
const protectedRoutes = ['/api/account', '/api/trade', '/api/competition'];
app.use(protectedRoutes, authMiddleware(services.teamManager, services.competitionManager));

// Apply routes
app.use('/api/auth', authRoutes.default);
app.use('/api/account', accountRoutes.default);
app.use('/api/trade', tradeRoutes.default);
app.use('/api/price', priceRoutes.default);
app.use('/api/competition', competitionRoutes.default);
app.use('/api/admin', adminRoutes.default);
app.use('/api/health', healthRoutes.default);
app.use('/api/docs', docsRoutes.default);

// Legacy health check endpoint for backward compatibility
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Root endpoint redirects to API documentation
app.get('/', (req, res) => {
  res.redirect('/api/docs');
});

// Apply error handler
app.use(errorHandler);

// Start server
const startServer = async () => {
  const PORT = config.server.port;
  let databaseInitialized = false;
  
  try {
    // Initialize database
    console.log('Checking database connection...');
    await initializeDatabase();
    console.log('Database connection and schema verification completed');
    databaseInitialized = true;
    
    // Start snapshot scheduler
    services.scheduler.startSnapshotScheduler();
    console.log('Portfolio snapshot scheduler started');
  } catch (error) {
    console.error('Database initialization error:', error);
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        'WARNING: Starting server without successful database initialization. ' +
        'Some functionality may be limited until database connection is restored.'
      );
    } else {
      console.error('Failed to start server due to database initialization error. Exiting...');
      process.exit(1);
    }
  }
  
  // Start HTTP server
  app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${config.server.nodeEnv}`);
    console.log(`Database: ${databaseInitialized ? 'Connected' : 'Error - Limited functionality'}`);
    console.log(`API documentation: http://localhost:${PORT}/api/docs`);
    console.log(`========================================\n`);
  });
};

// Start the server
startServer();

export default app; 