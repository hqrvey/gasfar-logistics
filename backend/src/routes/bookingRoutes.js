/*
  BOOKING ROUTES: Match each HTTP method + URL to a controller function.

  server.js contains: app.use("/api/bookings", bookingRoutes)
  Therefore router.post("/", ...) is really POST /api/bookings.

  requireAuth verifies the login cookie and sets req.user.
  allowRoles("driver") checks req.user.role before running a controller.
*/
import express from "express";
import { requireAuth, allowRoles } from "../middleware/authMiddleware.js";
import {
  getBookings, getBooking, getBookingHistory, submitBookingReview, createBooking, acceptBooking, declineBooking,
  updateStatus, verifyDelivery, resendDeliveryPin, cancelBooking, updateDriverLocation,
} from "../controllers/bookingControllers.js";

const router = express.Router();

// Every request in this router must come from a signed-in account.
router.use(requireAuth);

// GET = read information; POST = create/submit; PATCH = change existing data.
router.get("/", allowRoles("customer", "driver", "admin"), getBookings);
router.post("/", allowRoles("customer"), createBooking);

// GET /api/bookings/history returns only this logged-in person's finished jobs.
// IMPORTANT: register /history BEFORE /:id, or Express may read "history"
// as a booking code instead of matching our history route.
router.get("/history", allowRoles("customer", "driver"), getBookingHistory);
router.get("/:id", allowRoles("customer", "driver", "admin"), getBooking);

// :id is a variable in the URL. For example, ORD-123 is in req.params.id.
router.patch("/:id/accept", allowRoles("driver"), acceptBooking);
router.patch("/:id/decline", allowRoles("driver"), declineBooking);
router.patch("/:id/status", allowRoles("driver"), updateStatus);
router.patch("/:id/location", allowRoles("driver"), updateDriverLocation);

// Delivery completion has its OWN endpoint because a recipient PIN is required.
router.post("/:id/verify-delivery", allowRoles("driver"), verifyDelivery);
router.post("/:id/resend-pin", allowRoles("driver"), resendDeliveryPin);
router.patch("/:id/cancel", allowRoles("customer", "driver"), cancelBooking);
// POST /api/bookings/ORD-.../review: only the customer may submit stars.
router.post("/:id/review", allowRoles("customer"), submitBookingReview);

export default router;
