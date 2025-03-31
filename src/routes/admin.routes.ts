import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { adminAuthMiddleware } from '../middleware/admin-auth.middleware';
import { services } from '../services';

const router = Router();

/**
 * @openapi
 * /api/admin/setup:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Set up initial admin account
 *     description: Creates the first admin account. This endpoint is only available when no admin exists in the system.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *               - email
 *             properties:
 *               username:
 *                 type: string
 *                 description: Admin username
 *                 example: admin
 *               password:
 *                 type: string
 *                 description: Admin password (minimum 8 characters)
 *                 format: password
 *                 example: password123
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Admin email address
 *                 example: admin@example.com
 *     responses:
 *       201:
 *         description: Admin account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Operation success status
 *                 message:
 *                   type: string
 *                   description: Success message
 *                 admin:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Admin ID
 *                     username:
 *                       type: string
 *                       description: Admin username
 *                     email:
 *                       type: string
 *                       description: Admin email
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       description: Account creation timestamp
 *       400:
 *         description: Missing required parameters or password too short
 *       403:
 *         description: Admin setup not allowed - an admin account already exists
 *       500:
 *         description: Server error
 */
router.post('/setup', AdminController.setupAdmin);

// Apply admin auth middleware to protected routes - pass the teamManager instance
router.use(adminAuthMiddleware(services.teamManager));

/**
 * @openapi
 * /api/admin/teams/register:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Register a new team
 *     description: Admin-only endpoint to register a new team. Admins create team accounts and distribute the generated API keys to team members. Teams cannot register themselves.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - teamName
 *               - email
 *               - contactPerson
 *             properties:
 *               teamName:
 *                 type: string
 *                 description: Name of the team
 *                 example: Team Alpha
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Team email address
 *                 example: team@example.com
 *               contactPerson:
 *                 type: string
 *                 description: Name of the contact person
 *                 example: John Doe
 *     responses:
 *       201:
 *         description: Team registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Operation success status
 *                 team:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Team ID
 *                     name:
 *                       type: string
 *                       description: Team name
 *                     email:
 *                       type: string
 *                       description: Team email
 *                     contactPerson:
 *                       type: string
 *                       description: Contact person name
 *                     contact_person:
 *                       type: string
 *                       description: Contact person name (snake_case version)
 *                     apiKey:
 *                       type: string
 *                       description: API key for the team to use with Bearer authentication. Admin should securely provide this to the team.
 *                       example: abc123def456_ghi789jkl012
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       description: Account creation timestamp
 *       400:
 *         description: Missing required parameters
 *       409:
 *         description: Team with this email already exists
 *       500:
 *         description: Server error
 */
router.post('/teams/register', AdminController.registerTeam);

/**
 * @openapi
 * /api/admin/teams:
 *   get:
 *     tags:
 *       - Admin
 *     summary: List all teams
 *     description: Get a list of all non-admin teams
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of teams
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Operation success status
 *                 teams:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Team ID
 *                       name:
 *                         type: string
 *                         description: Team name
 *                       email:
 *                         type: string
 *                         description: Team email
 *                       contact_person:
 *                         type: string
 *                         description: Contact person name
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: Account creation timestamp
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         description: Account update timestamp
 *       401:
 *         description: Unauthorized - Admin authentication required
 *       500:
 *         description: Server error
 */
router.get('/teams', AdminController.listAllTeams);

/**
 * @openapi
 * /api/admin/teams/{teamId}:
 *   delete:
 *     tags:
 *       - Admin
 *     summary: Delete a team
 *     description: Permanently delete a team and all associated data
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the team to delete
 *     responses:
 *       200:
 *         description: Team deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Operation success status
 *                 message:
 *                   type: string
 *                   description: Success message
 *       400:
 *         description: Team ID is required
 *       401:
 *         description: Unauthorized - Admin authentication required
 *       403:
 *         description: Cannot delete admin accounts
 *       404:
 *         description: Team not found
 *       500:
 *         description: Server error
 */
router.delete('/teams/:teamId', AdminController.deleteTeam);

