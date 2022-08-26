import { transactionModal } from "../models/transaction.modal";
import { Request, Response } from "express";

export const getAllTransction = async (req: Request, res: Response) => {};

export const addTransaction = async (
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
