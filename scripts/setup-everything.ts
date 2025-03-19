import { spawn, exec } from 'child_process';
import * as readline from 'readline';
import * as os from 'os';
import * as crypto from 'crypto';

// Helper function to execute shell commands
function executeCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing command: ${command}`);
        console.error(stderr);
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
}

// Helper function to run a command and stream the output
function runCommand(command: string, args: string[]): Promise<number> {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command} ${args.join(' ')}`);
    
    const childProcess = spawn(command, args, {
      stdio: 'inherit',
      shell: os.platform() === 'win32' // Use shell on Windows
    });
    
    childProcess.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command "${command} ${args.join(' ')}" failed with exit code ${code}`));
      }
    });
    
    childProcess.on('error', (err) => {
      reject(err);
    });
  });
}

// Helper function to prompt for user input
function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Helper function to generate a random secure password
function generateRandomPassword(length: number = 16): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(crypto.randomBytes(1)[0] / 255 * charset.length);
    password += charset[randomIndex];
  }
  
  return password;
}

async function setupEverything() {
  try {
    console.log('=============================================================');
    console.log('Starting complete setup of the Trading Simulator Server');
    console.log('=============================================================\n');
    
    // Create readline interface for user input
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    // Collect admin credentials at the beginning
    console.log('\n📝 Admin Account Setup Information');
    console.log('=============================================================');
    console.log('These credentials will be used to access the admin dashboard.');
    
    let adminUsername = await prompt(rl, 'Enter admin username (default: admin): ');
    adminUsername = adminUsername || 'admin';
    
    let adminEmail = await prompt(rl, 'Enter admin email (default: admin@example.com): ');
    adminEmail = adminEmail || 'admin@example.com';
    
    const useGeneratedPassword = await prompt(rl, 'Generate a secure random password? (y/n, default: y): ');
    let adminPassword = '';
    
    if (useGeneratedPassword.toLowerCase() !== 'n') {
      adminPassword = generateRandomPassword();
      console.log(`Generated password: ${adminPassword}`);
    } else {
      adminPassword = await prompt(rl, 'Enter admin password: ');
      if (!adminPassword) {
        console.log('Password cannot be empty. Using a generated password instead.');
        adminPassword = generateRandomPassword();
        console.log(`Generated password: ${adminPassword}`);
      }
    }
    
    console.log('\nAdmin account will be created with:');
    console.log(`Username: ${adminUsername}`);
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    
    const confirmSetup = await prompt(rl, '\nContinue with setup? (y/n, default: y): ');
    if (confirmSetup.toLowerCase() === 'n') {
      console.log('Setup cancelled.');
      rl.close();
      return;
    }
    
    // Close readline as we don't need it anymore for the automated steps
    rl.close();

    // Step 1: Generate secrets
    console.log('\n📦 STEP 1: Generating secrets...');
    await runCommand('npm', ['run', 'generate:secrets']);
    
    // Step 2: Initialize database
    console.log('\n📦 STEP 2: Initializing database...');
    await runCommand('npm', ['run', 'db:init']);
    
    // Step 3: Run database migrations
    console.log('\n📦 STEP 3: Running database migrations...');
    await runCommand('npm', ['run', 'db:migrate']);
    
    // Step 4: Build the application
    console.log('\n📦 STEP 4: Building the application...');
    await runCommand('npm', ['run', 'build']);
    
    // Step 5: Start the server temporarily
    console.log('\n📦 STEP 5: Starting server temporarily for admin setup...');
    
    const server = spawn('npm', ['run', 'start'], {
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    // Store server PID for later termination
    const serverPid = server.pid;
    if (!serverPid) {
      throw new Error('Failed to get server process ID');
    }
    
    let serverOutput = '';
    if (server.stdout) {
      server.stdout.on('data', (data) => {
        const output = data.toString();
        process.stdout.write(output);
        serverOutput += output;
      });
    }
    
    if (server.stderr) {
      server.stderr.on('data', (data) => {
        process.stderr.write(data.toString());
      });
    }
    
    // Give the server some time to start
    console.log('Waiting for server to start...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check if the server started successfully
    if (!serverOutput.includes('Server is running') && !serverOutput.includes('listening')) {
      throw new Error('Server failed to start properly');
    }
    
    // Step 6: Setup admin account
    console.log('\n📦 STEP 6: Setting up admin account...');
    
    try {
      // Pass the collected admin credentials as command line arguments
      await runCommand('npm', ['run', 'setup:admin', '--', adminUsername, adminPassword, adminEmail]);
    } catch (error) {
      console.error('Error setting up admin account:', error);
      console.log('Continuing with setup process...');
    }
    
    // Step 7: Stop the temporary server
    console.log('\n📦 STEP 7: Stopping temporary server...');
    if (process.platform === 'win32') {
      try {
        await executeCommand(`taskkill /F /T /PID ${serverPid}`);
      } catch (error) {
        console.error('Error stopping the server:', error);
      }
    } else {
      process.kill(-serverPid, 'SIGINT');
    }
    
    // Final instructions
    console.log('\n=============================================================');
    console.log('🎉 SETUP COMPLETE!');
    console.log('=============================================================\n');
    console.log('Your Trading Simulator Server is now set up and ready to use.');
    console.log('\nAdmin Credentials - SAVE THESE:');
    console.log('----------------------------------------');
    console.log(`Username: ${adminUsername}`);
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log('----------------------------------------\n');
    console.log('To start the server, run:');
    console.log('  npm run start\n');
    console.log('You can then access the API at: http://localhost:3000');
    console.log('=============================================================\n');
    
  } catch (error) {
    console.error('Error during setup:', error);
    process.exit(1);
  }
}

// Run the setup
setupEverything().catch(console.error); 