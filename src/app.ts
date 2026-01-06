import express from "express";
import helmet from "helmet";
import cors from "cors";
import v1 from "./routes/v1";

export const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => res.json({ ok: true }));
app.use("/api/v1", v1);
