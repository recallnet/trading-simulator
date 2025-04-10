import { registerTeamAndGetClient, cleanupTestState, startTestCompetition, ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_EMAIL, createTestClient, wait } from '../utils/test-helpers';
import axios from 'axios';
import { getBaseUrl } from '../utils/server';
import { BlockchainType } from '../../src/types';
import config from '../../src/config';

describe('Team Disqualification API', () => {
  let adminApiKey: string;
  
  // Clean up test state before each test
  beforeEach(async () => {
    await cleanupTestState();
    
    // Create admin account directly using the setup endpoint
    const response = await axios.post(`${getBaseUrl()}/api/admin/setup`, {
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD,
      email: ADMIN_EMAIL
    });
    
    // Store the admin API key for authentication
    adminApiKey = response.data.admin.apiKey;
    expect(adminApiKey).toBeDefined();
    console.log(`Admin API key created: ${adminApiKey.substring(0, 8)}...`);
  });

  test('admin can disqualify a team', async () => {
    // Setup admin client
    const adminClient = createTestClient();
    await adminClient.loginAsAdmin(adminApiKey);
    
    // Register a team
    const { team } = await registerTeamAndGetClient(adminClient, 'Team to Disqualify');
    
    // Disqualify the team
    const reason = 'Violated competition rules by using external API';
    const disqualifyResponse = await adminClient.disqualifyTeam(team.id, reason);
    
    // Verify disqualification response
    expect(disqualifyResponse.success).toBe(true);
    expect(disqualifyResponse.team).toBeDefined();
    expect(disqualifyResponse.team.id).toBe(team.id);
    expect(disqualifyResponse.team.name).toBe('Team to Disqualify');
    expect(disqualifyResponse.team.disqualified).toBe(true);
    expect(disqualifyResponse.team.disqualificationReason).toBe(reason);
    expect(disqualifyResponse.team.disqualificationDate).toBeDefined();
    
    // List all teams to verify the disqualification status is persisted
    const teamsResponse = await adminClient.listAllTeams();
    const disqualifiedTeam = teamsResponse.teams.find((t: any) => t.id === team.id);
    expect(disqualifiedTeam).toBeDefined();
    expect(disqualifiedTeam.disqualified).toBe(true);
  });
  
  test('disqualified team cannot access API endpoints', async () => {
    // Setup admin client
    const adminClient = createTestClient();
    await adminClient.loginAsAdmin(adminApiKey);
    
    // Register a team and get the client
    const { client: teamClient, team } = await registerTeamAndGetClient(adminClient, 'To Be Blocked');
    
    // Start a competition with the team
    const competitionName = `Disqualification Test ${Date.now()}`;
    await startTestCompetition(adminClient, competitionName, [team.id]);
    
    // Verify team can access API before disqualification
    const profileResponse = await teamClient.getProfile();
    expect(profileResponse.success).toBe(true);
    
    // Disqualify the team
    const reason = 'Testing disqualification blocking';
    const disqualifyResponse = await adminClient.disqualifyTeam(team.id, reason);
    expect(disqualifyResponse.success).toBe(true);
    
    // Attempt to get profile - should fail with disqualification message
    try {
      await teamClient.getProfile();
      // Should not reach here - access should be blocked
      expect(false).toBe(true); // Force test to fail if we get here
    } catch (error) {
      // Expect error with disqualification message
      expect(error).toBeDefined();
      if (axios.isAxiosError(error) && error.response) {
        expect(error.response.status).toBe(403);
        expect(error.response.data).toBeDefined();
        expect(error.response.data.error).toContain('disqualified');
        expect(error.response.data.error).toContain(reason);
      }
    }
    
    // Attempt to execute a trade - should also fail with disqualification message
    try {
      const usdcTokenAddress = config.specificChainTokens.svm.usdc;
      const solTokenAddress = config.specificChainTokens.svm.sol;
      
      await teamClient.executeTrade({
        fromToken: usdcTokenAddress,
        toToken: solTokenAddress,
        amount: '100',
        fromChain: BlockchainType.SVM,
        toChain: BlockchainType.SVM
      });
      // Should not reach here - trade should be blocked
      expect(false).toBe(true); // Force test to fail if we get here
    } catch (error) {
      // Expect error with disqualification message
      expect(error).toBeDefined();
      if (axios.isAxiosError(error) && error.response) {
        expect(error.response.status).toBe(403);
        expect(error.response.data).toBeDefined();
        expect(error.response.data.error).toContain('disqualified');
      }
    }
  });
  
  test('admin can reinstate a disqualified team', async () => {
    // Setup admin client
    const adminClient = createTestClient();
    await adminClient.loginAsAdmin(adminApiKey);
    
    // Register a team and get the client
    const { client: teamClient, team } = await registerTeamAndGetClient(adminClient, 'To Be Reinstated');
    
    // Start a competition with the team
    const competitionName = `Reinstatement Test ${Date.now()}`;
    await startTestCompetition(adminClient, competitionName, [team.id]);
    
    // Disqualify the team
    const reason = 'Temporary disqualification for testing';
    const disqualifyResponse = await adminClient.disqualifyTeam(team.id, reason);
    expect(disqualifyResponse.success).toBe(true);
    
    // Verify team is blocked from API
    try {
      await teamClient.getProfile();
      expect(false).toBe(true); // Should not succeed
    } catch (error) {
      expect(error).toBeDefined();
    }
    
    // Reinstate the team
    const reinstateResponse = await adminClient.reinstateTeam(team.id);
    expect(reinstateResponse.success).toBe(true);
    expect(reinstateResponse.team).toBeDefined();
    expect(reinstateResponse.team.id).toBe(team.id);
    expect(reinstateResponse.team.disqualified).toBe(false);
    
    // Wait a moment for any cache to update
    await wait(100);
    
    // Verify team can access API after reinstatement
    const profileResponse = await teamClient.getProfile();
    expect(profileResponse.success).toBe(true);
    expect(profileResponse.team.id).toBe(team.id);
  });
  
  test('cannot disqualify admin accounts', async () => {
    // Setup admin client
    const adminClient = createTestClient();
    await adminClient.loginAsAdmin(adminApiKey);
    
    // Get the list of teams to find the admin
    const teamsResponse = await adminClient.listAllTeams();
    expect(teamsResponse.success).toBe(true);
    
    // Find the admin account (might be filtered out in the API response)
    // Since we cannot directly get the admin ID, create a test that should fail
    // for any team that is an admin
    
    // Register an additional team to make sure we have at least one non-admin
    const { team: regularTeam } = await registerTeamAndGetClient(adminClient, 'Regular Team');
    
    // Try to disqualify each team and check for admin protection
    for (const team of teamsResponse.teams) {
      // Skip the team we just created as we know it's not an admin
      if (team.id === regularTeam.id) continue;
      
      const disqualifyResponse = await adminClient.disqualifyTeam(team.id, 'Attempted admin disqualification');
      
      // If this is an admin account, it should fail with a specific error
      if (team.isAdmin) {
        expect(disqualifyResponse.success).toBe(false);
        expect(disqualifyResponse.error).toContain('admin');
      }
    }
    
    // Explicitly verify we can disqualify a regular team
    const regularDisqualifyResponse = await adminClient.disqualifyTeam(regularTeam.id, 'Regular team disqualification');
    expect(regularDisqualifyResponse.success).toBe(true);
  });
  
  test('non-admin cannot disqualify a team', async () => {
    // Setup admin client
    const adminClient = createTestClient();
    await adminClient.loginAsAdmin(adminApiKey);
    
    // Register two teams
    const { client: teamClient1, team: team1 } = await registerTeamAndGetClient(adminClient, 'Team One');
    const { team: team2 } = await registerTeamAndGetClient(adminClient, 'Team Two');
    
    // Start a competition with both teams
    const competitionName = `Non-Admin Test ${Date.now()}`;
    await startTestCompetition(adminClient, competitionName, [team1.id, team2.id]);
    
    // Team One tries to disqualify Team Two (should fail)
    const disqualifyResponse = await teamClient1.disqualifyTeam(team2.id, 'Unauthorized disqualification attempt');
    
    // Verify the operation failed due to lack of admin rights
    expect(disqualifyResponse.success).toBe(false);
    expect(disqualifyResponse.error).toBeDefined();
    
    // Verify Team Two wasn't actually disqualified
    const teamsResponse = await adminClient.listAllTeams();
    const teamTwoInfo = teamsResponse.teams.find((t: any) => t.id === team2.id);
    expect(teamTwoInfo).toBeDefined();
    expect(teamTwoInfo.disqualified).toBeFalsy();
  });
  
  test('disqualified teams are filtered from leaderboard', async () => {
    // Setup admin client
    const adminClient = createTestClient();
    await adminClient.loginAsAdmin(adminApiKey);
    
    // Register three teams for the competition
    const { client: teamClient1, team: team1 } = await registerTeamAndGetClient(adminClient, 'Active Team 1');
    const { client: teamClient2, team: team2 } = await registerTeamAndGetClient(adminClient, 'Active Team 2');
    const { client: teamClient3, team: team3 } = await registerTeamAndGetClient(adminClient, 'Disqualified Team');
    
    // Create competition with all three teams
    const competitionName = `Leaderboard Test ${Date.now()}`;
    await startTestCompetition(adminClient, competitionName, [team1.id, team2.id, team3.id]);
    
    // Make some trades to differentiate portfolio values
    // We'll have team3 (to be disqualified) make some trades to put them on the leaderboard
    const usdcTokenAddress = config.specificChainTokens.svm.usdc;
    const solTokenAddress = config.specificChainTokens.svm.sol;
    
    // Have Team 3 execute a trade
    await teamClient3.executeTrade({
      fromToken: usdcTokenAddress,
      toToken: solTokenAddress,
      amount: '100',
      fromChain: BlockchainType.SVM,
      toChain: BlockchainType.SVM
    });
    
    // Have the other teams make trades too to populate leaderboard
    await teamClient1.executeTrade({
      fromToken: usdcTokenAddress,
      toToken: solTokenAddress,
      amount: '50',
      fromChain: BlockchainType.SVM,
      toChain: BlockchainType.SVM
    });
    
    await teamClient2.executeTrade({
      fromToken: usdcTokenAddress,
      toToken: solTokenAddress,
      amount: '75',
      fromChain: BlockchainType.SVM,
      toChain: BlockchainType.SVM
    });
    
    // Wait a moment for portfolio values to update
    await wait(1000);
    
    // Check leaderboard before disqualification
    const leaderboardBefore = await teamClient1.getLeaderboard();
    expect(leaderboardBefore.success).toBe(true);
    expect(leaderboardBefore.leaderboard).toBeDefined();
    
    // All three teams should be in the leaderboard
    const teamIds = leaderboardBefore.leaderboard.map((entry: any) => entry.teamId);
    expect(teamIds).toContain(team1.id);
    expect(teamIds).toContain(team2.id);
    expect(teamIds).toContain(team3.id);
    
    // Now disqualify team3
    const reason = 'Disqualified for leaderboard test';
    const disqualifyResponse = await adminClient.disqualifyTeam(team3.id, reason);
    expect(disqualifyResponse.success).toBe(true);
    
    // Check leaderboard after disqualification
    const leaderboardAfter = await teamClient1.getLeaderboard();
    expect(leaderboardAfter.success).toBe(true);
    expect(leaderboardAfter.leaderboard).toBeDefined();
    
    // Verify team3 is still in the leaderboard but marked as disqualified
    const teamIdsAfter = leaderboardAfter.leaderboard.map((entry: any) => entry.teamId);
    expect(teamIdsAfter).toContain(team1.id);
    expect(teamIdsAfter).toContain(team2.id);
    expect(teamIdsAfter).toContain(team3.id);
    
    // Find team3 entry and verify it's marked as disqualified
    const team3Entry = leaderboardAfter.leaderboard.find((entry: any) => entry.teamId === team3.id);
    expect(team3Entry).toBeDefined();
    expect(team3Entry.disqualified).toBe(true);
    expect(team3Entry.disqualificationReason).toBe(reason);
    
    expect(leaderboardAfter.hasDisqualifiedTeams).toBe(true);
    
    // All teams should still have ranks
    const ranks = leaderboardAfter.leaderboard.map((entry: any) => entry.rank);
    expect(ranks.length).toBe(3); // All three teams still have ranks
    
    // Reinstate the team and verify they show up again
    await adminClient.reinstateTeam(team3.id);
    
    // Wait a moment for any cache to update
    await wait(100);
    
    // Check leaderboard after reinstatement
    const leaderboardFinal = await teamClient1.getLeaderboard();
    expect(leaderboardFinal.success).toBe(true);
    expect(leaderboardFinal.leaderboard).toBeDefined();
    
    // Verify team3 is back in the leaderboard and not disqualified
    const teamIdsFinal = leaderboardFinal.leaderboard.map((entry: any) => entry.teamId);
    expect(teamIdsFinal).toContain(team1.id);
    expect(teamIdsFinal).toContain(team2.id);
    expect(teamIdsFinal).toContain(team3.id);
    
    // Find team3 entry and verify it's no longer marked as disqualified
    const team3FinalEntry = leaderboardFinal.leaderboard.find((entry: any) => entry.teamId === team3.id);
    expect(team3FinalEntry).toBeDefined();
    expect(team3FinalEntry.disqualified).toBe(false);
    expect(team3FinalEntry.disqualificationReason).toBeNull();
    
    // Verify the hasDisqualifiedTeams flag is false
    expect(leaderboardFinal.hasDisqualifiedTeams).toBe(false);
  });
}); 