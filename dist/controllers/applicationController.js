"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApplication = createApplication;
exports.getApplications = getApplications;
exports.getApplicationById = getApplicationById;
exports.updateApplication = updateApplication;
exports.deleteApplication = deleteApplication;
exports.hardDeleteApplication = hardDeleteApplication;
exports.regenerateApiKey = regenerateApiKey;
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
            _count: {
                select: { logs: true },
            },
        },
        orderBy: { createdAt: "desc" },
    });
    return res.json({
        success: true,
        data: applications.map((app) => ({
            ...app,
            total_logs: app._count.logs,
            _count: undefined,
        })),
    });
}
async function getApplicationById(req, res) {
    const { id } = req.params;
    const application = await prismaClient_1.prisma.application.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            slug: true,
            domain: true,
            stack: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            _count: {
                select: { logs: true },
            },
        },
    });
    if (!application) {
        return res.status(404).json({
            success: false,
            message: "Application not found",
        });
    }
    return res.json({
        success: true,
        data: {
            ...application,
            total_logs: application._count.logs,
            _count: undefined,
        },
    });
}
async function updateApplication(req, res) {
    const { id } = req.params;
    const { name, domain, stack, isActive } = req.body;
    // Check if application exists
    const existing = await prismaClient_1.prisma.application.findUnique({
        where: { id },
        select: { id: true, slug: true },
    });
    if (!existing) {
        return res.status(404).json({
            success: false,
            message: "Application not found",
        });
    }
    // Build update data (exclude slug and apiKey for security)
    const updateData = {};
    if (name !== undefined)
        updateData.name = name;
    if (domain !== undefined)
        updateData.domain = domain;
    if (stack !== undefined)
        updateData.stack = stack;
    if (isActive !== undefined)
        updateData.isActive = isActive;
    const updated = await prismaClient_1.prisma.application.update({
        where: { id },
        data: updateData,
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
    });
    return res.json({
        success: true,
        message: "Application updated successfully",
        data: updated,
    });
}
async function deleteApplication(req, res) {
    const { id } = req.params;
    // Check if application exists
    const existing = await prismaClient_1.prisma.application.findUnique({
        where: { id },
        select: { id: true, name: true },
    });
    if (!existing) {
        return res.status(404).json({
            success: false,
            message: "Application not found",
        });
    }
    // Soft delete by setting isActive to false
    await prismaClient_1.prisma.application.update({
        where: { id },
        data: { isActive: false },
    });
    return res.json({
        success: true,
        message: `Application "${existing.name}" deleted successfully`,
    });
}
async function hardDeleteApplication(req, res) {
    const { id } = req.params;
    // Check if application exists
    const existing = await prismaClient_1.prisma.application.findUnique({
        where: { id },
        select: { id: true, name: true, _count: { select: { logs: true } } },
    });
    if (!existing) {
        return res.status(404).json({
            success: false,
            message: "Application not found",
        });
    }
    // Warning if has logs
    if (existing._count.logs > 0) {
        return res.status(400).json({
            success: false,
            message: `Cannot delete application with ${existing._count.logs} logs. Please use soft delete instead or confirm with force=true query parameter`,
        });
    }
    // Hard delete from database
    await prismaClient_1.prisma.application.delete({
        where: { id },
    });
    return res.json({
        success: true,
        message: `Application "${existing.name}" permanently deleted`,
    });
}
async function regenerateApiKey(req, res) {
    const { id } = req.params;
    // Check if application exists
    const existing = await prismaClient_1.prisma.application.findUnique({
        where: { id },
        select: { id: true, name: true },
    });
    if (!existing) {
        return res.status(404).json({
            success: false,
            message: "Application not found",
        });
    }
    const newApiKey = (0, apiKey_1.generateApiKey)();
    const updated = await prismaClient_1.prisma.application.update({
        where: { id },
        data: { apiKey: newApiKey },
        select: {
            id: true,
            name: true,
            slug: true,
            apiKey: true,
        },
    });
    return res.json({
        success: true,
        message: "API Key regenerated successfully",
        data: {
            id: updated.id,
            name: updated.name,
            slug: updated.slug,
            apiKey: updated.apiKey, // ⚠️ Only shown when regenerating
        },
    });
}
