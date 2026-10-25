/*
  BOOKING CONTROLLER: THE BOOKING AND DELIVERY BUSINESS LOGIC

  Example flow:
  1. React calls POST /api/bookings with form data.
  2. bookingRoutes.js runs requireAuth and checks role = customer.
  3. Express runs createBooking(req, res) in THIS file.
  4. Booking.create() uses the Booking Mongoose model to save MongoDB data.
  5. res.json() sends the result back to React.

  Each exported function below corresponds to one route in bookingRoutes.js.
  `req` means the request FROM React; `res` means our response TO React.
*/

import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import Booking from "../models/Booking.js";
import DriverProfile from "../models/DriverProfile.js";
import User from "../models/User.js";
import Wallet from "../models/Wallet.js";
import { sendSMS } from "../services/smsService.js";

// These are the statuses where a driver is actively working on a booking.
const ACTIVE_STATUSES = ["accepted", "at_pickup", "picked_up", "arrived"];

// Stable vehicle IDs saved in MongoDB; nice labels displayed in React.
const VEHICLE_LABELS = {
  motorcycle: "Motorcycle",
  sedan: "Sedan",
  suv: "SUV",
  pickup: "Pickup",
  l300: "L300",
};

// Check that a pickup/drop-off object contains a readable address and GPS.
function validLocation(location) {
  if (!location) return false;
  if (typeof location.address !== "string") return false;
  if (location.address.trim().length < 3) return false;
  if (!Number.isFinite(location.lat) || location.lat < -90 || location.lat > 90) return false;
  if (!Number.isFinite(location.lng) || location.lng < -180 || location.lng > 180) return false;
  return true;
}

// Convert 09171234567, 9171234567 or +639171234567 into +639171234567.
function normalizePhone(value) {
  let digits = String(value || "").replace(/\D/g, ""); // Remove non-digits.
  if (digits.startsWith("63")) digits = digits.slice(2);  // Remove country prefix.
  if (digits.startsWith("0")) digits = digits.slice(1);   // Remove local prefix.
  if (!/^9\d{9}$/.test(digits)) return null;              // Must be a PH mobile number.
  return "+63" + digits;
}

// React expects a particular JSON shape, not a raw MongoDB document.
// We also keep the secret delivery PIN hash out of the response.
function showBooking(booking, viewer) {
  // Unassigned requests are visible to eligible drivers, but private phone
  // numbers should only be shown after a driver has accepted the booking.
  let hideContact = false;
  if (viewer && viewer.role === "driver" && booking.status === "pending") {
    hideContact = true;
  }

  // The booking form uses Philippine local dates. MongoDB stores absolute UTC dates.
  let scheduleDate = "";
  let scheduleTime = "";
  if (booking.schedule && booking.schedule.scheduledAt) {
    const date = booking.schedule.scheduledAt;
    const phDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);
    const iso = phDate.toISOString();
    scheduleDate = iso.slice(0, 10);  // YYYY-MM-DD
    scheduleTime = iso.slice(11, 16); // HH:MM
  }

  // Convert the payment code into the label used by the existing React pages.
  let paymentMethod = "Cash";
  if (booking.payment.method === "gcash") paymentMethod = "GCash";
  if (booking.payment.method === "maya") paymentMethod = "Maya";

  const items = booking.packageDetails.itemTypes || [];
  const quantity = booking.packageDetails.quantity || 1;
  const pricePesos = booking.pricing.feeCentavos / 100;

  // ObjectIds are special MongoDB values. String() converts them for JSON/React.
  const customerId = String(booking.customerId);
  let driverId = null;
  if (booking.driverId) driverId = String(booking.driverId);

  // .map() creates a new array without changing the original MongoDB array.
  // These loops could also be written using for...of; map is common React JS.
  const declinedBy = (booking.declinedBy || []).map((id) => String(id));
  const statusHistory = (booking.statusHistory || []).map((event) => {
    return { status: event.status, at: event.at };
  });

  // Fields below intentionally keep the names required by the current frontend.
  return {
    id: booking.bookingCode,
    status: booking.status,
    pickup: booking.pickup,
    dropoff: booking.dropoff,
    customerId: customerId,
    customerName: booking.customerName,
    contactNumber: hideContact ? "" : booking.customerPhone,
    recipientName: booking.recipient.name,
    recipientPhone: hideContact ? "" : booking.recipient.phone,
    recipientUnit: booking.recipient.unit,
    vehicleType: VEHICLE_LABELS[booking.vehicleType] || booking.vehicleType,
    vehicleTypeId: booking.vehicleType,
    deliveryType: booking.deliveryType,
    itemTypes: items,
    itemDetails: items.join(", ") + " · Qty: " + quantity,
    quantity: quantity,
    itemWeight: booking.packageDetails.itemWeight,
    handlingInstructions: booking.packageDetails.handlingInstructions,
    notesToDriver: booking.packageDetails.notesToDriver,
    scheduleType: booking.schedule.type,
    scheduleDate: scheduleDate,
    scheduleTime: scheduleTime,
    paymentMethod: paymentMethod,
    paymentSide: booking.payment.payer,
    paymentStatus: booking.payment.status,
    price: "₱" + pricePesos.toLocaleString("en-PH"),
    feeCentavos: booking.pricing.feeCentavos,
    fareBreakdown: {
      base: (booking.pricing.baseCentavos || 0) / 100,
      firstKm: (booking.pricing.firstKmCentavos || 0) / 100,
      extraKm: (booking.pricing.extraKmCentavos || 0) / 100,
      priority: (booking.pricing.priorityCentavos || 0) / 100,
      total: booking.pricing.feeCentavos / 100,
      distanceKm: booking.pricing.distanceKm,
    },
    creditApplied: (booking.creditAppliedCentavos || 0) / 100,
    amountDue: (booking.pricing.feeCentavos - (booking.creditAppliedCentavos || 0)) / 100,
    cashCollectedAt: booking.cashCollectedAt || null,
    journeyStartedAt: booking.journeyStartedAt || null,
    cancellationFee: (booking.cancellationFeeCentavos || 0) / 100,
    feeWaiver: booking.feeWaiver || { status: "none" },
    itemPhotoUrl: booking.itemPhoto ? "/bookings/" + encodeURIComponent(booking.bookingCode) + "/item-photo" : "",
    walletSettledAt: booking.walletSettledAt || null,
    driver: booking.driver && booking.driver.name ? booking.driver : null,
    driverId: driverId,
    driverLocation: booking.driverLocation,
    locationUpdatedAt: booking.locationUpdatedAt ? booking.locationUpdatedAt.getTime() : null,
    declinedBy: declinedBy,
    statusHistory: statusHistory,
    bookedAt: booking.createdAt ? booking.createdAt.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }) : "",
    completedAt: booking.deliveredAt ? booking.deliveredAt.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }) : "",
    cancelledAt: booking.cancelledAt ? booking.cancelledAt.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }) : "",
    cancelReason: booking.cancelReason,
    cancelledBy: booking.cancelledBy,
    // Never expose a raw database document to React. A review is visible to
    // both the customer and assigned driver, but only after it has a rating.
    review: booking.review && booking.review.rating ? {
      rating: booking.review.rating,
      comment: booking.review.comment || "",
      date: booking.review.createdAt
        ? booking.review.createdAt.toLocaleDateString("en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" })
        : "",
    } : null,
  };
}

