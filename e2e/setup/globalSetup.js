// This file will be run once before all tests
module.exports = async () => {
  console.log('Global setup - starting test environment');
  
  // Set a flag in global scope to indicate we're in test mode
  global.__TEST_ENV__ = true;
  
  // Set test mode for scheduler (will be checked in scheduler service)
  process.env.TEST_MODE = 'true';
}; 