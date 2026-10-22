import express from "express";
import multer from "multer";
import path from "node:path";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { rateLimit } from "express-rate-limit";
import { sendCode, verifyCode, register, login, logout, me, listDriverApplications, updateDriverApproval, getDriverDocument } from "../controllers/authController.js";
import { requireAuth, allowRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// Limit automated OTP requests and password guessing (replace memory storage
// with a shared Redis-backed limiter if you deploy multiple server instances).
const otpLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: "draft-7", legacyHeaders: false });
const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 15, standardHeaders: "draft-7", legacyHeaders: false });

const uploadDirectory = path.resolve("private-uploads");
fs.mkdirSync(uploadDirectory, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename: (req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 8 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const image = (file.mimetype === "image/png" && extension === ".png") ||
      (file.mimetype === "image/jpeg" && [".jpg", ".jpeg"].includes(extension));
    const pdf = file.mimetype === "application/pdf" && extension === ".pdf";
    const accepted = image || (file.fieldname !== "profilePhoto" && file.fieldname !== "backplate" && pdf);
    cb(accepted ? null : new Error("Only JPG, PNG or PDF documents are allowed."), accepted);
  },
}).fields([
  { name: "profilePhoto", maxCount: 1 },
  { name: "license", maxCount: 1 },
  { name: "or", maxCount: 1 },
  { name: "cr", maxCount: 1 },
  { name: "backplate", maxCount: 1 },
]);

router.post("/send-code", otpLimit, sendCode);
router.post("/verify-code", otpLimit, verifyCode);
router.post("/register", otpLimit, upload, register);
router.post("/login", loginLimit, login);
router.post("/logout", logout);
router.get("/me", requireAuth, me);
router.get("/driver-applications", requireAuth, allowRoles("admin"), listDriverApplications);
router.patch("/drivers/:id/approval", requireAuth, allowRoles("admin"), updateDriverApproval);
router.get("/drivers/:id/documents/:field", requireAuth, allowRoles("admin"), getDriverDocument);

export default router;
