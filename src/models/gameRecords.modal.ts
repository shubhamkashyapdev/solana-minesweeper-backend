import { Schema, model } from "mongoose";

interface GameRecord {
  gameId: string;
  user1: any;
  user2: any;
  status: boolean;
  winner: any;
  score: object;
}

const newSchema = new Schema<GameRecord>(
  {
    gameId: { type: String, required: true },
    user1: { type: Schema.Types.ObjectId, ref: "transactions" },
    user2: { type: Schema.Types.ObjectId, ref: "transactions" },
    score: {
      p1: {
        type: Number,
      },
      p2: {
        type: Number,
      },
    },
    status: { type: Boolean, required: false, default: false },
    winner: [{ type: Schema.Types.ObjectId, ref: "Users" }],
  },
  { timestamps: true }
);

export const gameRecordsModal = model<GameRecord>("GameRecords", newSchema);
