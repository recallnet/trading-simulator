import { createTestClient, registerTeamAndGetClient, startTestCompetition, createTestCompetition, startExistingTestCompetition, cleanupTestState, ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_EMAIL } from '../utils/test-helpers';
import axios from 'axios';
import { getBaseUrl } from '../utils/server';

describe('Competition API', () => {
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
  
  test('should start a competition with registered teams', async () => {
    // Setup admin client
    const adminClient = createTestClient();
    await adminClient.loginAsAdmin(adminApiKey);
    
    // Register teams
    const { team: team1 } = await registerTeamAndGetClient(adminClient, 'Team Alpha');
    const { team: team2 } = await registerTeamAndGetClient(adminClient, 'Team Beta');
    
    // Start a competition
    const competitionName = `Test Competition ${Date.now()}`;
    const competitionResponse = await startTestCompetition(
      adminClient, 
      competitionName, 
      [team1.id, team2.id]
    );
    
    // Verify competition was started
    const competition = competitionResponse.competition;
    expect(competition).toBeDefined();
    expect(competition.name).toBe(competitionName);
    expect(competition.status).toBe('ACTIVE');
    expect(competition.teamIds).toContain(team1.id);
    expect(competition.teamIds).toContain(team2.id);
  });
  
  test('should create a competition without starting it', async () => {
    // Setup admin client
    const adminClient = createTestClient();
    await adminClient.loginAsAdmin(adminApiKey);
    
    // Create a competition without starting it
    const competitionName = `Pending Competition ${Date.now()}`;
    const competitionResponse = await createTestCompetition(
      adminClient, 
      competitionName
    );
    
    // Verify competition was created in PENDING state
    const competition = competitionResponse.competition;
    expect(competition).toBeDefined();
    expect(competition.name).toBe(competitionName);
    expect(competition.status).toBe('PENDING');
    expect(competition.startDate).toBeNull();
    expect(competition.endDate).toBeNull();
  });
  
  test('should start an existing competition with teams', async () => {
    // Setup admin client
    const adminClient = createTestClient();
    await adminClient.loginAsAdmin(adminApiKey);
    
    // Register teams
    const { team: team1 } = await registerTeamAndGetClient(adminClient, 'Team Delta');
    const { team: team2 } = await registerTeamAndGetClient(adminClient, 'Team Echo');
    
    // Create a competition without starting it
    const competitionName = `Two-Stage Competition ${Date.now()}`;
    const createResponse = await createTestCompetition(
      adminClient, 
      competitionName
    );
    
    // Verify competition was created in PENDING state
    const pendingCompetition = createResponse.competition;
    expect(pendingCompetition).toBeDefined();
    expect(pendingCompetition.status).toBe('PENDING');
    
    // Now start the existing competition
    const startResponse = await startExistingTestCompetition(
      adminClient,
      pendingCompetition.id,
      [team1.id, team2.id]
    );
    
    // Verify competition was started
    const activeCompetition = startResponse.competition;
    expect(activeCompetition).toBeDefined();
    expect(activeCompetition.id).toBe(pendingCompetition.id);
    expect(activeCompetition.name).toBe(competitionName);
    expect(activeCompetition.status).toBe('ACTIVE');
    expect(activeCompetition.startDate).toBeDefined();
    expect(activeCompetition.teamIds).toContain(team1.id);
    expect(activeCompetition.teamIds).toContain(team2.id);
  });
  
  test('should not allow starting a non-pending competition', async () => {
    // Setup admin client
    const adminClient = createTestClient();
    await adminClient.loginAsAdmin(adminApiKey);
    
    // Register teams
    const { team: team1 } = await registerTeamAndGetClient(adminClient, 'Team Foxtrot');
    const { team: team2 } = await registerTeamAndGetClient(adminClient, 'Team Golf');
    
    // Create and start a competition
    const competitionName = `Already Active Competition ${Date.now()}`;
    const startResponse = await startTestCompetition(
      adminClient, 
      competitionName, 
      [team1.id]
    );
    
    const activeCompetition = startResponse.competition;
    expect(activeCompetition.status).toBe('ACTIVE');
    
    // Try to start the same competition again
    try {
      await startExistingTestCompetition(
        adminClient,
        activeCompetition.id,
        [team1.id, team2.id]
      );
      
      // Should not reach this line
      expect(false).toBe(true);
    } catch (error) {
      // Expect an error because the competition is already active
      expect(error).toBeDefined();
      expect((error as Error).message).toContain('Failed to start existing competition');
    }
    
    // Verify through direct API call to see the actual error
    try {
      await adminClient.startExistingCompetition(activeCompetition.id, [team1.id, team2.id]);
    } catch (error: any) {
      expect(error.success).toBe(false);
      expect(error.error).toContain('ACTIVE');
    }
  });
  
  test('teams can view competition status and leaderboard', async () => {
    // Setup admin client and register a team
    const adminClient = createTestClient();
    await adminClient.loginAsAdmin(adminApiKey);
    
    const { client: teamClient, team } = await registerTeamAndGetClient(adminClient, 'Team Gamma');
    
    // Admin starts a competition with the team
    const competitionName = `Viewable Competition ${Date.now()}`;
    const competitionResponse = await startTestCompetition(adminClient, competitionName, [team.id]);
    const competitionId = competitionResponse.competition.id;
    
    // Team checks competition status
    const statusResponse = await teamClient.getCompetitionStatus();
    expect(statusResponse.success).toBe(true);
    expect(statusResponse.competition).toBeDefined();
    expect(statusResponse.competition.name).toBe(competitionName);
    expect(statusResponse.competition.status).toBe('ACTIVE');
    
    // Team checks leaderboard
    const leaderboardResponse = await teamClient.getLeaderboard();
    expect(leaderboardResponse.success).toBe(true);
    expect(leaderboardResponse.leaderboard).toBeDefined();
    expect(leaderboardResponse.leaderboard).toBeInstanceOf(Array);
    
    // There should be one team in the leaderboard
    expect(leaderboardResponse.leaderboard.length).toBe(1);
    
    // The team should be in the leaderboard
    const teamInLeaderboard = leaderboardResponse.leaderboard.find(
      (entry: any) => entry.teamName === 'Team Gamma'
    );
    expect(teamInLeaderboard).toBeDefined();
  });
  
  test('teams cannot access competitions they are not part of', async () => {
    // Setup admin client
    const adminClient = createTestClient();
    await adminClient.loginAsAdmin(adminApiKey);
    
    // Register teams - one in the competition, one not
    const { client: teamInClient, team: teamIn } = await registerTeamAndGetClient(adminClient, 'Inside Team');
    const { client: teamOutClient } = await registerTeamAndGetClient(adminClient, 'Outside Team');
    
    // Start a competition with only one team
    await startTestCompetition(adminClient, `Exclusive Competition ${Date.now()}`, [teamIn.id]);
    
    // Team in competition checks status - should succeed
    const statusInResponse = await teamInClient.getCompetitionStatus();
    expect(statusInResponse.success).toBe(true);
    expect(statusInResponse.competition).toBeDefined();
    
    // Team not in competition checks status - should show no active competition
    const statusOutResponse = await teamOutClient.getCompetitionStatus();
    expect(statusOutResponse.success).toBe(true);
    expect(statusOutResponse.competition).toBeNull();
  });
}); 