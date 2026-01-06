"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HashChainService = void 0;
const crypto_1 = __importDefault(require("crypto"));
class HashChainService {
    normalize(value) {
        if (value === null || value === undefined)
            return undefined;
        if (typeof value === "string") {
            if (value === "")
                return undefined;
            return value;
        }
        if (Array.isArray(value)) {
            const arr = value
                .map((v) => this.normalize(v))
                .filter((v) => v !== undefined);
            return arr.length ? arr : undefined;
        }
        if (typeof value === "object") {
            const entries = Object.entries(value)
                .map(([k, v]) => [k, this.normalize(v)])
                .filter(([, v]) => v !== undefined);
            entries.sort(([a], [b]) => a.localeCompare(b));
            const out = {};
            for (const [k, v] of entries)
                out[k] = v;
            return Object.keys(out).length ? out : undefined;
        }
        return value;
    }
    generateHash(params) {
        const payloadNorm = this.normalize(params.payload) ?? {};
        const raw = [
            params.applicationId,
            params.seq.toString(),
            params.logType.toUpperCase(),
            JSON.stringify(payloadNorm),
            params.prevHash,
        ].join("|");
        return crypto_1.default.createHmac("sha256", params.secret).update(raw).digest("hex");
    }
    verifyLog(params) {
        const expectedHash = this.generateHash({
            applicationId: params.applicationId,
            seq: params.seq,
            logType: params.logType,
            payload: params.payload,
            prevHash: params.prevHash,
            secret: params.secret,
        });
        return expectedHash === params.hash;
    }
    async verifyHashChain(applicationId, secret, prisma) {
        const logs = await prisma.unifiedLog.findMany({
            where: { applicationId },
            orderBy: { seq: "asc" },
            select: {
                seq: true,
                logType: true,
                payload: true,
                hash: true,
                prevHash: true,
            },
        });
        if (logs.length === 0) {
            return { valid: true, totalLogs: 0, errors: [] };
        }
        const errors = [];
        let firstInvalidSeq;
        for (let i = 0; i < logs.length; i++) {
            const log = logs[i];
            const expectedSeq = BigInt(i + 1);
            // Check sequence continuity
            if (log.seq !== expectedSeq) {
                errors.push(`Sequence gap at seq=${log.seq}, expected=${expectedSeq}`);
                if (!firstInvalidSeq)
                    firstInvalidSeq = log.seq;
            }
            // Check first log prevHash
            if (i === 0) {
                if (log.prevHash !== "0".repeat(64)) {
                    errors.push(`First log (seq=${log.seq}) prevHash should be 64 zeros`);
                    if (!firstInvalidSeq)
                        firstInvalidSeq = log.seq;
                }
            }
            else {
                // Check prevHash matches previous hash
                const prevLog = logs[i - 1];
                if (log.prevHash !== prevLog.hash) {
                    errors.push(`Hash chain broken at seq=${log.seq}, prevHash mismatch`);
                    if (!firstInvalidSeq)
                        firstInvalidSeq = log.seq;
                }
            }
            // Verify hash
            const isValid = this.verifyLog({
                applicationId,
                seq: log.seq,
                logType: log.logType,
                payload: log.payload,
                prevHash: log.prevHash || "0".repeat(64),
                hash: log.hash,
                secret,
            });
            if (!isValid) {
                errors.push(`Invalid hash at seq=${log.seq}`);
                if (!firstInvalidSeq)
                    firstInvalidSeq = log.seq;
            }
        }
        return {
            valid: errors.length === 0,
            totalLogs: logs.length,
            firstInvalidSeq,
            errors,
        };
    }
}
exports.HashChainService = HashChainService;
