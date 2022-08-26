import { Schema, model } from "mongoose";

interface transaction {
  walletId: string;
  amount: number;
  signature: string;
  status: Boolean;
}

const transactionSchema = new Schema<transaction>(
  {
    walletId: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    signature: {
      type: String,
      required: true,
    },
    status: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const transactionModal = model<transaction>(
  "transactions",
  transactionSchema
);
