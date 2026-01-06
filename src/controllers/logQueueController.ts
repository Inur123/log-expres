import { Request, Response } from "express";
import { baseLogSchema, isAllowedLogType } from "../validators/logValidators";
import { logQueue } from "../queues/logQueue";
import { getApiKey } from "../utils/apiKey";
import { prisma } from "../prismaClient";

export async function storeWithQueue(req: Request, res: Response) {
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

  // Add job to queue
  const job = await logQueue.add("log-processing", {
    applicationId: application.id,
    logType,
    payload,
    ipAddress: req.ip || undefined,
    userAgent: req.get("user-agent") || undefined,
  });

  return res.status(202).json({
    success: true,
    message: "Log queued for processing",
    data: {
      job_id: job.id,
      log_type: originalLogType,
      status: "queued",
    },
  });
}
