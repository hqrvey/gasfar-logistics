/*
  AUTHENTICATION ROUTES

  A route links an HTTP method + URL to a controller function.
  `server.js` adds the prefix "/api/auth" to every URL below.

  Example: POST /api/auth/login -> login() in authController.js.
*/
import express from "express";
import multer from "multer"; // Reads multipart forms containing file uploads.
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { rateLimit } from "express-rate-limit";
import {
  sendCode, verifyCode, register, login, logout, me,
  listDriverApplications, updateDriverApproval, getDriverDocument,
} from "../controllers/authController.js";
import { requireAuth, allowRoles, allowAdminSections } from "../middleware/authMiddleware.js";

const router = express.Router(); // A smaller router mounted by server.js.

// Rate limiting is worth keeping: SMS costs money and passwords can be guessed.
// This stops repeated requests from the same client during a 15-minute period.
const otpLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10 });
const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 15 });

// Multer writes driver uploads to a folder outside the public React files.
const uploadDirectory = path.resolve("private-uploads");
fs.mkdirSync(uploadDirectory, { recursive: true }); // Create folder if missing.

// Multer calls destination/filename when saving each uploaded file.
const storage = multer.diskStorage({
  destination: uploadDirectory,
  filename: (req, file, callback) => {
    // UUID gives each upload a new random filename; extension is retained.
    const extension = path.extname(file.originalname).toLowerCase();
    const filename = randomUUID() + extension;
    callback(null, filename); // No error, use this filename.
  },
});

// Allow only intended image/PDF document types for driver registration.
function checkFileType(req, file, callback) {
  const extension = path.extname(file.originalname).toLowerCase();
  const isPNG = file.mimetype === "image/png" && extension === ".png";
  const isJPG = file.mimetype === "image/jpeg" && [".jpg", ".jpeg"].includes(extension);
  const isPDF = file.mimetype === "application/pdf" && extension === ".pdf";

  // Photos must be images. Supporting driver documents may also be PDFs.
  let accepted = isPNG || isJPG;
  if (file.fieldname !== "profilePhoto" && file.fieldname !== "backplate") {
    if (isPDF) accepted = true;
  }
  if (!accepted) {
    return callback(new Error("Only JPG, PNG or PDF documents are allowed."));
  }
  callback(null, true);
}

const upload = multer({
  storage: storage,
  limits: { fileSize: 8 * 1024 * 1024, files: 5 },
  fileFilter: checkFileType,
}).fields([
  { name: "profilePhoto", maxCount: 1 },
  { name: "license", maxCount: 1 },
  { name: "or", maxCount: 1 },
  { name: "cr", maxCount: 1 },
  { name: "backplate", maxCount: 1 },
]);

// The order of arguments matters: middleware first, controller last.
router.post("/send-code", otpLimit, sendCode);        // TextBee signup code.
router.post("/verify-code", otpLimit, verifyCode);    // Check code.
router.post("/register", otpLimit, upload, register); // Upload driver docs + create account.
router.post("/login", loginLimit, login);            // Check password, create cookie.
router.post("/logout", logout);                      // Clear cookie.
router.get("/me", requireAuth, me);                  // Return logged-in account.

// Admin-only endpoints: requireAuth finds req.user; allowRoles checks the role.
router.get("/driver-applications", requireAuth, allowAdminSections("drivers"), listDriverApplications);
router.patch("/drivers/:id/approval", requireAuth, allowAdminSections("drivers"), updateDriverApproval);
router.get("/drivers/:id/documents/:field", requireAuth, allowAdminSections("drivers"), getDriverDocument);

export default router;
