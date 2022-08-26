import express from "express";
import { getRecords } from "../controllers/game.controller";
const router = express.Router();

router.get("/gameRecords", getRecords);

export default router;