// Only send a booking to someone who has permission to read it.
function canView(booking, user) {
  if (user.role === "admin") return true;
  if (user.role === "customer") return String(booking.customerId) === String(user._id);
  if (user.role === "driver") return String(booking.driverId) === String(user._id);
  return false;
}

// Call Geoapify FROM the backend to calculate the authoritative delivery price.
// Prices come from the uploaded client/utils/pricing.js (not its conflicting README).
const FARE_RATES = {
  motorcycle: { base: 50, first: 6.5, extra: 6, split: 5 },
  sedan: { base: 100, first: 18, extra: 15, split: 5 },
  suv: { base: 115, first: 20, extra: 20, split: 5 },
  pickup: { base: 240, first: 20, extra: 20, split: 5 },
  l300: { base: 280, first: 24, extra: 22, split: 10 },
};
function fareForVehicle(distanceKm, vehicleType, deliveryType) {
  const rate = FARE_RATES[vehicleType];
  const firstKm = Math.min(distanceKm, rate.split);
  const extraKm = Math.max(0, distanceKm - rate.split);
  const base = Math.round(rate.base * 100);
  const first = Math.round(firstKm * rate.first) * 100;
  const extra = Math.round(extraKm * rate.extra) * 100;
  const subtotal = base + first + extra;
  const priority = deliveryType === "priority" ? Math.round(subtotal * 0.20) : 0;
  return {
    baseCentavos: base, firstKmCentavos: first, extraKmCentavos: extra,
    subtotalCentavos: subtotal, priorityCentavos: priority,
    feeCentavos: subtotal + priority,
  };
}
async function calculateRoutePrice(pickup, dropoff, vehicleType, deliveryType) {
  const key = process.env.GEOAPIFY_API_KEY;
  if (!key) {
    const error = new Error("Set GEOAPIFY_API_KEY in backend/.env before booking.");
    error.status = 503;
    throw error;
  }

  // The waypoints parameter is written as LAT,LNG|LAT,LNG.
  // encodeURIComponent() makes the | character safe to put in a URL.
  const points = pickup.lat + "," + pickup.lng + "|" + dropoff.lat + "," + dropoff.lng;
  const url = "https://api.geoapify.com/v1/routing?waypoints=" +
    encodeURIComponent(points) + "&mode=drive&apiKey=" + encodeURIComponent(key);

  let response;
  try {
    // `await` waits for a Promise. AbortSignal.timeout prevents waiting forever.
    response = await fetch(url, { signal: AbortSignal.timeout(12000) });
  } catch (error) {
    const problem = new Error("Could not contact the route service. Please try again.");
    problem.status = 502;
    throw problem;
  }

  if (!response.ok) {
    const error = new Error("Routing service unavailable. Try again.");
    error.status = 502;
    throw error;
  }

  const data = await response.json(); // Convert Geoapify JSON response into JS data.
  const firstRoute = data.features && data.features[0];
  const properties = firstRoute && firstRoute.properties;
  if (!properties || !Number.isFinite(properties.distance) || !Number.isFinite(properties.time)) {
    const error = new Error("No driving route was found for those locations.");
    error.status = 400;
    throw error;
  }

  const distanceKm = Math.round(properties.distance / 100) / 10;
  const durationMins = Math.max(1, Math.ceil(properties.time / 60));
  const breakdown = fareForVehicle(distanceKm, vehicleType, deliveryType);
  return { distanceKm, durationMins, ...breakdown };
}

// HMAC makes the four-digit PIN impossible to read directly from the database.
// We must use the SAME formula when generating and checking the PIN.
function hashPin(bookingCode, pin) {
  const hmac = createHmac("sha256", process.env.OTP_SECRET);
  hmac.update(bookingCode + ":" + pin);
  return hmac.digest("hex");
}

