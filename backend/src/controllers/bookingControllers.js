import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import Booking from "../models/Booking.js";
import DriverProfile from "../models/DriverProfile.js";
import { sendSMS } from "../services/smsService.js";

const ACTIVE = ["accepted", "at_pickup", "picked_up", "arrived"];
const NEXT = { accepted: "at_pickup", at_pickup: "picked_up", picked_up: "arrived" };
const TIME_FIELDS = { at_pickup: "arrivedAtPickupAt", picked_up: "pickedUpAt", arrived: "arrivedAtDropoffAt" };
const VEHICLE_NAMES = { motorcycle: "Motorcycle", sedan: "Sedan", suv: "SUV", pickup: "Pickup", l300: "L300" };

function validLocation(point) {
  return point && typeof point.address === "string" && point.address.trim().length > 2 &&
    Number.isFinite(point.lat) && point.lat >= -90 && point.lat <= 90 &&
    Number.isFinite(point.lng) && point.lng >= -180 && point.lng <= 180;
}

function normalizePhone(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("63")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return /^9\d{9}$/.test(digits) ? `+63${digits}` : null;
}

// A single public booking shape keeps the existing React pages readable.
// Sensitive fields (such as the PIN hash) are never included.
function showBooking(b, viewer = null) {
  const hidePrivateContacts = viewer?.role === "driver" && b.status === "pending";
  const scheduleDate = b.schedule?.scheduledAt;
  // Convert stored UTC timestamps back to the Philippine date/time used by the form.
  const localSchedule = scheduleDate ? new Date(scheduleDate.getTime() + 8 * 60 * 60 * 1000).toISOString() : null;
  return {
    id: b.bookingCode,
    status: b.status,
    pickup: b.pickup,
    dropoff: b.dropoff,
    customerName: b.customerName,
    customerId: String(b.customerId),
    recipientName: b.recipient?.name,
    recipientPhone: hidePrivateContacts ? "" : b.recipient?.phone,
    recipientUnit: b.recipient?.unit,
    contactNumber: hidePrivateContacts ? "" : b.customerPhone,
    vehicleType: VEHICLE_NAMES[b.vehicleType] || b.vehicleType,
    vehicleTypeId: b.vehicleType,
    deliveryType: b.deliveryType,
    itemTypes: b.packageDetails?.itemTypes || [],
    itemDetails: `${(b.packageDetails?.itemTypes || []).join(", ")} · Qty: ${b.packageDetails?.quantity || 1}`,
    quantity: b.packageDetails?.quantity,
    itemWeight: b.packageDetails?.itemWeight,
    handlingInstructions: b.packageDetails?.handlingInstructions,
    notesToDriver: b.packageDetails?.notesToDriver,
    scheduleType: b.schedule?.type,
    scheduleDate: localSchedule ? localSchedule.slice(0, 10) : "",
    scheduleTime: localSchedule ? localSchedule.slice(11, 16) : "",
    paymentMethod: b.payment?.method === "gcash" ? "GCash" : b.payment?.method === "maya" ? "Maya" : "Cash",
    paymentSide: b.payment?.payer,
    paymentStatus: b.payment?.status,
    price: `₱${(b.pricing.feeCentavos / 100).toLocaleString("en-PH")}`,
    feeCentavos: b.pricing.feeCentavos,
    driver: b.driver?.name ? b.driver : null,
    driverId: b.driverId ? String(b.driverId) : null,
    driverLocation: b.driverLocation,
    locationUpdatedAt: b.locationUpdatedAt?.getTime() || null,
    declinedBy: (b.declinedBy || []).map(String),
    statusHistory: (b.statusHistory || []).map((event) => ({ status: event.status, at: event.at })),
    bookedAt: b.createdAt?.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }),
    completedAt: b.deliveredAt?.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }),
    cancelledAt: b.cancelledAt?.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }),
    cancelReason: b.cancelReason,
    cancelledBy: b.cancelledBy,
  };
}

function findBooking(id) {
  // Lookup by public booking code; the MongoDB _id is not exposed in the URL.
  return Booking.findOne({ bookingCode: id });
}

function canView(booking, user) {
  return user.role === "admin" ||
    (user.role === "customer" && String(booking.customerId) === String(user._id)) ||
    (user.role === "driver" && String(booking.driverId) === String(user._id));
}

