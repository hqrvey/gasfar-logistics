/*
  GASFAR BACKEND - STARTING POINT

  Request path:
  React -> server.js -> route -> controller -> Mongoose model -> MongoDB

  This file does not create bookings. It prepares Express, connects routes,
  connects MongoDB, and starts the HTTP server.
*/

// IMPORT: Bring code from npm packages and our own files into this file.
import express from "express";             // Web server for our REST API.
import dotenv from "dotenv";               // Reads environment variables from .env.
import cors from "cors";                   // Allows our React website to call this server.
import cookieParser from "cookie-parser"; // Reads the login cookie sent by the browser.
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import User from "./models/User.js";
import DriverProfile from "./models/DriverProfile.js";
import VerificationCode from "./models/VerificationCode.js";
import Booking from "./models/Booking.js";

// Load backend/.env so we can use process.env.VARIABLE_NAME.
dotenv.config();

// Before starting, check that the settings required for login and MongoDB exist.
const requiredSettings = ["MONGO_URI", "CLIENT_ORIGIN", "JWT_SECRET", "OTP_SECRET"];
for (const setting of requiredSettings) {
  const value = process.env[setting];
  if (!value || value.startsWith("REPLACE_")) {
    throw new Error(`Missing ${setting} in backend/.env`);
  }
}

// These two values sign login tokens and OTP proofs; short secrets are easy to guess.
if (process.env.JWT_SECRET.length < 32 || process.env.OTP_SECRET.length < 32) {
  throw new Error("JWT_SECRET and OTP_SECRET must each have at least 32 characters.");
}

// express() creates the app to which we attach all our routes.
const app = express();
app.disable("x-powered-by");

// MIDDLEWARE: Express runs these in the order we write them.
// CORS permits requests from the React URL written in CLIENT_ORIGIN.
app.use(cors({
  origin: process.env.CLIENT_ORIGIN,
  credentials: true, // Our authentication uses browser cookies.
}));

// Without express.json(), a JSON request body would not become req.body.
app.use(express.json({ limit: "100kb" }));

// Without cookieParser(), req.cookies would not contain our session cookie.
app.use(cookieParser());

// Extra browser-origin check for requests that change data.
// This is a small defense for cookie-based login, not a substitute for role checks.
app.use((req, res, next) => {
  const origin = req.get("origin"); // Example: http://localhost:5178
  const method = req.method;        // Example: GET, POST, PATCH
  const isReadRequest = ["GET", "HEAD", "OPTIONS"].includes(method);

  // Some non-browser tools have no Origin header, so we check it only if present.
  if (!isReadRequest && origin && origin !== process.env.CLIENT_ORIGIN) {
    return res.status(403).json({ message: "Request origin not allowed." });
  }

  next(); // Continue to the next middleware or route.
});

// ROUTES: React calls these URLs. Each routes file chooses a controller function.
app.use("/api/auth", authRoutes);       // e.g. POST /api/auth/login
app.use("/api/bookings", bookingRoutes); // e.g. POST /api/bookings

// Quick test: open http://localhost:5001/api/health in your browser.
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" }); // res.json() sends a JSON response back to the caller.
});

// ERROR MIDDLEWARE: Express recognizes this because it has FOUR parameters.
// A controller can pass an unexpected error here using next(error).
app.use((error, req, res, next) => {
  const uploadErrors = ["LIMIT_FILE_SIZE", "LIMIT_FILE_COUNT", "LIMIT_UNEXPECTED_FILE"];

  if (uploadErrors.includes(error.code)) {
    return res.status(400).json({ message: "Invalid or oversized file upload (maximum 8 MB each, 5 files)." });
  }

  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON request." });
  }

  if (error.message && error.message.startsWith("Only JPG")) {
    return res.status(400).json({ message: error.message });
  }

  console.error(error); // Show the full error in the backend terminal, NOT to users.
  return res.status(500).json({ message: "An unexpected server error occurred." });
});

// async allows await: connect MongoDB BEFORE accepting API requests.
async function startServer() {
  await connectDB(); // Wait until MongoDB connects, or this function will fail.

  // .init() prepares each model's indexes (e.g. unique username and booking code).
  // We do them one by one to make the order straightforward for beginners.
  await User.init();
  await DriverProfile.init();
  await VerificationCode.init();
  await Booking.init();

  // process.env values are strings; Number() converts the port to a number.
  const port = Number(process.env.PORT || 5001);

  app.listen(port, () => {
    console.log(`GASFAR API listening on http://localhost:${port}`);
  });
}

// If database connection or model initialization fails, show why and stop.
startServer().catch((error) => {
  console.error("Could not start server:", error.message);
  process.exit(1); // Exit status 1 means the program stopped due to an error.
});

// Named export for future API tests.
export { app };
