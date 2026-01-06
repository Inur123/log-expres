import crypto from "crypto";
import { Request, Response } from "express";
import { prisma } from "../prismaClient";
import { baseLogSchema, isAllowedLogType } from "../validators/logValidators";
import { HashChainService } from "../services/hashChainService";


const hashSvc = new HashChainService();

function getApiKey(req: Request) {
  return (req.header("X-API-Key") ?? (req.query.api_key as string | undefined))?.toString();
}

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
  const created = await prisma.$transaction(async (tx) => {
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
