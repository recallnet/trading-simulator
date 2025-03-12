// This file will be run once after all tests complete
const { services } = require('../../src/services');
const { DatabaseConnection } = require('../../src/database/connection');

module.exports = async () => {
  console.log('Global teardown - cleaning up test environment');
  
  try {
    // Stop all schedulers
    if (services && services.scheduler) {
      console.log('Global teardown - stopping scheduler');
      services.scheduler.stopSnapshotScheduler();
    }
    
    // Close database connections
    try {
      console.log('Global teardown - closing database connections');
      const dbConnection = DatabaseConnection.getInstance();
      await dbConnection.close();
    } catch (dbError) {
      console.error('Error closing database connection:', dbError);
    }
    
    // Wait a bit for resources to clean up
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('Global teardown - cleanup complete');
  } catch (error) {
    console.error('Error during global teardown:', error);
  }
  
  // Force exit after a delay as a final safety measure
  setTimeout(() => {
    console.log('Global teardown - forcing process exit');
    process.exit(0);
  }, 2000);
}; 