async function sendDeliveryPin(booking, pin) {
  if (process.env.NODE_ENV !== "production" && process.env.DEV_LOG_DELIVERY_PIN === "true") {
    console.log("[LOCAL TEST] Delivery PIN for " + booking.bookingCode + ": " + pin);
  }
  const message = "GASFAR delivery PIN for " + booking.bookingCode + ": " + pin +
    ". Give it only when your package arrives. Expires in 15 minutes.";
  await sendSMS(booking.recipient.phone, message);
}

// Give React a helpful HTTP status instead of sending raw database errors.
function replyError(res, error) {
  if (error.code === 11000) {
    return res.status(409).json({ message: "Booking conflict. Refresh and try again." });
  }
  if (error.status) {
    return res.status(error.status).json({ message: error.message });
  }
  if (error.name === "ValidationError") {
    return res.status(400).json({ message: error.message });
  }
  console.error("Booking API:", error);
  return res.status(500).json({ message: "Unable to process booking. Try again." });
}

// ============================================================
// 1. CUSTOMER CREATES A BOOKING: POST /api/bookings
// ============================================================
export async function createBooking(req, res) {
  try {
    // express.json() in server.js converts the React JSON into req.body.
    const form = req.body || {};

    if (!validLocation(form.pickup) || !validLocation(form.dropoff)) {
      return res.status(400).json({ message: "Valid pickup and drop-off locations are required." });
    }
    // Driver GPS is not part of this check. This calculates the straight-line
    // gap between the CUSTOMER'S TWO SELECTED PINS (Haversine distance).
    // 100 metres is a product rule; it avoids placing both pins on one spot.
    const lat1 = form.pickup.lat * Math.PI / 180;
    const lat2 = form.dropoff.lat * Math.PI / 180;
    const latDifference = (form.dropoff.lat - form.pickup.lat) * Math.PI / 180;
    const lngDifference = (form.dropoff.lng - form.pickup.lng) * Math.PI / 180;
    const a = Math.sin(latDifference / 2) ** 2
      + Math.cos(lat1) * Math.cos(lat2) * Math.sin(lngDifference / 2) ** 2;
    const distanceBetweenPins = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    if (distanceBetweenPins < 100) {
      return res.status(400).json({ message: "Pickup and drop-off must be at least 100 metres apart." });
    }
    if (!Object.keys(VEHICLE_LABELS).includes(form.vehicleType)) {
      return res.status(400).json({ message: "Choose a valid vehicle." });
    }
    if (!["regular", "priority"].includes(form.deliveryType)) {
      return res.status(400).json({ message: "Choose a valid delivery type." });
    }

    const recipientName = String(form.recipientName || "").trim();
    const recipientPhone = normalizePhone(form.recipientPhone);
    if (!recipientName || !recipientPhone) {
      return res.status(400).json({ message: "Enter a recipient name and valid phone." });
    }
    if (!Array.isArray(form.itemTypes) || form.itemTypes.length === 0) {
      return res.status(400).json({ message: "Choose at least one package category." });
    }
    for (const item of form.itemTypes) {
      if (typeof item !== "string" || item.length > 50) {
        return res.status(400).json({ message: "Invalid package category." });
      }
    }
    if (!Number.isInteger(form.quantity) || form.quantity < 1 || form.quantity > 1000) {
      return res.status(400).json({ message: "Enter a valid package quantity." });
    }
    // The new booking policy is CASH paid by the SENDER only.
    // Historical GCash/Maya/recipient bookings remain in MongoDB so old
    // delivery records are not destroyed. New bookings cannot use them.
    if (form.paymentMethod !== "cash" || form.paymentSide !== "sender") {
      return res.status(400).json({ message: "New bookings require sender-paid cash." });
    }
    if (!["now", "scheduled"].includes(form.scheduleType)) {
      return res.status(400).json({ message: "Choose a delivery schedule." });
    }

    let scheduledAt = null;
    if (form.scheduleType === "scheduled") {
      // This date string includes the Philippine timezone (+08:00).
      if (!/^\d{4}-\d{2}-\d{2}$/.test(form.scheduleDate || "") ||
          !/^\d{2}:\d{2}$/.test(form.scheduleTime || "")) {
        return res.status(400).json({ message: "Choose a valid pickup date and time." });
      }
      scheduledAt = new Date(form.scheduleDate + "T" + form.scheduleTime + ":00+08:00");
      if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
        return res.status(400).json({ message: "Choose a future pickup date and time." });
      }
    }

    // Never trust a price sent by the browser; the backend gets distance itself.
    const pricing = await calculateRoutePrice(form.pickup, form.dropoff, form.vehicleType, form.deliveryType);
    // Credits are PROMOTIONAL discounts, never withdrawable cash.
    // Atomic $inc prevents two simultaneous bookings spending the same credits.
    let creditUsed = 0;
    const customer = await User.findById(req.user._id);
    if (customer && customer.creditCentavos > 0) {
      creditUsed = Math.min(customer.creditCentavos, pricing.feeCentavos);
      const changed = await User.findOneAndUpdate(
        { _id: req.user._id, creditCentavos: { $gte: creditUsed } },
        { $inc: { creditCentavos: -creditUsed } }, { new: true }
      );
      if (!changed) creditUsed = 0;
    }
    const bookingCode = "ORD-" + Date.now() + "-" + randomBytes(3).toString("hex").toUpperCase();
    const now = new Date();

    // .create() is approximately SQL INSERT. We must refund any reserved
    // promotional credit if MongoDB rejects this insert (e.g. validation failure).
    let booking;
    try {
    booking = await Booking.create({
      bookingCode: bookingCode,
      // req.user was found using the login cookie in authMiddleware.js.
      customerId: req.user._id,
      customerName: req.user.firstName + " " + req.user.lastName,
      customerPhone: req.user.phone,
      pickup: form.pickup,
      dropoff: form.dropoff,
      recipient: {
        name: recipientName,
        phone: recipientPhone,
        unit: String(form.recipientUnit || "").trim(),
      },
      vehicleType: form.vehicleType,
      deliveryType: form.deliveryType,
      schedule: { type: form.scheduleType, scheduledAt: scheduledAt },
      packageDetails: {
        itemTypes: form.itemTypes,
        quantity: form.quantity,
        itemWeight: String(form.itemWeight || ""),
        handlingInstructions: Array.isArray(form.handlingInstructions) ? form.handlingInstructions : [],
        notesToDriver: String(form.notesToDriver || ""),
      },
      payment: { method: form.paymentMethod, payer: form.paymentSide, status: "unpaid" },
      pricing: pricing,
      creditAppliedCentavos: creditUsed,
      statusHistory: [{ status: "pending", at: now, by: req.user._id }],
    });
    } catch (problem) {
      // This compensating update restores promotional credit on create failure.
      if (creditUsed > 0) {
        await User.updateOne({ _id: req.user._id }, { $inc: { creditCentavos: creditUsed } });
      }
      throw problem;
    }

    // HTTP 201 means Created. React reads response.booking.
    return res.status(201).json({ booking: showBooking(booking, req.user) });
  } catch (error) {
    return replyError(res, error);
  }
}

