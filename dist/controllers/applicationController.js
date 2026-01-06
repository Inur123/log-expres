"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApplication = createApplication;
exports.getApplications = getApplications;
const crypto_1 = __importDefault(require("crypto"));
const prismaClient_1 = require("../prismaClient");
const apiKey_1 = require("../utils/apiKey");
async function createApplication(req, res) {
    const { name, slug, domain, stack } = req.body;
    if (!name || !slug) {
        return res.status(422).json({
            success: false,
            message: "name and slug are required",
        });
    }
    const apiKey = (0, apiKey_1.generateApiKey)();
    const app = await prismaClient_1.prisma.application.create({
        data: {
            id: crypto_1.default.randomUUID(),
            name,
            slug,
            domain,
            stack: stack ?? "other",
            apiKey,
            isActive: true,
        },
    });
    return res.status(201).json({
        success: true,
        message: "Application created successfully",
        data: {
            id: app.id,
            name: app.name,
            slug: app.slug,
            apiKey: app.apiKey, // ⚠️ hanya muncul saat create
        },
    });
}
async function getApplications(req, res) {
    const applications = await prismaClient_1.prisma.application.findMany({
        where: { isActive: true },
        select: {
            id: true,
            name: true,
            slug: true,
            domain: true,
            stack: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
    });
    return res.json({
        success: true,
        data: applications,
    });
}
