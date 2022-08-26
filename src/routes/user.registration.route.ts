import express from "express";
import {
  resgister,
  profileImgUpload,
} from "../controllers/registration.controller";
const router = express.Router();

router.post("/registration", resgister);
router.post("/addProfileImage", profileImgUpload);

export default router;
