import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import DriverProfile from "../models/DriverProfile.js";
import VerificationCode from "../models/VerificationCode.js";
import { sendSMS } from "../services/smsService.js";

// Philippine mobile number: 09171234567, 9171234567 or +639171234567.
function normalizePhone(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("63")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return /^9\d{9}$/.test(digits) ? `+63${digits}` : null;
}

function userForClient(user) {
  return {
    id: String(user._id),
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    email: user.email || "",
    phone: user.phone,
    role: user.role,
    accountStatus: user.accountStatus,
  };
}

function makeCodeHash(phone, code) {
  return createHmac("sha256", process.env.OTP_SECRET).update(`${phone}:${code}`).digest("hex");
}


export async function sendCode(req, res, next) {
  try {
    const phone = normalizePhone(req.body?.phone);
    if (!phone) return res.status(400).json({ message: "Enter a valid Philippine mobile number." });
    if (await User.exists({ phone })) return res.status(409).json({ message: "This phone number already has an account." });

    const previous = await VerificationCode.findOne({ phone });
    const now = Date.now();
    if (previous && now - previous.lastSentAt.getTime() < 60000) {
      return res.status(429).json({ message: "Please wait 60 seconds before requesting another code." });
    }
    if (previous && previous.sends >= 5) {
      return res.status(429).json({ message: "Too many codes requested. Try again later." });
    }

    const code = String(randomInt(100000, 1000000));
    try {
      await sendSMS(phone, `GASFAR verification code: ${code}. It expires in 5 minutes.`);
    } catch (error) {
      // Do not store a new OTP or start the resend cooldown if SMS sending fails.
      console.error("Could not send registration OTP:", error.message);
      return res.status(502).json({ message: "Unable to send verification SMS. Check the SMS service and try again." });
    }
    await VerificationCode.findOneAndUpdate({ phone }, {
      codeHash: makeCodeHash(phone, code),
      expiresAt: new Date(now + 5 * 60 * 1000),
      lastSentAt: new Date(now),
      attempts: 0,
      sends: (previous?.sends || 0) + 1,
    }, { upsert: true, new: true, runValidators: true });

    res.json({ message: "Verification code sent." });
  } catch (error) { next(error); }
}

export async function verifyCode(req, res, next) {
  try {
    const phone = normalizePhone(req.body?.phone);
    const code = String(req.body?.code || "");
    if (!phone || !/^\d{6}$/.test(code)) return res.status(400).json({ message: "Invalid phone number or code." });
    // Atomically count each verification attempt; limits brute-force guesses.
    const record = await VerificationCode.findOneAndUpdate({ phone, attempts: { $lt: 5 }, expiresAt: { $gt: new Date() } }, { $inc: { attempts: 1 } }, { new: true });
    if (!record) return res.status(400).json({ message: "Code expired or too many attempts. Request a new code." });
    const expected = Buffer.from(record.codeHash, "hex");
    const actual = Buffer.from(makeCodeHash(phone, code), "hex");
    if (!timingSafeEqual(expected, actual)) return res.status(400).json({ message: "Incorrect code." });

    await VerificationCode.deleteOne({ _id: record._id });
    // Short-lived proof: registration must present this token for the SAME phone.
    const verificationToken = jwt.sign({ purpose: "phone_signup", phone }, process.env.OTP_SECRET, { expiresIn: "15m" });
    res.json({ message: "Phone verified.", verificationToken });
  } catch (error) { next(error); }
}

async function removeUploadedFiles(files = {}) {
  await Promise.all(Object.values(files).flat().map((file) => fs.unlink(file.path).catch(() => {})));
}

