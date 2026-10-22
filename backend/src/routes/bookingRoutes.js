import express from "express";
import { requireAuth, allowRoles } from "../middleware/authMiddleware.js";
import {
  getBookings, getBooking, createBooking, acceptBooking, declineBooking,
  updateStatus, verifyDelivery, resendDeliveryPin, cancelBooking, updateDriverLocation,
} from "../controllers/bookingControllers.js";

const router = express.Router();
router.use(requireAuth);
router.get("/", allowRoles("customer", "driver", "admin"), getBookings);
router.post("/", allowRoles("customer"), createBooking);
router.get("/:id", allowRoles("customer", "driver", "admin"), getBooking);
router.patch("/:id/accept", allowRoles("driver"), acceptBooking);
router.patch("/:id/decline", allowRoles("driver"), declineBooking);
router.patch("/:id/status", allowRoles("driver"), updateStatus);
router.post("/:id/verify-delivery", allowRoles("driver"), verifyDelivery);
router.post("/:id/resend-pin", allowRoles("driver"), resendDeliveryPin);
router.patch("/:id/cancel", allowRoles("customer", "driver"), cancelBooking);
router.patch("/:id/location", allowRoles("driver"), updateDriverLocation);
export default router;
