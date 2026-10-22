import mongoose from "mongoose";

// Drivers are users with additional information that admins can review.
const driverProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  verificationStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  isOnline: { type: Boolean, default: false },
  vehicle: {
    type: { type: String, enum: ["motorcycle", "sedan", "suv", "pickup", "l300"], required: true },
    plateNumber: { type: String, required: true, uppercase: true, trim: true },
  },
  // Private filenames, never public URLs. Only admins should access these later.
  documents: {
    profilePhoto: { type: String, required: true },
    license: { type: String, required: true },
    or: { type: String, required: true },
    cr: { type: String, required: true },
    backplate: { type: String, required: true },
  },
}, { timestamps: true });

export default mongoose.model("DriverProfile", driverProfileSchema);
