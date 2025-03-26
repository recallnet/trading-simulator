# Authentication Simplification Implementation Plan

## Overview

This document outlines the plan to simplify the authentication system in the Trading Simulator application by replacing the current API key + HMAC signature approach with a single encrypted API key approach, similar to OpenAI, Anthropic, and other modern API providers.

## Current Architecture

The current authentication system:
- Uses an API key to identify the team
- Requires HMAC signatures calculated from request details (method, path, timestamp, body)
- Stores encrypted API secrets in the database
- Requires multiple headers (X-API-Key, X-Timestamp, X-Signature)
- Has complex validation logic in both server and client

## Target Architecture

The new authentication system will:
- Use a single, longer API key for both identification and authentication
- Store the API key encrypted in the database
- Remove the need for signatures, timestamps, and complex crypto
- Require only one header (Authorization: Bearer {api_key} or X-API-Key)
- Simplify both server and client implementations

## Implementation Steps

### 1. Database Changes

Modify the `teams` table to remove the unused column:

```sql
-- SQL migration to remove api_secret_encrypted column
ALTER TABLE teams DROP COLUMN api_secret_encrypted;
```

The `api_key` field will now store the encrypted API key.

### 2. TeamManager Service Updates

1. **Modify `generateApiKey()`**:
   ```typescript
   private generateApiKey(): string {
     // Generate multiple random segments for a longer key (48 bytes total)
     const segment1 = crypto.randomBytes(12).toString('hex');  // 24 chars
     const segment2 = crypto.randomBytes(12).toString('hex');  // 24 chars
     const segment3 = crypto.randomBytes(12).toString('hex');  // 24 chars
     const segment4 = crypto.randomBytes(12).toString('hex');  // 24 chars
     
     // Combine with a prefix and separator underscore for readability
     return `ts_live_${segment1}_${segment2}_${segment3}_${segment4}`;
   }
   ```

2. **Encrypt and decrypt API keys**:
   ```typescript
   /**
    * Encrypt an API key for database storage
    * @param key The API key to encrypt
    * @returns The encrypted key
    */
   private encryptApiKey(key: string): string {
     try {
       const algorithm = 'aes-256-cbc';
       const iv = crypto.randomBytes(16);
       
       // Create a consistently-sized key from the master encryption key
       const cryptoKey = crypto.createHash('sha256')
         .update(String(config.security.masterEncryptionKey))
         .digest();
       
       const cipher = crypto.createCipheriv(algorithm, cryptoKey, iv);
       let encrypted = cipher.update(key, 'utf8', 'hex');
       encrypted += cipher.final('hex');
       
       // Return the IV and encrypted data together, clearly separated
       return `${iv.toString('hex')}:${encrypted}`;
     } catch (error) {
       console.error('[TeamManager] Error encrypting API key:', error);
       throw new Error('Failed to encrypt API key');
     }
   }

   /**
    * Decrypt an encrypted API key
    * @param encryptedKey The encrypted API key
    * @returns The original API key
    */
   private decryptApiKey(encryptedKey: string): string {
     try {
       const algorithm = 'aes-256-cbc';
       const parts = encryptedKey.split(':');
       
       if (parts.length !== 2) {
         throw new Error('Invalid encrypted key format');
       }
       
       const iv = Buffer.from(parts[0], 'hex');
       const encrypted = parts[1];
       
       // Create a consistently-sized key from the master encryption key
       const cryptoKey = crypto.createHash('sha256')
         .update(String(config.security.masterEncryptionKey))
         .digest();
       
       const decipher = crypto.createDecipheriv(algorithm, cryptoKey, iv);
       let decrypted = decipher.update(encrypted, 'hex', 'utf8');
       decrypted += decipher.final('utf8');
       
       return decrypted;
     } catch (error) {
       console.error('[TeamManager] Error decrypting API key:', error);
       throw error;
     }
   }
   ```

