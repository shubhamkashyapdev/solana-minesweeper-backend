import { transactionModal } from "../models/transaction.modal";
import { Request, Response } from "express";

export const getAllTransction = async (req: Request, res: Response) => {
  // get all transction
  const { page = 1, limit = 10 } = req.query;
  const walletId = req.query.walletId;
  if (!walletId) {
    res.status(400).send({ success: false, message: "no wallet Id Found " });
  } else {
    try {
      const transcation = await transactionModal
        .find({ walletId: walletId })
        //@ts-ignore
        .limit(limit * 1)
        //@ts-ignore
        .skip((page - 1) * limit)
        .exec();

      const count = await transactionModal.countDocuments();

      res.send({
        success: true,
        count: transcation.length,
        //@ts-ignore
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        data: transcation,
      });
    } catch (err) {
      res.status(400).send({ success: false, error: err });
    }
  }
};

export const addTransaction = async (
  // create transcation
  amount: number,
  walletId: string,
  signature: string,
  status: boolean
) => {
  const newTransction = new transactionModal({
    amount: amount,
    walletId: walletId,
    signature: signature,
    status: status,
  });
  try {
    const transaction = await newTransction.save();
    console.log({ walletId: walletId, transaction: transaction._id });
    return transaction._id;
  } catch (err) {
    console.log(err);
    return false;
  }
};

export const updateTransaction = async (
  // update status of transcation and  its signature
  id: string,
  signature: string,
  isPaid: boolean
) => {
  const find = await transactionModal.findOne({ _id: id });
  if (find) {
    console.log("Payment Recieved From : ", id);
    find.signature = signature;
    find.status = isPaid;
    await find.save();
  }
};