// Backend calculates distance and pricing; never trust a price submitted by React.
async function routePrice(pickup, dropoff) {
  const key = process.env.GEOAPIFY_API_KEY;
  if (!key) throw Object.assign(new Error("Set GEOAPIFY_API_KEY in backend/.env before creating bookings."), { status: 503 });
  const url = new URL("https://api.geoapify.com/v1/routing");
  url.searchParams.set("waypoints", `${pickup.lat},${pickup.lng}|${dropoff.lat},${dropoff.lng}`);
  url.searchParams.set("mode", "drive");
  url.searchParams.set("apiKey", key);
  let response;
  try { response = await fetch(url, { signal: AbortSignal.timeout(12000) }); }
  catch { throw Object.assign(new Error("Could not calculate delivery price. Try again."), { status: 502 }); }
  if (!response.ok) throw Object.assign(new Error("Routing service unavailable. Try again."), { status: 502 });
  const data = await response.json();
  const route = data.features?.[0]?.properties;
  if (!Number.isFinite(route?.distance) || !Number.isFinite(route?.time)) {
    throw Object.assign(new Error("No driving route found for these locations."), { status: 400 });
  }
  const distanceKm = Math.round(route.distance / 100) / 10;
  const durationMins = Math.max(1, Math.ceil(route.time / 60));
  const feeCentavos = Math.round((50 + distanceKm * 12) * 100);
  return { distanceKm, durationMins, feeCentavos };
}

function pinHash(id, pin) {
  return createHmac("sha256", process.env.OTP_SECRET).update(`${id}:${pin}`).digest("hex");
}

async function sendDeliveryPin(booking, pin) {
  // A development code may be logged only when explicitly enabled locally.
  if (process.env.NODE_ENV !== "production" && process.env.DEV_LOG_DELIVERY_PIN === "true") {
    console.log(`[LOCAL TEST] Delivery PIN for ${booking.bookingCode}: ${pin}`);
  }
  await sendSMS(booking.recipient.phone, `GASFAR delivery PIN for ${booking.bookingCode}: ${pin}. Give it only when your package arrives. Expires in 15 minutes.`);
}

function replyError(res, error) {
  if (error.code === 11000) return res.status(409).json({ message: "Conflicting booking assignment or duplicate booking. Refresh and try again." });
  if (error.status) return res.status(error.status).json({ message: error.message });
  if (error.name === "ValidationError") return res.status(400).json({ message: Object.values(error.errors).map((e) => e.message).join("; ") });
  console.error("Booking API:", error);
  return res.status(500).json({ message: "Unable to process booking. Try again." });
}

export async function createBooking(req, res) {
  try {
    const b = req.body || {};
    if (!validLocation(b.pickup) || !validLocation(b.dropoff)) return res.status(400).json({ message: "Valid pickup and drop-off locations are required." });
    if (!["motorcycle", "sedan", "suv", "pickup", "l300"].includes(b.vehicleType) ||
        !["regular", "priority"].includes(b.deliveryType)) return res.status(400).json({ message: "Select a valid vehicle and delivery type." });
    const phone = normalizePhone(b.recipientPhone);
    if (!String(b.recipientName || "").trim() || !phone) return res.status(400).json({ message: "Recipient name and valid Philippine mobile number are required." });
    if (!Array.isArray(b.itemTypes) || !b.itemTypes.length || b.itemTypes.some((type) => typeof type !== "string" || type.length > 50) ||
        !Number.isInteger(b.quantity) || b.quantity < 1 || b.quantity > 1000) return res.status(400).json({ message: "Choose package items and a valid quantity." });
    if (!["cash", "gcash", "maya"].includes(b.paymentMethod) || !["sender", "recipient"].includes(b.paymentSide)) return res.status(400).json({ message: "Choose a payment method and payer." });
    if (!["now", "scheduled"].includes(b.scheduleType)) return res.status(400).json({ message: "Choose a delivery schedule." });
    let scheduledAt = null;
    if (b.scheduleType === "scheduled") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(b.scheduleDate || "") || !/^\d{2}:\d{2}$/.test(b.scheduleTime || "")) {
        return res.status(400).json({ message: "Choose a valid pickup date and time." });
      }
      scheduledAt = new Date(`${b.scheduleDate}T${b.scheduleTime}:00+08:00`);
      if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) return res.status(400).json({ message: "Choose a future pickup date and time." });
    }
    const pricing = await routePrice(b.pickup, b.dropoff);
    const created = await Booking.create({
      bookingCode: `ORD-${Date.now()}-${randomBytes(3).toString("hex").toUpperCase()}`,
      customerId: req.user._id,
      customerName: `${req.user.firstName} ${req.user.lastName}`,
      customerPhone: req.user.phone,
      pickup: b.pickup, dropoff: b.dropoff,
      recipient: { name: b.recipientName.trim(), phone, unit: String(b.recipientUnit || "").trim() },
      vehicleType: b.vehicleType, deliveryType: b.deliveryType,
      schedule: { type: b.scheduleType, scheduledAt },
      packageDetails: {
        itemTypes: b.itemTypes, quantity: b.quantity,
        itemWeight: String(b.itemWeight || ""),
        handlingInstructions: Array.isArray(b.handlingInstructions) ? b.handlingInstructions : [],
        notesToDriver: String(b.notesToDriver || ""),
      },
      payment: { method: b.paymentMethod, payer: b.paymentSide, status: "unpaid" },
      pricing,
      statusHistory: [{ status: "pending", at: new Date(), by: req.user._id }],
    });
    return res.status(201).json({ booking: showBooking(created) });
  } catch (error) { return replyError(res, error); }
}

