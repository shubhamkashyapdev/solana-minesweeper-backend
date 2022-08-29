import { Request, Response } from "express";
import { userModal } from "../models/user.models";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: "saffronsanjeet",
  api_key: "945863976476842",
  api_secret: "jM0haOEcyJUVpmXCmOk-nBHIj44",
  secure: true,
});

export const resgister = async (req: Request, res: Response) => {
  const name = req.body.name;
  const walletAddress = req.body.walletAddress;

  if (!name || !walletAddress) {
    res
      .status(400)
      .json({ err: "name & wallet address are required", success: false });
  }
  const newUser = new userModal({
    name: name,
    wallet: walletAddress,
  });

  try {
    const checkUser = await userModal.findOne({ wallet: walletAddress });

    if (checkUser) {
      res.send({ success: false, message: "user already exist" });
      return;
    }

    const user = await newUser.save();
    res.send({ success: true, data: user });
  } catch (err) {
    console.log({ err });
    res.status(400).json({ success: false, err });
  }
};

export const profileImgUpload = async (req: Request, res: Response) => {
  const wallletId = req.body.walletId;
  // console.log({ wallletId });
  if (req.files) {
    const photo = req.files.photo;

    if (!photo || !wallletId) {
      res.status(400).json({ err: "no Image Found", success: false });
      return;
    }
    const user = await userModal.findOne({ wallet: wallletId });
    if (!user) {
      res.status(400).json({ success: false, err: " no user Found " });
      return;
    }

    try {
      await cloudinary.uploader.upload(
        //@ts-ignore
        photo.tempFilePath,
        { folder: "profilePics" },
        async (err: any, result: any) => {
          if (err) {
            console.log({ err });
          } else {
            if (user) {
              user.profilePic = result.secure_url;
              await user.save();
            }
            res.json({ success: true, url: result.secure_url });
            // console.log({ result });
          }
        }
      );
    } catch (err) {
      res.status(400).json({ success: false, err: err });
    }
  }
};
