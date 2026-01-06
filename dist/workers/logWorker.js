"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bullmq_1 = require("bullmq");
const crypto_1 = __importDefault(require("crypto"));
const prismaClient_1 = require("../prismaClient");
const hashChainService_1 = require("../services/hashChainService");
const connectionOptions = {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    maxRetriesPerRequest: null,
};
const hashSvc = new hashChainService_1.HashChainService();
const worker = new bullmq_1.Worker("log-processing", async (job) => {
    const { applicationId, logType, payload, ipAddress, userAgent } = job.data;
    console.log(`[Worker] Processing job ${job.id} for app ${applicationId}`);
    const secret = process.env.LOG_HASH_KEY;
    if (!secret) {
        throw new Error("LOG_HASH_KEY missing");
    }
    // Process in transaction with proper locking
    const created = await prismaClient_1.prisma.$transaction(async (tx) => {
        // Lock with FOR UPDATE to prevent race conditions
        const last = await tx.$queryRaw `
        SELECT seq, hash 
        FROM unified_logs 
        WHERE application_id = ${applicationId}::uuid
        ORDER BY seq DESC 
        LIMIT 1 
        FOR UPDATE
      `;
        const nextSeq = last.length > 0 ? last[0].seq + 1n : 1n;
        const prevHash = last.length > 0 ? last[0].hash : "0".repeat(64);
        const payloadNorm = hashSvc.normalize(payload) ?? {};
        const hash = hashSvc.generateHash({
            applicationId,
            seq: nextSeq,
            logType,
            payload: payloadNorm,
            prevHash,
            secret,
        });
        return tx.unifiedLog.create({
            data: {
                id: crypto_1.default.randomUUID(),
                applicationId,
                seq: nextSeq,
                logType,
                payload: payloadNorm,
                hash,
                prevHash,
                ipAddress: ipAddress || null,
                userAgent: userAgent || null,
            },
            select: { id: true, seq: true, createdAt: true },
        });
    });
    console.log(`[Worker] ✅ Log created: seq=${created.seq}, id=${created.id}`);
    return {
        id: created.id,
        seq: created.seq.toString(),
        createdAt: created.createdAt,
    };
}, {
    connection: connectionOptions,
    concurrency: 5, // Process 5 jobs concurrently
    limiter: {
        max: 100, // Max 100 jobs
        duration: 1000, // Per 1 second
    },
});
worker.on("completed", (job) => {
    console.log(`[Worker] ✅ Job ${job.id} completed`);
});
worker.on("failed", (job, err) => {
    console.error(`[Worker] ❌ Job ${job?.id} failed:`, err.message);
});
worker.on("error", (err) => {
    console.error("[Worker] ⚠️ Worker error:", err);
});
console.log("🚀 Log Worker started");
// Graceful shutdown
process.on("SIGTERM", async () => {
    console.log("📋 SIGTERM received, closing worker...");
    await worker.close();
    process.exit(0);
});
process.on("SIGINT", async () => {
    console.log("📋 SIGINT received, closing worker...");
    await worker.close();
    process.exit(0);
});
