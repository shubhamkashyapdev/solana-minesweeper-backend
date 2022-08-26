import { Schema, model } from "mongoose";
import { User } from "../models/user.models";

const onlineUserSchema = new Schema<User>(
  {
    name: {
      type: String,
      required: false,
    },
    socketId: {
      type: String,
      required: false,
    },
    wallet: {
      type: String,
      required: true,
    },
    profilePic: {
      type: String,
      required: false,
    },
  },
  { timestamps: true }
);

export const onlineUserModal = model("OnlineUsers", onlineUserSchema);
