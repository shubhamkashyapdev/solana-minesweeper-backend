import express from "express";
import config from "config";
import { getUserBywalletId, init } from "./sockets/socket";
import { connectToDB } from "./db/conectdb";
import bodyParser from "body-parser";
import morgan from "morgan";
import cors from "cors";
import fileupload from "express-fileupload";
import { v4 as uuidv4 } from "uuid";

import userRotes from "./routes/user.registration.route";
import searchOpponent from "./routes/searchOpponent.route";
import gameRecodsRoutes from "./routes/gameRecords.route";

import { availableUserModel } from "./models/AvailableForMatching.modal";
import { userModal } from "./models/user.models";
import {
  addtoOnlineList,
  removeUser,
} from "./controllers/online.users.controller";
import onlineUsersRoute from "./routes/OnlineUsers.route";
import {
  addTransaction,
  updateTransaction,
} from "./controllers/transctions.controller";
import { gameRecordsModal } from "./models/gameRecords.modal";

const app = express();
const PORT = process.env.PORT || config.get("PORT");

app.use(fileupload({ useTempFiles: true }));
app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(morgan("dev"));
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send(`API is working fine!`)
})

app.use("/", userRotes);
app.use("/", searchOpponent);
app.use("/", onlineUsersRoute);
app.use("/", gameRecodsRoutes);

connectToDB();

const server = app.listen(PORT, () => {
  console.log("Server is Running : " + PORT);
});

const socketIo: any = init(server);

socketIo.use(async (socket: any, next: any) => {
  const walletId = socket.handshake.auth.walletId;
  const checkUser = await userModal.findOne({ wallet: walletId });
  if (!walletId) {
    return socket.disconnect();
  } else if (checkUser) {
    checkUser.socketId = socket.id;
    checkUser.save();
    await addtoOnlineList(checkUser);
  } else {
    const newUser = new userModal({
      name: "",
      socketId: socket.id,
      wallet: walletId,
      profilePic: "",
    });
    await newUser.save();
  }

  next();
});

socketIo.on("connection", async (socket: any) => {
  console.log("client Connected with id ", socket.id);
  socket.emit("message", `connected with id ${socket.id}`);

  socket.on("message", (msg: any) => {
    // channel for messaging
    console.log({ msg });
  });

  socket.on("disconnect", () => {
    // when a user disconnects
    console.log("ueser Disconnected with id ", socket.id);
    removeUser(socket.id);
  });

  socket.on("msgToCustomRoom", (msg: string, roomId: string) => {
    socketIo.to(roomId).emit("message", msg); // tramsmit msg to opponent after matching
  });

  socket.on(
    "updatePayment", /// update payment status after payment
    async (signature: string, isPaid: boolean, id: string, gameId: string) => {
      await updateTransaction(id, signature, isPaid);

      socketIo.to(gameId).emit("paymentRecieved", { transactionId: id });

      const payment = await isPayment(gameId);
      if (payment) {
        socketIo.to(gameId).emit("startGame", { startGame: true }); // start game after both player have done payment
      }
    }
  );

  socket.on(
    "updateScore",
    async (roomId: string, transactionId: string, score: number) => {
      const isGame: any = await gameRecordsModal
        .findOne({ gameId: roomId })
        .populate("user1")
        .populate("user2");

      if (isGame.user1._id == transactionId) {
        // update score in doc
        isGame.score = { ...isGame.score, p1: score };
        console.log("updatig score of Player 1 with Id ", transactionId);
        // console.log({ isGame });
      }
      if (isGame.user2._id == transactionId) {
        console.log("updatig score of Player 2 with Id ", transactionId);
        // update score in doc
        isGame.score = { ...isGame.score, p2: score };
      }

      await isGame.save();

      const { p1, p2 } = isGame.score;
      if (p1 > -1 && p2 > -1) {
        isGame.status = true;
        // check winner and notify players
        let winner: Array<any> = [];
        if (isGame.score.p1 > isGame.score.p2) {
          winner.push(isGame.user1.walletId);
        } else if (isGame.score.p1 < isGame.score.p2) {
          winner.push(isGame.user2.walletId);
        } else {
          winner = [isGame.user1.walletId, isGame.user2.walletId];
          console.log("tie");
        }
        console.log({ winner });

        getUserBywalletId(winner, async (result: Array<any>) => {
          console.log({ result });
          isGame.winner = result;
          await isGame.save();
          socketIo.to(roomId).emit("winner", winner);
        });
      }
    }
  );

  socket.on("leaveGame", (roomId: string) => {
    // leave Room
    socket.leave(roomId);
    console.log(`\n\n\n\n\n user with roomId ${roomId} is ended`);
  });

  socket.on("joinCustomRoom", (roomId: string) => {
    // join room after getting opponent
    socket.join(roomId);
    socket.emit("message", "joined Room");
  });

  socket.on(
    // player available for match
    "availableForMatch",
    async (walletId: any, amount: any, level: any) => {
      console.log("\n\nPlayer Available for Match", walletId);

      const checkUser = await userModal.findOne({ wallet: walletId });

      if (checkUser) {
        const alreadySearching = await availableUserModel.findOne({
          userId: checkUser._id,
        });

        if (alreadySearching) {
          console.log("already in Matching");
          socket.emit("message", `alrady in Maching  ${alreadySearching}`);
          return false;
        }

        const newEntry = new availableUserModel({
          // adding current user to available list
          amount: amount,
          level: level,
          userId: checkUser._id,
          socketId: checkUser.socketId,
          profilePic: checkUser.profilePic,
          walletId: checkUser.wallet,
        });
        await newEntry.save();

        startMatching(socket, newEntry);
      }
    }
  );
});

