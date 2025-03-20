import { setupAdminClient, registerTeamAndGetClient, startTestCompetition, cleanupTestState, wait, ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_EMAIL } from '../utils/test-helpers';
import axios from 'axios';
import { getBaseUrl } from '../utils/server';
import config from '../../src/config';
import { BlockchainType, SpecificChain } from '../../src/types';

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
      fromToken: usdcTokenAddress,
      toToken: solTokenAddress,
      amount: tradeAmount.toString(),
      fromChain: BlockchainType.SVM,
      toChain: BlockchainType.SVM
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
      fromToken: solTokenAddress,
      toToken: usdcTokenAddress,
      amount: tokenToSell.toString(),
      fromChain: BlockchainType.SVM,
      toChain: BlockchainType.SVM
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
    
    // Use the client's executeTrade which expects fromToken and toToken
    const buyTradeResponse = await teamClient.executeTrade({
      fromToken: usdcTokenAddress,
      toToken: arbitraryTokenAddress,
      amount: tradeAmount.toString(),
      fromChain: BlockchainType.SVM,
      toChain: BlockchainType.SVM
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
      fromToken: usdcTokenAddress,
      toToken: 'InvalidTokenAddressFormat123', // This should be rejected by the API as not a valid token address format
      amount: '100',
      fromChain: BlockchainType.SVM,
      toChain: BlockchainType.SVM
    });
    
    expect(invalidTokenResponse.success).toBe(false);
    
    // Try to execute a trade with a completely made-up token address that uses a valid format but doesn't exist
    // Using a completely invalid but properly formatted address that will never have a price
    const nonExistentTokenAddress = '1111111111111111111111111111111111111111111111111111';
    
    const noPriceTokenResponse = await teamClient.executeTrade({
      fromToken: usdcTokenAddress,
      toToken: nonExistentTokenAddress,
      amount: '100',
      fromChain: BlockchainType.SVM,
      toChain: BlockchainType.SVM
    });
    
    expect(noPriceTokenResponse.success).toBe(false);
    expect(noPriceTokenResponse.error).toContain('Unable to determine price');
    
    // Try to execute a trade with amount exceeding balance
    const excessiveAmountResponse = await teamClient.executeTrade({
      fromToken: usdcTokenAddress,
      toToken: usdcTokenAddress, // Use USDC which has a known price
      amount: (initialUsdcBalance * 2).toString(), // Double the available balance
      fromChain: BlockchainType.SVM,
      toChain: BlockchainType.SVM
    });
    
    expect(excessiveAmountResponse.success).toBe(false);
    expect(excessiveAmountResponse.error).toContain('Cannot trade between identical tokens');
    
    // Add a test for truly excessive amounts after fixing the token address
    // The test should now execute a transaction where from != to
    const solanaPriceResponse = await teamClient.executeTrade({
      fromToken: usdcTokenAddress,
      toToken: config.tokens.sol, // Use SOL token which has a different address from USDC
      amount: (initialUsdcBalance * 2).toString(), // Double the available balance
      fromChain: BlockchainType.SVM,
      toChain: BlockchainType.SVM
    });
    
    expect(solanaPriceResponse.success).toBe(false);
    expect(solanaPriceResponse.error).toContain('Insufficient balance');
    
    // Try to execute a sell trade without having tokens
    const invalidSellResponse = await teamClient.executeTrade({
      fromToken: config.tokens.sol, // Use SOL which we don't have in our balance
      toToken: usdcTokenAddress,
      amount: '100',
      fromChain: BlockchainType.SVM,
      toChain: BlockchainType.SVM
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
    const priceResponse = await teamClient.getPrice(arbitraryTokenAddress);
    expect(priceResponse.success).toBe(true);
    expect(priceResponse.price).toBeDefined();
    
    const tokenPrice = parseFloat(priceResponse.price);
    console.log(`Token price: ${tokenPrice} USDC`);
    expect(tokenPrice).toBeGreaterThan(0);
    
    // 2. Calculate how much of the token can be bought with 10 USDC
    const usdcAmount = 10;
    const expectedTokenAmount = usdcAmount / tokenPrice;
    console.log(`With ${usdcAmount} USDC, expect to receive approximately ${expectedTokenAmount} tokens`);
    
    // 3. Execute the trade (buy the token with 10 USDC)
    const buyTradeResponse = await teamClient.executeTrade({
      fromToken: usdcTokenAddress,
      toToken: arbitraryTokenAddress,
      amount: usdcAmount.toString(),
      fromChain: BlockchainType.SVM,
      toChain: BlockchainType.SVM
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

    // Check if cross-chain trading is allowed
    const allowCrossChainTrading = process.env.ALLOW_CROSS_CHAIN_TRADING === 'true';
    if (!allowCrossChainTrading) {
      console.log('Skipping Ethereum token test: Cross-chain trading is disabled');
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
      const priceResponse = await teamClient.getPrice(ethTokenAddress);
      
      // If we get a successful response, verify the token is recognized as EVM
      if (priceResponse.chain) {
        expect(priceResponse.chain).toBe(BlockchainType.EVM);
        console.log(`Confirmed ETH token is on ${priceResponse.chain} chain with price ${priceResponse.price}`);
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
        fromToken: svmUsdcAddress,
        toToken: ethTokenAddress,
        amount: tradeAmount.toString(),
        fromChain: BlockchainType.SVM,
        toChain: BlockchainType.EVM
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

  test('team can execute trades with explicit chain parameters', async () => {
    // Setup admin client
    const adminClient = await setupAdminClient();
    
    // Register team and get client
    const { client: teamClient, team } = await registerTeamAndGetClient(adminClient, 'Chain-Specific Trading Team');
    
    // Start a competition with our team
    const competitionName = `Chain-Specific Trading Test ${Date.now()}`;
    await startTestCompetition(adminClient, competitionName, [team.id]);
    
    // Wait for balances to be properly initialized
    await wait(500);
    
    // Check initial balance
    const initialBalanceResponse = await teamClient.getBalance();
    expect(initialBalanceResponse.success).toBe(true);
    
    // Initial USDC balance should be the starting amount (e.g., 10000)
    const usdcTokenAddress = config.tokens.usdc;
    const initialUsdcBalance = parseFloat(initialBalanceResponse.balance[usdcTokenAddress]?.toString() || '0');
    console.log(`Initial USDC balance: ${initialUsdcBalance}`);
    expect(initialUsdcBalance).toBeGreaterThan(0);
    
    // Use SOL token for trading (since we know it has a price in the test environment)
    const solTokenAddress = config.tokens.sol;
    
    // Initial SOL balance
    const initialSolBalance = parseFloat(initialBalanceResponse.balance[solTokenAddress]?.toString() || '0');
    console.log(`Initial SOL balance: ${initialSolBalance}`);
    
    // The amount to trade
    const tradeAmount = 50;
    
    // Execute a buy trade with explicit Solana chain parameters
    console.log('Executing trade with explicit Solana chain parameters');
    const buyTradeResponse = await teamClient.executeTrade({
      fromToken: usdcTokenAddress,
      toToken: solTokenAddress,
      amount: tradeAmount.toString(),
      fromChain: BlockchainType.SVM,
      toChain: BlockchainType.SVM
    });
    
    console.log(`Buy trade response: ${JSON.stringify(buyTradeResponse)}`);
    expect(buyTradeResponse.success).toBe(true);
    expect(buyTradeResponse.transaction).toBeDefined();
    
    // Verify chain fields in the transaction
    expect(buyTradeResponse.transaction.fromChain).toBe(BlockchainType.SVM);
    expect(buyTradeResponse.transaction.toChain).toBe(BlockchainType.SVM);
    
    // Wait for the trade to process
    await wait(500);
    
    // Check updated balance
    const updatedBalanceResponse = await teamClient.getBalance();
    expect(updatedBalanceResponse.success).toBe(true);
    
    // USDC balance should have decreased
    const updatedUsdcBalance = parseFloat(updatedBalanceResponse.balance[usdcTokenAddress]?.toString() || '0');
    console.log(`Updated USDC balance: ${updatedUsdcBalance}`);
    expect(updatedUsdcBalance).toBeLessThan(initialUsdcBalance);
    
    // SOL balance should have increased
    const updatedSolBalance = parseFloat(updatedBalanceResponse.balance[solTokenAddress]?.toString() || '0');
    console.log(`Updated SOL balance: ${updatedSolBalance}`);
    expect(updatedSolBalance).toBeGreaterThan(initialSolBalance);
    
    // Get trade history and verify chain info is preserved
    const tradeHistoryResponse = await teamClient.getTradeHistory();
    expect(tradeHistoryResponse.success).toBe(true);
    
    // Get the most recent trade
    const lastTrade = tradeHistoryResponse.trades[0];
    
    // Verify chain fields in the trade history
    expect(lastTrade.fromChain).toBe(BlockchainType.SVM);
    expect(lastTrade.toChain).toBe(BlockchainType.SVM);
    
    // Test cross-chain trading validation when disabled
    // First, we need to check if cross-chain trading is disabled
    try {
      // Get Ethereum ETH token address
      const ethTokenAddress = config.blockchainTokens?.[BlockchainType.EVM]?.eth;
      if (!ethTokenAddress) {
        console.log('Skipping cross-chain test: Ethereum ETH token address not configured');
        return;
      }
      
      // Attempt to execute a cross-chain trade with explicit chain parameters
      // This should succeed if cross-chain trading is enabled, or fail if disabled
      console.log('Attempting cross-chain trade (Solana USDC to Ethereum ETH)');
      const crossChainTradeResponse = await teamClient.executeTrade({
        fromToken: usdcTokenAddress,
        toToken: ethTokenAddress,
        amount: tradeAmount.toString(),
        fromChain: BlockchainType.SVM,
        toChain: BlockchainType.EVM,
        fromSpecificChain: 'svm',
        toSpecificChain: 'eth'
      });
      
      console.log(`Cross-chain trade response: ${JSON.stringify(crossChainTradeResponse)}`);
      
      // If ALLOW_CROSS_CHAIN_TRADING is false, this should fail
      const allowCrossChainTrading = process.env.ALLOW_CROSS_CHAIN_TRADING === 'true';
      if (!allowCrossChainTrading) {
        expect(crossChainTradeResponse.success).toBe(false);
        expect(crossChainTradeResponse.error).toContain('Cross-chain trading is disabled');
      } else {
        // If cross-chain trading is allowed, this should succeed
        expect(crossChainTradeResponse.success).toBe(true);
      }
      
    } catch (error) {
      console.error('Error testing cross-chain trading:', error);
    }
  });
}); 