import mongoose from "mongoose";

// One booking document contains the route, recipient, package and delivery timeline.
// Customer and driver accounts are referenced by their User _id values.
const pointSchema = new mongoose.Schema({
  address: { type: String, required: true, trim: true, maxlength: 500 },
  lat: { type: Number, required: true, min: -90, max: 90 },
  lng: { type: Number, required: true, min: -180, max: 180 },
}, { _id: false });

const bookingSchema = new mongoose.Schema({
  bookingCode: { type: String, required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  status: {
    type: String,
    enum: ["pending", "accepted", "at_pickup", "picked_up", "arrived", "delivered", "cancelled"],
    default: "pending",
    index: true,
  },
  pickup: { type: pointSchema, required: true },
  dropoff: { type: pointSchema, required: true },
  customerName: { type: String, required: true }, // Snapshot at booking time
  customerPhone: { type: String, required: true },
  recipient: {
    name: { type: String, required: true, maxlength: 100 },
    phone: { type: String, required: true, match: /^\+639\d{9}$/ },
    unit: { type: String, default: "", maxlength: 150 },
  },
  vehicleType: { type: String, enum: ["motorcycle", "sedan", "suv", "pickup", "l300"], required: true },
  deliveryType: { type: String, enum: ["regular", "priority"], required: true },
  schedule: {
    type: { type: String, enum: ["now", "scheduled"], required: true },
    scheduledAt: { type: Date, default: null },
  },
  packageDetails: {
    itemTypes: { type: [String], required: true },
    quantity: { type: Number, min: 1, max: 1000, required: true },
    itemWeight: { type: String, default: "", maxlength: 100 },
    handlingInstructions: { type: [String], default: [] },
    notesToDriver: { type: String, default: "", maxlength: 1000 },
  },
  pricing: {
    distanceKm: { type: Number, required: true },
    durationMins: { type: Number, required: true },
    feeCentavos: { type: Number, required: true, min: 0 },
  },
  payment: {
    method: { type: String, enum: ["cash", "gcash", "maya"], required: true },
    payer: { type: String, enum: ["sender", "recipient"], required: true },
    status: { type: String, enum: ["unpaid", "paid"], default: "unpaid" },
  },
  driver: { // Display snapshot, filled in when accepted.
    name: String, phone: String, plate: String, vehicleType: String,
  },
  declinedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  driverLocation: { type: pointSchema, default: null },
  locationUpdatedAt: { type: Date, default: null },
  statusHistory: [{
    status: { type: String, required: true },
    at: { type: Date, required: true },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  }],
  acceptedAt: Date,
  arrivedAtPickupAt: Date,
  pickedUpAt: Date,
  arrivedAtDropoffAt: Date,
  deliveredAt: Date,
  cancelledAt: Date,
  cancelledBy: { type: String, enum: ["customer", "driver", "admin"] },
  cancelReason: String,
  // Never return the delivery PIN hash to React.
  deliveryPinHash: { type: String, select: false },
  pinExpiresAt: { type: Date, select: false },
  pinAttempts: { type: Number, default: 0, select: false },
  pinLastSentAt: { type: Date, select: false },
  pinSends: { type: Number, default: 0, select: false },
}, { timestamps: true });

// Tutorial-only bookings without bookingCode won't block creation of this index.
bookingSchema.index({ bookingCode: 1 }, { unique: true,
  partialFilterExpression: { bookingCode: { $type: "string" } },
});
bookingSchema.index({ vehicleType: 1, status: 1, createdAt: -1 });
bookingSchema.index({ customerId: 1, createdAt: -1 });
bookingSchema.index({ driverId: 1, createdAt: -1 });
// Prevent concurrent requests from assigning two ACTIVE deliveries to one driver.
bookingSchema.index({ driverId: 1 }, {
  unique: true,
  name: "one_active_delivery_per_driver",
  partialFilterExpression: { status: { $in: ["accepted", "at_pickup", "picked_up", "arrived"] } },
});

export default mongoose.model("Booking", bookingSchema);