function sleep(time: number, func?: () => void) {
  return new Promise((resolve, reject) =>
    setTimeout(() => {
      resolve(true);
    }, time)
  );
}

async function startMatching(socket: any, data: any) {
  //  find match
  try {
    console.log("starting Search");
    let isOpponent = false;
    while (!isOpponent) {
      // socket.emit("message", "Searching");
      await sleep(5000);
      const checkAvailablility = await availableUserModel.findOne({
        userId: data.userId,
        amount: data.amount,
        level: data.level,
      });

      if (!checkAvailablility) {
        console.log("already paired with someOne");
        return (isOpponent = true);
      }

      const opponent = await availableUserModel.findOne({
        userId: { $ne: data.userId },
        amount: data.amount,
        level: data.level,
      });
      if (opponent) {
        await availableUserModel.findOneAndRemove({
          userId: opponent.userId,
        });
        await availableUserModel.findOneAndRemove({ userId: data.userId });

        const p1Id = await addTransaction(
          data.amount,
          data.walletId,
          "false",
          false
        );

        const p2Id = await addTransaction(
          opponent.amount,
          opponent.walletId,
          "false",
          false
        );

        const roomid = uuidv4();
        const newGame = new gameRecordsModal({
          gameId: roomid,
          user1: p1Id,
          user2: p2Id,
        });
        await newGame.save();

        console.log({ opponent, notifiying: "opponent" });
        socket.to(opponent.socketId).emit("gotOpponent", data, roomid, p2Id);
        socket.emit("gotOpponent", opponent, roomid, p1Id);

        isOpponent = true;
      } else {
        socket.emit("noOpponent", {
          opponent: false,
          message: "no oppenent Found",
        });
      }
    }
  } catch (err) {
    console.log(err);
  }
}

async function isPayment(gameId: string) {
  // verify payment and start game
  return new Promise(async (resolve) => {
    const game = await gameRecordsModal
      .findOne({ gameId: gameId })
      .populate("user1")
      .populate("user2");
    if (game) {
      // console.log({ UpdatingGame: game });
      // console.log({ statusp1: game.user1.status });
      // console.log({ statusp2: game.user2.status });
      if (game.user1.status && game.user2.status) {
        resolve(true);
      } else {
        resolve(false);
      }
    }
  });
}