// ============================================================
// 2. GET BOOKINGS: GET /api/bookings
// ============================================================
export async function getBookings(req, res) {
  try {
    let bookings = [];

    if (req.user.role === "customer") {
      // .find() is approximately SELECT ... WHERE customerId = ...
      bookings = await Booking.find({ customerId: req.user._id }).sort({ createdAt: -1 }).limit(200);
    }

    if (req.user.role === "admin") {
      bookings = await Booking.find({ bookingCode: { $exists: true } }).sort({ createdAt: -1 }).limit(200);
    }

    if (req.user.role === "driver") {
      const profile = await DriverProfile.findOne({ userId: req.user._id });
      if (!profile || profile.verificationStatus !== "approved") {
        return res.status(403).json({ message: "Driver approval required." });
      }

      // Query A: all recent deliveries that this driver accepted.
      const assigned = await Booking.find({ driverId: req.user._id }).sort({ createdAt: -1 }).limit(200);

      // Query B: pending requests that need this driver's type of vehicle.
      const pending = await Booking.find({
        status: "pending",
        driverId: null,
        vehicleType: profile.vehicle.type,
      }).sort({ createdAt: -1 }).limit(200);

      // We filter the small pending list in JavaScript. This is easier to
      // read than building one deeply nested MongoDB $or query.
      const available = [];
      const nextHour = Date.now() + 60 * 60 * 1000;
      for (const booking of pending) {
        const declinedIds = booking.declinedBy || [];
        let alreadyDeclined = false;
        for (const id of declinedIds) {
          if (String(id) === String(req.user._id)) alreadyDeclined = true;
        }
        if (alreadyDeclined) continue; // Skip this request.

        if (booking.schedule.type === "scheduled") {
          if (!booking.schedule.scheduledAt) continue;
          if (booking.schedule.scheduledAt.getTime() > nextHour) continue;
        }
        available.push(booking);
      }
      // Combine the two arrays without creating another database collection.
      bookings = assigned.concat(available);
      bookings.sort((a, b) => b.createdAt - a.createdAt);
    }

    // Return the same frontend JSON shape for all three roles.
    const result = [];
    for (const booking of bookings) {
      result.push(showBooking(booking, req.user));
    }
    return res.json({ bookings: result });
  } catch (error) {
    return replyError(res, error);
  }
}

// ============================================================
// BOOKING HISTORY: GET /api/bookings/history
// ============================================================
// Unlike GET /api/bookings, this endpoint returns FINISHED bookings only.
// It is used by BOTH history pages; React doesn't talk to MongoDB directly.
export async function getBookingHistory(req, res) {
  try {
    // Only completed and cancelled deliveries belong in history.
    // $in means "the status is either delivered OR cancelled".
    const filter = { status: { $in: ["delivered", "cancelled"] } };

    // req.user is set by requireAuth() after reading the login cookie.
    // Customers can read only bookings they created.
    // Drivers can read only bookings assigned to them.
    if (req.user.role === "customer") {
      filter.customerId = req.user._id;
    } else if (req.user.role === "driver") {
      filter.driverId = req.user._id;
    } else {
      return res.status(403).json({ message: "Only customers and drivers have personal booking history." });
    }

    // Booking.find() asks MongoDB for all documents matching the filter.
    // sort({ createdAt: -1 }) orders them newest first (-1 = descending).
    // We intentionally do not use the normal active-bookings 200-item limit.
    const bookings = await Booking.find(filter).sort({ createdAt: -1 });

    // Convert each MongoDB document into the JSON format our React UI uses.
    const history = [];
    for (const booking of bookings) {
      history.push(showBooking(booking, req.user));
    }

    // res.json sends HTTP 200 plus JSON: { bookings: [ ... ] }.
    return res.json({ bookings: history });
  } catch (error) {
    return replyError(res, error);
  }
}

