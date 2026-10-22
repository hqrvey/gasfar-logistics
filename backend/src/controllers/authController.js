/*
  GASFAR AUTHENTICATION CONTROLLER

  React sends login and registration requests to /api/auth/... .
  authRoutes.js chooses one function in this file.
  Mongoose models communicate with MongoDB; res.json() sends data back to React.

  User = shared customer/driver/admin login data.
  DriverProfile = driver-specific vehicle information and approval status.
  VerificationCode = temporary phone registration codes.
*/
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

// Convert normal Philippine number formats into +639XXXXXXXXX.
function normalizePhone(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("63")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (!/^9\d{9}$/.test(digits)) return null;
  return "+63" + digits;
}

// Give React only the account fields it needs; NEVER return passwordHash.
function userForClient(user) {
  return {
    id: String(user._id), // Convert MongoDB ObjectId to text.
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    email: user.email || "",
    phone: user.phone,
    role: user.role,
    accountStatus: user.accountStatus,
  };
}

// HMAC is a one-way hash based on OTP_SECRET in backend/.env.
// The six-digit code is sent by SMS, but only its hash is saved in MongoDB.
function makeCodeHash(phone, code) {
  const hash = createHmac("sha256", process.env.OTP_SECRET);
  hash.update(phone + ":" + code);
  return hash.digest("hex");
}

// ------------------------------------------------------------
// POST /api/auth/send-code: Create and send a registration OTP.
// ------------------------------------------------------------
export async function sendCode(req, res, next) {
  try {
    const phone = normalizePhone(req.body && req.body.phone);
    if (!phone) return res.status(400).json({ message: "Enter a valid Philippine mobile number." });

    // Phone numbers must be unique, so do not send signup codes to existing users.
    const alreadyRegistered = await User.exists({ phone: phone });
    if (alreadyRegistered) return res.status(409).json({ message: "This phone already has an account." });

    const previous = await VerificationCode.findOne({ phone: phone });
    const now = Date.now(); // Current time in milliseconds.

    // Prevent repeated SMS requests every few seconds.
    if (previous) {
      const timeSinceLastSMS = now - previous.lastSentAt.getTime();
      if (timeSinceLastSMS < 60000) {
        return res.status(429).json({ message: "Please wait 60 seconds before requesting another code." });
      }
      if (previous.sends >= 5) {
        return res.status(429).json({ message: "Too many codes requested. Try again later." });
      }
    }

    const code = String(randomInt(100000, 1000000)); // Random six-digit number.
    try {
      await sendSMS(phone, "GASFAR verification code: " + code + ". Expires in 5 minutes.");
    } catch (error) {
      console.error("SMS send problem:", error.message);
      return res.status(502).json({ message: "Unable to send verification SMS. Try again." });
    }

    let totalSends = 1;
    if (previous) totalSends = previous.sends + 1;

    // ONE record per phone: findOneAndUpdate changes it or inserts it (upsert).
    // $set explicitly changes the named fields, not the entire document.
    await VerificationCode.findOneAndUpdate(
      { phone: phone }, // FILTER: Which record should MongoDB look for?
      {
        $set: {
          codeHash: makeCodeHash(phone, code),
          expiresAt: new Date(now + 5 * 60 * 1000),
          lastSentAt: new Date(now),
          attempts: 0,
          sends: totalSends,
        },
      },
      { upsert: true, new: true, runValidators: true } // Create if missing.
    );
    return res.json({ message: "Verification code sent." });
  } catch (error) {
    next(error); // Give an unexpected error to server.js error middleware.
  }
}

