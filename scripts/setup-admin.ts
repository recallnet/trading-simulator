import axios from 'axios';
import * as readline from 'readline';
import * as crypto from 'crypto';
import { config } from '../src/config';

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

// Password prompt function (doesn't show characters)
async function promptPassword(question: string): Promise<string> {
  process.stdout.write(question);
  const password = await new Promise<string>((resolve) => {
    let input = '';
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', (key) => {
      const byteArray = [...key];
      
      // If user presses Ctrl+C, exit
      if (byteArray.length === 1 && byteArray[0] === 3) {
        console.log('\nSetup cancelled.');
        process.exit(1);
      } 
      
      // If user presses Enter, we're done
      if (byteArray.length === 1 && byteArray[0] === 13) {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        console.log('');  // new line after password
        resolve(input);
        return;
      }
      
      // If user presses backspace, remove last character
      if (byteArray.length === 1 && (byteArray[0] === 8 || byteArray[0] === 127)) {
        if (input.length > 0) {
          input = input.slice(0, -1);
          process.stdout.write('\b \b');  // erase last character
        }
        return;
      }
      
      // Otherwise, add character to password and show *
      const char = key.toString();
      input += char;
      process.stdout.write('*');
    });
  });
  
  return password;
}

// Generate a random password if none is provided
function generateRandomPassword(length: number = 12): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(crypto.randomBytes(1)[0] / 255 * charset.length);
    password += charset[randomIndex];
  }
  
  return password;
}

async function setupAdmin() {
  try {
    console.log('Setting up admin account...');
    
    // Get admin details from command line arguments or prompt for them
    let username = process.argv[2];
    let password = process.argv[3];
    let email = process.argv[4];
    
    if (!username) {
      username = await prompt('Enter admin username (default: admin): ');
      username = username || 'admin';
    }
    
    if (!password) {
      const useGenerated = await prompt('Generate random password? (y/n, default: y): ');
      
      if (useGenerated.toLowerCase() !== 'n') {
        password = generateRandomPassword();
        console.log(`Generated password: ${password}`);
      } else {
        password = await promptPassword('Enter admin password: ');
        const confirmPassword = await promptPassword('Confirm admin password: ');
        
        if (password !== confirmPassword) {
          console.error('Passwords do not match. Please try again.');
          rl.close();
          return;
        }
      }
    }
    
    if (!email) {
      email = await prompt('Enter admin email (default: admin@example.com): ');
      email = email || 'admin@example.com';
    }
    
    // Use the admin setup endpoint to create a new admin account
    const port = config.server.port || 3000;
    const baseUrl = `http://localhost:${port}`;
    
    console.log(`Attempting to connect to server at ${baseUrl}...`);
    
    // Wait for server to be available (maximum 30 seconds)
    let serverAvailable = false;
    for (let i = 0; i < 30; i++) {
      try {
        await axios.get(`${baseUrl}/api/health`);
        serverAvailable = true;
        break;
      } catch (error) {
        process.stdout.write('.');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    if (!serverAvailable) {
      console.error('\nCould not connect to server after 30 seconds. Please ensure the server is running and try again.');
      rl.close();
      return;
    }
    
    console.log('\nServer is up! Creating admin account...');
    
    await axios.post(`${baseUrl}/api/admin/setup`, {
      username,
      password,
      email
    });
    
    console.log('\nAdmin account created successfully!');
    console.log('----------------------------------------');
    console.log('Username:', username);
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('----------------------------------------');
    console.log('\nYou can now log in with these credentials to manage the trading simulator.');
    
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error(`\nError setting up admin account: ${error.response.data.message || error.response.data.error || error.message}`);
      
      if (error.response.status === 403 && error.response.data.message?.includes('admin account already exists')) {
        console.log('\nAn admin account already exists. You can use the existing admin account to manage the trading simulator.');
      }
    } else {
      console.error('\nError setting up admin account:', error);
    }
  } finally {
    rl.close();
  }
}

// Run the setup function
setupAdmin(); 