// ============================================================
// CUSTOMER SUBMITS A REVIEW: POST /api/bookings/:id/review
// ============================================================
// Store one 1-5-star review inside the completed booking document.
export async function submitBookingReview(req, res) {
  try {
    const rating = req.body && req.body.rating;
    const comment = String((req.body && req.body.comment) || "").trim();

    // A star rating must be a whole number from 1 to 5.
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Choose a rating from 1 to 5 stars." });
    }
    if (comment.length > 300) {
      return res.status(400).json({ message: "Review must be 300 characters or fewer." });
    }

    // Find the specific booking, using BOTH booking code and customer ID.
    // This prevents a customer from reviewing somebody else's booking.
    const booking = await Booking.findOne({
      bookingCode: req.params.id,
      customerId: req.user._id,
    });
    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }
    if (booking.status !== "delivered") {
      return res.status(409).json({ message: "You can review a booking only after delivery." });
    }
    if (booking.review && booking.review.rating) {
      return res.status(409).json({ message: "You already reviewed this booking." });
    }

    // Ordinary Mongoose document assignment and .save(), as in a MERN tutorial.
    // The review becomes part of the EXISTING booking in MongoDB.
    booking.review = {
      rating: rating,
      comment: comment,
      createdAt: new Date(),
    };
    await booking.save();

    // The frontend immediately updates its history card from response.booking.
    return res.status(201).json({ booking: showBooking(booking, req.user) });
  } catch (error) {
    return replyError(res, error);
  }
}

// GET /api/bookings/:id, where :id is a public booking code.
export async function getBooking(req, res) {
  try {
    const booking = await Booking.findOne({ bookingCode: req.params.id });
    if (!booking) return res.status(404).json({ message: "Booking not found." });
    if (!canView(booking, req.user)) {
      return res.status(403).json({ message: "You cannot view this booking." });
    }
    return res.json({ booking: showBooking(booking, req.user) });
  } catch (error) {
    return replyError(res, error);
  }
}

// ============================================================
// 3. DRIVER ACCEPTS: PATCH /api/bookings/:id/accept
// ============================================================
export async function acceptBooking(req, res) {
  try {
    const profile = await DriverProfile.findOne({ userId: req.user._id });
    if (!profile || profile.verificationStatus !== "approved") {
      return res.status(403).json({ message: "Driver verification required." });
    }

    // Only one active job per driver. `exists` only checks if any matching job exists.
    const activeJob = await Booking.exists({
      driverId: req.user._id,
      status: { $in: ACTIVE_STATUSES }, // $in means "one of these values".
    });
    if (activeJob) return res.status(409).json({ message: "Finish your current delivery first." });

    // Read the booking first: plain if-statements make eligibility easy to learn.
    const candidate = await Booking.findOne({ bookingCode: req.params.id });
    if (!candidate || candidate.status !== "pending" || candidate.driverId) {
      return res.status(409).json({ message: "Booking is no longer available." });
    }
    if (candidate.vehicleType !== profile.vehicle.type) {
      return res.status(409).json({ message: "This booking needs a different vehicle type." });
    }
    for (const id of candidate.declinedBy || []) {
      if (String(id) === String(req.user._id)) {
        return res.status(409).json({ message: "You already declined this booking." });
      }
    }
    if (candidate.schedule.type === "scheduled") {
      const nextHour = Date.now() + 60 * 60 * 1000;
      if (!candidate.schedule.scheduledAt || candidate.schedule.scheduledAt.getTime() > nextHour) {
        return res.status(409).json({ message: "This scheduled booking is not available yet." });
      }
    }

    // For cash deliveries the driver keeps the fare and owes the platform 15%.
    // Requiring coverage avoids a negative platform commission balance.
    if (candidate.payment.method === "cash") {
      const wallet = await Wallet.findOne({ userId: req.user._id });
      const commission = Math.round(candidate.pricing.feeCentavos * 0.15);
      if (!wallet || wallet.balanceCentavos < commission) {
        return res.status(409).json({ message: "Wallet must cover the estimated 15% cash commission. Request a top-up first." });
      }
    }
    const expires = [profile.licenseExpiresAt, profile.orExpiresAt, profile.crExpiresAt];
    for (const expiry of expires) {
      if (expiry && new Date(expiry).getTime() < Date.now()) {
        return res.status(403).json({ message: "A driver document has expired. Submit a renewal." });
      }
    }
    const now = new Date();
    const driverInfo = {
      name: req.user.firstName + " " + req.user.lastName,
      phone: req.user.phone,
      plate: profile.vehicle.plateNumber,
      vehicleType: VEHICLE_LABELS[profile.vehicle.type],
    };

    // IMPORTANT EXCEPTION TO THE SIMPLE CODE RULE:
    // We do NOT use candidate.status = "accepted"; await candidate.save() here.
    // Two drivers may click Accept almost together. `findOneAndUpdate` is atomic:
    // MongoDB CHECKS status:"pending" AND changes it in ONE operation.
    // Only the first driver can match; the other receives a conflict response.
    const booking = await Booking.findOneAndUpdate(
      {
        bookingCode: req.params.id,
        status: "pending",
        driverId: null,
        vehicleType: profile.vehicle.type,
        declinedBy: { $ne: req.user._id }, // $ne means this driver did NOT decline.
      }, // FILTER (SQL WHERE); still safe if another request changes availability.
      {
        $set: { driverId: req.user._id, status: "accepted", acceptedAt: now, driver: driverInfo },
        $push: { statusHistory: { status: "accepted", at: now, by: req.user._id } },
      }, // UPDATE: $set changes fields; $push adds a history entry.
      { new: true, runValidators: true } // Return the UPDATED document and validate the changes.
    );

    if (!booking) return res.status(409).json({ message: "Another driver already accepted this booking." });
    // A MongoDB unique active-driver index is our final concurrency safeguard.
    return res.json({ booking: showBooking(booking, req.user) });
  } catch (error) {
    return replyError(res, error);
  }
}

