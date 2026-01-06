"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
require("dotenv/config");
const client_1 = require("@prisma/client");
const extension_accelerate_1 = require("@prisma/extension-accelerate");
if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL is missing");
exports.prisma = new client_1.PrismaClient({
    accelerateUrl: process.env.DATABASE_URL,
}).$extends((0, extension_accelerate_1.withAccelerate)());
