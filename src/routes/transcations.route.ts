import { getAllTransction } from "../controllers/transcations.controller";
import express from "express";

const router = express.Router();

router.get("/transcation", getAllTransction);

export default router;
