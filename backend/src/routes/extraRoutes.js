/*
 * EXTRA ROUTES — same pattern as ThinkBoard tutorial.
 * This file ONLY describes: HTTP method + URL + middleware + controller.
 * Example: PATCH /api/extra/me/profile -> updateMyProfile() in extraController.js.
 * The controller reads req.body, talks to Mongoose, then sends res.json().
 * requireAuth protects all paths; allowRoles() restricts some paths.
 */
import express from "express";
import multer from "multer";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { requireAuth, allowRoles, allowAdminSections, requireSuperAdmin } from "../middleware/authMiddleware.js";
import {
  uploadMyPhoto,
  getMyPhoto,
  removeMyPhoto,
  updateMyProfile,
  changeMyPassword,
  deactivateMyAccount,
  getSavedAddresses,
  addSavedAddress,
  editSavedAddress,
  deleteSavedAddress,
  getMyWallet,
  requestWalletChange,
  getMyCredit,
  getDriverProfile,
  submitDriverRenewal,
  readFeeWaiverProof,
  readRenewalDocument,
  getOpenIncidents,
  resolveIncident,
  getPendingCashRefunds,
  acknowledgeCashRefund,
  getAdminCustomers,
  changeAccountStatus,
  getAdminDrivers,
  decideDriverRenewal,
  getFeeWaiverRequests,
  decideFeeWaiver,
  getWalletRequests,
  decideWalletRequest,
  getAdminDeliveries,
  getAdminStatistics,
  confirmExternalPayment,
  getModeratorAccounts,
  createModeratorAccount,
  setModeratorStatus,
  getAdminAttention,
  markAdminAttentionRead
} from "../controllers/extraController.js";

const router = express.Router();
router.use(requireAuth);


// Profile photos use the SAME private uploads directory as driver documents.
// The browser submits FormData; multer extracts the file from req.file.
const profilePhotoUpload = multer({
  storage: multer.diskStorage({
    destination: path.resolve("private-uploads"),
    filename: (req, file, done) => done(null, randomUUID() + path.extname(file.originalname).toLowerCase()),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, done) => done(null, ["image/jpeg", "image/png"].includes(file.mimetype)),
});
router.post("/me/photo", profilePhotoUpload.single("photo"), uploadMyPhoto);
router.get("/me/photo", getMyPhoto);
router.delete("/me/photo", removeMyPhoto);

// Basic profile settings. Controllers use the authenticated req.user, not a user ID
// submitted by the browser, so people cannot edit one another's accounts.
router.patch("/me/profile", updateMyProfile);
router.post("/me/password", changeMyPassword);
// Soft-disable preserves important booking, wallet and review records, unlike
// physically deleting a User that is referenced by many MongoDB documents.
router.post("/me/deactivate", deactivateMyAccount);
router.get("/me/addresses", allowRoles("customer"), getSavedAddresses);
router.post("/me/addresses", allowRoles("customer"), addSavedAddress);
router.patch("/me/addresses/:id", allowRoles("customer"), editSavedAddress);
router.delete("/me/addresses/:id", allowRoles("customer"), deleteSavedAddress);


router.get("/wallet", allowRoles("driver"), getMyWallet);
router.post("/wallet/request", allowRoles("driver"), requestWalletChange);

router.get("/me/credit", allowRoles("customer"), getMyCredit);

// Driver can submit replacement documents without overwriting the approved files.
// Admin approves or rejects this request separately.
const upload = multer({
  storage: multer.diskStorage({
    destination: path.resolve("private-uploads"),
    filename: (req, file, done) => done(null, randomUUID() + path.extname(file.originalname).toLowerCase()),
  }),
  limits: { fileSize: 8 * 1024 * 1024, files: 4 },
  fileFilter: (req, file, done) => {
    const types = ["image/png", "image/jpeg", "application/pdf"];
    done(null, types.includes(file.mimetype));
  },
}).fields([{ name: "license", maxCount: 1 }, { name: "or", maxCount: 1 }, { name: "cr", maxCount: 1 }, { name: "backplate", maxCount: 1 }]);
router.get("/driver/profile", allowRoles("driver"), getDriverProfile);
router.post("/driver/renewal", allowRoles("driver"), upload, submitDriverRenewal);

router.get("/admin/fee-reviews/:id/proof", allowAdminSections("fees"), readFeeWaiverProof);
router.get("/admin/drivers/:id/renewal-docs/:field", allowAdminSections("drivers"), readRenewalDocument);
router.get("/admin/incidents", allowAdminSections("fees"), getOpenIncidents);
router.patch("/admin/incidents/:id", allowAdminSections("fees"), resolveIncident);
router.get("/admin/cash-refunds", allowAdminSections("fees"), getPendingCashRefunds);
router.patch("/admin/cash-refunds/:id", allowAdminSections("fees"), acknowledgeCashRefund);

router.get("/admin/users", allowAdminSections("users"), getAdminCustomers);
router.patch("/admin/users/:id/status", allowAdminSections("users"), changeAccountStatus);
router.get("/admin/drivers", allowAdminSections("drivers"), getAdminDrivers);
router.patch("/admin/drivers/:id/renewal", allowAdminSections("drivers"), decideDriverRenewal);
router.get("/admin/fee-reviews", allowAdminSections("fees"), getFeeWaiverRequests);
router.patch("/admin/fee-reviews/:id", allowAdminSections("fees"), decideFeeWaiver);
router.get("/admin/wallet-requests", allowAdminSections("fees"), getWalletRequests);
router.patch("/admin/wallet-requests/:walletId/:id", allowAdminSections("fees"), decideWalletRequest);

router.get("/admin/deliveries", allowAdminSections("reports"), getAdminDeliveries);
router.get("/admin/stats", allowAdminSections("reports"), getAdminStatistics);
router.patch("/admin/bookings/:id/confirm-payment", allowAdminSections("reports"), confirmExternalPayment);

// Special administrator URLs (same tutorial pattern: route -> controller).
router.get("/admin/moderators", requireSuperAdmin, getModeratorAccounts);
router.post("/admin/moderators", requireSuperAdmin, createModeratorAccount);
router.patch("/admin/moderators/:id", requireSuperAdmin, setModeratorStatus);
router.get("/admin/attention", allowRoles("admin"), getAdminAttention);
router.post("/admin/attention/read", allowRoles("admin"), markAdminAttentionRead);

export default router;
