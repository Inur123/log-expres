import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Log Management API",
      version: "1.0.0",
      description: "API for managing application logs with hash chain integrity verification",
      contact: {
        name: "API Support",
      },
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT token for authenticated users (Super Admin / Auditor)",
        },
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "X-API-Key",
          description: "API Key for external applications to send logs",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            email: { type: "string", format: "email" },
            role: { type: "string", enum: ["SUPER_ADMIN", "AUDITOR"] },
            isActive: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Application: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            slug: { type: "string" },
            domain: { type: "string" },
            stack: { type: "string" },
            isActive: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Log: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            seq: { type: "string" },
            log_type: { 
              type: "string",
              enum: [
                "AUTH_LOGIN", "AUTH_LOGOUT", "AUTH_LOGIN_FAILED",
                "ACCESS_ENDPOINT", "DOWNLOAD_DOCUMENT", "SEND_EXTERNAL",
                "DATA_CREATE", "DATA_UPDATE", "DATA_DELETE",
                "STATUS_CHANGE", "BULK_IMPORT", "BULK_EXPORT",
                "SYSTEM_ERROR", "VALIDATION_FAILED",
                "SECURITY_VIOLATION", "PERMISSION_CHANGE"
              ]
            },
            payload: { type: "object" },
            hash: { type: "string" },
            prev_hash: { type: "string" },
            ip_address: { type: "string" },
            user_agent: { type: "string" },
            created_at: { type: "string", format: "date-time" },
          },
        },
        Error: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string" },
            errors: { type: "object" },
          },
        },
      },
    },
    tags: [
      { name: "Auth", description: "Authentication endpoints" },
      { name: "Applications", description: "Application management (Super Admin only)" },
      { name: "Logs", description: "Log operations (API Key required)" },
    ],
  },
  apis: ["./src/routes/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
