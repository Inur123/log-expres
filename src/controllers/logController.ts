import crypto from "crypto";
import { Request, Response } from "express";
import { prisma } from "../prismaClient";
import { baseLogSchema, isAllowedLogType } from "../validators/logValidators";
import { HashChainService } from "../services/hashChainService";
import { getApiKey } from "../utils/apiKey";

const hashSvc = new HashChainService();

export async function store(req: Request, res: Response) {
  const apiKey = getApiKey(req);
  if (!apiKey) return res.status(401).json({ success: false, message: "API Key is required" });

  const application = await prisma.application.findFirst({
    where: { apiKey, isActive: true },
    select: { id: true },
  });

  if (!application) return res.status(401).json({ success: false, message: "Invalid or inactive API Key" });

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
  const apiKey = getApiKey(req);
  if (!apiKey) return res.status(401).json({ success: false, message: "API Key is required" });

  const application = await prisma.application.findFirst({
    where: { apiKey, isActive: true },
    select: { id: true },
  });

  if (!application) return res.status(401).json({ success: false, message: "Invalid or inactive API Key" });

  // Pagination params
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;

  // Filter params
  const logType = req.query.log_type as string | undefined;
  const startSeq = req.query.start_seq ? BigInt(req.query.start_seq as string) : undefined;
  const endSeq = req.query.end_seq ? BigInt(req.query.end_seq as string) : undefined;

  const where: any = { applicationId: application.id };
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
    })),
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
  });
}

export async function verifyChain(req: Request, res: Response) {
  const apiKey = getApiKey(req);
  if (!apiKey) return res.status(401).json({ success: false, message: "API Key is required" });

  const application = await prisma.application.findFirst({
    where: { apiKey, isActive: true },
    select: { id: true, name: true },
  });

  if (!application) return res.status(401).json({ success: false, message: "Invalid or inactive API Key" });

  const secret = process.env.LOG_HASH_KEY;
  if (!secret) return res.status(500).json({ success: false, message: "LOG_HASH_KEY missing" });

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
}
