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
  // Format: ts_live_[hexstring]_[hexstring]
  const segment1 = crypto.randomBytes(8).toString('hex');  // 16 chars
  const segment2 = crypto.randomBytes(8).toString('hex');  // 16 chars
  return `ts_live_${segment1}_${segment2}`;
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
  const masterEncryptionKey = generateSecureSecret();
  const adminApiKey = generateAdminApiKey();
  
  // Replace placeholder values
  const placeholderPatterns = [
    /MASTER_ENCRYPTION_KEY=.*$/m
  ];
  
  const replacements = [
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
  
  // Remove deprecated secrets
  if (!isNewFile) {
    const deprecatedVars = [
      'JWT_SECRET=',
      'API_KEY_SECRET=',
      'HMAC_SECRET='
    ];
    
    for (const varName of deprecatedVars) {
      const regex = new RegExp(`\\n${varName}.*`, 'g');
      newEnvContent = newEnvContent.replace(regex, '');
    }
  }
  
  // Write updated content back to .env file
  fs.writeFileSync(envPath, newEnvContent);
  
  console.log('Secrets generated and updated in .env file:');
  console.log('----------------------------------------');
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
  console.log('\nAlternatively, you can use this generated API key for admin API access:');
  console.log(`Admin API Key: ${adminApiKey}`);
  console.log('----------------------------------------');
  console.log('\nIMPORTANT: Store this admin API key securely. This is the only time it will be displayed.');
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