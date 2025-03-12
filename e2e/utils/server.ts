import { Server } from 'http';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import axios from 'axios';

// Reference to the server process
let serverProcess: ChildProcess | null = null;
let server: Server | null = null;

// Server configuration
const PORT = process.env.TEST_PORT || '3001';
const BASE_URL = `http://localhost:${PORT}`;

/**
 * Start the server for testing
 * 
 * @returns A promise that resolves to the HTTP server instance
 */
export async function startServer(): Promise<Server> {
  // First try to kill any existing servers on the test port
  await killExistingServers();
  
  return new Promise((resolve, reject) => {
    try {
      const testPort = process.env.TEST_PORT || '3001';
      
      // Start the server script in a separate process
      // Use the index.ts file which is the main entry point
      serverProcess = spawn('npx', ['ts-node', 'src/index.ts'], {
        env: {
          ...process.env,
          NODE_ENV: 'test',
          PORT: testPort
        },
        stdio: 'inherit',
        detached: true
      });
      
      // Create a mock server object that we can use to track and shut down the server
      const mockServer = {
        close: (callback: () => void) => {
          try {
            // Kill the server process
            if (serverProcess && serverProcess.pid) {
              process.kill(-serverProcess.pid);
            }
            callback();
          } catch (error) {
            console.error('Error shutting down server:', error);
            callback();
          }
        }
      } as unknown as Server;
      
      // Handle server process errors
      serverProcess.on('error', (error) => {
        console.error('Server process error:', error);
        reject(error);
      });
      
      // Give the server some time to start up
      setTimeout(() => {
        console.log(`Server started on port ${testPort}`);
        resolve(mockServer);
      }, 2000);
    } catch (error) {
      console.error('Failed to start server:', error);
      reject(error);
    }
  });
}

/**
 * Stop the server
 * 
 * @param server The HTTP server instance to stop
 */
export async function stopServer(server: Server): Promise<void> {
  return new Promise((resolve) => {
    try {
      console.log('Stopping server...');
      
      // Kill the server process if it exists
      if (serverProcess && serverProcess.pid) {
        try {
          console.log(`Killing server process with PID: ${serverProcess.pid}`);
          // Use negative PID to kill the entire process group since we used detached: true
          process.kill(-serverProcess.pid, 'SIGTERM');
          serverProcess = null;
        } catch (error) {
          console.error('Error killing server process:', error);
        }
      }
      
      // Close the server
      server.close(() => {
        console.log('Server stopped');
        resolve();
      });
    } catch (error) {
      console.error('Error in stopServer:', error);
      resolve(); // Resolve anyway to avoid hanging promises
    }
  });
}

/**
 * Kill any existing server processes running on the test port
 * This is a safety measure to ensure no orphaned processes remain
 */
export async function killExistingServers(): Promise<void> {
  return new Promise<void>((resolve) => {
    try {
      const testPort = process.env.TEST_PORT || '3001';
      console.log(`Checking for existing servers on port ${testPort}...`);
      
      // Platform-specific command to find and kill processes using the test port
      let command: string;
      let args: string[];
      
      if (process.platform === 'win32') {
        // Windows
        command = 'cmd.exe';
        args = ['/c', `for /f "tokens=5" %a in ('netstat -ano ^| findstr :${testPort}') do taskkill /F /PID %a`];
      } else {
        // Unix-like (macOS, Linux)
        command = 'bash';
        args = ['-c', `lsof -i:${testPort} -t | xargs -r kill -9`];
      }
      
      const killProcess = spawn(command, args, { stdio: 'pipe' });
      
      killProcess.on('close', (code) => {
        if (code !== 0) {
          console.log('No existing server processes found or unable to kill them.');
        } else {
          console.log('Successfully killed existing server processes.');
        }
        resolve();
      });
    } catch (error) {
      console.error('Error killing existing servers:', error);
      resolve(); // Resolve anyway to avoid hanging
    }
  });
}

/**
 * Wait for the server to be ready by polling the health endpoint
 */
async function waitForServerReady(maxRetries = 10, interval = 500): Promise<void> {
  console.log('⏳ Waiting for server to be ready...');
  
  let retries = 0;
  while (retries < maxRetries) {
    try {
      // Try to reach the health endpoint
      const response = await axios.get(`${BASE_URL}/health`);
      if (response.status === 200) {
        console.log('✅ Server is ready');
        return;
      }
    } catch (error) {
      // Server not ready yet, retry after interval
      await new Promise(resolve => setTimeout(resolve, interval));
      retries++;
    }
  }
  
  throw new Error(`Server failed to start after ${maxRetries} retries`);
}

/**
 * Get the base URL for the test server
 */
export function getBaseUrl(): string {
  return BASE_URL;
} 