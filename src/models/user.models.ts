import { Schema, model } from "mongoose";

export interface User {
  name: string;
  wallet: string;
  socketId: string;
  profilePic: string;
}

const userSchema = new Schema<User>(
  {
    name: { type: String, required: false },
    wallet: { type: String, required: true },
    socketId: { type: String },
    profilePic: { type: String, required: false, default: "#" },
  },
  { timestamps: true }
);

userSchema.pre("save", function () {
  if (!this.name) {
    this.name = this.wallet;
  }
});

export const userModal = model<User>("Users", userSchema);
