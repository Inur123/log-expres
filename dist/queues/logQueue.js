"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logQueue = void 0;
const bullmq_1 = require("bullmq");
const connectionOptions = {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    maxRetriesPerRequest: null,
};
exports.logQueue = new bullmq_1.Queue("log-processing", {
    connection: connectionOptions,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 2000,
        },
        removeOnComplete: {
            age: 3600, // Keep completed jobs for 1 hour
            count: 1000,
        },
        removeOnFail: {
            age: 86400, // Keep failed jobs for 24 hours
        },
    },
});
console.log("✅ Log Queue initialized");