// Driver declines an available request but does NOT cancel the customer's booking.
export async function declineBooking(req, res) {
  try {
    // $addToSet adds the driver's ObjectId to the array only if not already there.
    const result = await Booking.updateOne(
      { bookingCode: req.params.id, status: "pending", driverId: null },
      { $addToSet: { declinedBy: req.user._id } }
    );
    if (result.matchedCount === 0) return res.status(409).json({ message: "This booking is no longer available." });
    return res.json({ message: "Booking declined." });
  } catch (error) {
    return replyError(res, error);
  }
}

// ============================================================
// 4. DRIVER PROGRESSES THROUGH THE THREE MIDDLE STAGES
// ============================================================
export async function updateStatus(req, res) {
  try {
    const requested = req.body && req.body.status;
    const now = new Date();
    let previous = "";
    const changes = { status: requested };
    let pin = null;

    // Explicit if statements show exactly which transition is permitted.
    if (requested === "at_pickup") {
      previous = "accepted";
      changes.arrivedAtPickupAt = now;
    } else if (requested === "picked_up") {
      previous = "at_pickup";
      changes.pickedUpAt = now;
    } else if (requested === "arrived") {
      previous = "picked_up";
      changes.arrivedAtDropoffAt = now;
      // Random code is sent to recipient through TextBee at drop-off arrival.
      pin = String(randomInt(1000, 10000));
      changes.deliveryPinHash = hashPin(req.params.id, pin);
      changes.pinExpiresAt = new Date(now.getTime() + 15 * 60 * 1000);
      changes.pinAttempts = 0;
      changes.pinSends = 1;
      changes.pinLastSentAt = now;
    } else {
      return res.status(400).json({ message: "Use the next stage; delivered requires PIN verification." });
    }

    // NEW WORKFLOW: The driver first marks the parcel picked up, then
    // confirms that the sender paid cash BEFORE arriving at drop-off.
    // Unlike the old implementation, pickup itself needs no cash confirmation.
    if (requested === "arrived") {
      const current = await Booking.findOne({ bookingCode: req.params.id, driverId: req.user._id, status: "picked_up" });
      if (current && current.payment.method === "cash" && current.payment.payer === "sender" && !current.cashCollectedAt) {
        return res.status(409).json({ message: "Confirm sender cash payment after pickup before proceeding to drop-off." });
      }
    }
    // Atomic filter prevents skipping/repeating stages even with two requests.
    const booking = await Booking.findOneAndUpdate(
      { bookingCode: req.params.id, driverId: req.user._id, status: previous },
      {
        $set: changes,
        $push: { statusHistory: { status: requested, at: now, by: req.user._id } },
      },
      { new: true, runValidators: true }
    );
    if (!booking) {
      return res.status(409).json({ message: "Booking not assigned to you or stage changed already." });
    }

    let smsSent = true;
    if (pin) {
      try {
        await sendDeliveryPin(booking, pin);
      } catch (error) {
        smsSent = false;
        console.error("Delivery PIN SMS:", error.message);
      }
    }

    let message = "Delivery stage updated.";
    if (pin && !smsSent) message = "Arrived at drop-off. SMS failed; try Resend PIN.";
    return res.json({ booking: showBooking(booking, req.user), smsSent: smsSent, message: message });
  } catch (error) {
    return replyError(res, error);
  }
}

// ============================================================
// 5. RESEND PIN: POST /api/bookings/:id/resend-pin
// ============================================================
export async function resendDeliveryPin(req, res) {
  try {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const pin = String(randomInt(1000, 10000));

    // The 60-second wait and four-send limit need one atomic DB update.
    // Otherwise two rapid clicks could both pass a separate check and send SMS.
    const booking = await Booking.findOneAndUpdate(
      {
        bookingCode: req.params.id,
        driverId: req.user._id,
        status: "arrived",
        pinSends: { $lt: 4 }, // $lt = less than four sends.
        pinLastSentAt: { $lte: oneMinuteAgo }, // $lte = at or before one minute ago.
      },
      {
        $set: {
          deliveryPinHash: hashPin(req.params.id, pin),
          pinExpiresAt: new Date(now.getTime() + 15 * 60 * 1000),
          pinAttempts: 0,
          pinLastSentAt: now,
        },
        $inc: { pinSends: 1 }, // $inc adds one to the existing number.
      },
      { new: true }
    );

    if (!booking) return res.status(429).json({ message: "PIN cannot be resent yet or send limit reached." });

    try {
      await sendDeliveryPin(booking, pin);
    } catch (error) {
      console.error("Resend PIN:", error.message);
      return res.status(502).json({ message: "TextBee could not send PIN. Try again later." });
    }
    return res.json({ message: "A new PIN was sent to the recipient." });
  } catch (error) {
    return replyError(res, error);
  }
}

