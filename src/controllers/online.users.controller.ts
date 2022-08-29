import { onlineUserModal } from "../models/OnlineUser.modal";
import { Request, Response } from "express";
import { availableUserModel } from "../models/AvailableForMatching.modal";
export interface Data {
  wallet: string;
  socketId: string;
  name: string;
  profilePic: string;
}

export const addtoOnlineList = async (data: Data) => {
  const check = await onlineUserModal.findOne({ wallet: data.wallet });

  if (check) {
    console.log({ message: "useralready exit" });
    return;
  }

  const newEntry = new onlineUserModal({
    name: data.name,
    profilePic: data.profilePic,
    socketId: data.socketId,
    wallet: data.wallet,
  });
  await newEntry.save();
};

export const removeUser = async (socketid: string) => {
  await onlineUserModal.findOneAndRemove({ socketId: socketid });
  await availableUserModel.findOneAndRemove({ socketId: socketid });
};

export const getOnlineusers = async (req: Request, res: Response) => {
  const { page = 1, limit = 10 } = req.query;

  try {
    const result = await onlineUserModal
      .find()
      // @ts-ignore
      .limit(limit * 1)
      // @ts-ignore
      .skip((page - 1) * limit);

    const count = await onlineUserModal.countDocuments();

    res.send({
      success: true,
      count: result.length,
      currentPage: page,
      //@ts-ignore
      totalPages: Math.ceil(count / limit),
      data: result,
    });
  } catch (err) {
    res.status(400).json({ success: false, err: err });
  }
};
