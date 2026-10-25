/*
 * Wallet.js — Mongoose MODEL: describes a driver's internal demo ledger.
 * ThinkBoard's Note model stores a note. Our Wallet model stores money records.
 *
 * The application does NOT send real GCash/Maya/bank payments. Each amount
 * uses INTEGER CENTAVOS: 5000 means ₱50.00. This avoids rounding errors
 * from repeatedly saving peso decimals such as 0.1 + 0.2.
 *
 * The controller uses Wallet.findOne(), Wallet.create() and wallet.save().
 */
import mongoose from "mongoose";

const walletSchema = new mongoose.Schema({
  // A MongoDB ObjectId identifies the owner. ref connects to the User model.
  // unique:true means only ONE wallet is allowed for each userId.
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },

  // Default wallet balance is zero; +5000 centavos would mean +₱50.
  balanceCentavos: { type: Number, default: 0 },

  // Arrays inside [ ] store multiple embedded records in one Wallet document.
  // A transaction is a record of a balance change, not an external transfer.
  transactions: [{
    kind: String,          // e.g. "topup", "withdrawal", "commission"
    amountCentavos: Number,
    label: String,
    bookingCode: String,
    date: { type: Date, default: Date.now },
  }],

  // A request stays "pending" until an admin makes a decision.
  requests: [{
    kind: { type: String, enum: ["topup", "withdrawal"] },
    amountCentavos: Number,
    account: String,
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    createdAt: { type: Date, default: Date.now },
  }],
}, {
  // Mongoose automatically adds createdAt and updatedAt.
  timestamps: true,
});

// Controllers import Wallet and use it like ThinkBoard uses its Note model.
export default mongoose.model("Wallet", walletSchema);
