import { Router } from "express";
import { store, getLogs, verifyChain } from "../controllers/logController";
import { storeWithQueue } from "../controllers/logQueueController";
import { createApplication } from "../controllers/applicationController";

const r = Router();

// application CRUD
r.post("/applications", createApplication);

// logs - synchronous (direct)
r.post("/logs", store);
r.get("/logs", getLogs);
r.get("/logs/verify-chain", verifyChain);

// logs - asynchronous (with queue)
r.post("/logs/queue", storeWithQueue);

export default r;