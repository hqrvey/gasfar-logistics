/*
  BOOKING ROUTES: Match each HTTP method + URL to a controller function.

  server.js contains: app.use("/api/bookings", bookingRoutes)
  Therefore router.post("/", ...) is really POST /api/bookings.

  requireAuth verifies the login cookie and sets req.user.
  allowRoles("driver") checks req.user.role before running a controller.
*/
import express from "express";
import multer from "multer";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { requireAuth, allowRoles, requireApprovedDriver, allowAdminSections } from "../middleware/authMiddleware.js";
import {
  getBookings, getBooking, getBookingHistory, submitBookingReview, createBooking, acceptBooking, declineBooking,
  updateStatus, verifyDelivery, resendDeliveryPin, cancelBooking, updateDriverLocation,
  startPickupJourney, confirmCashCollection, attachItemPhoto, readItemPhoto, requestFeeWaiver, reportDeliveryIssue,
} from "../controllers/bookingControllers.js";

const router = express.Router();

// Every request in this router must come from a signed-in account.
router.use(requireAuth);

// Ordinary customers and drivers can see their own eligible bookings.
// Only SUPER ADMINS may use admin-wide booking reporting endpoints.
function restrictAdminBookingRead(req, res, next) {
  if (req.user.role !== "admin") return next();
  return allowAdminSections("reports")(req, res, next);
}
// GET = read information; POST = create/submit; PATCH = change existing data.
router.get("/", allowRoles("customer", "driver", "admin"), restrictAdminBookingRead, getBookings);
router.post("/", allowRoles("customer"), createBooking);

// GET /api/bookings/history returns only this logged-in person's finished jobs.
// IMPORTANT: register /history BEFORE /:id, or Express may read "history"
// as a booking code instead of matching our history route.
router.get("/history", allowRoles("customer", "driver"), getBookingHistory);
router.get("/:id", allowRoles("customer", "driver", "admin"), restrictAdminBookingRead, getBooking);

// Uploaded parcel photos are private files, not data URLs stored by React.
const photoUpload = multer({
  storage: multer.diskStorage({
    destination: path.resolve("private-uploads"),
    filename: (req, file, done) => done(null, randomUUID() + path.extname(file.originalname).toLowerCase()),
  }),
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, done) => done(null, ["image/png", "image/jpeg"].includes(file.mimetype)),
});
router.post("/:id/item-photo", allowRoles("customer"), photoUpload.single("photo"), attachItemPhoto);
router.get("/:id/item-photo", allowRoles("customer", "driver", "admin"), restrictAdminBookingRead, readItemPhoto);
router.patch("/:id/start-pickup", allowRoles("driver"), requireApprovedDriver, startPickupJourney);
router.patch("/:id/collect-cash", allowRoles("driver"), requireApprovedDriver, confirmCashCollection);
router.post("/:id/fee-waiver", allowRoles("driver"), requireApprovedDriver, photoUpload.single("proof"), requestFeeWaiver);
router.post("/:id/issue", allowRoles("driver"), requireApprovedDriver, reportDeliveryIssue);

// :id is a variable in the URL. For example, ORD-123 is in req.params.id.
router.patch("/:id/accept", allowRoles("driver"), requireApprovedDriver, acceptBooking);
router.patch("/:id/decline", allowRoles("driver"), requireApprovedDriver, declineBooking);
router.patch("/:id/status", allowRoles("driver"), requireApprovedDriver, updateStatus);
router.patch("/:id/location", allowRoles("driver"), requireApprovedDriver, updateDriverLocation);

// Delivery completion has its OWN endpoint because a recipient PIN is required.
router.post("/:id/verify-delivery", allowRoles("driver"), requireApprovedDriver, verifyDelivery);
router.post("/:id/resend-pin", allowRoles("driver"), requireApprovedDriver, resendDeliveryPin);
router.patch("/:id/cancel", allowRoles("customer", "driver"), cancelBooking);
// POST /api/bookings/ORD-.../review: only the customer may submit stars.
router.post("/:id/review", allowRoles("customer"), submitBookingReview);

export default router;
