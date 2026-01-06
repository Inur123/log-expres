import { Router } from "express";
import { store, getLogs, verifyChain } from "../controllers/logController";
import { storeWithQueue } from "../controllers/logQueueController";
import { createApplication, getApplications } from "../controllers/applicationController";
import { register, login, logout, getProfile } from "../controllers/authController";
import { authenticate } from "../middlewares/authMiddleware";
import { requireSuperAdmin, requireAuditorOrAdmin } from "../middlewares/rbacMiddleware";

const r = Router();

// ============================================
// PUBLIC ROUTES - No Authentication Required
// ============================================

/**
 * @openapi
 * /api/v1/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, example: "John Doe" }
 *               email: { type: string, format: email, example: "john@example.com" }
 *               password: { type: string, minLength: 8, example: "password123" }
 *               role: { type: string, enum: [SUPER_ADMIN, AUDITOR], default: AUDITOR }
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     user: { $ref: '#/components/schemas/User' }
 *                     token: { type: string }
 */
r.post("/auth/register", register);

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email, example: "john@example.com" }
 *               password: { type: string, example: "password123" }
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     user: { $ref: '#/components/schemas/User' }
 *                     token: { type: string }
 */
r.post("/auth/login", login);

/**
 * @openapi
 * /api/v1/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout user
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 */
r.post("/auth/logout", authenticate, logout);

/**
 * @openapi
 * /api/v1/auth/profile:
 *   get:
 *     tags: [Auth]
 *     summary: Get user profile
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/User' }
 */
r.get("/auth/profile", authenticate, getProfile);

// ============================================
// SUPER ADMIN ONLY - Create Applications
// ============================================

/**
 * @openapi
 * /api/v1/applications:
 *   post:
 *     tags: [Applications]
 *     summary: Create new application (Super Admin only)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, slug]
 *             properties:
 *               name: { type: string, example: "My Application" }
 *               slug: { type: string, example: "my-app" }
 *               domain: { type: string, example: "myapp.com" }
 *               stack: { type: string, example: "nodejs" }
 *     responses:
 *       201:
 *         description: Application created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     name: { type: string }
 *                     slug: { type: string }
 *                     apiKey: { type: string, description: "Only shown once" }
 */
r.post("/applications", authenticate, requireSuperAdmin, createApplication);

// ============================================
// AUDITOR + SUPER ADMIN - View Applications
// ============================================

/**
 * @openapi
 * /api/v1/applications:
 *   get:
 *     tags: [Applications]
 *     summary: Get all applications (Auditor & Super Admin)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Applications retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Application' }
 */
r.get("/applications", authenticate, requireAuditorOrAdmin, getApplications);

// ============================================
// LOG ENDPOINTS - Require API Key (for external apps)
// ============================================

/**
 * @openapi
 * /api/v1/logs:
 *   post:
 *     tags: [Logs]
 *     summary: Store log (synchronous)
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [log_type, payload]
 *             properties:
 *               log_type: 
 *                 type: string
 *                 enum: [AUTH_LOGIN, AUTH_LOGOUT, AUTH_LOGIN_FAILED, ACCESS_ENDPOINT, DOWNLOAD_DOCUMENT, SEND_EXTERNAL, DATA_CREATE, DATA_UPDATE, DATA_DELETE, STATUS_CHANGE, BULK_IMPORT, BULK_EXPORT, SYSTEM_ERROR, VALIDATION_FAILED, SECURITY_VIOLATION, PERMISSION_CHANGE]
 *                 example: AUTH_LOGIN
 *               payload:
 *                 type: object
 *                 example: { "user_id": 123, "ip": "192.168.1.1" }
 *     responses:
 *       201:
 *         description: Log stored
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     seq: { type: string }
 *                     created_at: { type: string, format: date-time }
 *                     log_type: { type: string }
 */
r.post("/logs", store);

/**
 * @openapi
 * /api/v1/logs:
 *   get:
 *     tags: [Logs]
 *     summary: Get logs with pagination
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - in: query
 *         name: log_type
 *         schema: { type: string }
 *       - in: query
 *         name: start_seq
 *         schema: { type: string }
 *       - in: query
 *         name: end_seq
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Logs retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Log' }
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page: { type: integer }
 *                     limit: { type: integer }
 *                     total: { type: integer }
 *                     total_pages: { type: integer }
 */
r.get("/logs", getLogs);

/**
 * @openapi
 * /api/v1/logs/verify-chain:
 *   get:
 *     tags: [Logs]
 *     summary: Verify hash chain integrity
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Chain verification result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     application_id: { type: string }
 *                     application_name: { type: string }
 *                     valid: { type: boolean }
 *                     total_logs: { type: integer }
 *                     first_invalid_seq: { type: string }
 *                     errors: { type: array, items: { type: string } }
 */
r.get("/logs/verify-chain", verifyChain);

/**
 * @openapi
 * /api/v1/logs/queue:
 *   post:
 *     tags: [Logs]
 *     summary: Store log (asynchronous with queue)
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [log_type, payload]
 *             properties:
 *               log_type: { type: string, example: AUTH_LOGIN }
 *               payload: { type: object, example: { "user_id": 123 } }
 *     responses:
 *       202:
 *         description: Log queued for processing
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     job_id: { type: string }
 *                     log_type: { type: string }
 *                     status: { type: string, example: queued }
 */
r.post("/logs/queue", storeWithQueue);

export default r;