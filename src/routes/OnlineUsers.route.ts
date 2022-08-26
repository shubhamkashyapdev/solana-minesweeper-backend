import express from "express";
import { getOnlineusers } from "../controllers/online.users.controller";

const router = express.Router();

router.get("/onlineUsers", getOnlineusers);

export default router;
