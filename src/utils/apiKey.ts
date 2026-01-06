import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { prisma } from "../prismaClient";

export function generateApiKey(): string {
  return crypto.randomBytes(32).toString("hex"); // 64 char
}

export function getApiKey(req: Request): string | undefined {
  return (req.header("X-API-Key") ?? (req.query.api_key as string | undefined))?.toString();
}

export async function authenticateApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = getApiKey(req);
  
  if (!apiKey) {
    return res.status(401).json({ 
      success: false, 
      message: "API Key is required. Provide via X-API-Key header or api_key query parameter" 
    });
  }

  const application = await prisma.application.findFirst({
    where: { apiKey, isActive: true },
    select: { id: true, name: true, slug: true },
  });

  if (!application) {
    return res.status(401).json({ 
      success: false, 
      message: "Invalid or inactive API Key" 
    });
  }

  // Attach application to request object
  (req as any).application = application;
  next();
}
