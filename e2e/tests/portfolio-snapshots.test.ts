import { setupAdminClient, registerTeamAndGetClient, startTestCompetition, cleanupTestState, wait, ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_EMAIL } from '../utils/test-helpers';
import axios from 'axios';
import { getBaseUrl } from '../utils/server';
import config from '../../src/config';
import { services } from '../../src/services';
import { DatabaseConnection } from '../../src/database/connection';

describe('Portfolio Snapshots', () => {
  // Reset database between tests
  beforeEach(async () => {
    // Clean up test state
    await cleanupTestState();
    
    // Create admin account
    await axios.post(`${getBaseUrl()}/api/admin/setup`, {
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD,
      email: ADMIN_EMAIL
    });
  });
  
  // Clean up resources after all tests
  afterAll(async () => {
    try {
      console.log('[Test] Starting resource cleanup...');
      
      // Stop the scheduler to prevent ongoing database connections
      if (services.scheduler) {
        console.log('[Test] Stopping scheduler service...');
        services.scheduler.stopSnapshotScheduler();
      }
      
      // Get the database connection instance
      const dbConnection = DatabaseConnection.getInstance();
      
      // Add a small delay to allow any pending operations to complete
      console.log('[Test] Waiting for pending operations to complete...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Close the database connection pool
      console.log('[Test] Closing database connection pool...');
      await dbConnection.close();
      
      console.log('[Test] Cleaned up resources - scheduler stopped and database connections closed');
    } catch (error) {
      console.error('[Test] Error during cleanup:', error);
    }
  });

  // Test that a snapshot is taken when a competition starts
  test('takes a snapshot when a competition starts', async () => {
    // Setup admin client
    const adminClient = await setupAdminClient();
    
    // Register team and get client
    const { client: teamClient, team } = await registerTeamAndGetClient(adminClient, 'Snapshot Test Team');
    
    // Start a competition with our team
    const competitionName = `Snapshot Test ${Date.now()}`;
    const startResult = await startTestCompetition(adminClient, competitionName, [team.id]);
    
    // Wait for operations to complete
    await wait(500);
    
    // Get the competition ID
    const competitionId = startResult.competition.id;
    
    // Verify that a portfolio snapshot was taken for the team
    const snapshotsResponse = await adminClient.request('get', `/api/admin/competition/${competitionId}/snapshots`);
    
    expect(snapshotsResponse.success).toBe(true);
    expect(snapshotsResponse.snapshots).toBeDefined();
    expect(snapshotsResponse.snapshots.length).toBeGreaterThan(0);
    
    // Verify the snapshot has the correct team ID and competition ID
    const snapshot = snapshotsResponse.snapshots[0];
    expect(snapshot.teamId).toBe(team.id);
    expect(snapshot.competitionId).toBe(competitionId);
    
    // Verify the snapshot has token values
    expect(snapshot.valuesByToken).toBeDefined();
    expect(Object.keys(snapshot.valuesByToken).length).toBeGreaterThan(0);
  });

  // Test that snapshots can be taken manually
  test('manually taking snapshots creates new portfolio snapshots', async () => {
    // Setup admin client
    const adminClient = await setupAdminClient();
    
    // Register team and get client
    const { client: teamClient, team } = await registerTeamAndGetClient(adminClient, 'Periodic Snapshot Team');
    
    // Start a competition with our team
    const competitionName = `Periodic Snapshot Test ${Date.now()}`;
    const startResult = await startTestCompetition(adminClient, competitionName, [team.id]);
    
    // Get the competition ID
    const competitionId = startResult.competition.id;
    
    // Wait for initial snapshot to be taken
    await wait(500);
    
    // Initial snapshot count
    const initialSnapshotsResponse = await adminClient.request('get', `/api/admin/competition/${competitionId}/snapshots`);
    const initialSnapshotCount = initialSnapshotsResponse.snapshots.length;
    
    // Force a snapshot directly
    await services.competitionManager.takePortfolioSnapshots(competitionId);
    
    // Wait for snapshot to be processed
    await wait(500);
    
    // Get snapshots again
    const afterFirstSnapshotResponse = await adminClient.request('get', `/api/admin/competition/${competitionId}/snapshots`);
    const afterFirstSnapshotCount = afterFirstSnapshotResponse.snapshots.length;
    
    // Should have at least one more snapshot (account for potential auto snapshots)
    expect(afterFirstSnapshotCount).toBeGreaterThan(initialSnapshotCount);
    
    // Store the current count for next comparison
    const countAfterFirstManualSnapshot = afterFirstSnapshotCount;
    
    // Force another snapshot
    await services.competitionManager.takePortfolioSnapshots(competitionId);
    
    // Wait for snapshot to be processed
    await wait(500);
    
    // Get snapshots again
    const afterSecondSnapshotResponse = await adminClient.request('get', `/api/admin/competition/${competitionId}/snapshots`);
    const afterSecondSnapshotCount = afterSecondSnapshotResponse.snapshots.length;
    
    // Should have at least one more snapshot than after the first manual snapshot
    expect(afterSecondSnapshotCount).toBeGreaterThan(countAfterFirstManualSnapshot);
  });

  // Test that a snapshot is taken when a competition ends
  test('takes a snapshot when a competition ends', async () => {
    // Setup admin client
    const adminClient = await setupAdminClient();
    
    // Register team and get client
    const { client: teamClient, team } = await registerTeamAndGetClient(adminClient, 'End Snapshot Team');
    
    // Start a competition with our team
    const competitionName = `End Snapshot Test ${Date.now()}`;
    const startResult = await startTestCompetition(adminClient, competitionName, [team.id]);
    
    // Get the competition ID
    const competitionId = startResult.competition.id;
    
    // Wait for initial snapshot to be taken
    await wait(500);
    
    // Execute a trade to change the portfolio composition
    const usdcTokenAddress = config.tokens.usdc;
    const solTokenAddress = config.tokens.sol;
    
    await teamClient.executeTrade({
      tokenAddress: solTokenAddress,
      side: 'buy',
      amount: '100',
      price: '1.0'
    });
    
    // Wait for trade to process
    await wait(500);
    
    // Get snapshot count before ending
    const beforeEndResponse = await adminClient.request('get', `/api/admin/competition/${competitionId}/snapshots`);
    const beforeEndCount = beforeEndResponse.snapshots.length;
    
    // End the competition
    const endResult = await adminClient.endCompetition(competitionId);
    
    // Wait for operations to complete
    await wait(500);
    
    // Get snapshots after ending
    const afterEndResponse = await adminClient.request('get', `/api/admin/competition/${competitionId}/snapshots`);
    const afterEndCount = afterEndResponse.snapshots.length;
    
    // Should have at least one more snapshot
    expect(afterEndCount).toBeGreaterThan(beforeEndCount);
    
    // Verify the final snapshot has current portfolio values
    const finalSnapshot = afterEndResponse.snapshots[afterEndResponse.snapshots.length - 1];
    expect(finalSnapshot.valuesByToken[solTokenAddress]).toBeDefined();
    expect(finalSnapshot.valuesByToken[solTokenAddress].amount).toBeGreaterThan(0);
  });

  // Test portfolio value calculation accuracy
  test('calculates portfolio value correctly based on token prices', async () => {
    // Setup admin client
    const adminClient = await setupAdminClient();
    
    // Register team and get client
    const { client: teamClient, team } = await registerTeamAndGetClient(adminClient, 'Value Calc Team');
    
    // Start a competition with our team
    const competitionName = `Value Calculation Test ${Date.now()}`;
    const startResult = await startTestCompetition(adminClient, competitionName, [team.id]);
    
    // Get the competition ID
    const competitionId = startResult.competition.id;
    
    // Wait for initial snapshot to be taken
    await wait(500);
    
    // Get initial balances
    const initialBalanceResponse = await teamClient.getBalance();
    const usdcTokenAddress = config.tokens.usdc;
    const initialUsdcBalance = parseFloat(initialBalanceResponse.balance[usdcTokenAddress]?.toString() || '0');
    
    // Get token price
    const priceResponse = await axios.get(`${getBaseUrl()}/api/price?token=${usdcTokenAddress}`);
    const usdcPrice = parseFloat(priceResponse.data.price);
    
    // Get initial snapshot
    const initialSnapshotsResponse = await adminClient.request('get', `/api/admin/competition/${competitionId}/snapshots`);
    const initialSnapshot = initialSnapshotsResponse.snapshots[0];
    
    // Verify the USDC value is calculated correctly
    const usdcValue = initialSnapshot.valuesByToken[usdcTokenAddress];
    expect(usdcValue.amount).toBeCloseTo(initialUsdcBalance);
    expect(usdcValue.valueUsd).toBeCloseTo(initialUsdcBalance * usdcPrice, 2);
    
    // Verify total portfolio value is the sum of all token values
    const totalValue = Object.values(initialSnapshot.valuesByToken).reduce(
      (sum: number, token: any) => sum + token.valueUsd,
      0
    );
    expect(initialSnapshot.totalValue).toBeCloseTo(totalValue, 2);
  });
}); 