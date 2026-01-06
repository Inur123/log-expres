import { Request, Response, NextFunction } from "express";
import { prisma } from "../prismaClient";
import { getApiKey } from "../utils/apiKey";

export interface ApiKeyRequest extends Request {
  application?: {
    id: string;
    name: string;
    slug: string;
  };
}

export async function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = getApiKey(req);

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: "API Key is required. Provide via X-API-Key header or Authorization: Bearer <api-key>",
    });
  }

  try {
    const application = await prisma.application.findFirst({
      where: { apiKey, isActive: true },
      select: { id: true, name: true, slug: true },
    });

    if (!application) {
      return res.status(401).json({
        success: false,
        message: "Invalid or inactive API Key",
      });
    }

    // Attach application to request
    (req as ApiKeyRequest).application = application;

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to validate API Key",
    });
  }
}
