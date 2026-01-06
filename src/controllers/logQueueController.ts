import { Request, Response } from "express";
import { baseLogSchema, isAllowedLogType } from "../validators/logValidators";
import { logQueue } from "../queues/logQueue";
import { ApiKeyRequest } from "../middlewares/apiKeyMiddleware";

export async function storeWithQueue(req: Request, res: Response) {
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
