/**
 * Global teardown script for end-to-end tests
 * 
 * This file is automatically run by Jest after all tests
 */

import { closeDb } from './utils/database';
import { killExistingServers } from './utils/server';
import { SchedulerService } from '../src/services/scheduler.service';
import { services } from '../src/services';
import { DatabaseConnection } from '../src/database/connection';

// Teardown function to run after all tests
export default async function() {
  console.log('🔄 Global Teardown - Cleaning up all resources...');
  
  try {
    // First, stop the scheduler service if running
    if (services.scheduler) {
      console.log('🛑 Global Teardown - Stopping scheduler service...');
      services.scheduler.stopSnapshotScheduler();
    }
    
    // Clear all scheduler timers as a safety measure
    console.log('🕒 Global Teardown - Clearing all scheduler timers...');
    SchedulerService.clearAllTimers();
    
    // Kill any remaining server processes
    console.log('🛑 Global Teardown - Killing server processes...');
    await killExistingServers();
    
    // Close database connection 
    try {
      console.log('🔌 Global Teardown - Closing database connection...');
      
      // Try getting the instance first
      const dbConnection = DatabaseConnection.getInstance();
      await dbConnection.close();
      
      // Also close through the utility
      await closeDb();
    } catch (dbError) {
      console.error('❌ Global Teardown - Database connection error:', dbError);
    }
    
    // Add a small delay to allow any pending operations to complete
    console.log('⏱️ Global Teardown - Waiting for pending operations...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('✅ Global Teardown - Test environment cleaned up');
    
    // For absolute certainty all async operations are done,
    // attempt to close all active timers
    try {
      // NodeJS internals: this is safe but not officially supported
      // @ts-ignore -- Using Node.js internal API
      const activeHandles = process._getActiveHandles ? process._getActiveHandles() : [];
      
      if (activeHandles && activeHandles.length > 0) {
        console.log(`🧹 Global Teardown - Found ${activeHandles.length} active handles, attempting to clear...`);
        
        // Try to close database handles and sockets
        for (const handle of activeHandles) {
          if (handle && typeof (handle as any).close === 'function') {
            try { 
              (handle as any).close();
            } catch (err) {
              // Ignore errors during cleanup
            }
          }
        }
      }
    } catch (handleError) {
      // Ignore errors when trying to access internal Node.js APIs
      console.log('Note: Unable to access Node.js internal handles');
    }
  } catch (error) {
    console.error('❌ Global Teardown - Failed to clean up test environment:', error);
    
    // As a last resort, try to kill any server processes
    try {
      await killExistingServers();
    } catch (secondError) {
      console.error('❌ Global Teardown - Failed to kill server processes:', secondError);
    }
  }
} 