3. **Add a new method for API key validation**:
   ```typescript
   async validateApiKey(apiKey: string): Promise<string | null> {
     try {
       // First check cache
       const cachedAuth = this.apiKeyCache.get(apiKey);
       if (cachedAuth) {
         return cachedAuth.teamId;
       }
       
       // If not in cache, search all teams and check if any decrypted key matches
       const teams = await repositories.teamRepository.findAll();
       
       for (const team of teams) {
         try {
           const decryptedKey = this.decryptApiKey(team.apiKey);
           
           if (decryptedKey === apiKey) {
             // Found matching team, add to cache
             this.apiKeyCache.set(apiKey, {
               teamId: team.id,
               key: apiKey
             });
             
             return team.id;
           }
         } catch (decryptError) {
           // Log but continue checking other teams
           console.error(`[TeamManager] Error decrypting key for team ${team.id}:`, decryptError);
         }
       }
       
       // No matching team found
       return null;
     } catch (error) {
       console.error('[TeamManager] Error validating API key:', error);
       return null;
     }
   }
   ```

4. **Modify the TeamRepository to handle encrypted keys**:
   ```typescript
   // Add a new method to find team by id
   async findById(id: string): Promise<Team | null> {
     // Implementation to find team by ID
   }
   
   // Modify this method to handle encrypted keys (optional optimization)
   async findByApiKey(encryptedApiKey: string): Promise<Team | null> {
     try {
       const query = 'SELECT * FROM teams WHERE api_key = $1';
       const result = await this.db.query(query, [encryptedApiKey]);
       
       if (result.rows.length === 0) {
         return null;
       }
       
       return result.rows[0];
     } catch (error) {
       console.error('[TeamRepository] Error finding team by API key:', error);
       throw error;
     }
   }
   ```

5. **Update `registerTeam()` method**:
   ```typescript
   async registerTeam(name: string, email: string, contactPerson: string): Promise<Team> {
     try {
       // Generate team ID
       const id = uuidv4();
       
       // Generate API key (longer, more secure format)
       const apiKey = this.generateApiKey();
       
       // Encrypt API key for storage
       const encryptedApiKey = this.encryptApiKey(apiKey);
       
       // Create team record
       const team: Team = {
         id,
         name,
         email,
         contactPerson,
         apiKey: encryptedApiKey, // Store encrypted key in database
         createdAt: new Date(),
         updatedAt: new Date()
       };
       
       // Store in database
       const savedTeam = await repositories.teamRepository.create(team);
       
       // Update cache with plaintext key
       this.apiKeyCache.set(apiKey, {
         teamId: id,
         key: apiKey
       });
       
       console.log(`[TeamManager] Registered team: ${name} (${id})`);
       
       // Return team with unencrypted apiKey for display to admin
       return {
         ...savedTeam,
         apiKey // Return unencrypted key
       };
     } catch (error) {
       if (error instanceof Error) {
         console.error('[TeamManager] Error registering team:', error);
         throw error;
       }
       
       console.error('[TeamManager] Unknown error registering team:', error);
       throw new Error(`Failed to register team: ${error}`);
     }
   }
   ```

### 3. Authentication Middleware Updates

Update `auth.middleware.ts` to use the new API key validation:

```typescript
export const authMiddleware = (
  teamManager: TeamManager,
  competitionManager: CompetitionManager
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log(`\n[AuthMiddleware] ========== AUTH REQUEST ==========`);
      console.log(`[AuthMiddleware] Received request to ${req.method} ${req.originalUrl}`);
      
      // Get API key from Authorization header (Bearer token) or X-API-Key header
      let apiKey = req.header('X-API-Key');
      const authHeader = req.header('Authorization');
      
      if (!apiKey && authHeader && authHeader.startsWith('Bearer ')) {
        // Extract token from Bearer authentication
        apiKey = authHeader.substring(7);
      }
      
      // Log partial key for debugging (only first 8 chars)
      const partialKey = apiKey ? `${apiKey.substring(0, 8)}...` : 'undefined';
      console.log(`[AuthMiddleware] API Key: ${partialKey}`);
      
      if (!apiKey) {
        throw new ApiError(401, 'API key is required');
      }
      
      // Validate API key
      const teamId = await teamManager.validateApiKey(apiKey);

      if (!teamId) {
        console.log(`[AuthMiddleware] Invalid API key`);
        throw new ApiError(401, 'Invalid API key');
      }

      console.log(`[AuthMiddleware] API key validation succeeded - team ID: ${teamId}`);
      
      // Set team ID in request for use in route handlers
      req.teamId = teamId;

      // Check if there's an active competition
      const activeCompetition = await competitionManager.getActiveCompetition();
      
      // For trade endpoints, ensure competition is active
      const fullRoutePath = `${req.baseUrl}${req.path}`;
      console.log(`[AuthMiddleware] Full route path: ${fullRoutePath}`);
      
      if (fullRoutePath.includes('/api/trade/execute') && req.method === 'POST') {
        if (!activeCompetition) {
          throw new ApiError(403, 'No active competition');
        }
        
        // Set competition ID in request
        req.competitionId = activeCompetition.id;
        console.log(`[AuthMiddleware] Set competition ID: ${req.competitionId}`);
      }

      console.log(`[AuthMiddleware] Authentication successful, proceeding to handler`);
      console.log(`[AuthMiddleware] ========== END AUTH ==========\n`);
      
      next();
    } catch (error) {
      console.log(`[AuthMiddleware] Error in authentication:`, error);
      next(error);
    }
  };
};
```

