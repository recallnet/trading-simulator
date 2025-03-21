/**
 * Team Registration Script
 * 
 * This script registers a new team in the Trading Simulator.
 * It connects directly to the database and does NOT require the server to be running.
 * 
 * Usage:
 *   npm run register:team
 *   
 * Or with command line arguments:
 *   npm run register:team -- "Team Name" "team@email.com" "Contact Person"
 * 
 * The script will:
 * 1. Connect to the database
 * 2. Create a new team with API credentials
 * 3. Display the API key and secret (which is only shown ONCE)
 * 4. Close the database connection
 */
import * as readline from 'readline';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { services } from '../src/services';
import { DatabaseConnection } from '../src/database';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Create readline interface for prompting user
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Colors for console output
const colors = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m'
};

// Prompt function that returns a promise
function prompt(question: string): Promise<string> {
  // Add some visual highlighting to make the prompt stand out
  const highlightedQuestion = `\n${colors.cyan}>> ${question}${colors.reset}`;
  return new Promise((resolve) => {
    rl.question(highlightedQuestion, (answer) => {
      resolve(answer);
    });
  });
}

// Safe console log that won't be overridden
function safeLog(...args: any[]) {
  originalConsoleLog.apply(console, args);
}

// Store original console.log
const originalConsoleLog = console.log;

/**
 * Register a new team using the TeamManager service
 */
async function registerTeam() {
  try {
    // Banner with clear visual separation
    safeLog('\n\n');
    safeLog(`${colors.magenta}╔════════════════════════════════════════════════════════════════╗${colors.reset}`);
    safeLog(`${colors.magenta}║                        REGISTER NEW TEAM                       ║${colors.reset}`);
    safeLog(`${colors.magenta}╚════════════════════════════════════════════════════════════════╝${colors.reset}`);
    
    safeLog(`\n${colors.cyan}This script will register a new team in the Trading Simulator.${colors.reset}`);
    safeLog(`${colors.cyan}You'll need to provide the team name, email, and contact person.${colors.reset}`);
    safeLog(`${colors.yellow}--------------------------------------------------------------${colors.reset}\n`);
    
    // Get team details from command line arguments or prompt for them
    let teamName = process.argv[2];
    let email = process.argv[3];
    let contactPerson = process.argv[4];
    
    // Temporarily restore console.log for input
    console.log = originalConsoleLog;
    
    // Collect all input upfront before database operations
    if (!teamName) {
      teamName = await prompt('Enter team name:');
      if (!teamName) {
        throw new Error('Team name is required');
      }
    }
    
    if (!email) {
      email = await prompt('Enter team email:');
      if (!email) {
        throw new Error('Team email is required');
      }
    }
    
    if (!contactPerson) {
      contactPerson = await prompt('Enter contact person name:');
      if (!contactPerson) {
        throw new Error('Contact person is required');
      }
    }
    
    safeLog(`\n${colors.yellow}Registering team with the following details:${colors.reset}`);
    safeLog(`- Team Name: ${teamName}`);
    safeLog(`- Email: ${email}`);
    safeLog(`- Contact Person: ${contactPerson}`);
    
    const confirmRegistration = await prompt(`${colors.yellow}Proceed with registration? (y/n):${colors.reset}`);
    
    if (confirmRegistration.toLowerCase() !== 'y') {
      safeLog(`\n${colors.red}Registration cancelled.${colors.reset}`);
      return;
    }
    
    // Apply the quieter console.log during database operations
    console.log = function(...args) {
      // Only log critical errors, or explicit service messages
      if (typeof args[0] === 'string' && args[0].includes('Error')) {
        originalConsoleLog.apply(console, args);
      }
    };
    
    safeLog(`\n${colors.blue}Registering team...${colors.reset}`);
    
    // Register the team
    const team = await services.teamManager.registerTeam(teamName, email, contactPerson);
    
    safeLog(`\n${colors.green}✓ Team registered successfully!${colors.reset}`);
    safeLog(`\n${colors.cyan}Team Details:${colors.reset}`);
    safeLog(`${colors.cyan}----------------------------------------${colors.reset}`);
    safeLog(`Team ID: ${team.id}`);
    safeLog(`Team Name: ${team.name}`);
    safeLog(`Email: ${team.email}`);
    safeLog(`Contact: ${team.contactPerson}`);
    safeLog(`${colors.cyan}----------------------------------------${colors.reset}`);
    
    // Get API secret from the extended team object
    const apiSecret = (team as any).apiSecret;
    
    safeLog(`\n${colors.yellow}API Credentials (SAVE THESE SECURELY):${colors.reset}`);
    safeLog(`${colors.yellow}----------------------------------------${colors.reset}`);
    safeLog(`API Key: ${team.apiKey}`);
    safeLog(`API Secret: ${apiSecret}`);
    safeLog(`${colors.yellow}----------------------------------------${colors.reset}`);
    
    safeLog(`\n${colors.red}IMPORTANT: The API Secret will only be shown once when the team is first created.${colors.reset}`);
    safeLog(`Make sure to securely store these credentials.`);
    
  } catch (error) {
    safeLog(`\n${colors.red}Error registering team:${colors.reset}`, error instanceof Error ? error.message : error);
  } finally {
    rl.close();
    
    // Restore original console.log before closing
    console.log = originalConsoleLog;
    
    // Close database connection
    try {
      await DatabaseConnection.getInstance().close();
      safeLog('Database connection closed.');
    } catch (err) {
      safeLog('Error closing database connection:', err);
    }
    
    // Exit the process after clean closure
    process.exit(0);
  }
}

// Run the registration function
registerTeam(); 