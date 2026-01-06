"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const logController_1 = require("../controllers/logController");
const logQueueController_1 = require("../controllers/logQueueController");
const applicationController_1 = require("../controllers/applicationController");
const authController_1 = require("../controllers/authController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const rbacMiddleware_1 = require("../middlewares/rbacMiddleware");
const apiKeyMiddleware_1 = require("../middlewares/apiKeyMiddleware");
const r = (0, express_1.Router)();
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
r.post("/auth/register", authController_1.register);
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
r.post("/auth/login", authController_1.login);
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
r.post("/auth/logout", authMiddleware_1.authenticate, authController_1.logout);
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
r.get("/auth/profile", authMiddleware_1.authenticate, authController_1.getProfile);
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
r.post("/applications", authMiddleware_1.authenticate, rbacMiddleware_1.requireSuperAdmin, applicationController_1.createApplication);
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
r.get("/applications", authMiddleware_1.authenticate, rbacMiddleware_1.requireAuditorOrAdmin, applicationController_1.getApplications);
/**
 * @openapi
 * /api/v1/applications/{id}:
 *   get:
 *     tags: [Applications]
 *     summary: Get application by ID (Auditor & Super Admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Application ID
 *     responses:
 *       200:
 *         description: Application retrieved
 *       404:
 *         description: Application not found
 */
r.get("/applications/:id", authMiddleware_1.authenticate, rbacMiddleware_1.requireAuditorOrAdmin, applicationController_1.getApplicationById);
/**
 * @openapi
 * /api/v1/applications/{id}:
 *   put:
 *     tags: [Applications]
 *     summary: Update application (Super Admin only)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Application ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, example: "Updated App Name" }
 *               domain: { type: string, example: "newdomain.com" }
 *               stack: { type: string, example: "python" }
 *               isActive: { type: boolean, example: true }
 *     responses:
 *       200:
 *         description: Application updated
 *       404:
 *         description: Application not found
 */
r.put("/applications/:id", authMiddleware_1.authenticate, rbacMiddleware_1.requireSuperAdmin, applicationController_1.updateApplication);
/**
 * @openapi
 * /api/v1/applications/{id}:
 *   delete:
 *     tags: [Applications]
 *     summary: Soft delete application (Super Admin only)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Application ID
 *     responses:
 *       200:
 *         description: Application deleted (soft delete)
 *       404:
 *         description: Application not found
 */
r.delete("/applications/:id", authMiddleware_1.authenticate, rbacMiddleware_1.requireSuperAdmin, applicationController_1.deleteApplication);
/**
 * @openapi
 * /api/v1/applications/{id}/hard-delete:
 *   delete:
 *     tags: [Applications]
 *     summary: Permanently delete application (Super Admin only)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Application ID
 *     responses:
 *       200:
 *         description: Application permanently deleted
 *       400:
 *         description: Cannot delete application with logs
 *       404:
 *         description: Application not found
 */
r.delete("/applications/:id/hard-delete", authMiddleware_1.authenticate, rbacMiddleware_1.requireSuperAdmin, applicationController_1.hardDeleteApplication);
/**
 * @openapi
 * /api/v1/applications/{id}/regenerate-key:
 *   post:
 *     tags: [Applications]
 *     summary: Regenerate API Key (Super Admin only)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Application ID
 *     responses:
 *       200:
 *         description: API Key regenerated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     name: { type: string }
 *                     slug: { type: string }
 *                     apiKey: { type: string }
 *       404:
 *         description: Application not found
 */
r.post("/applications/:id/regenerate-key", authMiddleware_1.authenticate, rbacMiddleware_1.requireSuperAdmin, applicationController_1.regenerateApiKey);
// ============================================
// LOG ENDPOINTS - Require API Key (for external apps)
// ============================================
/**
 * @openapi
 * /api/v1/logs:
 *   post:
 *     tags: [Logs]
 *     summary: Store log (synchronous) - Requires API Key
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
r.post("/logs", apiKeyMiddleware_1.requireApiKey, logController_1.store);
/**
 * @openapi
 * /api/v1/logs:
 *   get:
 *     tags: [Logs]
 *     summary: Get logs with pagination - Requires JWT Token
 *     security:
 *       - BearerAuth: []
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
 *       - in: query
 *         name: application_id
 *         schema: { type: string }
 *         description: Filter by application ID (optional)
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
r.get("/logs", authMiddleware_1.authenticate, rbacMiddleware_1.requireAuditorOrAdmin, logController_1.getLogs);
/**
 * @openapi
 * /api/v1/logs/{id}:
 *   get:
 *     tags: [Logs]
 *     summary: Get log details by ID - Requires JWT Token
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Log ID
 *     responses:
 *       200:
 *         description: Log details retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     seq: { type: string }
 *                     log_type: { type: string }
 *                     payload: { type: object }
 *                     hash: { type: string }
 *                     prev_hash: { type: string }
 *                     ip_address: { type: string }
 *                     user_agent: { type: string }
 *                     created_at: { type: string, format: date-time }
 *                     application:
 *                       type: object
 *                       properties:
 *                         id: { type: string }
 *                         name: { type: string }
 *                         slug: { type: string }
 *                         domain: { type: string }
 *                         stack: { type: string }
 *       404:
 *         description: Log not found
 */
r.get("/logs/:id", authMiddleware_1.authenticate, rbacMiddleware_1.requireAuditorOrAdmin, logController_1.getLogById);
/**
 * @openapi
 * /api/v1/logs/verify-chain:
 *   get:
 *     tags: [Logs]
 *     summary: Verify hash chain integrity - Requires JWT Token
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: application_id
 *         schema: { type: string }
 *         description: Application ID to verify (optional, will verify all if not provided)
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
r.get("/logs/verify-chain", authMiddleware_1.authenticate, rbacMiddleware_1.requireAuditorOrAdmin, logController_1.verifyChain);
/**
 * @openapi
 * /api/v1/logs/queue:
 *   post:
 *     tags: [Logs]
 *     summary: Store log (asynchronous with queue) - Requires API Key
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
r.post("/logs/queue", apiKeyMiddleware_1.requireApiKey, logQueueController_1.storeWithQueue);
exports.default = r;
