/**
 * DRIVER PROFILE MODEL — data that ONLY driver accounts need.
 * A driver has ONE User document for login and ONE DriverProfile for verification.
 * They are connected by DriverProfile.userId -> User._id (like a foreign key).
 *
 * Driver registration in authController.js creates BOTH documents.
 * Admin approval changes DriverProfile.verificationStatus, not User.role.
 */
import mongoose from "mongoose";

const driverProfileSchema = new mongoose.Schema(
  {
    // ObjectId is MongoDB's identifier type. `ref: "User"` allows populate().
    // unique:true makes it impossible for TWO profiles to share the same userId.
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // The status starts at "pending" unless code sets another value.
    // This field belongs to driverprofiles, NOT the users collection.
    verificationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    // Boolean accepts true or false. New drivers are offline until enabled.
    isOnline: { type: Boolean, default: false },

    // This is an EMBEDDED OBJECT, not another "vehicles" collection.
    // Mongoose stores vehicle.type and vehicle.plateNumber together in the profile.
    vehicle: {
      // Here the FIRST `type` is the field name (vehicle.type), and the SECOND
      // `type` tells Mongoose what data type to expect (String).
      type: {
        type: String,
        enum: ["motorcycle", "sedan", "suv", "pickup", "l300"],
        required: true,
      },
      plateNumber: { type: String, required: true, uppercase: true, trim: true },
    },

    // The strings are filenames of uploaded private documents, not file bytes.
    // The Express registration route (Multer) saves the files to disk first.
    documents: {
      profilePhoto: { type: String, required: true },
      license: { type: String, required: true },
      or: { type: String, required: true },
      cr: { type: String, required: true },
      backplate: { type: String, required: true },
    },
  },
  // Mongoose manages createdAt and updatedAt for these records too.
  { timestamps: true }
);

// `DriverProfile.findOne({userId: ...})` will query "driverprofiles".
export default mongoose.model("DriverProfile", driverProfileSchema);
