import { Request, Response } from "express";
import { gameRecordsModal } from "../models/gameRecords.modal";

export const getRecords = async (req: Request, res: Response) => {
  const { wallet } = req.body; // user wallet Address
  const { page = 1, limit = 10 } = req.query; // assigning default values to pages & limit
  if (!wallet) {
    res.status(400).send({ success: false, msg: "Wallet ID is Required " });
    return; // send error to if their is no wallet address
  }

  try {
    const result = await gameRecordsModal // pgination
      .find()
      //@ts-ignore
      .limit(limit)
      //@ts-ignore
      .skip((page - 1) * limit)
      .populate("user1")
      .populate("user2")
      .populate("winner");

    const filter = await result.filter((x) => {
      // filter result according to walletAddress
      return x.user1.walletId == wallet || x.user2.walletId == wallet;
    });

    const count = await gameRecordsModal.countDocuments(); // count total no. of enteries in collection

    res.send({
      // sending response
      success: true,
      count: filter.length + 1,
      //@ts-ignore
      totalPages: Math.ceil(count / limit), // total pages availvable
      currentPage: page, // current page no
      data: filter, // filtered data
    });
  } catch (err) {
    res.status(400).send({ success: false, err: err });
  }
};
