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
      _count: {
        select: { logs: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return res.json({
    success: true,
    data: applications.map((app: any) => ({
      ...app,
      total_logs: app._count.logs,
      _count: undefined,
    })),
  });
}

export async function getApplicationById(req: AuthRequest, res: Response) {
  const { id } = req.params;

  const application = await prisma.application.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      domain: true,
      stack: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: { logs: true },
      },
    },
  });

  if (!application) {
    return res.status(404).json({
      success: false,
      message: "Application not found",
    });
  }

  return res.json({
    success: true,
    data: {
      ...application,
      total_logs: application._count.logs,
      _count: undefined,
    },
  });
}

export async function updateApplication(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { name, domain, stack, isActive } = req.body;

  // Check if application exists
  const existing = await prisma.application.findUnique({
    where: { id },
    select: { id: true, slug: true },
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: "Application not found",
    });
  }

  // Build update data (exclude slug and apiKey for security)
  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (domain !== undefined) updateData.domain = domain;
  if (stack !== undefined) updateData.stack = stack;
  if (isActive !== undefined) updateData.isActive = isActive;

  const updated = await prisma.application.update({
    where: { id },
    data: updateData,
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
  });

  return res.json({
    success: true,
    message: "Application updated successfully",
    data: updated,
  });
}

export async function deleteApplication(req: AuthRequest, res: Response) {
  const { id } = req.params;

  // Check if application exists
  const existing = await prisma.application.findUnique({
    where: { id },
    select: { id: true, name: true },
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: "Application not found",
    });
  }

  // Soft delete by setting isActive to false
  await prisma.application.update({
    where: { id },
    data: { isActive: false },
  });

  return res.json({
    success: true,
    message: `Application "${existing.name}" deleted successfully`,
  });
}

export async function hardDeleteApplication(req: AuthRequest, res: Response) {
  const { id } = req.params;

  // Check if application exists
  const existing = await prisma.application.findUnique({
    where: { id },
    select: { id: true, name: true, _count: { select: { logs: true } } },
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: "Application not found",
    });
  }

  // Warning if has logs
  if (existing._count.logs > 0) {
    return res.status(400).json({
      success: false,
      message: `Cannot delete application with ${existing._count.logs} logs. Please use soft delete instead or confirm with force=true query parameter`,
    });
  }

  // Hard delete from database
  await prisma.application.delete({
    where: { id },
  });

  return res.json({
    success: true,
    message: `Application "${existing.name}" permanently deleted`,
  });
}

export async function regenerateApiKey(req: AuthRequest, res: Response) {
  const { id } = req.params;

  // Check if application exists
  const existing = await prisma.application.findUnique({
    where: { id },
    select: { id: true, name: true },
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: "Application not found",
    });
  }

  const newApiKey = generateApiKey();

  const updated = await prisma.application.update({
    where: { id },
    data: { apiKey: newApiKey },
    select: {
      id: true,
      name: true,
      slug: true,
      apiKey: true,
    },
  });

  return res.json({
    success: true,
    message: "API Key regenerated successfully",
    data: {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      apiKey: updated.apiKey, // ⚠️ Only shown when regenerating
    },
  });
}