/**
 * @openapi
 * /api/admin/competition/start:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Start a competition
 *     description: Create and start a new trading competition with specified teams
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - teamIds
 *             properties:
 *               name:
 *                 type: string
 *                 description: Competition name
 *                 example: Spring 2023 Trading Competition
 *               description:
 *                 type: string
 *                 description: Competition description
 *                 example: A trading competition for the spring semester
 *               teamIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of team IDs to include in the competition
 *     responses:
 *       200:
 *         description: Competition started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Operation success status
 *                 competition:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Competition ID
 *                     name:
 *                       type: string
 *                       description: Competition name
 *                     description:
 *                       type: string
 *                       description: Competition description
 *                     startDate:
 *                       type: string
 *                       format: date-time
 *                       description: Competition start date
 *                     endDate:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       description: Competition end date (null if not ended)
 *                     status:
 *                       type: string
 *                       enum: [pending, active, completed]
 *                       description: Competition status
 *                     teamIds:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Team IDs participating in the competition
 *       400:
 *         description: Missing required parameters
 *       401:
 *         description: Unauthorized - Admin authentication required
 *       500:
 *         description: Server error
 */
router.post('/competition/start', AdminController.startCompetition);

/**
 * @openapi
 * /api/admin/competition/end:
 *   post:
 *     tags:
 *       - Admin
 *     summary: End a competition
 *     description: End an active competition and finalize the results
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - competitionId
 *             properties:
 *               competitionId:
 *                 type: string
 *                 description: ID of the competition to end
 *     responses:
 *       200:
 *         description: Competition ended successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Operation success status
 *                 competition:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Competition ID
 *                     name:
 *                       type: string
 *                       description: Competition name
 *                     description:
 *                       type: string
 *                       description: Competition description
 *                     startDate:
 *                       type: string
 *                       format: date-time
 *                       description: Competition start date
 *                     endDate:
 *                       type: string
 *                       format: date-time
 *                       description: Competition end date
 *                     status:
 *                       type: string
 *                       enum: [pending, active, completed]
 *                       description: Competition status (completed)
 *                 leaderboard:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       teamId:
 *                         type: string
 *                         description: Team ID
 *                       value:
 *                         type: number
 *                         description: Final portfolio value
 *       400:
 *         description: Missing competitionId parameter
 *       401:
 *         description: Unauthorized - Admin authentication required
 *       404:
 *         description: Competition not found
 *       500:
 *         description: Server error
 */
router.post('/competition/end', AdminController.endCompetition);

/**
 * @openapi
 * /api/admin/competition/{competitionId}/snapshots:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get competition snapshots
 *     description: Get portfolio snapshots for a competition, optionally filtered by team
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: competitionId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the competition
 *       - in: query
 *         name: teamId
 *         schema:
 *           type: string
 *         required: false
 *         description: Optional team ID to filter snapshots
 *     responses:
 *       200:
 *         description: Competition snapshots
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Operation success status
 *                 snapshots:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Snapshot ID
 *                       competitionId:
 *                         type: string
 *                         description: Competition ID
 *                       teamId:
 *                         type: string
 *                         description: Team ID
 *                       totalValue:
 *                         type: number
 *                         description: Total portfolio value at snapshot time
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                         description: Snapshot timestamp
 *       400:
 *         description: Missing competitionId or team not in competition
 *       401:
 *         description: Unauthorized - Admin authentication required
 *       404:
 *         description: Competition or team not found
 *       500:
 *         description: Server error
 */
router.get('/competition/:competitionId/snapshots', AdminController.getCompetitionSnapshots);

/**
 * @openapi
 * /api/admin/reports/performance:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get performance reports
 *     description: Get performance reports and leaderboard for a competition
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: competitionId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the competition
 *     responses:
 *       200:
 *         description: Performance reports
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Operation success status
 *                 competition:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Competition ID
 *                     name:
 *                       type: string
 *                       description: Competition name
 *                     description:
 *                       type: string
 *                       description: Competition description
 *                     startDate:
 *                       type: string
 *                       format: date-time
 *                       description: Competition start date
 *                     endDate:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       description: Competition end date
 *                     status:
 *                       type: string
 *                       enum: [pending, active, completed]
 *                       description: Competition status
 *                 leaderboard:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       rank:
 *                         type: integer
 *                         description: Team rank on the leaderboard
 *                       teamId:
 *                         type: string
 *                         description: Team ID
 *                       teamName:
 *                         type: string
 *                         description: Team name
 *                       portfolioValue:
 *                         type: number
 *                         description: Portfolio value
 *       400:
 *         description: Missing competitionId parameter
 *       401:
 *         description: Unauthorized - Admin authentication required
 *       404:
 *         description: Competition not found
 *       500:
 *         description: Server error
 */
router.get('/reports/performance', AdminController.getPerformanceReports);

export default router; 