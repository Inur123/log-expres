import express from "express";
import helmet from "helmet";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";
import v1 from "./routes/v1";

export const app = express();

// Swagger UI - disable CSP for swagger
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "Log Management API Docs",
}));

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => res.json({ ok: true }));
app.get("/", (req, res) => res.json({ 
  message: "Log Management API", 
  docs: "/api-docs" 
}));
app.use("/api/v1", v1);