// ------------------------------------------------------------
// POST /api/auth/verify-code: Check the customer's SMS code.
// ------------------------------------------------------------
export async function verifyCode(req, res, next) {
  try {
    const phone = normalizePhone(req.body && req.body.phone);
    const code = String((req.body && req.body.code) || "");
    if (!phone || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ message: "Invalid phone number or code." });
    }

    // IMPORTANT: We count each attempt in MongoDB BEFORE testing the code.
    // This one atomic update prevents simultaneous attempts bypassing the limit.
    // $lt = less than; $gt = greater than.
    const record = await VerificationCode.findOneAndUpdate(
      { phone: phone, attempts: { $lt: 5 }, expiresAt: { $gt: new Date() } },
      { $inc: { attempts: 1 } }, // $inc adds 1 to the stored attempts value.
      { new: true } // Give us the updated document.
    );
    if (!record) return res.status(400).json({ message: "Code expired or attempts exhausted. Request a new code." });

    const storedHash = Buffer.from(record.codeHash, "hex");
    const enteredHash = Buffer.from(makeCodeHash(phone, code), "hex");
    // timingSafeEqual compares the hashes without leaking timing information.
    let isCorrect = false;
    if (storedHash.length === enteredHash.length) {
      isCorrect = timingSafeEqual(storedHash, enteredHash);
    }
    if (!isCorrect) return res.status(400).json({ message: "Incorrect code." });

    await VerificationCode.deleteOne({ _id: record._id }); // Code cannot be reused.
    // A short-lived signed proof lets /register know this PHONE was verified.
    const verificationToken = jwt.sign(
      { purpose: "phone_signup", phone: phone },
      process.env.OTP_SECRET,
      { expiresIn: "15m" }
    );
    return res.json({ message: "Phone verified.", verificationToken: verificationToken });
  } catch (error) {
    next(error);
  }
}

// Files uploaded by drivers are saved on disk by Multer (authRoutes.js).
// If registration fails, delete files that don't belong to a saved profile.
async function removeUploadedFiles(files) {
  if (!files) return;
  // `Object.values` gets all arrays inside req.files.
  for (const fileArray of Object.values(files)) {
    for (const file of fileArray) {
      try {
        await fs.unlink(file.path); // Delete one file using Node's file system.
      } catch {
        // Ignore an already-missing file while cleaning up.
      }
    }
  }
}