// ============================================================
// 6. CONFIRM DELIVERY PIN: POST /api/bookings/:id/verify-delivery
// ============================================================
export async function verifyDelivery(req, res) {
  try {
    const pin = String((req.body && req.body.pin) || "");
    const beforePin = await Booking.findOne({ bookingCode: req.params.id, driverId: req.user._id, status: "arrived" });
    if (beforePin && beforePin.payment.method === "cash" && beforePin.payment.payer === "recipient" && !beforePin.cashCollectedAt) {
      return res.status(409).json({ message: "Confirm recipient cash payment before completing delivery." });
    }
    if (!/^\d{4}$/.test(pin)) return res.status(400).json({ message: "Enter the four-digit recipient PIN." });

    // IMPORTANT: count the attempt ATOMICALLY before comparing PINs.
    // $gt = greater than current time; $lt = fewer than five attempts.
    // .select("+...") includes secret fields normally hidden by Booking.js.
    const booking = await Booking.findOneAndUpdate(
      {
        bookingCode: req.params.id,
        driverId: req.user._id,
        status: "arrived",
        pinExpiresAt: { $gt: new Date() },
        pinAttempts: { $lt: 5 },
      },
      { $inc: { pinAttempts: 1 } },
      { new: true }
    ).select("+deliveryPinHash +pinExpiresAt +pinAttempts");

    if (!booking) return res.status(409).json({ message: "PIN expired or attempts exhausted. Request a new PIN." });

    // Compare HMAC hashes rather than reading a plaintext PIN from MongoDB.
    const storedHash = Buffer.from(booking.deliveryPinHash || "", "hex");
    const enteredHash = Buffer.from(hashPin(booking.bookingCode, pin), "hex");
    // timingSafeEqual helps avoid leaking hints about the correct secret.
    let correct = false;
    if (storedHash.length === enteredHash.length) {
      correct = timingSafeEqual(storedHash, enteredHash);
    }
    if (!correct) return res.status(400).json({ message: "Incorrect delivery PIN." });

    const now = new Date();
    // Atomic completion prevents a second click from finishing twice.
    const completed = await Booking.findOneAndUpdate(
      { _id: booking._id, status: "arrived", driverId: req.user._id },
      {
        $set: { status: "delivered", deliveredAt: now, driverLocation: null, locationUpdatedAt: null },
        $unset: { deliveryPinHash: "", pinExpiresAt: "", pinAttempts: "", pinSends: "", pinLastSentAt: "" },
        $push: { statusHistory: { status: "delivered", at: now, by: req.user._id } },
      },
      { new: true }
    );
    if (!completed) return res.status(409).json({ message: "Delivery already completed or changed." });
    // Wallet updates for completed CASH jobs; confirmed online payments are
    // settled separately by an admin. Neither operation transfers real money.
    if (completed.payment.method === "cash") {
      await settleWallet(completed);
    }
    return res.json({ booking: showBooking(completed, req.user), message: "Delivery completed successfully." });
  } catch (error) {
    return replyError(res, error);
  }
}

// ============================================================
// 7. CUSTOMER/DRIVER CANCELLATION: PATCH /api/bookings/:id/cancel
// ============================================================
export async function cancelBooking(req, res) {
  try {
    const role = req.user.role; // Always from authenticated session, not React JSON.
    const reason = String((req.body && req.body.reason) || "").trim().slice(0, 300);
    if (!reason) return res.status(400).json({ message: "Choose a cancellation reason." });

    // Current policy in this uploaded project:
    // customer: only pending; driver: only accepted/at_pickup.
    // NOTE: Driver cancellation currently CANCELS the booking; it does NOT
    // return it to pending for reassignment. That is a separate feature change.
    let filter = { bookingCode: req.params.id };
    if (role === "customer") {
      filter.customerId = req.user._id;
      filter.status = { $in: ["pending", "accepted"] };
    } else {
      filter.driverId = req.user._id;
      filter.status = { $in: ["accepted", "at_pickup"] };
    }

    // Accepted: free; heading to pickup: ₱10; at pickup: ₱20.
    // A cancellation always records the reason, even if no fee is due.
    let fee = 0;
    if (role === "driver") {
      const current = await Booking.findOne(filter);
      if (current && current.status === "at_pickup") fee = 2000;
      else if (current && current.journeyStartedAt) fee = 1000;
    }
    const now = new Date();
    const booking = await Booking.findOneAndUpdate(
      filter,
      {
        $set: {
          status: "cancelled", cancelledAt: now, cancelledBy: role,
          cancelReason: reason, driverLocation: null, locationUpdatedAt: null,
          cancellationFeeCentavos: fee,
          cashRefundStatus: "none",
        },
        $push: { statusHistory: { status: "cancelled", at: now, by: req.user._id } },
      },
      { new: true }
    );

    if (!booking) return res.status(409).json({ message: "This booking can no longer be cancelled here." });
    if (booking.cashCollectedAt && booking.payment.method === "cash") {
      booking.cashRefundStatus = "pending";
      await booking.save();
    }
    // The fee becomes promotional customer credit once the driver wallet is charged.
    // Use the booking code as a ledger reference; admins can review a waiver later.
    if (fee > 0 && booking.driverId) {
      const wallet = await Wallet.findOne({ userId: booking.driverId });
      if (wallet) {
        wallet.balanceCentavos -= fee;
        wallet.transactions.push({ kind: "cancellation", amountCentavos: -fee, label: "Cancellation fee", bookingCode: booking.bookingCode });
        await wallet.save();
        await User.updateOne({ _id: booking.customerId }, { $inc: { creditCentavos: fee } });
      }
    }
    return res.json({ booking: showBooking(booking, req.user) });
  } catch (error) {
    return replyError(res, error);
  }
}