### 4. Client Updates

Create or update client code to use the simpler authentication:

```typescript
class SimplifiedTradingClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey.trim();
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  }

  private generateHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'TradingSimMCP/2.0'
    };
  }

  private async request<T>(method: string, path: string, body: any = null): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    
    const options: RequestInit = {
      method: method.toUpperCase(),
      headers: this.generateHeaders(),
      body: body ? JSON.stringify(body) : undefined
    };

    const response = await fetch(url, options);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `API request failed with status ${response.status}`);
    }
    
    return data as T;
  }

  // Rest of client methods remain unchanged
  // ...
}
```

### 5. API Documentation Updates

Update documentation to reflect the new authentication method:

```markdown
## Authentication

The Trading Simulator API uses API key authentication. Include your API key in all requests using one of these methods:

### Option 1: Authorization Header (Recommended)
```
Authorization: Bearer ts_live_your_api_key_here
```

### Option 2: API Key Header
```
X-API-Key: ts_live_your_api_key_here
```

Keep your API key secure and do not share it with others. 
If your API key is compromised, contact the administrators for a replacement.
```

### 6. Testing Plan

1. Create unit tests for the new `validateApiKey` method
2. Create integration tests for the simplified authentication flow
3. Test both Authorization header and X-API-Key header approaches
4. Verify encryption and decryption of API keys works correctly
5. Test performance of API key validation

### 7. Migration Plan

Since we're not maintaining backward compatibility, we need a clean migration:

1. Create a backup of the teams table
2. Apply database migration to remove the `api_secret_encrypted` column
3. Generate new API keys for all teams and update the database with encrypted keys
4. Distribute new API keys to teams (via admin panel or email)
5. Deploy the new code
6. Monitor for any authentication-related issues

### 8. Types Updates

Update the `Team` interface to reflect the new structure:

```typescript
// Before
interface Team {
  id: string;
  name: string;
  email: string;
  contactPerson: string;
  apiKey: string;
  apiSecretEncrypted: string;
  createdAt: Date;
  updatedAt: Date;
}

// After
interface Team {
  id: string;
  name: string;
  email: string;
  contactPerson: string;
  apiKey: string; // Now stores encrypted API key
  createdAt: Date;
  updatedAt: Date;
}

// Type used in the API key cache
interface ApiAuth {
  teamId: string;
  key: string; // Plaintext API key
}
```

## Files to Update

1. `src/database/init.sql` (or a migration file)
2. `src/services/team-manager.service.ts`
3. `src/middleware/auth.middleware.ts`
4. `src/types.ts` (or wherever Team interface is defined)
5. API client code
6. Documentation

## Performance Considerations

The new implementation has a potential performance impact:

1. **Database Queries**: Without the ability to directly query by API key (since keys are encrypted), we may need to fetch and decrypt many keys for validation.

**Optimization Strategies**:
- Implement a robust in-memory cache for API keys
- Consider adding a hashed version of API keys to the database as a secondary index
- Batch database queries for better performance

## Risk Assessment

### Potential Issues
- Teams will experience authentication failures during migration
- Less security against request tampering and replay attacks
- Initial performance impact from encrypted key validation

### Mitigations
- Coordinate with teams about the authentication changes
- Implement comprehensive logging for auth failures
- Use longer API keys (96+ characters) for adequate security
- Enforce HTTPS for all API traffic
- Implement rate limiting (already in place)
- Optimize key validation performance with caching

## Timeline

1. Database changes: 1 day
2. Code changes: 2 days
3. Testing: 2 days
4. Documentation updates: 1 day
5. Migration and deployment: 1 day

Total estimated time: 7 days 