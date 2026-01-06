"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.getProfile = getProfile;
exports.logout = logout;
const bcrypt_1 = __importDefault(require("bcrypt"));
const prismaClient_1 = require("../prismaClient");
const authValidators_1 = require("../validators/authValidators");
const authMiddleware_1 = require("../middlewares/authMiddleware");
async function register(req, res) {
    const parsed = authValidators_1.registerSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(422).json({
            success: false,
            message: "Validation failed",
            errors: parsed.error.flatten(),
        });
    }
    const { name, email, password, role } = parsed.data;
    // Check if email already exists
    const existing = await prismaClient_1.prisma.user.findUnique({
        where: { email },
    });
    if (existing) {
        return res.status(409).json({
            success: false,
            message: "Email already registered",
        });
    }
    // Hash password
    const hashedPassword = await bcrypt_1.default.hash(password, 10);
    // Create user
    const user = await prismaClient_1.prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
            role,
        },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
        },
    });
    // Generate token
    const token = (0, authMiddleware_1.generateToken)({
        userId: user.id,
        email: user.email,
        role: user.role,
    });
    return res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: {
            user,
            token,
        },
    });
}
async function login(req, res) {
    const parsed = authValidators_1.loginSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(422).json({
            success: false,
            message: "Validation failed",
            errors: parsed.error.flatten(),
        });
    }
    const { email, password } = parsed.data;
    // Find user
    const user = await prismaClient_1.prisma.user.findUnique({
        where: { email },
        select: {
            id: true,
            name: true,
            email: true,
            password: true,
            role: true,
            isActive: true,
        },
    });
    if (!user || !user.isActive) {
        return res.status(401).json({
            success: false,
            message: "Invalid email or password",
        });
    }
    // Verify password
    const isPasswordValid = await bcrypt_1.default.compare(password, user.password);
    if (!isPasswordValid) {
        return res.status(401).json({
            success: false,
            message: "Invalid email or password",
        });
    }
    // Generate token
    const token = (0, authMiddleware_1.generateToken)({
        userId: user.id,
        email: user.email,
        role: user.role,
    });
    return res.json({
        success: true,
        message: "Login successful",
        data: {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
            token,
        },
    });
}
async function getProfile(req, res) {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized",
        });
    }
    const user = await prismaClient_1.prisma.user.findUnique({
        where: { id: req.user.userId },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
        },
    });
    if (!user) {
        return res.status(404).json({
            success: false,
            message: "User not found",
        });
    }
    return res.json({
        success: true,
        data: user,
    });
}
async function logout(req, res) {
    // Dengan JWT, logout dilakukan di client-side dengan menghapus token
    // Server hanya memberikan response success
    // Optional: Bisa implement token blacklist di Redis untuk keamanan lebih
    return res.json({
        success: true,
        message: "Logout successful. Please remove token from client storage",
    });
}
