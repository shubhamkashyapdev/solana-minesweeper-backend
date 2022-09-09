import {
  Keypair,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  Connection,
  clusterApiUrl,
} from "@solana/web3.js";
import { transactionModal } from "../models/transaction.modal";

export const makePayment = async (
  winnerAddress: string,
  transactionId: string,
  stauts: string
) => {
  if (!winnerAddress) return false;

  let amount = await fetchAmount(transactionId);
  console.log({ amount });

  if (stauts == "win") {
    //@ts-ignore
    amount = amount * 2;
  }

  const secret_key = Uint8Array.from([
    90, 143, 136, 13, 217, 246, 237, 97, 10, 238, 184, 54, 35, 18, 194, 249, 6,
    249, 105, 59, 104, 123, 73, 61, 103, 192, 148, 227, 231, 253, 19, 80, 26, 3,
    63, 102, 28, 109, 25, 31, 154, 128, 141, 3, 4, 150, 68, 236, 123, 127, 219,
    48, 2, 167, 77, 3, 57, 153, 53, 127, 240, 198, 34, 195,
  ]);
  const sender = Keypair.fromSecretKey(secret_key);
  const recieverAddress: any = winnerAddress;

  let connection = new Connection(clusterApiUrl("devnet"));

  let transaction = new Transaction();
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: sender.publicKey,
      toPubkey: recieverAddress,
      lamports: Number(amount) * LAMPORTS_PER_SOL,
    })
  );

  sendAndConfirmTransaction(connection, transaction, [sender]);
};
export const fetchAmount = async (_id: string) => {
  const findDoc = await transactionModal.findOne({ _id: _id });
  if (findDoc) {
    return findDoc.amount;
  } else {
    return null;
  }
};
