import { Schema, model } from "mongoose";

interface Entry {
  amount: number;
  userId: string;
  socketId: string; // it changes whenever user connect
  profilePic: string; // link of user profile pic
  walletId: string; // phantham wallet Address
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
