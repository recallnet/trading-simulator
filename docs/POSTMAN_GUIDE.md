# Using Postman with the Trading Simulator API

This guide explains how to set up and use Postman to interact with the Trading Simulator API.

## Prerequisites

1. [Download and install Postman](https://www.postman.com/downloads/)
2. Have your team's API credentials (API key and secret) ready

## Setting Up Postman

### 1. Create a New Collection

1. Open Postman
2. Click on "Collections" in the sidebar
3. Click the "+" button to create a new collection
4. Name it "Trading Simulator API"

### 2. Set Up Environment Variables

1. Click on the gear icon (⚙️) in the top right
2. Select "Add" to create a new environment
3. Name it "Trading Simulator"
4. Add the following variables:

| Variable | Initial Value | Description |
|----------|---------------|-------------|
| baseUrl | http://localhost:3001 | API base URL |
| apiKey | your_api_key_here | Your team's API key |
| apiSecret | your_api_secret_here | Your team's API secret |
| usdcSolAddress | EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v | USDC token address on Solana |
| solAddress | So11111111111111111111111111111111111111112 | SOL token address |
| ethAddress | 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2 | ETH (WETH) token address |
| usdcEthAddress | 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 | USDC token address on Ethereum |

5. Click "Save"
6. Make sure to select this environment from the dropdown in the top right corner

## Setting Up Pre-request Script

To handle the HMAC authentication automatically, we'll use a pre-request script at the collection level:

1. Click on the "Trading Simulator API" collection
2. Go to the "Pre-request Script" tab
3. Paste the following code:

```javascript
// Get request details
const method = pm.request.method;
const path = pm.request.url.getPath();
const timestamp = new Date().toISOString();

// Get request body (if any)
let body = '';
if (pm.request.body && pm.request.body.mode === 'raw') {
    body = pm.request.body.raw;
}

// Generate signature using CryptoJS (built into Postman)
const data = method + path + timestamp + body;
const signature = CryptoJS.HmacSHA256(data, pm.environment.get('apiSecret')).toString(CryptoJS.enc.Hex);

// Set environment variables for use in headers
pm.environment.set('timestamp', timestamp);
pm.environment.set('signature', signature);

console.log('Request details:');
console.log('Method:', method);
console.log('Path:', path);
console.log('Timestamp:', timestamp);
console.log('Body:', body);
console.log('Signature:', signature);
```

4. Click "Save"

## Setting Up Collection Headers

1. Still in the collection settings, go to the "Headers" tab
2. Add the following headers:

| Key | Value |
|-----|-------|
| X-API-Key | {{apiKey}} |
| X-Timestamp | {{timestamp}} |
| X-Signature | {{signature}} |
| Content-Type | application/json |

3. Click "Save"

## Creating Requests

### 1. Get Account Balances

1. Right-click on the collection and select "Add Request"
2. Name it "Get Balances"
3. Set method to **GET**
4. Set URL to `{{baseUrl}}/api/account/balances`
5. Click "Save"

### 2. Get Portfolio

1. Right-click on the collection and select "Add Request"
2. Name it "Get Portfolio"
3. Set method to **GET**
4. Set URL to `{{baseUrl}}/api/account/portfolio`
5. Click "Save"

### 3. Get Current Price (Solana)

1. Right-click on the collection and select "Add Request"
2. Name it "Get SOL Price"
3. Set method to **GET**
4. Set URL to `{{baseUrl}}/api/price`
5. Go to the "Params" tab
6. Add a query parameter with key `token` and value `{{solAddress}}`
7. Click "Save"

### 4. Get Current Price (Ethereum)

1. Right-click on the collection and select "Add Request"
2. Name it "Get ETH Price"
3. Set method to **GET**
4. Set URL to `{{baseUrl}}/api/price`
5. Go to the "Params" tab
6. Add a query parameter with key `token` and value `{{ethAddress}}`
7. Click "Save"

### 5. Get Price From Provider (Solana)

1. Right-click on the collection and select "Add Request"
2. Name it "Get SOL Price from Jupiter"
3. Set method to **GET**
4. Set URL to `{{baseUrl}}/api/price/provider`
5. Go to the "Params" tab
6. Add the following query parameters:
   - Key: `token`, Value: `{{solAddress}}`
   - Key: `provider`, Value: `jupiter`
7. Click "Save"

### 6. Get Price From Provider (Ethereum)

1. Right-click on the collection and select "Add Request"
2. Name it "Get ETH Price from Noves"
3. Set method to **GET**
4. Set URL to `{{baseUrl}}/api/price/provider`
5. Go to the "Params" tab
6. Add the following query parameters:
   - Key: `token`, Value: `{{ethAddress}}`
   - Key: `provider`, Value: `noves`
7. Click "Save"

### 7. Execute a Trade (Solana to Solana)

1. Right-click on the collection and select "Add Request"
2. Name it "Trade USDC to SOL"
3. Set method to **POST**
4. Set URL to `{{baseUrl}}/api/trade/execute`
5. Go to the "Body" tab
6. Select "raw" and "JSON"
7. Enter the following JSON:
```json
{
  "fromToken": "{{usdcSolAddress}}",
  "toToken": "{{solAddress}}",
  "amount": "100.00",
  "price": "125.45",
  "slippageTolerance": "0.5"
}
```
8. Click "Save"

### 8. Execute a Cross-Chain Trade (Solana to Ethereum)

1. Right-click on the collection and select "Add Request"
2. Name it "Trade USDC (Solana) to ETH"
3. Set method to **POST**
4. Set URL to `{{baseUrl}}/api/trade/execute`
5. Go to the "Body" tab
6. Select "raw" and "JSON"
7. Enter the following JSON:
```json
{
  "fromToken": "{{usdcSolAddress}}",
  "toToken": "{{ethAddress}}",
  "amount": "100.00",
  "price": "3500.75",
  "slippageTolerance": "0.5"
}
```
8. Click "Save"

### 9. Get Competition Status

1. Right-click on the collection and select "Add Request"
2. Name it "Competition Status"
3. Set method to **GET**
4. Set URL to `{{baseUrl}}/api/competition/status`
5. Click "Save"

### 10. Get Leaderboard

1. Right-click on the collection and select "Add Request"
2. Name it "Competition Leaderboard"
3. Set method to **GET**
4. Set URL to `{{baseUrl}}/api/competition/leaderboard`
5. Click "Save"

## Making Requests

Now you can send requests to the API with proper authentication:

1. Select a request from the collection
2. Click the "Send" button
3. View the response in the panel below

The pre-request script will automatically:
1. Generate a fresh timestamp for each request
2. Calculate the correct signature based on the request details
3. Set the required headers

## Testing Multi-Chain Support

### Testing with Solana Tokens

1. Use "Get SOL Price" request to get the current price of SOL
2. Check the response for the `chain` field, which should be `svm`
3. Use "Get USDC (Solana) Price" request (create this by duplicating "Get SOL Price" and changing the token parameter)
4. Verify the `chain` field is correctly set to `svm`

### Testing with Ethereum Tokens

1. Use "Get ETH Price" request to get the current price of ETH (WETH)
2. Check the response for the `chain` field, which should be `evm`
3. Use "Get USDC (Ethereum) Price" request (create this by duplicating "Get ETH Price" and changing the token parameter)
4. Verify the `chain` field is correctly set to `evm`

### Testing Cross-Chain Trading

1. Use "Trade USDC (Solana) to ETH" request to execute a cross-chain trade
2. Verify that the response includes:
   - `fromChain` set to `svm`
   - `toChain` set to `evm`
3. Check your balances after the trade using the "Get Balances" request to confirm the cross-chain trade was successful

## Troubleshooting

If you get authentication errors:

1. Check that your API key and secret are correct in the environment variables
2. Make sure you have selected the correct environment
3. Verify that the pre-request script is being executed (look for log messages in the Postman console)
4. Check that the path in the URL matches exactly what the server expects

### Chain-Specific Issues

If you encounter issues related to chain detection:

1. Ensure token addresses are in the correct format:
   - Solana: Base58 encoded addresses (e.g., `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`)
   - Ethereum: Hex addresses starting with "0x" (e.g., `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2`)
2. For the Noves provider, you can explicitly specify the chain by adding a `chain` parameter:
   - Add a query param with key `chain` and value `svm` for Solana tokens
   - Add a query param with key `chain` and value `evm` for Ethereum tokens

## Advanced: Testing with Variables

You can use Postman's test scripts to extract values from responses and store them for later requests:

```javascript
// Example test script to save a value from the response
const jsonData = pm.response.json();
if (jsonData && jsonData.someValue) {
    pm.environment.set("storedValue", jsonData.someValue);
}
```

This is useful for workflows where you need to use values from previous responses in subsequent requests.

### Advanced Multi-Chain Workflow Example

You can create a workflow to:

1. Get the current price of SOL
2. Save the price to an environment variable
3. Execute a trade from USDC to SOL using the fetched price
4. Check your updated balances

To do this:

1. Add this script to the "Get SOL Price" request's Tests tab:
```javascript
const response = pm.response.json();
if (response.success && response.price) {
    pm.environment.set("solPrice", response.price);
    console.log("Saved SOL price:", response.price);
}
```

2. Then, modify the "Trade USDC to SOL" request body to use this dynamic price:
```json
{
  "fromToken": "{{usdcSolAddress}}",
  "toToken": "{{solAddress}}",
  "amount": "100.00",
  "price": "{{solPrice}}",
  "slippageTolerance": "0.5"
}
```

3. Run the requests in sequence to execute a trade with the current market price 