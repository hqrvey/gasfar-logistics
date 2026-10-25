/**
 * USER MODEL — shared account information for customer, driver and admin.
 *
 * Think of this file as defining a MySQL "users table". In MongoDB that table
 * is called a COLLECTION and each row is called a DOCUMENT.
 *
 * This file DOES NOT register or log in anyone. It only describes which fields
 * a User document can have and how Mongoose should validate those fields.
 * authController.js calls User.create(), User.findOne(), etc. using this model.
 */

// `import ... from ...` lets this file use a package installed with npm.
import mongoose from "mongoose";

// `const` creates a variable that cannot be reassigned to another value.
// `new` creates an instance of Mongoose's Schema class.
// `mongoose.Schema({...}, {...})` takes (1) field definitions and (2) options.
const userSchema = new mongoose.Schema(
  {
    // String = JavaScript text; required means Mongoose rejects a missing value.
    // trim removes whitespace at the beginning/end; maxlength limits length.
    firstName: { type: String, required: true, trim: true, maxlength: 80 },
    lastName: { type: String, required: true, trim: true, maxlength: 80 },

    // lowercase converts input to lowercase ("Driver01" -> "driver01").
    // unique creates a MongoDB unique index; it is NOT a normal validation rule.
    // minlength/maxlength limit the number of characters.
    // match accepts only usernames matching the regular expression (letters,
    // digits, underscore, period or hyphen; ^ and $ mean the whole string).
    username: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      minlength: 8,
      maxlength: 30,
      match: /^[a-z0-9_.-]+$/,
    },

    // This regular expression requires a PH mobile number such as +639171234567.
    // `\+` means an actual plus sign; `\d{9}` means exactly nine digits.
    phone: { type: String, required: true, unique: true, match: /^\+639\d{9}$/ },

    // `default: undefined` leaves out the email field when no email was entered.
    email: { type: String, lowercase: true, trim: true, default: undefined },

    // A password HASH, not the original password, is saved in MongoDB.
    // `select: false` means queries normally do not return this sensitive field.
    // The login controller explicitly requests it with `.select("+passwordHash")`.
    passwordHash: { type: String, required: true, select: false },

    // enum means the value MUST be one of the three role names in the array.
    role: { type: String, enum: ["customer", "driver", "admin"], required: true },

    // A moderator is still an admin account. We use the SAME users collection,
    // login form, hashed passwords and JWT cookie as any other GASFAR account.
    // Old administrators without adminRole are treated as super_admin.
    adminRole: {
      type: String,
      enum: ["super_admin", "fee_moderator", "driver_moderator", "user_moderator"],
      default: undefined,
    },
    // Notifications are computed from existing work. Store only which items
    // this administrator has already marked as read (not another collection).
    readAdminNotifications: { type: [String], default: [] },

    // Account enabled/disabled is DIFFERENT from a driver's verification status.
    accountStatus: {
      type: String,
      enum: ["active", "suspended", "disabled"],
      default: "active",
    },

    // Date = a date/time. `null` means no verification timestamp was saved yet.
    phoneVerifiedAt: { type: Date, default: null },
    // Last successful login, displayed in the admin profile.
    lastLoginAt: { type: Date, default: null },
    // Promotional credits from a driver cancellation. NOT actual cash.
    creditCentavos: { type: Number, default: 0, min: 0 },
    profilePhoto: { type: String, default: "" },
    savedAddresses: [{
      id: String, label: String, icon: String,
      address: String, lat: Number, lng: Number,
    }],
  },
  // timestamps:true adds createdAt and updatedAt fields automatically.
  { timestamps: true }
);

// A separate unique index for email. It applies only when email is a string,
// so customers who leave email blank do not conflict with one another.
// `1` means ascending index order; $type is a MongoDB query operator.
userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: "string" } } }
);

// `mongoose.model("User", userSchema)` creates the Model object.
// By default, Mongoose stores User documents in the "users" collection.
// `export default` allows other files to import this as `User`.
export default mongoose.model("User", userSchema);
