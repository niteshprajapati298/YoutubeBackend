import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

export const ConnectDb = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log("MONGODB Connection Established:", connectionInstance.connection.host);

    } catch (error) {
        console.log("MONGO Connection ERR",error);
        process.exit(1);
    }

}
// ConnectDb()