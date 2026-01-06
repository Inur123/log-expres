"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireApiKey = requireApiKey;
const prismaClient_1 = require("../prismaClient");
const apiKey_1 = require("../utils/apiKey");
async function requireApiKey(req, res, next) {
    const apiKey = (0, apiKey_1.getApiKey)(req);
    if (!apiKey) {
        return res.status(401).json({
            success: false,
            message: "API Key is required. Provide via X-API-Key header or Authorization: Bearer <api-key>",
        });
    }
    try {
        const application = await prismaClient_1.prisma.application.findFirst({
            where: { apiKey, isActive: true },
            select: { id: true, name: true, slug: true },
        });
        if (!application) {
            return res.status(401).json({
                success: false,
                message: "Invalid or inactive API Key",
            });
        }
        // Attach application to request
        req.application = application;
        next();
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to validate API Key",
        });
    }
}
