"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireSuperAdmin = requireSuperAdmin;
exports.requireAuditorOrAdmin = requireAuditorOrAdmin;
function requireSuperAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: "Authentication required",
        });
    }
    if (req.user.role !== "SUPER_ADMIN") {
        return res.status(403).json({
            success: false,
            message: "Access denied. Super Admin role required",
        });
    }
    next();
}
function requireAuditorOrAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: "Authentication required",
        });
    }
    if (req.user.role !== "SUPER_ADMIN" && req.user.role !== "AUDITOR") {
        return res.status(403).json({
            success: false,
            message: "Access denied. Auditor or Super Admin role required",
        });
    }
    next();
}
