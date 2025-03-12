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
| usdcAddress | EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v | USDC token address |
| solAddress | So11111111111111111111111111111111111111112 | SOL token address |

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

### 3. Get Current Price

1. Right-click on the collection and select "Add Request"
2. Name it "Get Current Price"
3. Set method to **GET**
4. Set URL to `{{baseUrl}}/api/price`
5. Go to the "Params" tab
6. Add a query parameter with key `token` and value `{{solAddress}}`
7. Click "Save"

### 4. Get Price From Provider

1. Right-click on the collection and select "Add Request"
2. Name it "Get Price From Provider"
3. Set method to **GET**
4. Set URL to `{{baseUrl}}/api/price/provider`
5. Go to the "Params" tab
6. Add the following query parameters:
   - Key: `token`, Value: `{{solAddress}}`
   - Key: `provider`, Value: `jupiter`
7. Click "Save"

### 5. Execute a Trade

1. Right-click on the collection and select "Add Request"
2. Name it "Execute Trade"
3. Set method to **POST**
4. Set URL to `{{baseUrl}}/api/trade/execute`
5. Go to the "Body" tab
6. Select "raw" and "JSON"
7. Enter the following JSON:
```json
{
  "fromToken": "{{usdcAddress}}",
  "toToken": "{{solAddress}}",
  "amount": "100.00",
  "price": "125.45",
  "slippageTolerance": "0.5"
}
```
8. Click "Save"

### 6. Get Competition Status

1. Right-click on the collection and select "Add Request"
2. Name it "Competition Status"
3. Set method to **GET**
4. Set URL to `{{baseUrl}}/api/competition/status`
5. Click "Save"

### 7. Get Leaderboard

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

## Troubleshooting

If you get authentication errors:

1. Check that your API key and secret are correct in the environment variables
2. Make sure you have selected the correct environment
3. Verify that the pre-request script is being executed (look for log messages in the Postman console)
4. Check that the path in the URL matches exactly what the server expects

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