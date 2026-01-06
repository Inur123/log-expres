import { Request, Response } from "express";
import crypto from "crypto";
import { prisma } from "../prismaClient";
import { generateApiKey } from "../utils/apiKey";

export async function createApplication(req: Request, res: Response) {
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
    data: {
      id: app.id,
      name: app.name,
      slug: app.slug,
      apiKey: app.apiKey, // ⚠️ hanya muncul saat create
    },
  });
}
