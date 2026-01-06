import { Response } from "express";
import crypto from "crypto";
import { prisma } from "../prismaClient";
import { generateApiKey } from "../utils/apiKey";
import { AuthRequest } from "../middlewares/authMiddleware";

export async function createApplication(req: AuthRequest, res: Response) {
  const { name, slug, domain, stack } = req.body;

  if (!name || !slug) {
    return res.status(422).json({
      success: false,
      message: "name and slug are required",
    });
  }

  const apiKey = generateApiKey();

  const app = await prisma.application.create({
    data: {
      id: crypto.randomUUID(),
      name,
      slug,
      domain,
      stack: stack ?? "other",
      apiKey,
      isActive: true,
    },
  });

  return res.status(201).json({
    success: true,
    message: "Application created successfully",
    data: {
      id: app.id,
      name: app.name,
      slug: app.slug,
      apiKey: app.apiKey, // ⚠️ hanya muncul saat create
    },
  });
}

export async function getApplications(req: AuthRequest, res: Response) {
  const applications = await prisma.application.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      domain: true,
      stack: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return res.json({
    success: true,
    data: applications,
  });
}
