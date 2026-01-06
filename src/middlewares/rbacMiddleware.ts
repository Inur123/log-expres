import { Response, NextFunction } from "express";
import { AuthRequest } from "./authMiddleware";

export function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction) {
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

export function requireAuditorOrAdmin(req: AuthRequest, res: Response, next: NextFunction) {
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
