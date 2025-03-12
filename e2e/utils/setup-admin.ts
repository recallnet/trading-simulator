import * as dotenv from 'dotenv';
import * as path from 'path';
import axios from 'axios';
import { getBaseUrl } from './server';

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

// Admin credentials for testing
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';
const ADMIN_EMAIL = 'admin@test.com';

async function setupAdminAccount() {
  console.log('Setting up admin account for testing...');
  
  try {
    // First, clean up any existing admin accounts by truncating the teams table
    // This ensures we can always create a fresh admin account
    const { Pool } = require('pg');
    const pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'solana_trading_simulator_test',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });
    
    console.log('Cleaning up existing teams/admin accounts...');
    await pool.query('TRUNCATE teams CASCADE');
    await pool.end();
    
    // Use the admin setup endpoint to create a new admin account
    const baseUrl = getBaseUrl();
    console.log(`Using API at ${baseUrl} to create admin account...`);
    
    const response = await axios.post(`${baseUrl}/api/admin/setup`, {
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD,
      email: ADMIN_EMAIL
    });
    
    if (response.data.success) {
      console.log('Admin account created successfully via API');
      console.log(`Username: ${ADMIN_USERNAME}`);
      console.log(`Password: ${ADMIN_PASSWORD}`);
      console.log(`Admin ID: ${response.data.admin.id}`);
    } else {
      throw new Error(`Failed to create admin account: ${response.data.error || 'Unknown error'}`);
    }

    console.log('Admin setup completed successfully');
  } catch (error) {
    console.error('Error setting up admin account:', error);
    process.exit(1);
  }
}

// Run the setup
setupAdminAccount()
  .then(() => {
    console.log('Admin account setup completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to set up admin account:', error);
    process.exit(1);
  }); 