import { createTestClient, registerTeamAndGetClient, startTestCompetition, cleanupTestState, ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_EMAIL } from '../utils/test-helpers';
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