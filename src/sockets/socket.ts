import { Server } from "socket.io";
import { userModal } from "../models/user.models";

export const init = (server: any) => {
  const io = new Server(server, { cors: { origin: "*" } });
  return io;
};

export const getUserBywalletId = (
  walletId: Array<string>,
  callback: (result: Array<any>) => void
) => {
  const winnerIds: any[] = [];
  walletId.forEach(async (element) => {
    try {
      const user = await userModal.findOne({ wallet: element });
      // @ts-ignore
      if (user) {
        winnerIds.push(user._id);
        if (winnerIds.length == walletId.length) {
          callback(winnerIds);
        }
      }
    } catch (err) {
      console.log({ err });
    }
  });
};
