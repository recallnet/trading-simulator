import {
  createTestClient,
  registerTeamAndGetClient,
  startTestCompetition,
  cleanupTestState,
  ADMIN_USERNAME,
  ADMIN_PASSWORD,
  ADMIN_EMAIL,
} from '../utils/test-helpers';
import axios from 'axios';
import { getBaseUrl } from '../utils/server';
import { getPool } from '../utils/db-manager';
import { BalancesResponse } from '../utils/api-types';
import { config } from '../../src/config';

describe('Specific Chains', () => {
  let adminApiKey: string;

  // Clean up test state before each test
  beforeEach(async () => {
    await cleanupTestState();

    // Create admin account directly using the setup endpoint
    const response = await axios.post(`${getBaseUrl()}/api/admin/setup`, {
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD,
      email: ADMIN_EMAIL,
    });

    // Store the admin API key for authentication
    adminApiKey = response.data.admin.apiKey;
    expect(adminApiKey).toBeDefined();
    console.log(`Admin API key created: ${adminApiKey.substring(0, 8)}...`);
  });

  test('specificChain is correctly entered into balances when team is initialized in competition', async () => {
    // Setup admin client
    const adminClient = createTestClient();
    await adminClient.loginAsAdmin(adminApiKey);

    // Register a new team
    const { client: teamClient, team } = await registerTeamAndGetClient(adminClient, 'Team 1');

    // Start a competition with the team
    const competitionName = `Specific Chain Test ${Date.now()}`;
    await startTestCompetition(adminClient, competitionName, [team.id]);

    // Get the database connection
    const pool = getPool();

    // Query the balances table to check if specificChain was correctly populated
    const balancesResult = await pool.query(
      'SELECT token_address, amount, specific_chain FROM balances WHERE team_id = $1 ORDER BY specific_chain, token_address',
      [team.id],
    );

    // Verify we have balances records
    expect(balancesResult.rows.length).toBeGreaterThan(0);

    // Verify each expected balance is found with the correct specificChain value
    // Verify each token address has the correct specificChain based on config
    for (const row of balancesResult.rows) {
      const tokenAddress = row.token_address.toLowerCase();
      const assignedChain = row.specific_chain;

      // Find which chain this token should belong to according to config
      let expectedChain = null;

      // Check each chain in the config to find a match for this token
      for (const [chain, tokenMap] of Object.entries(config.specificChainTokens)) {
        // Check if any token address in this chain matches our token
        const tokenAddresses = Object.values(tokenMap);

        if (
          tokenAddresses.some(
            (address) => typeof address === 'string' && address.toLowerCase() === tokenAddress,
          )
        ) {
          expectedChain = chain;
          break;
        }
      }

      // Assert that the chain in the database matches what we expect from config
      expect(assignedChain).toBe(expectedChain);
      console.log(`Token ${tokenAddress} correctly assigned to chain ${assignedChain}`);
    }

    // Check if prices table also has correct specificChain values
    const pricesResult = await pool.query(
      'SELECT token, specific_chain FROM prices WHERE specific_chain IS NOT NULL ORDER BY specific_chain, token',
    );

    // Verify we have prices records with specificChain
    expect(pricesResult.rows.length).toBeGreaterThan(0);

    // Verify that each token in balances has a corresponding price entry with matching specificChain
    for (const balance of balancesResult.rows) {
      const matchingPrices = pricesResult.rows.filter(
        (price: { token: string; specific_chain: string }) =>
          price.token === balance.token_address && price.specific_chain === balance.specific_chain,
      );

      // Each token should have at least one price entry with matching specificChain
      expect(matchingPrices.length).toBeGreaterThanOrEqual(1);
    }
  });

  test('specificChain is correctly recorded in trades table when executing trades', async () => {
    // Setup admin client
    const adminClient = createTestClient();
    await adminClient.loginAsAdmin(adminApiKey);

    // Register a new team
    const { client: teamClient, team } = await registerTeamAndGetClient(adminClient, 'Team 2');

    // Start a competition with the team
    const competitionName = `Trade Chain Test ${Date.now()}`;
    await startTestCompetition(adminClient, competitionName, [team.id]);

    // Get team's current balances
    const balanceResponse = (await teamClient.getBalance()) as BalancesResponse;
    expect(balanceResponse.success).toBe(true);

    // Find ETH and USDC tokens for a trade using config addresses
    let ethToken: string | undefined;
    let usdcToken: string | undefined;

    // Get ETH and USDC token addresses from config
    const ethAddress = config.specificChainTokens.eth.eth;
    const usdcAddress = config.specificChainTokens.eth.usdc;

    if (Array.isArray(balanceResponse.balances)) {
      // Find the tokens in the balances array using the config addresses
      const ethBalance = balanceResponse.balances.find(
        (balance) => balance.token.toLowerCase() === ethAddress.toLowerCase(),
      );

      const usdcBalance = balanceResponse.balances.find(
        (balance) => balance.token.toLowerCase() === usdcAddress.toLowerCase(),
      );

      if (ethBalance) ethToken = ethBalance.token;
      if (usdcBalance) usdcToken = usdcBalance.token;

      console.log(`Looking for ETH token (${ethAddress}) and USDC token (${usdcAddress})`);
      console.log(`Found ETH token: ${ethToken}, USDC token: ${usdcToken}`);
    }

    // Make sure we found both tokens
    expect(ethToken).toBeDefined();
    expect(usdcToken).toBeDefined();

    // Skip the test if we couldn't find the tokens (typescript safety)
    if (!ethToken || !usdcToken) {
      console.log('Could not find ETH and USDC tokens in balances, skipping test');
      return;
    }

    // Execute a trade from ETH to USDC
    const tradeAmount = '0.01'; // Trade a small amount of ETH
    const tradeResponse = await teamClient.executeTrade({
      fromToken: ethToken,
      toToken: usdcToken,
      amount: tradeAmount,
    });
    expect(tradeResponse.success).toBe(true);

    // Get the database connection
    const pool = getPool();

    // Query the trades table to check if specificChain fields were correctly populated
    const tradesResult = await pool.query(
      'SELECT from_token, to_token, from_specific_chain, to_specific_chain FROM trades WHERE team_id = $1',
      [team.id],
    );

    // Verify we have a trade record
    expect(tradesResult.rows.length).toBe(1);

    // Verify the specificChain fields were correctly populated
    const trade = tradesResult.rows[0];
    expect(trade.from_specific_chain).toBe('eth');
    expect(trade.to_specific_chain).toBe('eth');
    expect(trade.from_token).toBe(ethToken);
    expect(trade.to_token).toBe(usdcToken);
  });

  test('specificChain is correctly recorded in portfolio_token_values when taking snapshots', async () => {
    // Setup admin client
    const adminClient = createTestClient();
    await adminClient.loginAsAdmin(adminApiKey);

    // Register a new team
    const { client: teamClient, team } = await registerTeamAndGetClient(
      adminClient,
      'Team Portfolio',
    );

    // Start a competition with the team
    const competitionName = `Portfolio Chain Test ${Date.now()}`;
    const competition = await startTestCompetition(adminClient, competitionName, [team.id]);

    // Get the competition ID
    const competitionId = competition.competition.id;

    // Manually trigger a portfolio snapshot
    await adminClient.request('post', `/api/admin/competition/${competitionId}/snapshot`);

    // Wait briefly for snapshot to complete
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Get the database connection
    const pool = getPool();

    // Find the most recent portfolio snapshot for this team
    const snapshotResult = await pool.query(
      'SELECT id FROM portfolio_snapshots WHERE team_id = $1 ORDER BY timestamp DESC LIMIT 1',
      [team.id],
    );

    expect(snapshotResult.rows.length).toBe(1);
    const snapshotId = snapshotResult.rows[0].id;

    // Query the portfolio_token_values table to check if specificChain was correctly populated
    const tokenValuesResult = await pool.query(
      'SELECT token_address, specific_chain FROM portfolio_token_values WHERE portfolio_snapshot_id = $1',
      [snapshotId],
    );

    // Verify we have portfolio token value records
    expect(tokenValuesResult.rows.length).toBeGreaterThan(0);

    // Verify each token has the correct specific_chain based on config
    for (const row of tokenValuesResult.rows) {
      const tokenAddress = row.token_address.toLowerCase();
      const assignedChain = row.specific_chain;

      // Find which chain this token should belong to according to config
      let expectedChain = null;

      // Check each chain in the config to find a match for this token
      for (const [chain, tokenMap] of Object.entries(config.specificChainTokens)) {
        // Check if any token address in this chain matches our token
        const tokenAddresses = Object.values(tokenMap);

        if (
          tokenAddresses.some(
            (address) => typeof address === 'string' && address.toLowerCase() === tokenAddress,
          )
        ) {
          expectedChain = chain;
          break;
        }
      }

      // If no specific chain was found in config, it should default to a sensible value
      if (!expectedChain) {
        expectedChain = tokenAddress.startsWith('0x') ? 'eth' : 'svm';
      }

      // Assert that the chain in the database matches what we expect from config
      expect(assignedChain).toBe(expectedChain);
      console.log(`Portfolio token ${tokenAddress} correctly assigned to chain ${assignedChain}`);
    }
  });
});
