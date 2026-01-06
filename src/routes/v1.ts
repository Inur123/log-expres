import { Router } from "express";
import { store } from "../controllers/logController";
import { createApplication } from "../controllers/applicationController";

const r = Router();
console.log("V1 ROUTES LOADED");
// application CRUD
r.post("/applications", createApplication);

// logs
r.post("/logs", store);

export default r;