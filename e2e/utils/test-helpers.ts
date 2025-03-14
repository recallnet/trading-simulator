import { ApiClient } from './api-client';
import { dbManager } from './db-manager';

// Configured test token address
export const TEST_TOKEN_ADDRESS = process.env.TEST_SOL_TOKEN_ADDRESS || '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R';

// Fixed admin credentials - must match setup-admin.ts
export const ADMIN_USERNAME = 'admin';
export const ADMIN_PASSWORD = 'admin123';
export const ADMIN_EMAIL = 'admin@test.com';

// Flag to track if database is initialized
let isDatabaseInitialized = false;

/**
 * Create a new API client for testing with random credentials
 * This is useful for creating a client that doesn't have predefined API credentials
 */
export function createTestClient(baseUrl?: string): ApiClient {
  const randomKey = `sk_test_${generateRandomString(32)}`;
  const randomSecret = generateRandomString(64);
  return new ApiClient(randomKey, randomSecret, baseUrl);
}

/**
 * Create and setup an admin API client
 */
export async function setupAdminClient(): Promise<ApiClient> {
  // Ensure database is initialized using DbManager
  await ensureDatabaseInitialized();
  
  const client = createTestClient();
  
  // Use fixed admin credentials that match setup-admin.ts
  const username = ADMIN_USERNAME;
  const password = ADMIN_PASSWORD;
  
  // Login as admin
  const loginSuccess = await client.loginAsAdmin(username, password);
  if (!loginSuccess) {
    throw new Error(`Failed to login as admin with username: ${username}`);
  }
  
  return client;
}

/**
 * Register a new team and return a client configured with its API credentials
 */
export async function registerTeamAndGetClient(
  adminClient: ApiClient, 
  teamName?: string, 
  email?: string, 
  contactPerson?: string
): Promise<{ client: ApiClient; team: any; apiKey: string }> {
  // Ensure database is initialized
  await ensureDatabaseInitialized();
  
  // Register a new team
  const result = await adminClient.registerTeam(
    teamName || `Team ${generateRandomString(8)}`,
    email || `team-${generateRandomString(8)}@test.com`,
    contactPerson || `Contact ${generateRandomString(8)}`
  );
  
  if (!result.success || !result.team) {
    throw new Error('Failed to register team');
  }
  
  // Create a client with the team's API credentials
  const client = new ApiClient(result.team.apiKey, result.team.apiSecret);
  
  return { client, team: result.team, apiKey: result.team.apiKey };
}

/**
 * Start a competition with given teams
 */
export async function startTestCompetition(
  adminClient: ApiClient, 
  name: string, 
  teamIds: string[]
): Promise<any> {
  // Ensure database is initialized
  await ensureDatabaseInitialized();
  
  const result = await adminClient.startCompetition(
    name, 
    `Test competition description for ${name}`, 
    teamIds
  );
  
  if (!result.success) {
    throw new Error('Failed to start competition');
  }
  
  return result;
}

/**
 * Ensure the database is initialized before using it
 */
async function ensureDatabaseInitialized(): Promise<void> {
  if (!isDatabaseInitialized) {
    console.log('Initializing database for tests...');
    await dbManager.initialize();
    isDatabaseInitialized = true;
  }
}

/**
 * Clean up database state for a given test case
 * This can be used in beforeEach to ensure a clean state
 * Now delegated to the DbManager for consistency
 */
export async function cleanupTestState(): Promise<void> {
  await ensureDatabaseInitialized();
  return dbManager.cleanupTestState();
}

/**
 * Wait for a specified amount of time (useful for testing async processes)
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate a random string of specified length
 */
export function generateRandomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
} 