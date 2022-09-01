import mongoose from "mongoose";
import config from "config";
import colors from "colors";
const dbUrl: string = config.get("dbUrl");
colors.enable();
export const connectToDB = async () => {
  // connect to mongodb if connection fails then throw error and stop server
  try {
    console.log(dbUrl);
    await mongoose.connect(dbUrl);
    console.log("connected to mongodb".red);
  } catch (err) {
    console.log({ err });
    process.exit();
  }
};
