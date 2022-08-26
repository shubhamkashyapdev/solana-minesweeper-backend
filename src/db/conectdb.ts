import mongoose from "mongoose";
import config from "config";

const dbUrl: string = config.get("dbUrl");

export const connectToDB = async () => {
  try {
    console.log(dbUrl);
    await mongoose.connect(dbUrl);
    console.log("connected to mongodb");
  } catch (err) {
    console.log({ err });
    process.exit();
  }
};