// ------------------------------------------------------------
// POST /api/auth/register: Save User, and DriverProfile when needed.
// ------------------------------------------------------------
export async function register(req, res, next) {
  let createdUser = null; // Remember account so we can undo partial driver signup.
  let savedDriverProfile = false;

  try {
    const form = req.body || {};
    const role = form.role;
    const phone = normalizePhone(form.phone);
    const firstName = String(form.firstName || "").trim();
    const lastName = String(form.lastName || "").trim();
    const username = String(form.username || "").trim().toLowerCase();
    const email = String(form.email || "").trim().toLowerCase();
    const password = String(form.password || "");

    // Only admin-created accounts can have role=admin.
    if (role !== "customer" && role !== "driver") {
      return res.status(400).json({ message: "Choose customer or driver registration." });
    }
    if (!firstName || !lastName || firstName.length > 80 || lastName.length > 80 || !phone) {
      return res.status(400).json({ message: "Enter valid personal information." });
    }
    if (!/^\w[\w.-]{7,29}$/.test(username)) {
      return res.status(400).json({ message: "Username must be 8–30 valid characters." });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Invalid email address." });
    }
    if (password.length < 8 || Buffer.byteLength(password) > 72) {
      return res.status(400).json({ message: "Password must be at least 8 characters (max 72 bytes)." });
    }
    if (form.confirmPassword !== password) {
      return res.status(400).json({ message: "Passwords do not match." });
    }
    if (form.terms !== true && form.terms !== "true") {
      return res.status(400).json({ message: "Please accept the terms and conditions." });
    }

    // The verificationToken was returned by /verify-code, not made by React.
    try {
      const proof = jwt.verify(String(form.verificationToken || ""), process.env.OTP_SECRET);
      if (proof.purpose !== "phone_signup" || proof.phone !== phone) {
        throw new Error("Phone does not match verification proof.");
      }
    } catch {
      return res.status(400).json({ message: "Phone verification expired. Verify again." });
    }

    if (role === "driver") {
      const validVehicles = ["motorcycle", "sedan", "suv", "pickup", "l300"];
      if (!validVehicles.includes(form.vehicleType)) {
        return res.status(400).json({ message: "Choose a valid driver vehicle." });
      }
      if (!/^[A-Z0-9 -]{4,12}$/i.test(String(form.plateNumber || "").trim())) {
        return res.status(400).json({ message: "Enter a valid vehicle plate number." });
      }

      // Multer stores each uploaded file in req.files[fieldName][0].
      const documentNames = ["profilePhoto", "license", "or", "cr", "backplate"];
      for (const name of documentNames) {
        if (!req.files || !req.files[name] || !req.files[name][0]) {
          return res.status(400).json({ message: "All five driver documents are required." });
        }
      }
    }

    // Find a matching username/phone/email before inserting a new account.
    // We still keep UNIQUE indexes in User.js to protect simultaneous signups.
    let account = await User.findOne({ username: username });
    if (!account) account = await User.findOne({ phone: phone });
    if (!account && email) account = await User.findOne({ email: email });
    if (account) return res.status(409).json({ message: "Username, phone, or email is already registered." });

    // bcrypt turns the plain password into a salted, one-way password hash.
    const passwordHash = await bcrypt.hash(password, 12);

    const newAccount = {
      firstName: firstName,
      lastName: lastName,
      username: username,
      phone: phone,
      passwordHash: passwordHash,
      role: role,
      phoneVerifiedAt: new Date(),
    };
    if (email) newAccount.email = email;

    // User.create() validates against User.js and saves one document to users.
    createdUser = await User.create(newAccount);

    if (role === "driver") {
      // Save a SECOND document in driverprofiles, linked by userId to users._id.
      const uploadedFiles = {
        profilePhoto: req.files.profilePhoto[0].filename,
        license: req.files.license[0].filename,
        or: req.files.or[0].filename,
        cr: req.files.cr[0].filename,
        backplate: req.files.backplate[0].filename,
      };

      await DriverProfile.create({
        userId: createdUser._id,
        vehicle: { type: form.vehicleType, plateNumber: form.plateNumber },
        documents: uploadedFiles,
        // DriverProfile.js sets verificationStatus to "pending" automatically.
      });
      savedDriverProfile = true;
    }

    let message = "Account created. Please log in.";
    if (role === "driver") message = "Driver application submitted for approval.";
    return res.status(201).json({ message: message, user: userForClient(createdUser) });
  } catch (error) {
    // Registration touches TWO collections for drivers. If the second save
    // fails, remove the first user so no half-created driver account remains.
    if (createdUser && !savedDriverProfile) {
      try {
        await User.deleteOne({ _id: createdUser._id });
      } catch (cleanupError) {
        console.error("Account cleanup problem:", cleanupError);
      }
    }
    if (error.code === 11000) {
      return res.status(409).json({ message: "Username, phone, or email is already registered." });
    }
    next(error);
  } finally {
    // `finally` runs after success, failure, or early `return` inside try.
    if (!savedDriverProfile) await removeUploadedFiles(req.files);
  }
}

