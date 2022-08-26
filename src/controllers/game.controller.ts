import { Request, Response } from "express";
import { gameRecordsModal } from "../models/gameRecords.modal";

export const getRecords = async (req: Request, res: Response) => {
  const { wallet } = req.body;
  if (!wallet) {
    res.status(400).send({ success: false, msg: "Wallet ID is Required " });
    return;
  }

  try {
    const result = await gameRecordsModal
      .find()
      .populate("user1")
      .populate("user2")
      .populate("winner");

    const filter = await result.filter((x) => {
      console.log({ x });
      return x.user1.walletId == wallet || x.user2.walletId == wallet;
    });
    res.send({ data: filter, success: true, count: filter.length });
  } catch (err) {
    res.status(400).send({ success: false, err: err });
  }
};
