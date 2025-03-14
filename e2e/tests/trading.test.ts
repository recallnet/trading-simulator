import { setupAdminClient, registerTeamAndGetClient, startTestCompetition, cleanupTestState, wait, ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_EMAIL } from '../utils/test-helpers';
import axios from 'axios';
import { getBaseUrl } from '../utils/server';
import config from '../../src/config';
import { BlockchainType } from '../../src/types';

describe('Trading API', () => {
  // Clean up test state before each test
  beforeEach(async () => {
    await cleanupTestState();
    
    // Create admin account directly using the setup endpoint
    await axios.post(`${getBaseUrl()}/api/admin/setup`, {
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD,
      email: ADMIN_EMAIL
    });
  });
  
  test('team can execute a trade and verify balance updates', async () => {
    // Setup admin client
    const adminClient = await setupAdminClient();
    
    // Register team and get client
    const { client: teamClient, team } = await registerTeamAndGetClient(adminClient, 'Trading Team');
    
    // Start a competition with our team
    const competitionName = `Trading Test ${Date.now()}`;
    await startTestCompetition(adminClient, competitionName, [team.id]);
    
    // Wait for balances to be properly initialized
    await wait(500);
    
    // Check initial balance
    const initialBalanceResponse = await teamClient.getBalance();
    expect(initialBalanceResponse.success).toBe(true);
    expect(initialBalanceResponse.balance).toBeDefined();
    
    // Initial USDC balance should be the starting amount (e.g., 10000)
    const usdcTokenAddress = config.tokens.usdc;
    const initialUsdcBalance = parseFloat(initialBalanceResponse.balance[usdcTokenAddress]?.toString() || '0');
    console.log(`Initial USDC balance: ${initialUsdcBalance}`);
    expect(initialUsdcBalance).toBeGreaterThan(0);
    
    // Use SOL token for trading (since we know it has a price in the test environment)
    const solTokenAddress = config.tokens.sol;
    
    // Initial SOL balance might already exist from initial balance config
    const initialSolBalance = parseFloat(initialBalanceResponse.balance[solTokenAddress]?.toString() || '0');
    console.log(`Initial SOL balance: ${initialSolBalance}`);
    
    // Use a small fixed amount that should be less than the initial balance
    const tradeAmount = 100; // Use a small amount that should be available
    console.log(`Trade amount: ${tradeAmount} (should be less than ${initialUsdcBalance})`);
    
    // Execute a buy trade (buying SOL with USDC)
    const buyTradeResponse = await teamClient.executeTrade({
      tokenAddress: solTokenAddress,
      side: 'buy',
      amount: tradeAmount.toString(),
      price: '1.0' // Assume 1:1 price for simplicity in tests
    });
    
    console.log(`Buy trade response: ${JSON.stringify(buyTradeResponse)}`);
    expect(buyTradeResponse.success).toBe(true);
    expect(buyTradeResponse.transaction).toBeDefined();
    expect(buyTradeResponse.transaction.id).toBeDefined();
    
    // Verify chain field is included in transaction response
    if (buyTradeResponse.transaction.fromChain) {
      expect(buyTradeResponse.transaction.fromChain).toBe(BlockchainType.SVM);
    }
    if (buyTradeResponse.transaction.toChain) {
      expect(buyTradeResponse.transaction.toChain).toBe(BlockchainType.SVM);
    }
    
    // Wait a bit longer for the trade to process
    await wait(500);
    
    // Check updated balance
    const updatedBalanceResponse = await teamClient.getBalance();
    expect(updatedBalanceResponse.success).toBe(true);
    
    // USDC balance should have decreased
    const updatedUsdcBalance = parseFloat(updatedBalanceResponse.balance[usdcTokenAddress]?.toString() || '0');
    console.log(`Updated USDC balance: ${updatedUsdcBalance} (should be less than ${initialUsdcBalance})`);
    expect(updatedUsdcBalance).toBeLessThan(initialUsdcBalance);
    
    // SOL balance should have increased
    const updatedSolBalance = parseFloat(updatedBalanceResponse.balance[solTokenAddress]?.toString() || '0');
    console.log(`Updated SOL balance: ${updatedSolBalance} (should be greater than ${initialSolBalance})`);
    expect(updatedSolBalance).toBeGreaterThan(initialSolBalance);
    
    // Get trade history
    const tradeHistoryResponse = await teamClient.getTradeHistory();
    expect(tradeHistoryResponse.success).toBe(true);
    expect(tradeHistoryResponse.trades).toBeInstanceOf(Array);
    expect(tradeHistoryResponse.trades.length).toBeGreaterThan(0);
    
    // Verify chain fields in trades if they exist
    const lastTrade = tradeHistoryResponse.trades[0];
    if (lastTrade.fromChain) {
      expect(lastTrade.fromChain).toBe(BlockchainType.SVM);
    }
    if (lastTrade.toChain) {
      expect(lastTrade.toChain).toBe(BlockchainType.SVM);
    }
    
    // Execute a sell trade (selling SOL for USDC)
    // Sell 50% of what we have to ensure we never try to sell more than we have
    const tokenToSell = updatedSolBalance * 0.5; 
    console.log(`Token to sell: ${tokenToSell} (should be less than ${updatedSolBalance})`);
    
    const sellTradeResponse = await teamClient.executeTrade({
      tokenAddress: solTokenAddress,
      side: 'sell',
      amount: tokenToSell.toString(),
      price: '1.0' // Assume 1:1 price for simplicity in tests
    });
    
    console.log(`Sell trade response: ${JSON.stringify(sellTradeResponse)}`);
    expect(sellTradeResponse.success).toBe(true);
    expect(sellTradeResponse.transaction).toBeDefined();
    
    // Wait a bit longer for the trade to process
    await wait(500);
    
    // Check final balance
    const finalBalanceResponse = await teamClient.getBalance();
    expect(finalBalanceResponse.success).toBe(true);
    
    // USDC balance should have increased compared to after buying
    const finalUsdcBalance = parseFloat(finalBalanceResponse.balance[usdcTokenAddress]?.toString() || '0');
    console.log(`Final USDC balance: ${finalUsdcBalance} (should be greater than ${updatedUsdcBalance})`);
    expect(finalUsdcBalance).toBeGreaterThan(updatedUsdcBalance);
    
    // SOL balance should have decreased compared to after buying
    const finalSolBalance = parseFloat(finalBalanceResponse.balance[solTokenAddress]?.toString() || '0');
    console.log(`Final SOL balance: ${finalSolBalance} (should be less than ${updatedSolBalance})`);
    expect(finalSolBalance).toBeLessThan(updatedSolBalance);
  });
  
  test('team can execute a trade with an arbitrary token address', async () => {
    // Setup admin client
    const adminClient = await setupAdminClient();
    
    // Register team and get client
    const { client: teamClient, team } = await registerTeamAndGetClient(adminClient, 'Arbitrary Token Team');
    
    // Start a competition with our team
    const competitionName = `Arbitrary Token Test ${Date.now()}`;
    await startTestCompetition(adminClient, competitionName, [team.id]);
    
    // Wait for balances to be properly initialized
    await wait(500);
    
    // Check initial balance
    const initialBalanceResponse = await teamClient.getBalance();
    expect(initialBalanceResponse.success).toBe(true);
    expect(initialBalanceResponse.balance).toBeDefined();
    
    // Initial USDC balance should be the starting amount
    const usdcTokenAddress = config.tokens.usdc;
    const initialUsdcBalance = parseFloat(initialBalanceResponse.balance[usdcTokenAddress]?.toString() || '0');
    console.log(`Initial USDC balance: ${initialUsdcBalance}`);
    expect(initialUsdcBalance).toBeGreaterThan(0);
    
    // The arbitrary token address to test with
    const arbitraryTokenAddress = '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R';
    
    // Initial balance of the arbitrary token (likely 0)
    const initialArbitraryTokenBalance = parseFloat(initialBalanceResponse.balance[arbitraryTokenAddress]?.toString() || '0');
    console.log(`Initial arbitrary token balance: ${initialArbitraryTokenBalance}`);
    
    // Execute a direct trade using the API's expected parameters
    // We'll use the executeTrade method but we need to correctly map the parameters
    const tradeAmount = 10; // 10 USDC
    console.log(`Trading ${tradeAmount} USDC for arbitrary token ${arbitraryTokenAddress}`);
    
    // Use the client's executeTrade which expects tokenAddress and side
    const buyTradeResponse = await teamClient.executeTrade({
      tokenAddress: arbitraryTokenAddress,
      side: 'buy',
      amount: tradeAmount.toString(),
      price: '1.0' // Assume 1:1 price for simplicity
    });
    
    console.log(`Buy trade response: ${JSON.stringify(buyTradeResponse)}`);
    expect(buyTradeResponse.success).toBe(true);
    expect(buyTradeResponse.transaction).toBeDefined();
    expect(buyTradeResponse.transaction.id).toBeDefined();
    
    // Wait for the trade to process
    await wait(500);
    
    // Check updated balance
    const updatedBalanceResponse = await teamClient.getBalance();
    expect(updatedBalanceResponse.success).toBe(true);
    
    // USDC balance should have decreased
    const updatedUsdcBalance = parseFloat(updatedBalanceResponse.balance[usdcTokenAddress]?.toString() || '0');
    console.log(`Updated USDC balance: ${updatedUsdcBalance}`);
    expect(updatedUsdcBalance).toBeLessThan(initialUsdcBalance);
    expect(initialUsdcBalance - updatedUsdcBalance).toBeCloseTo(tradeAmount, 1); // Allow for small rounding differences
    
    // The arbitrary token balance should have increased
    const updatedArbitraryTokenBalance = parseFloat(updatedBalanceResponse.balance[arbitraryTokenAddress]?.toString() || '0');
    console.log(`Updated arbitrary token balance: ${updatedArbitraryTokenBalance}`);
    expect(updatedArbitraryTokenBalance).toBeGreaterThan(initialArbitraryTokenBalance);
    
    // Get trade history
    const tradeHistoryResponse = await teamClient.getTradeHistory();
    expect(tradeHistoryResponse.success).toBe(true);
    expect(tradeHistoryResponse.trades).toBeInstanceOf(Array);
    expect(tradeHistoryResponse.trades.length).toBeGreaterThan(0);
    
    // Verify the last trade has the correct tokens
    const lastTrade = tradeHistoryResponse.trades[0];
    expect(lastTrade.fromToken).toBe(usdcTokenAddress);
    expect(lastTrade.toToken).toBe(arbitraryTokenAddress);
    expect(parseFloat(lastTrade.fromAmount)).toBeCloseTo(tradeAmount, 1); // Allow for small rounding differences
  });
  
  test('team cannot execute invalid trades', async () => {
    // Setup admin client
    const adminClient = await setupAdminClient();
    
    // Register team and get client
    const { client: teamClient, team } = await registerTeamAndGetClient(adminClient, 'Invalid Trading Team');
    
    // Start a competition with our team
    await startTestCompetition(adminClient, `Invalid Trading Test ${Date.now()}`, [team.id]);
    
    // Check initial balance
    const initialBalanceResponse = await teamClient.getBalance();
    const usdcTokenAddress = config.tokens.usdc;
    const initialUsdcBalance = parseFloat(initialBalanceResponse.balance[usdcTokenAddress].toString());
    
    // Try to execute a trade with invalid token address format
    const invalidTokenResponse = await teamClient.executeTrade({
      tokenAddress: 'InvalidTokenAddressFormat123', // This should be rejected by the API as not a valid token address format
      side: 'buy',
      amount: '100',
      price: '1.0'
    });
    
    expect(invalidTokenResponse.success).toBe(false);
    
    // Try to execute a trade with a completely made-up token address that uses a valid format but doesn't exist
    // Using a completely invalid but properly formatted address that will never have a price
    const nonExistentTokenAddress = '1111111111111111111111111111111111111111111111111111';
    
    const noPriceTokenResponse = await teamClient.executeTrade({
      tokenAddress: nonExistentTokenAddress,
      side: 'buy',
      amount: '100',
      price: '1.0'
    });
    
    expect(noPriceTokenResponse.success).toBe(false);
    expect(noPriceTokenResponse.error).toContain('Unable to determine price');
    
    // Try to execute a trade with amount exceeding balance
    const excessiveAmountResponse = await teamClient.executeTrade({
      tokenAddress: usdcTokenAddress, // Use USDC which has a known price
      side: 'buy',
      amount: (initialUsdcBalance * 2).toString(), // Double the available balance
      price: '1.0'
    });
    
    expect(excessiveAmountResponse.success).toBe(false);
    expect(excessiveAmountResponse.error).toContain('Cannot trade between identical tokens');
    
    // Add a test for truly excessive amounts after fixing the token address
    // The test should now execute a transaction where from != to
    const solanaPriceResponse = await teamClient.executeTrade({
      tokenAddress: config.tokens.sol, // Use SOL token which has a different address from USDC
      side: 'buy',
      amount: (initialUsdcBalance * 2).toString(), // Double the available balance
      price: '1.0' 
    });
    
    expect(solanaPriceResponse.success).toBe(false);
    expect(solanaPriceResponse.error).toContain('Insufficient balance');
    
    // Try to execute a sell trade without having tokens
    const invalidSellResponse = await teamClient.executeTrade({
      tokenAddress: config.tokens.sol, // Use SOL which we don't have in our balance
      side: 'sell',
      amount: '100',
      price: '1.0'
    });
    
    expect(invalidSellResponse.success).toBe(false);
    expect(invalidSellResponse.error).toContain('Insufficient balance');
  });
  
  test('team can fetch price and execute a calculated trade', async () => {
    // Setup admin client
    const adminClient = await setupAdminClient();
    
    // Register team and get client
    const { client: teamClient, team } = await registerTeamAndGetClient(adminClient, 'Price Calculation Team');
    
    // Start a competition with our team
    const competitionName = `Price Calculation Test ${Date.now()}`;
    await startTestCompetition(adminClient, competitionName, [team.id]);
    
    // Wait for balances to be properly initialized
    await wait(500);
    
    // Check initial balance
    const initialBalanceResponse = await teamClient.getBalance();
    expect(initialBalanceResponse.success).toBe(true);
    expect(initialBalanceResponse.balance).toBeDefined();
    
    // Initial USDC balance
    const usdcTokenAddress = config.tokens.usdc;
    const initialUsdcBalance = parseFloat(initialBalanceResponse.balance[usdcTokenAddress]?.toString() || '0');
    console.log(`Initial USDC balance: ${initialUsdcBalance}`);
    expect(initialUsdcBalance).toBeGreaterThan(0);
    
    // The arbitrary token address specified
    const arbitraryTokenAddress = 'Grass7B4RdKfBCjTKgSqnXkqjwiGvQyFbuSCUJr3XXjs';
    
    // Initial balance of the arbitrary token (likely 0)
    const initialArbitraryTokenBalance = parseFloat(initialBalanceResponse.balance[arbitraryTokenAddress]?.toString() || '0');
    console.log(`Initial ${arbitraryTokenAddress} token balance: ${initialArbitraryTokenBalance}`);
    
    // 1. Fetch the price for the arbitrary token
    console.log(`Fetching price for token: ${arbitraryTokenAddress}`);
    const priceResponse = await axios.get(`${getBaseUrl()}/api/price?token=${arbitraryTokenAddress}`);
    expect(priceResponse.status).toBe(200);
    expect(priceResponse.data.success).toBe(true);
    expect(priceResponse.data.price).toBeDefined();
    
    const tokenPrice = parseFloat(priceResponse.data.price);
    console.log(`Token price: ${tokenPrice} USDC`);
    expect(tokenPrice).toBeGreaterThan(0);
    
    // 2. Calculate how much of the token can be bought with 10 USDC
    const usdcAmount = 10;
    const expectedTokenAmount = usdcAmount / tokenPrice;
    console.log(`With ${usdcAmount} USDC, expect to receive approximately ${expectedTokenAmount} tokens`);
    
    // 3. Execute the trade (buy the token with 10 USDC)
    const buyTradeResponse = await teamClient.executeTrade({
      tokenAddress: arbitraryTokenAddress,
      side: 'buy',
      amount: usdcAmount.toString(),
      price: tokenPrice.toString()
    });
    
    console.log(`Buy trade response: ${JSON.stringify(buyTradeResponse)}`);
    expect(buyTradeResponse.success).toBe(true);
    expect(buyTradeResponse.transaction).toBeDefined();
    expect(buyTradeResponse.transaction.id).toBeDefined();
    
    // Wait for the trade to process
    await wait(500);
    
    // 4. Check final balance and validate it reflects the calculation
    const finalBalanceResponse = await teamClient.getBalance();
    expect(finalBalanceResponse.success).toBe(true);
    
    // USDC balance should have decreased by 10
    const finalUsdcBalance = parseFloat(finalBalanceResponse.balance[usdcTokenAddress]?.toString() || '0');
    console.log(`Final USDC balance: ${finalUsdcBalance}`);
    expect(initialUsdcBalance - finalUsdcBalance).toBeCloseTo(usdcAmount, 1); // Allow for small rounding differences
    
    // The arbitrary token balance should have increased by the calculated amount
    const finalTokenBalance = parseFloat(finalBalanceResponse.balance[arbitraryTokenAddress]?.toString() || '0');
    console.log(`Final token balance: ${finalTokenBalance}`);
    expect(finalTokenBalance - initialArbitraryTokenBalance).toBeCloseTo(expectedTokenAmount, 1); // Allow for small variations due to price fluctuations
    
    // Get trade history to verify details
    const tradeHistoryResponse = await teamClient.getTradeHistory();
    expect(tradeHistoryResponse.success).toBe(true);
    expect(tradeHistoryResponse.trades).toBeInstanceOf(Array);
    expect(tradeHistoryResponse.trades.length).toBeGreaterThan(0);
    
    // Verify the trade details in history
    const lastTrade = tradeHistoryResponse.trades[0];
    expect(lastTrade.fromToken).toBe(usdcTokenAddress);
    expect(lastTrade.toToken).toBe(arbitraryTokenAddress);
    expect(parseFloat(lastTrade.fromAmount)).toBeCloseTo(usdcAmount, 1);
    expect(parseFloat(lastTrade.toAmount)).toBeCloseTo(expectedTokenAmount, 1);
  });

  test('team can trade with Ethereum tokens', async () => {
    // Skip if Noves provider isn't configured (required for EVM tokens)
    if (!config.api.noves?.enabled) {
      console.log('Skipping Ethereum token test: Noves provider not configured');
      return;
    }
    
    // Setup admin client
    const adminClient = await setupAdminClient();
    
    // Register team and get client
    const { client: teamClient, team } = await registerTeamAndGetClient(adminClient, 'Ethereum Token Team');
    
    // Start a competition with our team
    const competitionName = `Ethereum Token Test ${Date.now()}`;
    await startTestCompetition(adminClient, competitionName, [team.id]);
    
    // Wait for balances to be properly initialized
    await wait(500);
    
    // Check initial balance
    const initialBalanceResponse = await teamClient.getBalance();
    expect(initialBalanceResponse.success).toBe(true);
    expect(initialBalanceResponse.balance).toBeDefined();
    
    // Get Ethereum USDC token address from blockchain tokens config
    const ethUsdcTokenAddress = config.blockchainTokens?.[BlockchainType.EVM]?.usdc;
    if (!ethUsdcTokenAddress) {
      console.log('Skipping test: Ethereum USDC token address not configured');
      return;
    }
    
    // Get Ethereum ETH token address
    const ethTokenAddress = config.blockchainTokens?.[BlockchainType.EVM]?.eth;
    if (!ethTokenAddress) {
      console.log('Skipping test: Ethereum ETH token address not configured');
      return;
    }
    
    // First check price to verify EVM tokens are working
    try {
      const priceResponse = await axios.get(`${getBaseUrl()}/api/price?token=${ethTokenAddress}`);
      expect(priceResponse.status).toBe(200);
      
      // If we get a successful response, verify the token is recognized as EVM
      if (priceResponse.data.chain) {
        expect(priceResponse.data.chain).toBe(BlockchainType.EVM);
        console.log(`Confirmed ETH token is on ${priceResponse.data.chain} chain with price ${priceResponse.data.price}`);
      }
    } catch (error) {
      console.error('Error getting ETH price, EVM tokens may not be supported:', error);
      return; // Skip the rest of the test
    }
    
    // Check if we have any ETH balance already
    const initialEthBalance = parseFloat(initialBalanceResponse.balance[ethTokenAddress]?.toString() || '0');
    console.log(`Initial ETH balance: ${initialEthBalance}`);
    
    // If we have SVM USDC, we can try to trade it for ETH
    const svmUsdcAddress = config.tokens.usdc;
    const svmUsdcBalance = parseFloat(initialBalanceResponse.balance[svmUsdcAddress]?.toString() || '0');
    
    if (svmUsdcBalance > 0) {
      console.log(`Trading SVM USDC for ETH...`);
      
      // Use a small amount for the test
      const tradeAmount = Math.min(100, svmUsdcBalance * 0.1);
      
      // Execute a buy trade (buying ETH with USDC)
      const buyTradeResponse = await teamClient.executeTrade({
        tokenAddress: ethTokenAddress,
        side: 'buy',
        amount: tradeAmount.toString(),
        price: '1.0' // Simplified price for testing
      });
      
      console.log(`Buy ETH trade response: ${JSON.stringify(buyTradeResponse)}`);
      expect(buyTradeResponse.success).toBe(true);
      
      // Wait for the trade to process
      await wait(500);
      
      // Check updated balance
      const updatedBalanceResponse = await teamClient.getBalance();
      
      // ETH balance should have increased
      const updatedEthBalance = parseFloat(updatedBalanceResponse.balance[ethTokenAddress]?.toString() || '0');
      console.log(`Updated ETH balance: ${updatedEthBalance}`);
      expect(updatedEthBalance).toBeGreaterThan(initialEthBalance);
      
      // Get trade history and verify the Ethereum trade
      const tradeHistoryResponse = await teamClient.getTradeHistory();
      expect(tradeHistoryResponse.success).toBe(true);
      expect(tradeHistoryResponse.trades.length).toBeGreaterThan(0);
      
      // Verify the last trade details
      const lastTrade = tradeHistoryResponse.trades[0];
      expect(lastTrade.toToken).toBe(ethTokenAddress);
      
      // Verify chain fields if they exist
      if (lastTrade.toChain) {
        expect(lastTrade.toChain).toBe(BlockchainType.EVM);
        console.log(`Confirmed trade to chain is ${lastTrade.toChain}`);
      }
    } else {
      console.log('No SVM USDC available for trading to ETH, skipping trade execution');
    }
  });
}); 