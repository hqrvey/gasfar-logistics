import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import User from "./models/User.js";
import DriverProfile from "./models/DriverProfile.js";
import VerificationCode from "./models/VerificationCode.js";
import Booking from "./models/Booking.js";

dotenv.config();

for (const key of ["MONGO_URI", "CLIENT_ORIGIN", "JWT_SECRET", "OTP_SECRET"]) {
  if (!process.env[key] || process.env[key].startsWith("REPLACE_")) {
    throw new Error(`Missing ${key} in server/.env`);
  }
}
if (process.env.JWT_SECRET.length < 32 || process.env.OTP_SECRET.length < 32) {
  throw new Error("JWT_SECRET and OTP_SECRET must each be at least 32 characters.");
}

const app = express();
app.disable("x-powered-by");
app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

// Reject browser mutations from origins other than our React app.
app.use((req, res, next) => {
  const origin = req.get("origin");
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && origin && origin !== process.env.CLIENT_ORIGIN) {
    return res.status(403).json({ message: "Request origin not allowed." });
  }
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use((error, req, res, next) => {
  if (error.code === "LIMIT_FILE_SIZE" || error.code === "LIMIT_FILE_COUNT" || error.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({ message: "Invalid or oversized file upload (maximum 8 MB each, 5 files)." });
  }
  if (error.type === "entity.parse.failed") return res.status(400).json({ message: "Invalid JSON request." });
  if (error.message?.startsWith("Only JPG")) return res.status(400).json({ message: error.message });
  console.error(error);
  return res.status(500).json({ message: "An unexpected server error occurred." });
});

async function startServer() {
  await connectDB();
  // Ensure unique indexes exist before accepting registration requests.
  await Promise.all([User.init(), DriverProfile.init(), VerificationCode.init(), Booking.init()]);
  const port = Number(process.env.PORT || 5001);
  app.listen(port, () => console.log(`GASFAR API listening on http://localhost:${port}`));
}

startServer().catch((error) => {
  console.error("Could not start server:", error.message);
  process.exit(1);
});

export { app };
