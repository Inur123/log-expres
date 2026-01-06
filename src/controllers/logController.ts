import crypto from "crypto";
import { Request, Response } from "express";
import { prisma } from "../prismaClient";
import { baseLogSchema, isAllowedLogType } from "../validators/logValidators";
import { HashChainService } from "../services/hashChainService";
import { ApiKeyRequest } from "../middlewares/apiKeyMiddleware";
import { AuthRequest } from "../middlewares/authMiddleware";

const hashSvc = new HashChainService();

export async function store(req: Request, res: Response) {
  // Application sudah di-attach oleh requireApiKey middleware
  const application = (req as ApiKeyRequest).application;
  
  if (!application) {
    return res.status(401).json({ success: false, message: "API Key is required" });
  }

  const parsed = baseLogSchema.safeParse({ log_type: req.body?.log_type, payload: req.body?.payload });
  const originalLogType = req.body?.log_type ? String(req.body.log_type).toUpperCase() : "UNKNOWN";

  if (!parsed.success) {
    return res.status(422).json({ success: false, message: "Validation failed", errors: parsed.error.flatten() });
  }

  const logType = parsed.data.log_type;
  const payload = parsed.data.payload;

  if (!isAllowedLogType(logType)) {
    return res.status(422).json({ success: false, message: "Validation failed", errors: { log_type: ["Invalid log_type"] } });
  }

  if (payload === null || typeof payload !== "object") {
    return res.status(422).json({ success: false, message: "Validation failed", errors: { payload: ["payload must be object/array"] } });
  }

  const secret = process.env.LOG_HASH_KEY;
  if (!secret) return res.status(500).json({ success: false, message: "LOG_HASH_KEY missing" });

  // NOTE: Tanpa queue, kita buat seq/hash dalam transaksi
 const created = await prisma.$transaction(async (tx: typeof prisma) => {
    // Cari last log per app (tanpa FOR UPDATE dulu agar simple)
    const last = await tx.unifiedLog.findFirst({
      where: { applicationId: application.id },
      orderBy: { seq: "desc" },
      select: { seq: true, hash: true },
    });

    const nextSeq = last ? last.seq + 1n : 1n;
    const prevHash = last ? last.hash : "0".repeat(64);

    const payloadNorm = hashSvc.normalize(payload) ?? {};

    const hash = hashSvc.generateHash({
      applicationId: application.id,
      seq: nextSeq,
      logType,
      payload: payloadNorm,
      prevHash,
      secret,
    });

    return tx.unifiedLog.create({
      data: {
        // UUID akan kamu isi manual dari client? Tidak—kita generate.
        id: crypto.randomUUID(),
        applicationId: application.id,
        seq: nextSeq,
        logType,
        payload: payloadNorm,
        hash,
        prevHash,
        ipAddress: req.ip,
        userAgent: req.get("user-agent") ?? null,
      },
      select: { id: true, seq: true, createdAt: true },
    });
  });

  return res.status(201).json({
    success: true,
    message: "Log stored",
    data: {
      id: created.id,
      seq: created.seq.toString(),
      created_at: created.createdAt,
      log_type: originalLogType,
    },
  });
}

export async function getLogs(req: Request, res: Response) {
  // User sudah di-authenticate oleh JWT middleware
  const user = (req as AuthRequest).user;
  
  if (!user) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  // Pagination params
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;

  // Filter params
  const applicationId = req.query.application_id as string | undefined;
  const logType = req.query.log_type as string | undefined;
  const startSeq = req.query.start_seq ? BigInt(req.query.start_seq as string) : undefined;
  const endSeq = req.query.end_seq ? BigInt(req.query.end_seq as string) : undefined;

  const where: any = {};
  
  // Filter by application if specified
  if (applicationId) {
    where.applicationId = applicationId;
  }
  
  if (logType) where.logType = logType.toUpperCase();
  if (startSeq || endSeq) {
    where.seq = {};
    if (startSeq) where.seq.gte = startSeq;
    if (endSeq) where.seq.lte = endSeq;
  }

  const [total, logs] = await Promise.all([
    prisma.unifiedLog.count({ where }),
    prisma.unifiedLog.findMany({
      where,
      orderBy: { seq: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        seq: true,
        logType: true,
        payload: true,
        hash: true,
        prevHash: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        application: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    }),
  ]);

  return res.json({
    success: true,
    data: logs.map((log: any) => ({
      id: log.id,
      seq: log.seq.toString(),
      log_type: log.logType,
      payload: log.payload,
      hash: log.hash,
      prev_hash: log.prevHash,
      ip_address: log.ipAddress,
      user_agent: log.userAgent,
      created_at: log.createdAt,
      application: log.application,
    })),
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
  });
}

export async function getLogById(req: Request, res: Response) {
  // User sudah di-authenticate oleh JWT middleware
  const user = (req as AuthRequest).user;
  
  if (!user) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  const { id } = req.params;

  const log = await prisma.unifiedLog.findUnique({
    where: { id },
    select: {
      id: true,
      seq: true,
      logType: true,
      payload: true,
      hash: true,
      prevHash: true,
      ipAddress: true,
      userAgent: true,
      createdAt: true,
      application: {
        select: {
          id: true,
          name: true,
          slug: true,
          domain: true,
          stack: true,
        },
      },
    },
  });

  if (!log) {
    return res.status(404).json({ 
      success: false, 
      message: "Log not found" 
    });
  }

  return res.json({
    success: true,
    data: {
      id: log.id,
      seq: log.seq.toString(),
      log_type: log.logType,
      payload: log.payload,
      hash: log.hash,
      prev_hash: log.prevHash,
      ip_address: log.ipAddress,
      user_agent: log.userAgent,
      created_at: log.createdAt,
      application: log.application,
    },
  });
}

export async function verifyChain(req: Request, res: Response) {
  // User sudah di-authenticate oleh JWT middleware
  const user = (req as AuthRequest).user;
  
  if (!user) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  const secret = process.env.LOG_HASH_KEY;
  if (!secret) return res.status(500).json({ success: false, message: "LOG_HASH_KEY missing" });

  // Optional: filter by application_id dari query
  const applicationId = req.query.application_id as string | undefined;

  if (applicationId) {
    // Verify specific application
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      select: { id: true, name: true, isActive: true },
    });

    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    const result = await hashSvc.verifyHashChain(application.id, secret, prisma);

    return res.json({
      success: true,
      data: {
        application_id: application.id,
        application_name: application.name,
        valid: result.valid,
        total_logs: result.totalLogs,
        first_invalid_seq: result.firstInvalidSeq?.toString(),
        errors: result.errors,
      },
    });
  } else {
    // Verify all applications
    const applications = await prisma.application.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    const results = await Promise.all(
      applications.map(async (app: { id: string; name: string }) => {
        const result = await hashSvc.verifyHashChain(app.id, secret, prisma);
        return {
          application_id: app.id,
          application_name: app.name,
          valid: result.valid,
          total_logs: result.totalLogs,
          first_invalid_seq: result.firstInvalidSeq?.toString(),
          errors: result.errors,
        };
      })
    );

    return res.json({
      success: true,
      data: results,
    });
  }
}
