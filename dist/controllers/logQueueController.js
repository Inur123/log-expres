"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeWithQueue = storeWithQueue;
const logValidators_1 = require("../validators/logValidators");
const logQueue_1 = require("../queues/logQueue");
async function storeWithQueue(req, res) {
    // Application sudah di-attach oleh requireApiKey middleware
    const application = req.application;
    if (!application) {
        return res.status(401).json({ success: false, message: "API Key is required" });
    }
    const parsed = logValidators_1.baseLogSchema.safeParse({ log_type: req.body?.log_type, payload: req.body?.payload });
    const originalLogType = req.body?.log_type ? String(req.body.log_type).toUpperCase() : "UNKNOWN";
    if (!parsed.success) {
        return res.status(422).json({ success: false, message: "Validation failed", errors: parsed.error.flatten() });
    }
    const logType = parsed.data.log_type;
    const payload = parsed.data.payload;
    if (!(0, logValidators_1.isAllowedLogType)(logType)) {
        return res.status(422).json({ success: false, message: "Validation failed", errors: { log_type: ["Invalid log_type"] } });
    }
    if (payload === null || typeof payload !== "object") {
        return res.status(422).json({ success: false, message: "Validation failed", errors: { payload: ["payload must be object/array"] } });
    }
    // Add job to queue
    const job = await logQueue_1.logQueue.add("log-processing", {
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
