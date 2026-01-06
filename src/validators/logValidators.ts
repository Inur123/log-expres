import { z } from "zod";

export const allowedLogTypes = [
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
] as const;

export type AllowedLogType = (typeof allowedLogTypes)[number];

export const baseLogSchema = z.object({
  log_type: z
    .string()
    .min(1, "log_type is required")
    .toUpperCase()
    .refine(
      (val) => isAllowedLogType(val),
      (val) => ({
        message: `Invalid log_type: "${val}". Allowed types: ${allowedLogTypes.join(", ")}`,
      })
    ),
  payload: z.any().default({}),
});

export type CreateLogInput = z.infer<typeof baseLogSchema>;

export function isAllowedLogType(x: string): x is AllowedLogType {
  return (allowedLogTypes as readonly string[]).includes(x);
}