// ============================================================
// 8. DRIVER GPS UPDATE: PATCH /api/bookings/:id/location
// ============================================================
export async function updateDriverLocation(req, res) {
  try {
    // Number() converts JSON coordinate values to numbers.
    const lat = Number(req.body && req.body.lat);
    const lng = Number(req.body && req.body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return res.status(400).json({ message: "Invalid GPS coordinates." });
    }

    // .updateOne() updates the fields without needing a whole booking document.
    // Only the assigned driver can change GPS while the status is active.
    const result = await Booking.updateOne(
      { bookingCode: req.params.id, driverId: req.user._id, status: { $in: ACTIVE_STATUSES } },
      { $set: { driverLocation: { lat: lat, lng: lng, address: "Driver GPS location" }, locationUpdatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(409).json({ message: "No active booking assigned to you." });
    }
    return res.json({ message: "Location updated." });
  } catch (error) {
    return replyError(res, error);
  }
}

// ============================================================
// EXTRA FEATURES FROM THE NEW FRONTEND
// ============================================================

// A short, separate endpoint records when a driver starts travelling to pickup.
// We keep the existing accepted/at_pickup status names to avoid breaking maps.
export async function startPickupJourney(req, res) {
  const booking = await Booking.findOne({ bookingCode: req.params.id, driverId: req.user._id, status: "accepted" });
  if (!booking) return res.status(409).json({ message: "This job is not in the accepted stage." });
  if (!booking.journeyStartedAt) { booking.journeyStartedAt = new Date(); await booking.save(); }
  return res.json({ booking: showBooking(booking, req.user) });
}

// Driver confirms PHYSICAL cash collection; this does not mark a GCash payment paid.
export async function confirmCashCollection(req, res) {
  const booking = await Booking.findOne({ bookingCode: req.params.id, driverId: req.user._id });
  if (!booking) return res.status(404).json({ message: "Booking not found." });
  if (booking.payment.method !== "cash") return res.status(400).json({ message: "Cash confirmation is for cash bookings only." });
  if (!["picked_up", "arrived"].includes(booking.status)) return res.status(409).json({ message: "Collect cash after collecting the parcel, before delivery completion." });
  if (booking.payment.payer === "sender" && !["picked_up", "arrived"].includes(booking.status)) return res.status(409).json({ message: "Collect sender payment after package pickup." });
  if (booking.payment.payer === "recipient" && !["arrived", "delivered"].includes(booking.status)) return res.status(409).json({ message: "Confirm recipient payment at drop-off." });
  if (!booking.cashCollectedAt) {
    booking.cashCollectedAt = new Date();
    booking.cashCollectedBy = booking.payment.payer;
    booking.payment.status = "paid";
    await booking.save();
  }
  return res.json({ booking: showBooking(booking, req.user) });
}

// The original project's image control was UI-only. Store a private uploaded file.
export async function attachItemPhoto(req, res) {
  const booking = await Booking.findOne({ bookingCode: req.params.id, customerId: req.user._id, status: "pending" });
  if (!booking) return res.status(404).json({ message: "Pending booking not found." });
  if (!req.file) return res.status(400).json({ message: "Choose an image." });
  booking.itemPhoto = req.file.filename;
  await booking.save();
  return res.json({ booking: showBooking(booking, req.user) });
}
export async function readItemPhoto(req, res) {
  const booking = await Booking.findOne({ bookingCode: req.params.id });
  if (!booking || !booking.itemPhoto || (!canView(booking, req.user) && booking.status !== "pending")) return res.status(404).json({ message: "Photo not found." });
  // Only assigned driver or owning customer/admin may view item photos.
  if (!canView(booking, req.user)) return res.status(403).json({ message: "Not allowed." });
  const path = await import("node:path");
  return res.sendFile(path.basename(booking.itemPhoto), { root: path.resolve("private-uploads") });
}

// Review request is saved INSIDE the cancelled booking, not in localStorage.
export async function requestFeeWaiver(req, res) {
  const booking = await Booking.findOne({ bookingCode: req.params.id, driverId: req.user._id, status: "cancelled", cancelledBy: "driver" });
  if (!booking || !booking.cancellationFeeCentavos) return res.status(404).json({ message: "No eligible cancellation fee." });
  if (booking.feeWaiver && booking.feeWaiver.status !== "none") return res.status(409).json({ message: "Review has already been requested." });
  const reason = String(req.body.reason || "").trim();
  if (reason.length < 5 || reason.length > 500) return res.status(400).json({ message: "Explain your request (5–500 characters)." });
  booking.feeWaiver = { status: "pending", reason, proof: req.file ? req.file.filename : "", requestedAt: new Date() };
  await booking.save();
  return res.json({ booking: showBooking(booking, req.user) });
}

// Save a wallet movement only once. This is a demonstration ledger, NOT an actual payout.
export async function settleWallet(booking) {
  const wallet = await Wallet.findOne({ userId: booking.driverId });
  if (!wallet || booking.walletSettledAt) return false;
  const amount = booking.pricing.feeCentavos;
  const commission = Math.round(amount * 0.15);
  if (booking.payment.method === "cash") {
    wallet.balanceCentavos -= commission;
    wallet.transactions.push({ kind: "commission", amountCentavos: -commission, label: "Cash delivery commission", bookingCode: booking.bookingCode });
  } else if (booking.payment.status === "paid") {
    const earnings = amount - commission;
    wallet.balanceCentavos += earnings;
    wallet.transactions.push({ kind: "earnings", amountCentavos: earnings, label: "Online delivery earnings (admin confirmed)", bookingCode: booking.bookingCode });
  } else return false;
  // Atomic claim stops two requests from crediting this booking twice.
  const claimed = await Booking.updateOne({ _id: booking._id, walletSettledAt: null }, { $set: { walletSettledAt: new Date() } });
  if (!claimed.modifiedCount) return false;
  await wallet.save();
  return true;
}

// Report an incident WITHOUT cancelling the collected package delivery.
export async function reportDeliveryIssue(req, res) {
  const reason = String(req.body.reason || "").trim();
  if (reason.length < 5 || reason.length > 500) return res.status(400).json({ message: "Explain the delivery issue (5–500 characters)." });
  const booking = await Booking.findOne({ bookingCode: req.params.id, driverId: req.user._id, status: { $in: ["picked_up", "arrived"] } });
  if (!booking) return res.status(409).json({ message: "You can report an issue only during an active, collected delivery." });
  booking.deliveryIssue = { reason, reportedAt: new Date(), status: "open" };
  await booking.save();
  return res.json({ message: "Issue recorded. Contact the administrator to coordinate safe delivery or handover." });
}
