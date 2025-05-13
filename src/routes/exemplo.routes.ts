import { Router } from "express";
import { getExemplo } from "../controllers/exemplo.controller";

const router = Router();
router.get("/", getExemplo);
export default router;
