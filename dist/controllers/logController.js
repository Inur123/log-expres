"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.store = store;
exports.getLogs = getLogs;
exports.verifyChain = verifyChain;
const crypto_1 = __importDefault(require("crypto"));
const prismaClient_1 = require("../prismaClient");
const logValidators_1 = require("../validators/logValidators");
const hashChainService_1 = require("../services/hashChainService");
const hashSvc = new hashChainService_1.HashChainService();
async function store(req, res) {
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
    const secret = process.env.LOG_HASH_KEY;
    if (!secret)
        return res.status(500).json({ success: false, message: "LOG_HASH_KEY missing" });
    // NOTE: Tanpa queue, kita buat seq/hash dalam transaksi
    const created = await prismaClient_1.prisma.$transaction(async (tx) => {
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
                id: crypto_1.default.randomUUID(),
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
async function getLogs(req, res) {
    // User sudah di-authenticate oleh JWT middleware
    const user = req.user;
    if (!user) {
        return res.status(401).json({ success: false, message: "Authentication required" });
    }
    // Pagination params
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    // Filter params
    const applicationId = req.query.application_id;
    const logType = req.query.log_type;
    const startSeq = req.query.start_seq ? BigInt(req.query.start_seq) : undefined;
    const endSeq = req.query.end_seq ? BigInt(req.query.end_seq) : undefined;
    const where = {};
    // Filter by application if specified
    if (applicationId) {
        where.applicationId = applicationId;
    }
    if (logType)
        where.logType = logType.toUpperCase();
    if (startSeq || endSeq) {
        where.seq = {};
        if (startSeq)
            where.seq.gte = startSeq;
        if (endSeq)
            where.seq.lte = endSeq;
    }
    const [total, logs] = await Promise.all([
        prismaClient_1.prisma.unifiedLog.count({ where }),
        prismaClient_1.prisma.unifiedLog.findMany({
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
        data: logs.map((log) => ({
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
async function verifyChain(req, res) {
    // User sudah di-authenticate oleh JWT middleware
    const user = req.user;
    if (!user) {
        return res.status(401).json({ success: false, message: "Authentication required" });
    }
    const secret = process.env.LOG_HASH_KEY;
    if (!secret)
        return res.status(500).json({ success: false, message: "LOG_HASH_KEY missing" });
    // Optional: filter by application_id dari query
    const applicationId = req.query.application_id;
    if (applicationId) {
        // Verify specific application
        const application = await prismaClient_1.prisma.application.findUnique({
            where: { id: applicationId },
            select: { id: true, name: true, isActive: true },
        });
        if (!application) {
            return res.status(404).json({ success: false, message: "Application not found" });
        }
        const result = await hashSvc.verifyHashChain(application.id, secret, prismaClient_1.prisma);
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
    else {
        // Verify all applications
        const applications = await prismaClient_1.prisma.application.findMany({
            where: { isActive: true },
            select: { id: true, name: true },
        });
        const results = await Promise.all(applications.map(async (app) => {
            const result = await hashSvc.verifyHashChain(app.id, secret, prismaClient_1.prisma);
            return {
                application_id: app.id,
                application_name: app.name,
                valid: result.valid,
                total_logs: result.totalLogs,
                first_invalid_seq: result.firstInvalidSeq?.toString(),
                errors: result.errors,
            };
        }));
        return res.json({
            success: true,
            data: results,
        });
    }
}
