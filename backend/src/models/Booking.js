/**
 * BOOKING MODEL — the database structure for one delivery.
 *
 * MySQL comparison:
 *   bookingSchema  ~ a table definition
 *   Booking        ~ the table object we query through Mongoose
 *   Booking.create ~ INSERT INTO bookings ...
 *   Booking.find   ~ SELECT * FROM bookings WHERE ...
 *
 * Model vs controller: this file defines field types and rules; controllers
 * decide WHO can create/update a booking and WHEN its status can change.
 * A "pending" booking and a "delivered" booking are documents in ONE collection.
 */
import mongoose from "mongoose";

// Reuse this mini-schema for pickup, dropoff and driverLocation.
// `new mongoose.Schema(fields, options)` creates the schema rules.
const locationSchema = new mongoose.Schema(
  {
    // Every location stores its readable address PLUS GPS coordinates.
    address: { type: String, required: true, trim: true, maxlength: 500 },
    // Latitude must be within -90 and 90 degrees.
    lat: { type: Number, required: true, min: -90, max: 90 },
    // Longitude must be within -180 and 180 degrees.
    lng: { type: Number, required: true, min: -180, max: 180 },
  },
  // Nested location objects do not need their own automatically generated _id.
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    // Public order reference displayed to customers, e.g. ORD-12345-ABCDEF.
    bookingCode: { type: String, required: true },

    // `ObjectId` is MongoDB's identifier type. `ref: "User"` tells Mongoose
    // which model we could `populate()` to retrieve linked user information.
    // This does NOT enforce a MySQL-style database foreign key on its own.
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // null means no driver has accepted the booking yet.
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    // enum is the list of allowed text values. The controller checks which
    // TRANSITIONS are allowed; the schema only checks allowed VALUES.
    status: {
      type: String,
      enum: ["pending", "accepted", "at_pickup", "picked_up", "arrived", "delivered", "cancelled"],
      default: "pending",
      index: true,
    },

    // An embedded location is stored inside this booking document.
    // `type: locationSchema` validates the nested address and coordinates.
    pickup: { type: locationSchema, required: true },
    dropoff: { type: locationSchema, required: true },

    // Snapshot of the customer's information at the time of booking.
    // Even if their User profile changes later, the original booking keeps it.
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },

    // Recipient details are nested in the same document (NOT another collection).
    recipient: {
      name: { type: String, required: true, maxlength: 100 },
      // `^`/`$` require the WHOLE phone to match; \d means "digit".
      phone: { type: String, required: true, match: /^\+639\d{9}$/ },
      unit: { type: String, default: "", maxlength: 150 },
    },

    // Vehicle and delivery type must match one of the accepted choices.
    vehicleType: {
      type: String,
      enum: ["motorcycle", "sedan", "suv", "pickup", "l300"],
      required: true,
    },
    deliveryType: { type: String, enum: ["regular", "priority"], required: true },

    // "type" is a DATA FIELD name inside schedule. The inner `type: String`
    // defines that field as text. ScheduledAt is null for immediate bookings.
    schedule: {
      type: { type: String, enum: ["now", "scheduled"], required: true },
      scheduledAt: { type: Date, default: null },
    },

    packageDetails: {
      // `[String]` means an ARRAY of strings, like ["electronics", "clothes"].
      itemTypes: { type: [String], required: true },
      quantity: { type: Number, min: 1, max: 1000, required: true },
      itemWeight: { type: String, default: "", maxlength: 100 },
      handlingInstructions: { type: [String], default: [] },
      notesToDriver: { type: String, default: "", maxlength: 1000 },
    },

    pricing: {
      // These are calculated by Express using Geoapify, not trusted from React.
      distanceKm: { type: Number, required: true },
      durationMins: { type: Number, required: true },
      // Store money as INTEGER centavos to avoid floating-point rounding issues.
      // Example: 15080 centavos = ₱150.80.
      feeCentavos: { type: Number, required: true, min: 0 },
    },

    payment: {
      method: { type: String, enum: ["cash", "gcash", "maya"], required: true },
      payer: { type: String, enum: ["sender", "recipient"], required: true },
      // This currently only records a payment status; it does not collect money.
      status: { type: String, enum: ["unpaid", "paid"], default: "unpaid" },
    },

    // Driver display information captured when the booking is accepted.
    // The driverId above is still the reliable link to the actual User document.
    driver: {
      name: String,
      phone: String,
      plate: String,
      vehicleType: String,
    },

    // An array of driver account IDs. Each driver can decline an available job.
    declinedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // Current GPS location. This is replaced as the driver moves; this field
    // does not hold the full trip. `null` means location is unavailable.
    driverLocation: { type: locationSchema, default: null },
    locationUpdatedAt: { type: Date, default: null },

    // An ARRAY OF EMBEDDED OBJECTS stores the timeline, e.g.
    // [{ status: "accepted", at: ISODate(...), by: ObjectId(...) }, ...].
    // `$push` in the booking controller adds one entry to this array.
    statusHistory: [{
      status: { type: String, required: true },
      at: { type: Date, required: true },
      by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    }],

    // Individual timestamps make querying and generating reports simpler.
    // A bare `Date` field is shorthand for `{ type: Date }`.
    acceptedAt: Date,
    arrivedAtPickupAt: Date,
    pickedUpAt: Date,
    arrivedAtDropoffAt: Date,
    deliveredAt: Date,
    cancelledAt: Date,
    cancelledBy: { type: String, enum: ["customer", "driver", "admin"] },
    cancelReason: String,

    // Delivery confirmation secrets: never include these in normal MongoDB
    // queries or public REST responses. `.select("+deliveryPinHash")` explicitly
    // reads the protected hash only in the PIN-verification controller.
    deliveryPinHash: { type: String, select: false },
    pinExpiresAt: { type: Date, select: false },
    pinAttempts: { type: Number, default: 0, select: false },
    pinLastSentAt: { type: Date, select: false },
    pinSends: { type: Number, default: 0, select: false },
  },
  // Automatically adds MongoDB timestamps: createdAt and updatedAt.
  { timestamps: true }
);

// An INDEX is a database lookup helper, like a MySQL index.
// `1` = ascending; `-1` = descending. `unique:true` forbids duplicates.
// Partial filter applies the public-code uniqueness rule only to strings,
// allowing old tutorial documents without bookingCode during migration.
bookingSchema.index(
  { bookingCode: 1 },
  { unique: true, partialFilterExpression: { bookingCode: { $type: "string" } } }
);

// Common query patterns: searching jobs by status/vehicle and sorting histories.
bookingSchema.index({ vehicleType: 1, status: 1, createdAt: -1 });
bookingSchema.index({ customerId: 1, createdAt: -1 });
bookingSchema.index({ driverId: 1, createdAt: -1 });

// A UNIQUE PARTIAL INDEX means a driverId may occur many times in history,
// but at most ONCE among bookings whose status is still active.
// `$in` means "status is one of these four values".
// This is a database safeguard against concurrent booking-accept requests.
bookingSchema.index(
  { driverId: 1 },
  {
    unique: true,
    name: "one_active_delivery_per_driver",
    partialFilterExpression: {
      status: { $in: ["accepted", "at_pickup", "picked_up", "arrived"] },
    },
  }
);

// Create a Mongoose Model named Booking, automatically mapped to "bookings".
// bookingControllers.js imports this default export as `Booking`.
export default mongoose.model("Booking", bookingSchema);
