"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateApiKey = generateApiKey;
exports.getApiKey = getApiKey;
exports.authenticateApiKey = authenticateApiKey;
const crypto_1 = __importDefault(require("crypto"));
const prismaClient_1 = require("../prismaClient");
function generateApiKey() {
    return crypto_1.default.randomBytes(32).toString("hex"); // 64 char
}
function getApiKey(req) {
    return (req.header("X-API-Key") ?? req.query.api_key)?.toString();
}
async function authenticateApiKey(req, res, next) {
    const apiKey = getApiKey(req);
    if (!apiKey) {
        return res.status(401).json({
            success: false,
            message: "API Key is required. Provide via X-API-Key header or api_key query parameter"
        });
    }
    const application = await prismaClient_1.prisma.application.findFirst({
        where: { apiKey, isActive: true },
        select: { id: true, name: true, slug: true },
    });
    if (!application) {
        return res.status(401).json({
            success: false,
            message: "Invalid or inactive API Key"
        });
    }
    // Attach application to request object
    req.application = application;
    next();
}
