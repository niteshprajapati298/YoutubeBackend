import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

export const ConnectDb = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri || !/^mongodb(\+srv)?:\/\//.test(uri)) {
            throw new Error(
                "MONGODB_URI is missing or malformed. It must start with 'mongodb://' or 'mongodb+srv://'."
            );
        }
        const base = uri.replace(/\/+$/, "");
        const connectionInstance = await mongoose.connect(`${base}/${DB_NAME}`);
        console.log("MONGODB Connection Established:", connectionInstance.connection.host);

    } catch (error) {
        console.log("MONGO Connection ERR",error);
        process.exit(1);
    }

}
// ConnectDb()