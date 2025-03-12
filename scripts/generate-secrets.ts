import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Generate a secure random string
 */
function generateSecureSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate a more human-readable admin API key
 */
function generateAdminApiKey(): string {
  return `master_${crypto.randomBytes(16).toString('hex')}`;
}

/**
 * Generate secrets and update .env file
 */
async function generateSecrets(): Promise<void> {
  console.log('Generating secure secrets for your application...');
  
  const rootDir = path.resolve(__dirname, '..');
  const envPath = path.join(rootDir, '.env');
  const envExamplePath = path.join(rootDir, '.env.example');
  
  // Check if .env file exists
  let envContent: string;
  let isNewFile = false;
  
  if (fs.existsSync(envPath)) {
    console.log('Found existing .env file, updating secrets...');
    envContent = fs.readFileSync(envPath, 'utf8');
  } else if (fs.existsSync(envExamplePath)) {
    console.log('No .env file found, creating from .env.example...');
    envContent = fs.readFileSync(envExamplePath, 'utf8');
    isNewFile = true;
  } else {
    console.error('Error: Neither .env nor .env.example files found.');
    process.exit(1);
    return;
  }
  
  // Generate secrets
  const jwtSecret = generateSecureSecret();
  const apiKeySecret = generateSecureSecret();
  const hmacSecret = generateSecureSecret();
  const masterEncryptionKey = generateSecureSecret();
  const adminApiKey = generateAdminApiKey();
  const adminApiSecret = generateSecureSecret();
  
  // Replace placeholder values
  const placeholderPatterns = [
    /JWT_SECRET=.*$/m,
    /API_KEY_SECRET=.*$/m,
    /HMAC_SECRET=.*$/m,
    /MASTER_ENCRYPTION_KEY=.*$/m
  ];
  
  const replacements = [
    `JWT_SECRET=${jwtSecret}`,
    `API_KEY_SECRET=${apiKeySecret}`,
    `HMAC_SECRET=${hmacSecret}`,
    `MASTER_ENCRYPTION_KEY=${masterEncryptionKey}`
  ];
  
  // Only replace if the value looks like a placeholder or if it's a new file
  let newEnvContent = envContent;
  
  placeholderPatterns.forEach((pattern, index) => {
    const match = pattern.exec(newEnvContent);
    
    if (match) {
      const value = match[0].split('=')[1];
      // Check if it's a placeholder or has 'dev' or 'test' in it
      if (isNewFile || 
          value.includes('your_') || 
          value.includes('dev_') || 
          value.includes('test_') ||
          value.includes('replace_in_production') ||
          value === '') {
        newEnvContent = newEnvContent.replace(pattern, replacements[index]);
      }
    } else {
      // The variable doesn't exist in the file, add it
      newEnvContent += `\n${replacements[index]}`;
    }
  });
  
  // Write updated content back to .env file
  fs.writeFileSync(envPath, newEnvContent);
  
  console.log('Secrets generated and updated in .env file:');
  console.log('----------------------------------------');
  console.log(`JWT_SECRET=${jwtSecret}`);
  console.log(`API_KEY_SECRET=${apiKeySecret}`);
  console.log(`HMAC_SECRET=${hmacSecret}`);
  console.log(`MASTER_ENCRYPTION_KEY=${masterEncryptionKey}`);
  console.log('----------------------------------------');
  console.log('These values have been written to your .env file.');
  
  if (isNewFile) {
    console.log('A new .env file was created. Please review it and adjust other settings as needed.');
  }
  
  // Output admin setup information
  console.log('\nAdmin Setup Information:');
  console.log('----------------------------------------');
  console.log('To set up your admin account, make a POST request to /api/admin/setup with:');
  console.log(JSON.stringify({
    username: "admin",
    password: "<your-strong-password>",
    email: "admin@example.com"
  }, null, 2));
  console.log('\nAlternatively, you can use these generated credentials for API access:');
  console.log(`API Key: ${adminApiKey}`);
  console.log(`API Secret: ${adminApiSecret}`);
  console.log('----------------------------------------');
  console.log('\nIMPORTANT: Store these admin credentials securely. This is the only time they will be displayed.');
  console.log('Once you have your admin account set up, you can use it to register teams and manage competitions.');
}

// Run the script
generateSecrets()
  .then(() => {
    console.log('\nSecret generation completed successfully.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error generating secrets:', err);
    process.exit(1);
  }); 