export async function register(req, res, next) {
  let createdUser = null;
  let savedDriverProfile = false;
  try {
    const { firstName, lastName, username, email, password, confirmPassword, role, verificationToken, vehicleType, plateNumber } = req.body || {};
    const phone = normalizePhone(req.body?.phone);
    const cleanUsername = String(username || "").trim().toLowerCase();
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanFirst = String(firstName || "").trim();
    const cleanLast = String(lastName || "").trim();
    const passwordValue = String(password || "");

    if (!["customer", "driver"].includes(role)) return res.status(400).json({ message: "Only customer and driver signup is allowed." });
    if (!phone || !/^\w[\w.-]{7,29}$/.test(cleanUsername) || !cleanFirst || !cleanLast || cleanFirst.length > 80 || cleanLast.length > 80) {
      return res.status(400).json({ message: "Please enter valid personal information and a username of 8–30 characters." });
    }
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return res.status(400).json({ message: "Invalid email address." });
    if (passwordValue.length < 8 || Buffer.byteLength(passwordValue) > 72) return res.status(400).json({ message: "Password must be at least 8 characters and at most 72 bytes." });
    if (confirmPassword !== passwordValue) return res.status(400).json({ message: "Passwords do not match." });
    if (req.body?.terms !== "true" && req.body?.terms !== true) return res.status(400).json({ message: "You must accept the terms and conditions." });

    try {
      const proof = jwt.verify(String(verificationToken || ""), process.env.OTP_SECRET);
      if (proof.purpose !== "phone_signup" || proof.phone !== phone) throw new Error("Verification mismatch");
    } catch {
      return res.status(400).json({ message: "Phone verification expired. Please verify your phone again." });
    }

    if (role === "driver") {
      const types = ["motorcycle", "sedan", "suv", "pickup", "l300"];
      const requiredFiles = ["profilePhoto", "license", "or", "cr", "backplate"];
      if (!types.includes(vehicleType) || !/^[A-Z0-9 -]{4,12}$/i.test(String(plateNumber || "").trim()) || requiredFiles.some((key) => !req.files?.[key]?.[0])) {
        return res.status(400).json({ message: "Vehicle type, plate number, and all five documents are required." });
      }
    }

    if (await User.exists({ $or: [{ username: cleanUsername }, { phone }, ...(cleanEmail ? [{ email: cleanEmail }] : [])] })) {
      return res.status(409).json({ message: "Username, phone, or email is already registered." });
    }

    const passwordHash = await bcrypt.hash(passwordValue, 12);
    createdUser = await User.create({
      firstName: cleanFirst, lastName: cleanLast, username: cleanUsername, phone,
      ...(cleanEmail ? { email: cleanEmail } : {}), passwordHash, role,
      phoneVerifiedAt: new Date(),
    });

    if (role === "driver") {
      await DriverProfile.create({
        userId: createdUser._id,
        vehicle: { type: vehicleType, plateNumber },
        documents: Object.fromEntries(["profilePhoto", "license", "or", "cr", "backplate"].map((key) => [key, req.files[key][0].filename])),
      });
      savedDriverProfile = true;
    }
    res.status(201).json({ message: role === "driver" ? "Driver application submitted for approval." : "Account created. Please log in.", user: userForClient(createdUser) });
  } catch (error) {
    if (createdUser) await User.deleteOne({ _id: createdUser._id }).catch(() => {});
    if (error.code === 11000) return res.status(409).json({ message: "Username, phone, or email is already registered." });
    next(error);
  } finally {
    if (!savedDriverProfile) await removeUploadedFiles(req.files);
  }
}

export async function login(req, res, next) {
  try {
    const identifier = String(req.body?.identifier || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (!identifier || !password || identifier.length > 254) return res.status(400).json({ message: "Enter your account and password." });
    const phone = normalizePhone(identifier);
    const clauses = [{ username: identifier }, { email: identifier }];
    if (phone) clauses.push({ phone });
    const user = await User.findOne({ $or: clauses }).select("+passwordHash");
    // Use a dummy hash for unknown users to reduce timing differences.
    const dummyHash = "$2a$12$wHPruND06bqiTDzvmoG/HOrTpzmFeZ2ha8oOayvKynYNFNUTM9Ju2";
    const valid = await bcrypt.compare(password, user?.passwordHash || dummyHash);
    if (!user || !valid) return res.status(401).json({ message: "Invalid username, phone, email or password." });
    if (user.accountStatus !== "active") return res.status(403).json({ message: "This account is not active." });
    if (user.role === "driver") {
      const profile = await DriverProfile.findOne({ userId: user._id });
      if (!profile || profile.verificationStatus !== "approved") {
        return res.status(403).json({ code: "DRIVER_PENDING", message: "Driver account is awaiting admin approval." });
      }
    }

    const remember = req.body?.remember === true;
    const ageMs = remember ? 7 * 86400000 : 86400000;
    const token = jwt.sign({ purpose: "session", userId: String(user._id) }, process.env.JWT_SECRET, { expiresIn: remember ? "7d" : "1d" });
    res.cookie("gasfar_session", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: ageMs, path: "/" });
    res.json({ user: userForClient(user) });
  } catch (error) { next(error); }
}

export function logout(req, res) {
  res.clearCookie("gasfar_session", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" });
  res.json({ message: "Logged out." });
}

export function me(req, res) {
  res.json({ user: userForClient(req.user) });
}

// Admin-only endpoints to review driver applications and grant access.
export async function listDriverApplications(req, res, next) {
  try {
    const applications = await DriverProfile.find()
      .populate("userId", "firstName lastName username phone email")
      .sort({ createdAt: -1 });
    res.json({ applications });
  } catch (error) { next(error); }
}

export async function updateDriverApproval(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid driver ID." });
    const status = req.body?.status;
    if (!["approved", "rejected"].includes(status)) return res.status(400).json({ message: "Status must be approved or rejected." });
    const profile = await DriverProfile.findOneAndUpdate(
      { userId: id }, { verificationStatus: status, isOnline: false }, { new: true }
    );
    if (!profile) return res.status(404).json({ message: "Driver application not found." });
    res.json({ message: `Driver application ${status}.`, verificationStatus: profile.verificationStatus });
  } catch (error) { next(error); }
}

export async function getDriverDocument(req, res, next) {
  try {
    const { id, field } = req.params;
    if (!mongoose.isValidObjectId(id) || !["profilePhoto", "license", "or", "cr", "backplate"].includes(field)) {
      return res.status(400).json({ message: "Invalid document request." });
    }
    const profile = await DriverProfile.findOne({ userId: id });
    if (!profile?.documents?.[field]) return res.status(404).json({ message: "Document not found." });
    // Filenames are generated by the server and kept outside public directories.
    res.sendFile(path.basename(profile.documents[field]), {
      root: path.resolve("private-uploads"),
      headers: { "Content-Disposition": "attachment", "X-Content-Type-Options": "nosniff" },
    }, (error) => { if (error && !res.headersSent) next(error); });
  } catch (error) { next(error); }
}
