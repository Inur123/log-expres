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

// Auth endpoints
r.post("/auth/register", register);
r.post("/auth/login", login);
r.post("/auth/logout", authenticate, logout);
r.get("/auth/profile", authenticate, getProfile);

// ============================================
// SUPER ADMIN ONLY - Create Applications
// ============================================
r.post("/applications", authenticate, requireSuperAdmin, createApplication);

// ============================================
// AUDITOR + SUPER ADMIN - View Applications
// ============================================
r.get("/applications", authenticate, requireAuditorOrAdmin, getApplications);

// ============================================
// LOG ENDPOINTS - Require API Key (for external apps)
// ============================================

// logs - synchronous (direct)
r.post("/logs", store);
r.get("/logs", getLogs);
r.get("/logs/verify-chain", verifyChain);

// logs - asynchronous (with queue)
r.post("/logs/queue", storeWithQueue);

export default r;