import mongoose from "mongoose";

// Every account (customer, driver, admin) lives in this collection.
const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true, maxlength: 80 },
  lastName: { type: String, required: true, trim: true, maxlength: 80 },
  username: { type: String, required: true, lowercase: true, trim: true, unique: true, minlength: 8, maxlength: 30, match: /^[a-z0-9_.-]+$/ },
  phone: { type: String, required: true, unique: true, match: /^\+639\d{9}$/ }, // Example: +639171234567
  email: { type: String, lowercase: true, trim: true, default: undefined },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ["customer", "driver", "admin"], required: true },
  accountStatus: { type: String, enum: ["active", "suspended", "disabled"], default: "active" },
  phoneVerifiedAt: { type: Date, default: null },
}, { timestamps: true });

// Unlike unique:true on email, this permits many accounts without an email.
userSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: "string" } } });

export default mongoose.model("User", userSchema);
