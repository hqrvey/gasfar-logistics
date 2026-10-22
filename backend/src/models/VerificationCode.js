/**
 * VERIFICATION CODE MODEL — temporary records used during phone signup.
 *
 * One phone number has at most one OTP record at a time.
 * These records are NOT the same thing as user accounts.
 * authController.sendCode() creates/updates them; verifyCode() checks/deletes.
 */
import mongoose from "mongoose";

const verificationCodeSchema = new mongoose.Schema({
  // unique:true adds a MongoDB index so one number cannot have two OTP records.
  phone: { type: String, required: true, unique: true },

  // Store the HASH of the code, never the six-digit code itself.
  codeHash: { type: String, required: true },

  // All Date values are absolute timestamps; compare with `new Date()`.
  expiresAt: { type: Date, required: true },
  lastSentAt: { type: Date, required: true },

  // Defaults apply if a number isn't explicitly included on creation.
  attempts: { type: Number, default: 0 },
  sends: { type: Number, default: 1 },
});

// TTL INDEX: MongoDB eventually deletes a record after expiresAt passes.
// `expireAfterSeconds: 0` uses exactly the expiry time stored in expiresAt.
// TTL cleanup is asynchronous; verifyCode() ALSO checks expiration explicitly.
verificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("VerificationCode", verificationCodeSchema);
