"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.baseLogSchema = exports.allowedLogTypes = void 0;
exports.isAllowedLogType = isAllowedLogType;
const zod_1 = require("zod");
exports.allowedLogTypes = [
    "AUTH_LOGIN",
    "AUTH_LOGOUT",
    "AUTH_LOGIN_FAILED",
    "ACCESS_ENDPOINT",
    "DOWNLOAD_DOCUMENT",
    "SEND_EXTERNAL",
    "DATA_CREATE",
    "DATA_UPDATE",
    "DATA_DELETE",
    "STATUS_CHANGE",
    "BULK_IMPORT",
    "BULK_EXPORT",
    "SYSTEM_ERROR",
    "VALIDATION_FAILED",
    "SECURITY_VIOLATION",
    "PERMISSION_CHANGE",
];
exports.baseLogSchema = zod_1.z.object({
    log_type: zod_1.z
        .string()
        .min(1, "log_type is required")
        .toUpperCase()
        .refine((val) => isAllowedLogType(val), {
        message: `Invalid log_type. Allowed types: ${exports.allowedLogTypes.join(", ")}`,
    }),
    payload: zod_1.z.any().default({}),
});
function isAllowedLogType(x) {
    return exports.allowedLogTypes.includes(x);
}
