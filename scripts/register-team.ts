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

// Prompt function that returns a promise
function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Colors for console output
const colors = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

/**
 * Register a new team using the TeamManager service
 */
async function registerTeam() {
  try {
    console.log(`${colors.cyan}╔════════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║                        REGISTER NEW TEAM                       ║${colors.reset}`);
    console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════════╝${colors.reset}`);
    
    console.log(`\nThis script will register a new team in the Trading Simulator.`);
    console.log(`You'll need to provide the team name, email, and contact person.\n`);
    
    // Get team details from command line arguments or prompt for them
    let teamName = process.argv[2];
    let email = process.argv[3];
    let contactPerson = process.argv[4];
    
    if (!teamName) {
      teamName = await prompt('Enter team name: ');
      if (!teamName) {
        throw new Error('Team name is required');
      }
    }
    
    if (!email) {
      email = await prompt('Enter team email: ');
      if (!email) {
        throw new Error('Team email is required');
      }
    }
    
    if (!contactPerson) {
      contactPerson = await prompt('Enter contact person name: ');
      if (!contactPerson) {
        throw new Error('Contact person is required');
      }
    }
    
    console.log(`\n${colors.yellow}Registering team with the following details:${colors.reset}`);
    console.log(`- Team Name: ${teamName}`);
    console.log(`- Email: ${email}`);
    console.log(`- Contact Person: ${contactPerson}`);
    
    const confirmRegistration = await prompt(`\n${colors.yellow}Proceed with registration? (y/n):${colors.reset} `);
    
    if (confirmRegistration.toLowerCase() !== 'y') {
      console.log(`\n${colors.red}Registration cancelled.${colors.reset}`);
      rl.close();
      return;
    }
    
    console.log(`\n${colors.blue}Registering team...${colors.reset}`);
    
    // Register the team
    const team = await services.teamManager.registerTeam(teamName, email, contactPerson);
    
    console.log(`\n${colors.green}✓ Team registered successfully!${colors.reset}`);
    console.log(`\n${colors.cyan}Team Details:${colors.reset}`);
    console.log(`${colors.cyan}----------------------------------------${colors.reset}`);
    console.log(`Team ID: ${team.id}`);
    console.log(`Team Name: ${team.name}`);
    console.log(`Email: ${team.email}`);
    console.log(`Contact: ${team.contactPerson}`);
    console.log(`${colors.cyan}----------------------------------------${colors.reset}`);
    
    console.log(`\n${colors.yellow}API Credentials (SAVE THESE SECURELY):${colors.reset}`);
    console.log(`${colors.yellow}----------------------------------------${colors.reset}`);
    console.log(`API Key: ${team.apiKey}`);
    console.log(`API Secret: ${team.apiSecret}`);
    console.log(`${colors.yellow}----------------------------------------${colors.reset}`);
    
    console.log(`\n${colors.red}IMPORTANT: The API Secret will only be shown once.${colors.reset}`);
    console.log(`Make sure to securely store these credentials.`);
    
  } catch (error) {
    console.error(`\n${colors.red}Error registering team:${colors.reset}`, error instanceof Error ? error.message : error);
  } finally {
    rl.close();
    
    // Close database connection
    await DatabaseConnection.getInstance().close();
    
    // Exit the process after clean closure
    process.exit(0);
  }
}

// Run the registration function
registerTeam(); 