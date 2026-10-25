/*
 * server.js — WHERE THE BACKEND STARTS.
 * This is the same order used in the freeCodeCamp ThinkBoard course:
 * load settings -> make Express app -> add middleware -> add routes -> connect DB -> listen.
 *
 * A customer pressing Confirm Booking does NOT run Booking.create() here.
 * The request goes to bookingRoutes.js, which calls bookingControllers.js.
 */
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { mkdirSync } from "node:fs";

import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import extraRoutes from "./routes/extraRoutes.js";

import User from "./models/User.js";
import DriverProfile from "./models/DriverProfile.js";
import VerificationCode from "./models/VerificationCode.js";
import Booking from "./models/Booking.js";
import Wallet from "./models/Wallet.js";

// STEP 1: Read backend/.env. Its variables become process.env.MONGO_URI, etc.
dotenv.config();

// The app needs these values. Missing settings should not produce a half-working API.
const requiredSettings = ["MONGO_URI", "CLIENT_ORIGIN", "JWT_SECRET", "OTP_SECRET"];
for (const name of requiredSettings) {
  const value = process.env[name];
  if (!value || value.startsWith("REPLACE_")) {
    throw new Error(`Missing ${name} in backend/.env`);
  }
}

// A secret signs tokens. A longer, random secret is harder to guess.
if (process.env.JWT_SECRET.length < 32 || process.env.OTP_SECRET.length < 32) {
  throw new Error("JWT_SECRET and OTP_SECRET must each have at least 32 characters.");
}

// STEP 2: Create the Express app, just as in the tutorial.
const app = express();
app.disable("x-powered-by");

// STEP 3: Add middleware. app.use() means "run this before our route handler".
// Allow the browser address written in CLIENT_ORIGIN (e.g. localhost:5178).
app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));

// Make JSON sent by React available as req.body to our controllers.
app.use(express.json({ limit: "100kb" }));

// Read our signed login session cookie into req.cookies.
app.use(cookieParser());

// Cookies are sent automatically by browsers, so reject data-changing requests
// that explicitly announce an unexpected Origin. This is not a full CSRF system.
app.use((req, res, next) => {
  const origin = req.get("origin");
  const method = req.method;
  const readOnlyMethods = ["GET", "HEAD", "OPTIONS"];
  const isReadOnly = readOnlyMethods.includes(method);

  if (!isReadOnly && origin && origin !== process.env.CLIENT_ORIGIN) {
    return res.status(403).json({ message: "Request origin not allowed." });
  }
  next(); // Send the request to the next matching middleware or route.
});

// STEP 4: Connect route groups. Express adds these prefixes to their URLs.
app.use("/api/auth", authRoutes);         // POST /api/auth/login
app.use("/api/bookings", bookingRoutes); // POST /api/bookings
app.use("/api/extra", extraRoutes);       // GET /api/extra/wallet

// For a quick test, open http://localhost:5001/api/health.
app.get("/api/health", (req, res) => {
  return res.json({ status: "ok" });
});

// Error middleware has FOUR parameters so Express recognizes it as an error handler.
app.use((error, req, res, next) => {
  const uploadErrors = ["LIMIT_FILE_SIZE", "LIMIT_FILE_COUNT", "LIMIT_UNEXPECTED_FILE"];
  if (uploadErrors.includes(error.code)) {
    return res.status(400).json({
      message: "Invalid or oversized file upload (maximum 8 MB each, 5 files).",
    });
  }
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON request." });
  }
  if (error.message && error.message.startsWith("Only JPG")) {
    return res.status(400).json({ message: error.message });
  }
  console.error(error);
  return res.status(500).json({ message: "An unexpected server error occurred." });
});

// STEP 5: Connect MongoDB BEFORE telling Express to accept HTTP requests.
async function startServer() {
  // Uploaded private documents must never be served as ordinary public images.
  mkdirSync("private-uploads", { recursive: true });

  // mongoose.connect() is inside config/db.js; await waits for completion.
  await connectDB();

  // .init() finishes setting up indexes (such as unique usernames).
  // Initialize one by one so failures are easy to locate in the console.
  await User.init();
  await DriverProfile.init();
  await VerificationCode.init();
  await Booking.init();
  await Wallet.init(); // FIXED: previously Wallet.init() was not awaited.

  const port = Number(process.env.PORT || 5001);
  app.listen(port, () => {
    console.log(`GASFAR API listening on http://localhost:${port}`);
  });
}

// If MongoDB cannot connect, do not continue accepting booking requests.
startServer().catch((error) => {
  console.error("Could not start server:", error.message);
  process.exit(1);
});

// Allows automated tests to import this Express app.
export { app };
