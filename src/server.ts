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
import transactionRoutes from "./routes/transcations.route";
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
} from "./controllers/transcations.controller";
import { gameRecordsModal } from "./models/gameRecords.modal";
import colors from "colors";
import { makePayment } from "./controllers/solana.transcation.controller";
colors.enable();

const app = express();
const PORT = process.env.PORT || config.get("PORT");

app.use(fileupload({ useTempFiles: true }));
app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(morgan("dev"));
app.use(bodyParser.json());

app.use("/", userRotes); // user registration and upload profile pic
app.use("/", transactionRoutes); // get all trancsation
app.use("/", onlineUsersRoute); // get list of online user and other
app.use("/", gameRecodsRoutes); // get game records

app.get("/", (req, res) => {
  res.send(`API is working fine!`);
});
connectToDB(); // try connection to mongodb

const server = app.listen(PORT, () => {
  console.log("Server is Running : " + PORT);
});

const socketIo: any = init(server); // socket instance

socketIo.use(async (socket: any, next: any) => {
  // socket middleware
  // listerning for incoming connection request
  const walletId = socket.handshake.auth.walletId; // authentication

  const checkUser = await userModal.findOne({ wallet: walletId }); // verify user with user walletAddress
  if (!walletId) {
    // disconnect if no walletAddress found
    return socket.disconnect();
  } else if (checkUser) {
    checkUser.socketId = socket.id;
    checkUser.save();
    await addtoOnlineList(checkUser); // add user to online users array
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
  // listining for connections
  console.log("client Connected with id ".cyan.bold, socket.id);
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
      // update score
      const isGame: any = await gameRecordsModal // finding game record and updating score
        .findOne({ gameId: roomId })
        .populate("user1")
        .populate("user2");

      if (isGame.user1._id == transactionId) {
        // checking the uer
        // update score in doc
        isGame.score = { ...isGame.score, p1: score };
        console.log("updatig score of Player 1 with Id ", transactionId);
        // console.log({ isGame });
      }
      if (isGame.user2._id == transactionId) {
        // checking the user
        console.log("updatig score of Player 2 with Id ", transactionId);
        // update score in doc
        isGame.score = { ...isGame.score, p2: score };
      }

      await isGame.save(); // saving game record

      const { p1, p2 } = isGame.score;
      if (p1 > -1 && p2 > -1 && !isGame.status) {
        // choosing winner if we have scores from both users
        isGame.status = true;
        let winnerTransactionId = "";
        // check winner and notify players
        let winner: Array<any> = [];
        if (isGame.score.p1 > isGame.score.p2) {
          winner.push(isGame.user1.walletId);
          winnerTransactionId = isGame.user1;
        } else if (isGame.score.p1 < isGame.score.p2) {
          winner.push(isGame.user2.walletId);
          winnerTransactionId = isGame.user2;
        } else {
          winner = [isGame.user1.walletId, isGame.user2.walletId];
          console.log("tie");
        }
        console.log({ winner });

        if (winner.length > 1) {
          makePayment(winner[0], isGame.user1, "tie");
          makePayment(winner[1], isGame.user2, "tie");
        } else {
          makePayment(winner[0], winnerTransactionId, "win");
        }

        getUserBywalletId(winner, async (result: Array<any>) => {
          // fetching user by wallet address
          isGame.winner = result;
          await isGame.save();
          socketIo.to(roomId).emit("winner", winner);
          console.log("send winners :- ".red.bold);
          console.log(winner);
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

      const checkUser = await userModal.findOne({ wallet: walletId }); // check user if user is already in a matching

      if (checkUser) {
        const alreadySearching = await availableUserModel.findOne({
          userId: checkUser._id,
        });

        if (alreadySearching) {
          console.log("already in Matching"); // notify user if user is in matching and return here
          const object = {
            doc: alreadySearching,
            isMatching: true,
          };
          socket.emit("message", object);
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

function sleep(time: number) {
  // wait for a while then start Searching for opponnet
  return new Promise((resolve, reject) =>
    setTimeout(() => {
      resolve(true);
    }, time)
  );
}

async function startMatching(socket: any, data: any) {
  //  find match
  try {
    console.log("Looking for Opponent pls..... wait ");
    let isOpponent = false;
    while (!isOpponent) {
      // check untill user gets a opponent
      // socket.emit("message", "Searching");
      await sleep(2000); // wait to some time and check for opponent
      const checkAvailablility = await availableUserModel.findOne({
        userId: data.userId,
        amount: data.amount,
        level: data.level,
      });

      if (!checkAvailablility) {
        // if played is matched with someOne else then stop the search & notify user
        console.log("already paired with someOne");
        return (isOpponent = true);
      }

      const opponent = await availableUserModel.findOne({
        // find opponent based on parameters provided like amont & no. of theives
        userId: { $ne: data.userId },
        amount: data.amount,
        level: data.level,
      });
      if (opponent) {
        // if got opponent
        await availableUserModel.findOneAndRemove({
          // remove users from available array
          userId: opponent.userId,
        });
        await availableUserModel.findOneAndRemove({ userId: data.userId }); // some as above

        const p1Id = await addTransaction(
          // creating a payement with status pending
          data.amount,
          data.walletId,
          "false",
          false
        );

        const p2Id = await addTransaction(
          // creating payment record with status pending
          opponent.amount,
          opponent.walletId,
          "false",
          false
        );

        const roomid = uuidv4(); // generating a random number to represent current session
        const newGame = new gameRecordsModal({
          // creating a record for current game session
          gameId: roomid,
          user1: p1Id,
          user2: p2Id,
        });
        await newGame.save();

        console.log({ opponent, notifiying: "opponent" }); // notify both user new room id and let them start their payment
        socket.to(opponent.socketId).emit("gotOpponent", data, roomid, p2Id);
        socket.emit("gotOpponent", opponent, roomid, p1Id);

        isOpponent = true;
      } else {
        socket.emit("noOpponent", {
          // no opponent found search again after some time
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
  // verify payment and let both players play their
  // verify payment and start game
  return new Promise(async (resolve) => {
    const game = await gameRecordsModal
      .findOne({ gameId: gameId })
      .populate("user1")
      .populate("user2");
    if (game) {
      if (game.user1.status && game.user2.status) {
        resolve(true);
      } else {
        resolve(false);
      }
    }
  });
}