// ------------------------------------------------------------
// POST /api/auth/login: Check password and give the browser a login cookie.
// ------------------------------------------------------------
export async function login(req, res, next) {
  try {
    const form = req.body || {};
    const identifier = String(form.identifier || "").trim().toLowerCase();
    const password = String(form.password || "");
    if (!identifier || !password || identifier.length > 254) {
      return res.status(400).json({ message: "Enter your account and password." });
    }

    // Beginner version: try username, then email, then phone separately.
    // passwordHash is normally hidden (`select: false` in User.js).
    let user = await User.findOne({ username: identifier }).select("+passwordHash");
    if (!user) user = await User.findOne({ email: identifier }).select("+passwordHash");
    const phone = normalizePhone(identifier);
    if (!user && phone) user = await User.findOne({ phone: phone }).select("+passwordHash");

    if (!user) return res.status(401).json({ message: "Invalid username, phone, email or password." });

    // bcrypt.compare() hashes the supplied password appropriately and compares
    // it with the SAVED hash. We never retrieve a plaintext password from MongoDB.
    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) return res.status(401).json({ message: "Invalid username, phone, email or password." });
    if (user.accountStatus !== "active") return res.status(403).json({ message: "This account is not active." });

    if (user.role === "driver") {
      const profile = await DriverProfile.findOne({ userId: user._id });
      if (!profile || profile.verificationStatus !== "approved") {
        return res.status(403).json({ code: "DRIVER_PENDING", message: "Driver account is awaiting admin approval." });
      }
    }

    const remember = form.remember === true;
    let duration = "1d";          // JWT expiration in one day.
    let maxAge = 86400000;        // Browser cookie duration in milliseconds.
    if (remember) {
      duration = "7d";
      maxAge = 7 * 86400000;
    }

    // JWT signs user ID + purpose. The backend rechecks this ID on API requests.
    const token = jwt.sign(
      { purpose: "session", userId: String(user._id) },
      process.env.JWT_SECRET,
      { expiresIn: duration }
    );

    // HttpOnly prevents frontend JavaScript from reading the session token.
    // The browser still sends the cookie on API calls with credentials:"include".
    res.cookie("gasfar_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // HTTPS in production.
      sameSite: "lax",
      maxAge: maxAge,
      path: "/",
    });
    return res.json({ user: userForClient(user) });
  } catch (error) {
    next(error);
  }
}

// POST /api/auth/logout: Remove the login cookie from the browser.
export function logout(req, res) {
  res.clearCookie("gasfar_session", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  return res.json({ message: "Logged out." });
}

// GET /api/auth/me: authMiddleware already attached the signed-in user to req.user.
export function me(req, res) {
  return res.json({ user: userForClient(req.user) });
}

// ADMIN: View driver profiles together with account fields from the users collection.
export async function listDriverApplications(req, res, next) {
  try {
    // populate() follows DriverProfile.userId -> User._id like a MySQL JOIN.
    const applications = await DriverProfile.find()
      .populate("userId", "firstName lastName username phone email")
      .sort({ createdAt: -1 });
    return res.json({ applications: applications });
  } catch (error) {
    next(error);
  }
}

// ADMIN: Approve or reject a driver's profile.
export async function updateDriverApproval(req, res, next) {
  try {
    const id = req.params.id;   // The :id part of /drivers/:id/approval.
    const status = req.body && req.body.status;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid driver ID." });
    if (status !== "approved" && status !== "rejected") {
      return res.status(400).json({ message: "Status must be approved or rejected." });
    }

    // Simpler than findOneAndUpdate here: read, change fields, then save.
    const profile = await DriverProfile.findOne({ userId: id });
    if (!profile) return res.status(404).json({ message: "Driver application not found." });
    profile.verificationStatus = status;
    profile.isOnline = false;
    await profile.save();
    return res.json({ message: "Driver application " + status + ".", verificationStatus: status });
  } catch (error) {
    next(error);
  }
}

// ADMIN: Download one of the driver's private verification documents.
export async function getDriverDocument(req, res, next) {
  try {
    const id = req.params.id;
    const field = req.params.field;
    const allowedDocuments = ["profilePhoto", "license", "or", "cr", "backplate"];
    if (!mongoose.isValidObjectId(id) || !allowedDocuments.includes(field)) {
      return res.status(400).json({ message: "Invalid document request." });
    }

    const profile = await DriverProfile.findOne({ userId: id });
    if (!profile || !profile.documents || !profile.documents[field]) {
      return res.status(404).json({ message: "Document not found." });
    }

    // File path must come from a server-generated filename, never req.params.path.
    const filename = path.basename(profile.documents[field]);
    res.sendFile(filename, {
      root: path.resolve("private-uploads"),
      headers: { "Content-Disposition": "attachment", "X-Content-Type-Options": "nosniff" },
    }, (error) => {
      if (error && !res.headersSent) next(error);
    });
  } catch (error) {
    next(error);
  }
}