export async function getBookings(req, res) {
  try {
    let filter;
    if (req.user.role === "customer") filter = { customerId: req.user._id };
    else if (req.user.role === "admin") filter = { bookingCode: { $exists: true } };
    else {
      const profile = await DriverProfile.findOne({ userId: req.user._id });
      const vehicleType = profile?.vehicle?.type;
      // Driver sees eligible unclaimed jobs plus their own past and active jobs.
      filter = { $or: [
        { driverId: req.user._id },
        { status: "pending", driverId: null, vehicleType, declinedBy: { $ne: req.user._id },
          $or: [{ "schedule.type": "now" }, { "schedule.scheduledAt": { $lte: new Date(Date.now() + 60 * 60 * 1000) } }] },
      ] };
    }
    const bookings = await Booking.find(filter).sort({ createdAt: -1 }).limit(200);
    return res.json({ bookings: bookings.map((booking) => showBooking(booking, req.user)) });
  } catch (error) { return replyError(res, error); }
}

export async function getBooking(req, res) {
  try {
    const booking = await findBooking(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found." });
    if (!canView(booking, req.user)) return res.status(403).json({ message: "You cannot view this booking." });
    return res.json({ booking: showBooking(booking, req.user) });
  } catch (error) { return replyError(res, error); }
}

export async function acceptBooking(req, res) {
  try {
    const profile = await DriverProfile.findOne({ userId: req.user._id });
    if (!profile || profile.verificationStatus !== "approved") return res.status(403).json({ message: "Driver verification required." });
    const busy = await Booking.exists({ driverId: req.user._id, status: { $in: ACTIVE } });
    if (busy) return res.status(409).json({ message: "Finish your current delivery before accepting another." });
    const booking = await Booking.findOneAndUpdate({
      bookingCode: req.params.id, status: "pending", driverId: null,
      vehicleType: profile.vehicle.type, declinedBy: { $ne: req.user._id },
      $or: [{ "schedule.type": "now" }, { "schedule.scheduledAt": { $lte: new Date(Date.now() + 60 * 60 * 1000) } }],
    }, {
      $set: {
        driverId: req.user._id, status: "accepted", acceptedAt: new Date(),
        driver: { name: `${req.user.firstName} ${req.user.lastName}`, phone: req.user.phone,
          plate: profile.vehicle.plateNumber, vehicleType: VEHICLE_NAMES[profile.vehicle.type] },
      },
      $push: { statusHistory: { status: "accepted", at: new Date(), by: req.user._id } },
    }, { new: true, runValidators: true });
    if (!booking) return res.status(409).json({ message: "Booking unavailable, already accepted, or vehicle type does not match." });
    return res.json({ booking: showBooking(booking, req.user) });
  } catch (error) { return replyError(res, error); }
}

export async function declineBooking(req, res) {
  try {
    const result = await Booking.updateOne({ bookingCode: req.params.id, status: "pending", driverId: null },
      { $addToSet: { declinedBy: req.user._id } });
    if (!result.matchedCount) return res.status(409).json({ message: "This booking is no longer available." });
    return res.json({ message: "Booking declined." });
  } catch (error) { return replyError(res, error); }
}

export async function updateStatus(req, res) {
  try {
    const next = req.body?.status;
    const current = Object.keys(NEXT).find((status) => NEXT[status] === next);
    if (!current) return res.status(400).json({ message: "Use the next delivery stage. Delivered requires PIN verification." });
    const now = new Date();
    const patch = { $set: { status: next, [TIME_FIELDS[next]]: now }, $push: { statusHistory: { status: next, at: now, by: req.user._id } } };
    let pin = null;
    if (next === "arrived") {
      pin = String(randomInt(1000, 10000));
    }
    const booking = await Booking.findOneAndUpdate({ bookingCode: req.params.id, driverId: req.user._id, status: current }, {
      ...patch,
      $set: {
        ...patch.$set,
        ...(pin ? { deliveryPinHash: pinHash(req.params.id, pin), pinExpiresAt: new Date(now.getTime() + 15 * 60 * 1000), pinAttempts: 0, pinSends: 1, pinLastSentAt: now } : {}),
      },
    }, { new: true, runValidators: true });
    if (!booking) return res.status(409).json({ message: "Booking is not assigned to you or this stage is no longer available." });
    let smsSent = true;
    if (pin) {
      try { await sendDeliveryPin(booking, pin); }
      catch (error) { smsSent = false; console.error("Delivery PIN SMS error:", error.message); }
    }
    return res.json({ booking: showBooking(booking), smsSent,
      message: pin && !smsSent ? "Arrived at drop-off. SMS failed; try Resend PIN." : "Delivery stage updated." });
  } catch (error) { return replyError(res, error); }
}

export async function resendDeliveryPin(req, res) {
  try {
    const now = new Date();
    // Issue a new code (we store only its hash), with a 60-second cooldown and up to 4 sends.
    const pin = String(randomInt(1000, 10000));
    const booking = await Booking.findOneAndUpdate({
      bookingCode: req.params.id, driverId: req.user._id, status: "arrived",
      pinSends: { $lt: 4 }, pinLastSentAt: { $lte: new Date(now.getTime() - 60 * 1000) },
    }, { $set: { deliveryPinHash: pinHash(req.params.id, pin), pinExpiresAt: new Date(now.getTime() + 15 * 60 * 1000), pinAttempts: 0, pinLastSentAt: now }, $inc: { pinSends: 1 } }, { new: true });
    if (!booking) return res.status(429).json({ message: "PIN can't be resent yet, or the send limit has been reached." });
    try { await sendDeliveryPin(booking, pin); }
    catch (error) { console.error("Resend PIN error:", error.message); return res.status(502).json({ message: "TextBee could not send the PIN. Try again later." }); }
    return res.json({ message: "A new delivery PIN was sent to the recipient." });
  } catch (error) { return replyError(res, error); }
}

export async function verifyDelivery(req, res) {
  try {
    const pin = String(req.body?.pin || "");
    if (!/^\d{4}$/.test(pin)) return res.status(400).json({ message: "Enter the 4-digit recipient PIN." });
    const b = await Booking.findOneAndUpdate({
      bookingCode: req.params.id, driverId: req.user._id, status: "arrived",
      pinExpiresAt: { $gt: new Date() }, pinAttempts: { $lt: 5 },
    }, { $inc: { pinAttempts: 1 } }, { new: true }).select("+deliveryPinHash +pinExpiresAt +pinAttempts");
    if (!b) return res.status(409).json({ message: "PIN expired, too many attempts, or delivery is not ready. Request a new PIN." });
    const expected = Buffer.from(b.deliveryPinHash || "", "hex");
    const actual = Buffer.from(pinHash(b.bookingCode, pin), "hex");
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return res.status(400).json({ message: "Incorrect delivery PIN." });
    const now = new Date();
    const completed = await Booking.findOneAndUpdate({ _id: b._id, status: "arrived", driverId: req.user._id }, {
      $set: { status: "delivered", deliveredAt: now, driverLocation: null, locationUpdatedAt: null },
      $unset: { deliveryPinHash: "", pinExpiresAt: "", pinAttempts: "", pinSends: "", pinLastSentAt: "" },
      $push: { statusHistory: { status: "delivered", at: now, by: req.user._id } },
    }, { new: true });
    if (!completed) return res.status(409).json({ message: "Delivery already completed or changed." });
    return res.json({ booking: showBooking(completed), message: "Delivery completed successfully." });
  } catch (error) { return replyError(res, error); }
}

export async function cancelBooking(req, res) {
  try {
    const role = req.user.role;
    const allowed = role === "customer" ? ["pending"] : ["accepted", "at_pickup"];
    const reason = String(req.body?.reason || "").trim().slice(0, 300);
    if (!reason) return res.status(400).json({ message: "Please select a cancellation reason." });
    const owner = role === "customer" ? { customerId: req.user._id } : { driverId: req.user._id };
    const now = new Date();
    const booking = await Booking.findOneAndUpdate({ bookingCode: req.params.id, ...owner, status: { $in: allowed } }, {
      $set: { status: "cancelled", cancelledAt: now, cancelledBy: role, cancelReason: reason, driverLocation: null, locationUpdatedAt: null },
      $push: { statusHistory: { status: "cancelled", at: now, by: req.user._id } },
    }, { new: true });
    if (!booking) return res.status(409).json({ message: "This booking can no longer be cancelled here. Contact support." });
    return res.json({ booking: showBooking(booking, req.user) });
  } catch (error) { return replyError(res, error); }
}

export async function updateDriverLocation(req, res) {
  try {
    const lat = Number(req.body?.lat), lng = Number(req.body?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return res.status(400).json({ message: "Invalid GPS coordinates." });
    const now = new Date();
    const booking = await Booking.updateOne({ bookingCode: req.params.id, driverId: req.user._id, status: { $in: ACTIVE } }, {
      $set: { driverLocation: { lat, lng, address: "Driver GPS location" }, locationUpdatedAt: now },
    });
    if (!booking.matchedCount) return res.status(409).json({ message: "No active assigned booking to update." });
    return res.json({ message: "Location updated." });
  } catch (error) { return replyError(res, error); }
}
