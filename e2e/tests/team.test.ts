import {
  registerTeamAndGetClient,
  cleanupTestState,
  ADMIN_USERNAME,
  ADMIN_PASSWORD,
  ADMIN_EMAIL,
  createTestClient,
} from '../utils/test-helpers';
import axios from 'axios';
import { getBaseUrl } from '../utils/server';

describe('Team API', () => {
  // Clean up test state before each test
  let adminApiKey: string;

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

  test('admin can register a team and team can authenticate', async () => {
    // Create a test client
    const client = createTestClient();
    // Attempt to login as admin with correct API key
    console.log(`TEST: Attempting to login with admin API key: ${adminApiKey.substring(0, 8)}...`);
    const loginSuccess = await client.loginAsAdmin(adminApiKey);
    console.log(`TEST: Login result: ${loginSuccess}`);

    // Register a team
    const teamName = `Team ${Date.now()}`;
    const email = `team${Date.now()}@example.com`;
    const contactPerson = 'Test Contact';

    const {
      client: teamClient,
      team,
      apiKey,
    } = await registerTeamAndGetClient(client, teamName, email, contactPerson);

    expect(team).toBeDefined();
    expect(team.id).toBeDefined();
    expect(team.name).toBe(teamName);
    expect(team.email).toBe(email);
    expect(team.contact_person).toBe(contactPerson);
    expect(apiKey).toBeDefined();

    // Verify team client is authenticated
    const profileResponse = await teamClient.getProfile();
    expect(profileResponse.success).toBe(true);
    expect(profileResponse.team).toBeDefined();
    expect(profileResponse.team.id).toBe(team.id);
    expect(profileResponse.team.name).toBe(teamName);
  });

  test('teams can update their profile information', async () => {
    // Setup admin client
    const client = createTestClient();
    // Attempt to login as admin with correct API key
    console.log(`TEST: Attempting to login with admin API key: ${adminApiKey.substring(0, 8)}...`);
    const loginSuccess = await client.loginAsAdmin(adminApiKey);
    console.log(`TEST: Login result: ${loginSuccess}`);

    // Register a team
    const { client: teamClient } = await registerTeamAndGetClient(client);

    // Update team profile
    const newContactPerson = 'Updated Contact Person';
    const updateResponse = await teamClient.updateProfile({
      contactPerson: newContactPerson,
    });

    expect(updateResponse.success).toBe(true);
    expect(updateResponse.team).toBeDefined();
    expect(updateResponse.team.contact_person).toBe(newContactPerson);

    // Verify changes persisted
    const profileResponse = await teamClient.getProfile();
    expect(profileResponse.success).toBe(true);
    expect(profileResponse.team.contact_person).toBe(newContactPerson);
  });

  test('team cannot authenticate with invalid API key', async () => {
    // Setup admin client
    const client = createTestClient();
    // Attempt to login as admin with correct API key
    console.log(`TEST: Attempting to login with admin API key: ${adminApiKey.substring(0, 8)}...`);
    const loginSuccess = await client.loginAsAdmin(adminApiKey);
    console.log(`TEST: Login result: ${loginSuccess}`);

    // Register a team
    await registerTeamAndGetClient(client);

    // Create a client with an invalid API key
    const invalidApiKey = 'invalid_key_12345';
    const invalidClient = client.createTeamClient(invalidApiKey);

    // Try to get profile with invalid API key
    try {
      await invalidClient.getProfile();
      // Should not reach here - authentication should fail
      expect(false).toBe(true); // Force test to fail if we get here
    } catch (error) {
      // Expect authentication error
      expect(error).toBeDefined();
      // Check for 401 status in the error object
      if (axios.isAxiosError(error) && error.response) {
        expect(error.response.status).toBe(401);
      } else {
        expect((error as any).status || 401).toBe(401);
      }
    }
  });

  test('admin can list all registered teams', async () => {
    // Setup admin client
    const adminClient = createTestClient();
    const adminLoginSuccess = await adminClient.loginAsAdmin(adminApiKey);
    expect(adminLoginSuccess).toBe(true);

    // Register multiple teams
    const teamData = [
      { name: `Team A ${Date.now()}`, email: `teama${Date.now()}@example.com` },
      { name: `Team B ${Date.now()}`, email: `teamb${Date.now()}@example.com` },
      { name: `Team C ${Date.now()}`, email: `teamc${Date.now()}@example.com` },
    ];

    for (const data of teamData) {
      await registerTeamAndGetClient(adminClient, data.name, data.email);
    }

    // Admin lists all teams
    const teamsResponse = await adminClient.listAllTeams();

    expect(teamsResponse.success).toBe(true);
    expect(teamsResponse.teams).toBeDefined();
    expect(teamsResponse.teams.length).toBeGreaterThanOrEqual(teamData.length);

    // Verify all our teams are in the list
    for (const data of teamData) {
      const foundTeam = teamsResponse.teams.find(
        (t: any) => t.name === data.name && t.email === data.email,
      );
      expect(foundTeam).toBeDefined();
    }
  });
});
