import { Schema, model } from "mongoose";

interface Entry {
  amount: number;
  userId: string;
  socketId: string;
  profilePic: string;
  walletId: string;
  level: Number;
}

const availableUserSchema = new Schema<Entry>({
  amount: { type: Number, rquired: true },
  level: { type: Number, required: true },
  userId: { type: String, required: true },
  socketId: { type: String, required: true },
  profilePic: { type: String, required: false },
  walletId: { type: String, required: true },
});

export const availableUserModel = model<Entry>(
  "AvailbleUsers",
  availableUserSchema
);
