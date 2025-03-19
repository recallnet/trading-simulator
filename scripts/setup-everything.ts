import { spawn, exec } from 'child_process';
import * as readline from 'readline';
import * as os from 'os';

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

async function setupEverything() {
  try {
    console.log('=============================================================');
    console.log('Starting complete setup of the Solana Trading Simulator Server');
    console.log('=============================================================\n');

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
      await runCommand('npm', ['run', 'setup:admin']);
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
    console.log('\nTo start the server, run:');
    console.log('  npm run start\n');
    console.log('You can now access the API at: http://localhost:3000');
    console.log('=============================================================\n');
    
  } catch (error) {
    console.error('Error during setup:', error);
    process.exit(1);
  }
}

// Run the setup
setupEverything().catch(console.error); 