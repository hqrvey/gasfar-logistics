/* DATABASE CONNECTION: Called by startServer() in server.js. */
import mongoose from "mongoose";

export async function connectDB() {
  // mongoose.connect() reads the MongoDB address from backend/.env.
  // await waits for the connection before the server starts listening.
  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB connected");
}
