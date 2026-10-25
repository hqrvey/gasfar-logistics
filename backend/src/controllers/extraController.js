/*
 * EXTRA CONTROLLER — following freeCodeCamp ThinkBoard's controller pattern.
 * A route decides WHICH function runs; THIS file performs the work.
 *
 * Request flow:
 * 1. React calls /api/extra/... with fetch() in extraService.js.
 * 2. extraRoutes.js checks the URL and runs requireAuth / allowRoles.
 * 3. Express provides req and res to a named function below.
 * 4. req.user is the account checked from JWT. req.body is submitted form data.
 * 5. User / Booking / DriverProfile / Wallet uses Mongoose to read/change MongoDB.
 * 6. res.json() sends a plain JSON object back to React.
 *
 * This is one controller file to avoid splitting a beginner project into
 * dozens of tiny files. The endpoints and JSON shapes are unchanged.
 */
import path from "node:path";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import DriverProfile from "../models/DriverProfile.js";
import Wallet from "../models/Wallet.js";
import { settleWallet } from "./bookingControllers.js";

// Return an HTTP 400 (Bad Request) with a message the React page can show.
function bad(res, message) {
  return res.status(400).json({ message: message });
}

// A non-expected error is logged on the server, not sent as a database trace.
function serverError(res, error) {
  console.error(error);
  return res.status(500).json({ message: "Please try again." });
}

// MongoDB ObjectIds use 24 hexadecimal characters.
function isId(value) {
  return /^[0-9a-fA-F]{24}$/.test(value || "");
}

// Wallets belong to one driver. Create an empty one if it does not exist.
// We still retry the lookup if another request creates it at the same time.
async function findWallet(userId) {
  let wallet = await Wallet.findOne({ userId: userId });
  if (!wallet) {
    try {
      wallet = await Wallet.create({ userId: userId, balanceCentavos: 0 });
    } catch (error) {
      wallet = await Wallet.findOne({ userId: userId });
    }
  }
  return wallet;
}

// POST /api/extra/me/photo
// Express passes req (request) and res (response) to this controller.
export async function uploadMyPhoto(req, res) {
  if (!req.file) return bad(res, "Choose a JPG or PNG profile photo.");
  const user = await User.findById(req.user._id);
  user.profilePhoto = req.file.filename;
  // .save() writes changes on this Mongoose document to MongoDB.
  await user.save();
  return res.json({ message: "Photo saved.", photo: "/extra/me/photo" });
}

// GET /api/extra/me/photo
// Express passes req (request) and res (response) to this controller.
export async function getMyPhoto(req, res) {
  if (!req.user.profilePhoto) return res.status(404).json({ message: "No profile photo." });
  return res.sendFile(path.basename(req.user.profilePhoto), { root: path.resolve("private-uploads") });
}

// DELETE /api/extra/me/photo
// Remove the photo reference. Existing user and booking data remain intact.
export async function removeMyPhoto(req, res) {
  const user = await User.findById(req.user._id);
  user.profilePhoto = "";
  await user.save();
  return res.json({ message: "Profile photo removed." });
}

// PATCH /api/extra/me/profile
// Express passes req (request) and res (response) to this controller.
export async function updateMyProfile(req, res) {
  // STEP 1: Look up the account identified by the verified JWT cookie.
  // This is safer than accepting someone else's userId from the browser.
  const user = await User.findById(req.user._id);

  // STEP 2: Change only fields that React actually submitted.
  // !== undefined means "the property was provided"; it also permits an
  // intentionally blank optional email, which Mongoose will validate.
  if (req.body.firstName !== undefined) {
    user.firstName = String(req.body.firstName).trim();
  }
  if (req.body.lastName !== undefined) {
    user.lastName = String(req.body.lastName).trim();
  }
  if (req.body.username !== undefined) {
    user.username = String(req.body.username).trim();
  }
  if (req.body.email !== undefined) {
    // An empty optional email should be omitted so multiple users can leave it blank.
    const linkedEmail = String(req.body.email).trim().toLowerCase();
    if (linkedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(linkedEmail)) {
      return bad(res, "Enter a valid linked email or leave it blank.");
    }
    user.email = linkedEmail || undefined;
  }

  // STEP 3: .save() validates the changed fields and writes them to MongoDB.
  try {
    await user.save();
  } catch (error) {
    return res.status(400).json({ message: "Check the name, email, or unique username." });
  }

  // STEP 4: Return safe account details to React so the page can update.
  return res.json({
    user: {
      id: String(user._id),
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      email: user.email,
      role: user.role,
    },
  });
}

// POST /api/extra/me/password
// Express passes req (request) and res (response) to this controller.
export async function changeMyPassword(req, res) {
  // The password values were sent in req.body by the React form.
  const oldPassword = String(req.body.oldPassword || "");
  const newPassword = String(req.body.newPassword || "");

  // Keep this simple validation so accidentally empty passwords cannot be saved.
  if (newPassword.length < 8 || newPassword.length > 72) {
    return bad(res, "New password must have 8–72 characters.");
  }

  // passwordHash is select:false in User.js, so ask Mongoose to include it.
  const user = await User.findById(req.user._id).select("+passwordHash");
  const passwordIsCorrect = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!passwordIsCorrect) {
    return res.status(401).json({ message: "Your current password is incorrect." });
  }

  // Never save the actual password. bcrypt.hash() creates a one-way hash.
  const newHash = await bcrypt.hash(newPassword, 10);
  user.passwordHash = newHash;
  await user.save();
  return res.json({ message: "Password updated." });
}

// POST /api/extra/me/deactivate
// Express passes req (request) and res (response) to this controller.
export async function deactivateMyAccount(req, res) {
  // STEP 1: Confirm that the user knows the current account password.
  const user = await User.findById(req.user._id).select("+passwordHash");
  const submittedPassword = String(req.body.password || "");
  const passwordIsCorrect = await bcrypt.compare(submittedPassword, user.passwordHash);
  if (!passwordIsCorrect) {
    return res.status(401).json({ message: "Incorrect account password." });
  }

  // STEP 2: Do not disable an account that has an unfinished delivery.
  // An $in filter means "status is any one of these values".
  const unfinished = ["pending", "accepted", "at_pickup", "picked_up", "arrived"];
  let activeBooking;
  if (user.role === "customer") {
    activeBooking = await Booking.exists({ customerId: user._id, status: { $in: unfinished } });
  } else {
    activeBooking = await Booking.exists({ driverId: user._id, status: { $in: unfinished } });
  }
  if (activeBooking) {
    return res.status(409).json({
      message: "Complete or resolve active bookings before deactivating your account.",
    });
  }

  // STEP 3: Change the account status, but keep its booking history and wallet.
  user.accountStatus = "disabled";
  await user.save();

  // STEP 4: Clear the signed session cookie, just as the logout action does.
  res.clearCookie("gasfar_session", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return res.json({ message: "Account deactivated. Please contact admin to reactivate it." });
}

// GET /api/extra/me/addresses
// Express passes req (request) and res (response) to this controller.
export function getSavedAddresses(req, res) {
  return res.json({ addresses: req.user.savedAddresses || [] });
}

// POST /api/extra/me/addresses
// Express passes req (request) and res (response) to this controller.
export async function addSavedAddress(req, res) {
  // STEP 1: Read individual values submitted by the address form in React.
  const label = req.body.label;
  const icon = req.body.icon;
  const lat = req.body.lat;
  const lng = req.body.lng;
  const address = req.body.address;

  // A location requires a name, an address, and numbers inside GPS bounds.
  if (!label || !address || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return bad(res, "Save a valid map location and label.");
  }
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return bad(res, "Save a valid map location and label.");
  }

  // STEP 2: Find the logged-in customer in MongoDB.
  const user = await User.findById(req.user._id);

  // STEP 3: Create one plain JavaScript object for the new saved address.
  const item = {
    id: randomUUID(),
    label: String(label).slice(0, 50),
    icon: icon === "work" ? "work" : "home",
    lat: lat,
    lng: lng,
    address: String(address).slice(0, 500),
  };

  // STEP 4: .push() appends the object to the user's savedAddresses array.
  // .save() writes the updated user document to MongoDB.
  user.savedAddresses.push(item);
  await user.save();

  // HTTP 201 means a new resource was created.
  return res.status(201).json({ address: item });
}

// PATCH /api/extra/me/addresses/:id
// Express passes req (request) and res (response) to this controller.
export async function editSavedAddress(req, res) {
  const user = await User.findById(req.user._id);
  const item = user.savedAddresses.find(x => x.id === req.params.id);
  if (!item) return res.status(404).json({ message: "Saved location not found." });
  if (req.body.label) item.label = String(req.body.label).slice(0, 50);
  if (req.body.address && Number.isFinite(req.body.lat) && Number.isFinite(req.body.lng)) {
    item.address = String(req.body.address).slice(0, 500);
    item.lat = req.body.lat; item.lng = req.body.lng;
  }
  if (req.body.icon) item.icon = req.body.icon === "work" ? "work" : "home";
  // .save() writes changes on this Mongoose document to MongoDB.
  await user.save();
  return res.json({ address: item });
}

// DELETE /api/extra/me/addresses/:id
// Express passes req (request) and res (response) to this controller.
export async function deleteSavedAddress(req, res) {
  const user = await User.findById(req.user._id);
  user.savedAddresses = user.savedAddresses.filter(x => x.id !== req.params.id);
  // .save() writes changes on this Mongoose document to MongoDB.
  await user.save();
  return res.json({ message: "Address removed." });
}

// GET /api/extra/wallet
// Express passes req (request) and res (response) to this controller.
export async function getMyWallet(req, res) {
  try {
    // requireAuth() put the logged-in user document in req.user.
    // findWallet() runs Wallet.findOne() and creates an empty record if needed.
    const wallet = await findWallet(req.user._id);

    // The driver wallet page receives this object through extraService.wallet().
    return res.json({ wallet: wallet });
  } catch (error) {
    return serverError(res, error);
  }
}

// POST /api/extra/wallet/request
// Express passes req (request) and res (response) to this controller.
export async function requestWalletChange(req, res) {
  try {
    // STEP 1: Read the form data sent by React.
    const kind = req.body.kind;
    const amountPesos = Number(req.body.amount);
    const account = String(req.body.account || "").slice(0, 100);

    // STEP 2: Validate the request before writing anything to MongoDB.
    const allowedKinds = ["topup", "withdrawal"];
    if (!allowedKinds.includes(kind)) {
      return bad(res, "Choose a valid request of ₱50–₱50,000.");
    }
    if (!Number.isFinite(amountPesos) || amountPesos < 50 || amountPesos > 50000) {
      return bad(res, "Choose a valid request of ₱50–₱50,000.");
    }

    // We save integer centavos, not floating-point pesos: ₱100 -> 10000.
    const amountCentavos = Math.round(amountPesos * 100);
    const wallet = await findWallet(req.user._id);
    if (kind === "withdrawal" && wallet.balanceCentavos < amountCentavos) {
      return bad(res, "Insufficient wallet balance.");
    }

    // STEP 3: Make a REQUEST object. This does not move money by itself.
    const request = {
      kind: kind,
      amountCentavos: amountCentavos,
      account: account,
      status: "pending",
    };
    wallet.requests.push(request); // Add one entry to the existing requests array.
    await wallet.save();           // Save the new request in MongoDB.

    // STEP 4: Tell React that an admin review is required.
    return res.status(201).json({
      message: "Request submitted for admin review. No real payment was made.",
      wallet: wallet,
    });
  } catch (error) {
    return serverError(res, error);
  }
}

// GET /api/extra/me/credit
// Express passes req (request) and res (response) to this controller.
export function getMyCredit(req, res) {
  return res.json({ creditCentavos: req.user.creditCentavos || 0 });
}

// GET /api/extra/driver/profile
// Express passes req (request) and res (response) to this controller.
export async function getDriverProfile(req, res) {
  const profile = await DriverProfile.findOne({ userId: req.user._id });
  return res.json({ profile });
}

// POST /api/extra/driver/renewal
// Express passes req (request) and res (response) to this controller.
export async function submitDriverRenewal(req, res) {
  try {
    const profile = await DriverProfile.findOne({ userId: req.user._id });
    if (!profile) return res.status(404).json({ message: "Driver profile not found." });
    if (profile.renewal && profile.renewal.status === "pending") return bad(res, "Your previous request is still pending.");
    const docs = {};
    for (const field of ["license", "or", "cr", "backplate"]) {
      if (req.files && req.files[field]) docs[field] = req.files[field][0].filename;
    }
    if (Object.keys(docs).length === 0 && !req.body.vehicleType && !req.body.plateNumber) return bad(res, "Provide a document or vehicle change.");
    const types = ["motorcycle", "sedan", "suv", "pickup", "l300"];
    if (req.body.vehicleType && !types.includes(req.body.vehicleType)) return bad(res, "Invalid vehicle type.");
    const renewal = { status: "pending", requestedAt: new Date(), documents: docs, reason: String(req.body.reason || "").slice(0, 300) };
    if (req.body.vehicleType) renewal.vehicleType = req.body.vehicleType;
    if (req.body.plateNumber) renewal.plateNumber = String(req.body.plateNumber).trim().slice(0, 20);
    for (const field of ["licenseExpiresAt", "orExpiresAt", "crExpiresAt"]) {
      if (req.body[field]) {
        const expiry = new Date(req.body[field]);
        if (Number.isNaN(expiry.getTime())) return bad(res, "Invalid expiry date.");
        renewal[field] = expiry;
      }
    }
    profile.renewal = renewal;
    // If the registered vehicle changes, driver must wait for admin approval.
    if (renewal.vehicleType || renewal.plateNumber) profile.isOnline = false;
    // .save() persists the new profile/renewal data in MongoDB.
    await profile.save();
    return res.json({ message: "Document/vehicle update submitted for administrator approval.", profile });
  } catch (error) { return serverError(res, error); }
}

// GET /api/extra/admin/fee-reviews/:id/proof
// Express passes req (request) and res (response) to this controller.
export async function readFeeWaiverProof(req, res) {
  const booking = await Booking.findOne({ bookingCode: req.params.id });
  if (!booking || !booking.feeWaiver || !booking.feeWaiver.proof) return res.status(404).json({ message: "No proof uploaded." });
  return res.sendFile(path.basename(booking.feeWaiver.proof), { root: path.resolve("private-uploads") });
}

// GET /api/extra/admin/drivers/:id/renewal-docs/:field
// Express passes req (request) and res (response) to this controller.
export async function readRenewalDocument(req, res) {
  const field = req.params.field;
  if (!["license", "or", "cr", "backplate"].includes(field) || !isId(req.params.id)) return bad(res, "Invalid document request.");
  const profile = await DriverProfile.findOne({ userId: req.params.id });
  const file = profile && profile.renewal && profile.renewal.documents && profile.renewal.documents[field];
  if (!file) return res.status(404).json({ message: "No renewal document." });
  return res.sendFile(path.basename(file), { root: path.resolve("private-uploads") });
}

// GET /api/extra/admin/incidents
// Express passes req (request) and res (response) to this controller.
export async function getOpenIncidents(req, res) {
  const bookings = await Booking.find({ "deliveryIssue.status": "open" });
  return res.json({ incidents: bookings.map(b => ({ id: b.bookingCode, customer: b.customerName, driver: b.driver?.name, reason: b.deliveryIssue.reason })) });
}

// PATCH /api/extra/admin/incidents/:id
// Express passes req (request) and res (response) to this controller.
export async function resolveIncident(req, res) {
  const booking = await Booking.findOne({ bookingCode: req.params.id, "deliveryIssue.status": "open" });
  if (!booking) return res.status(404).json({ message: "Open incident not found." });
  booking.deliveryIssue.status = "resolved";
  // Save the updated booking document to MongoDB.
  await booking.save();
  return res.json({ message: "Incident marked resolved. Resolve package handover separately." });
}

// GET /api/extra/admin/cash-refunds
// Express passes req (request) and res (response) to this controller.
export async function getPendingCashRefunds(req, res) {
  const bookings = await Booking.find({ cashRefundStatus: "pending" });
  return res.json({ refunds: bookings.map(b => ({ id: b.bookingCode, customer: b.customerName, amount: b.pricing.feeCentavos - b.creditAppliedCentavos })) });
}

// PATCH /api/extra/admin/cash-refunds/:id
// Express passes req (request) and res (response) to this controller.
export async function acknowledgeCashRefund(req, res) {
  const booking = await Booking.findOne({ bookingCode: req.params.id, cashRefundStatus: "pending" });
  if (!booking) return res.status(404).json({ message: "Refund record not found." });
  booking.cashRefundStatus = "acknowledged";
  // Save the updated booking document to MongoDB.
  await booking.save();
  return res.json({ message: "Manual refund marked acknowledged (no money was transferred)." });
}

// GET /api/extra/admin/users
// Express passes req (request) and res (response) to this controller.
export async function getAdminCustomers(req, res) {
  try {
    // Read the newest 1000 customer accounts. sort({createdAt:-1}) = newest first.
    const users = await User.find({ role: "customer" })
      .sort({ createdAt: -1 })
      .limit(1000);

    // Build a plain JSON-friendly array, excluding password hashes.
    const results = [];
    for (const user of users) {
      results.push({
        id: String(user._id),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        accountStatus: user.accountStatus,
        creditCentavos: user.creditCentavos || 0,
      });
    }
    return res.json({ users: results });
  } catch (error) {
    return serverError(res, error);
  }
}

// PATCH /api/extra/admin/users/:id/status
// Express passes req (request) and res (response) to this controller.
export async function changeAccountStatus(req, res) {
  if (!isId(req.params.id) || !["active", "disabled", "suspended"].includes(req.body.status)) return bad(res, "Invalid account status.");
  const user = await User.findOne({ _id: req.params.id, role: { $in: ["customer", "driver"] } });
  if (!user) return res.status(404).json({ message: "Account not found." });
  user.accountStatus = req.body.status;
  // .save() writes changes on this Mongoose document to MongoDB.
  await user.save();
  return res.json({ message: "Account updated.", user: { id: String(user._id), accountStatus: user.accountStatus } });
}

// GET /api/extra/admin/drivers
// Express passes req (request) and res (response) to this controller.
export async function getAdminDrivers(req, res) {
  try {
    const profiles = await DriverProfile.find().populate("userId", "firstName lastName phone email username accountStatus");
    const bookings = await Booking.find({ status: "delivered", "review.rating": { $exists: true } });
    return res.json({ profiles, reviews: bookings.map(b => ({ driverId: String(b.driverId), customerName: b.customerName, rating: b.review.rating, comment: b.review.comment, bookingCode: b.bookingCode })) });
  } catch (error) { return serverError(res, error); }
}

// PATCH /api/extra/admin/drivers/:id/renewal
// Express passes req (request) and res (response) to this controller.
export async function decideDriverRenewal(req, res) {
  if (!isId(req.params.id) || !["approved", "rejected"].includes(req.body.status)) return bad(res, "Choose approved or rejected.");
  const profile = await DriverProfile.findOne({ userId: req.params.id });
  if (!profile || !profile.renewal || profile.renewal.status !== "pending") return res.status(404).json({ message: "No pending request." });
  if (req.body.status === "approved") {
    const renewal = profile.renewal;
    if (renewal.vehicleType) profile.vehicle.type = renewal.vehicleType;
    if (renewal.plateNumber) profile.vehicle.plateNumber = renewal.plateNumber;
    for (const field of ["license", "or", "cr", "backplate"]) {
      if (renewal.documents && renewal.documents[field]) profile.documents[field] = renewal.documents[field];
    }
    for (const field of ["licenseExpiresAt", "orExpiresAt", "crExpiresAt"]) {
      if (renewal[field]) profile[field] = renewal[field];
    }
  }
  profile.renewal.status = req.body.status;
  // .save() persists the new profile/renewal data in MongoDB.
  await profile.save();
  return res.json({ message: "Driver renewal " + req.body.status + "." });
}

// GET /api/extra/admin/fee-reviews
// Express passes req (request) and res (response) to this controller.
export async function getFeeWaiverRequests(req, res) {
  // The admin can review PENDING requests and see already-decided requests.
  // Empty/none requests are excluded because nobody asked for a waiver.
  const bookings = await Booking.find({ "feeWaiver.status": { $in: ["pending", "approved", "rejected"] } }).sort({ createdAt: -1 });
  const reviews = [];
  for (const booking of bookings) {
    reviews.push({
      id: booking.bookingCode,
      driverName: booking.driver ? booking.driver.name : "Driver",
      reason: booking.feeWaiver.reason,
      feeCentavos: booking.cancellationFeeCentavos,
      status: booking.feeWaiver.status,
      requestedAt: booking.feeWaiver.requestedAt,
      reviewerName: booking.feeWaiver.reviewerName || "",
    });
  }
  return res.json({ reviews: reviews });
}

// PATCH /api/extra/admin/fee-reviews/:id
// Express passes req (request) and res (response) to this controller.
export async function decideFeeWaiver(req, res) {
  if (!["approved", "rejected"].includes(req.body.status)) return bad(res, "Invalid review decision.");
  // SPECIAL CASE: One MongoDB operation checks pending AND changes the request.
  // Two admins must not approve the exact same waiver at the same time.
  const booking = await Booking.findOneAndUpdate(
    { bookingCode: req.params.id, "feeWaiver.status": "pending" },
    { $set: { "feeWaiver.status": req.body.status, "feeWaiver.resolvedAt": new Date(),
      "feeWaiver.reviewedBy": req.user._id,
      "feeWaiver.reviewerName": req.user.firstName + " " + req.user.lastName } },
    { new: true }
  );
  if (!booking) return res.status(409).json({ message: "Request already decided." });
  if (req.body.status === "approved" && booking.cancellationFeeCentavos > 0) {
    // Refund the driver's cancellation fee as a wallet adjustment.
    // Previous customer promotional credit is NOT removed if already spent.
    const wallet = await findWallet(booking.driverId);
    wallet.balanceCentavos += booking.cancellationFeeCentavos;
    wallet.transactions.push({ kind: "refund", amountCentavos: booking.cancellationFeeCentavos, bookingCode: booking.bookingCode, label: "Cancellation fee waived" });
    // .save() stores the updated balance or request history.
    await wallet.save();
  }
  return res.json({ message: "Fee waiver " + req.body.status + "." });
}

// GET /api/extra/admin/wallet-requests
// Express passes req (request) and res (response) to this controller.
export async function getWalletRequests(req, res) {
  // .populate() replaces the userId reference with chosen User fields for admins.
  const wallets = await Wallet.find().populate("userId", "firstName lastName phone");
  const requests = [];

  // Loop through wallets, then each wallet's embedded requests array.
  for (const wallet of wallets) {
    for (const request of wallet.requests) {
      if (request.status === "pending") {
        requests.push({
          id: String(request._id),
          walletId: String(wallet._id),
          driver: wallet.userId,
          kind: request.kind,
          amountCentavos: request.amountCentavos,
          account: request.account,
        });
      }
    }
  }
  return res.json({ requests: requests });
}

// PATCH /api/extra/admin/wallet-requests/:walletId/:id
// Express passes req (request) and res (response) to this controller.
export async function decideWalletRequest(req, res) {
  // STEP 1: Read the admin's choice from req.body and identifiers from the URL.
  const decision = req.body.status;
  const walletId = req.params.walletId;
  const requestId = req.params.id;

  if (!["approved", "rejected"].includes(decision)) {
    return bad(res, "Invalid request.");
  }
  if (!isId(walletId) || !isId(requestId)) {
    return bad(res, "Invalid request.");
  }

  // STEP 2: SPECIAL ATOMIC QUERY — explained because this is more advanced.
  // MongoDB will BOTH find a pending embedded request AND change its status
  // as one operation; two admins cannot both claim that same pending status.
  //
  // First argument (FILTER): wallet ID, and an array entry with ID + pending.
  //   $elemMatch = find an array item where BOTH conditions match.
  // Second argument (UPDATE): $set changes one value.
  //   requests.$.status = status of the matching array item only.
  // Third argument (OPTIONS): new:true returns the updated wallet.
  const wallet = await Wallet.findOneAndUpdate(
    {
      _id: walletId,
      requests: { $elemMatch: { _id: requestId, status: "pending" } },
    },
    { $set: { "requests.$.status": decision } },
    { new: true }
  );

  if (!wallet) {
    return res.status(409).json({ message: "Request was already handled." });
  }

  // STEP 3: Read the request from the embedded Mongoose document array.
  // .id() is a Mongoose shortcut that finds one subdocument by its _id.
  const request = wallet.requests.id(requestId);

  // On an approved top-up record, ADD centavos; on a withdrawal, SUBTRACT.
  // These are internal demo ledger changes, NOT real GCash/bank transfers.
  if (decision === "approved") {
    let amount = request.amountCentavos;
    if (request.kind === "withdrawal") {
      amount = -request.amountCentavos;
    }

    wallet.balanceCentavos = wallet.balanceCentavos + amount;
    wallet.transactions.push({
      kind: request.kind,
      amountCentavos: amount,
      label: "Admin-approved " + request.kind + " (record only)",
    });
    await wallet.save();
  }

  // STEP 4: Give React a confirmation message.
  return res.json({
    message: "Wallet request " + decision + ". No actual transfer was performed.",
  });
}

// GET /api/extra/admin/deliveries
// Express passes req (request) and res (response) to this controller.
export async function getAdminDeliveries(req, res) {
  // Get up to 1000 newest bookings for administrator reporting.
  const bookings = await Booking.find().sort({ createdAt: -1 }).limit(1000);
  const results = [];

  // Build the same plain objects the admin DeliveriesPage already expects.
  for (const booking of bookings) {
    let driverName = null;
    if (booking.driver) {
      driverName = booking.driver.name;
    }

    let rating = null;
    if (booking.review) {
      rating = booking.review.rating;
    }

    results.push({
      id: booking.bookingCode,
      status: booking.status,
      customer: booking.customerName,
      driver: driverName,
      vehicle: booking.vehicleType,
      price: booking.pricing.feeCentavos / 100,
      paymentMethod: booking.payment.method,
      paymentStatus: booking.payment.status,
      createdAt: booking.createdAt,
      deliveredAt: booking.deliveredAt,
      cancelledAt: booking.cancelledAt,
      cashCollectedAt: booking.cashCollectedAt,
      review: rating,
    });
  }
  return res.json({ bookings: results });
}

// GET /api/extra/admin/stats
// Express passes req (request) and res (response) to this controller.
export async function getAdminStatistics(req, res) {
  // Find every booking and count our user roles, just like simple CRUD queries.
  const bookings = await Booking.find();
  const customerCount = await User.countDocuments({ role: "customer" });
  const driverCount = await User.countDocuments({ role: "driver" });

  const stats = {
    total: bookings.length,
    completed: 0,
    cancelled: 0,
    ongoing: 0,
    grossCentavos: 0,
    commissionCentavos: 0,
    drivers: driverCount,
    users: customerCount,
    monthly: {},
  };

  // A for...of loop reads each booking individually; easier to trace in a debugger.
  for (const booking of bookings) {
    let yearMonth = "unknown";
    if (booking.createdAt) {
      yearMonth = booking.createdAt.toISOString().slice(0, 7);
    }

    // Make the month's counters the first time we encounter that month.
    if (!stats.monthly[yearMonth]) {
      stats.monthly[yearMonth] = { completed: 0, cancelled: 0, ongoing: 0 };
    }

    if (booking.status === "delivered") {
      stats.completed = stats.completed + 1;
      stats.monthly[yearMonth].completed += 1;
      stats.grossCentavos += booking.pricing.feeCentavos;
      stats.commissionCentavos += Math.round(booking.pricing.feeCentavos * 0.15);
    } else if (booking.status === "cancelled") {
      stats.cancelled = stats.cancelled + 1;
      stats.monthly[yearMonth].cancelled += 1;
    } else {
      stats.ongoing = stats.ongoing + 1;
      stats.monthly[yearMonth].ongoing += 1;
    }
  }
  return res.json({ stats: stats });
}

// PATCH /api/extra/admin/bookings/:id/confirm-payment
// Express passes req (request) and res (response) to this controller.
export async function confirmExternalPayment(req, res) {
  // This endpoint only RECORDS a payment verified OUTSIDE GASFAR.
  // It does not charge a payment account and must be used by an admin.
  const booking = await Booking.findOne({
    bookingCode: req.params.id,
    status: "delivered",
  });
  if (!booking || booking.payment.method === "cash") {
    return bad(res, "Select a delivered online-payment booking.");
  }

  // Mark the booking paid only if it was not already paid.
  if (booking.payment.status !== "paid") {
    booking.payment.status = "paid";
    await booking.save();
  }

  // Settle the driver's INTERNAL ledger after the external payment is recorded.
  await settleWallet(booking);
  return res.json({
    message: "External payment recorded; driver earnings ledger updated.",
  });
}


// ========================= ADMIN MODERATORS =========================
// These accounts are ordinary User documents, not a new collection.
// Only the super admin can create or disable other administrator accounts.
export async function getModeratorAccounts(req, res) {
  const admins = await User.find({ role: "admin" }).sort({ createdAt: -1 });
  const moderators = [];
  for (const admin of admins) {
    moderators.push({
      id: String(admin._id),
      firstName: admin.firstName,
      lastName: admin.lastName,
      username: admin.username,
      phone: admin.phone,
      adminRole: admin.adminRole || "super_admin",
      accountStatus: admin.accountStatus,
    });
  }
  return res.json({ moderators: moderators });
}

export async function createModeratorAccount(req, res) {
  // A moderator signs in with exactly the same username/password form as others.
  const firstName = String(req.body.firstName || "").trim();
  const lastName = String(req.body.lastName || "").trim();
  const username = String(req.body.username || "").trim().toLowerCase();
  const phone = String(req.body.phone || "").trim();
  const password = String(req.body.password || "");
  const adminRole = req.body.adminRole;

  if (!firstName || !lastName || !/^[a-z0-9_.-]{8,30}$/.test(username)) {
    return bad(res, "Enter both names and a username of 8 to 30 characters.");
  }
  if (!/^\+639\d{9}$/.test(phone)) return bad(res, "Use a phone number such as +639171234567.");
  if (password.length < 8 || Buffer.byteLength(password) > 72) return bad(res, "Password must be 8 to 72 bytes.");
  if (!["fee_moderator", "driver_moderator", "user_moderator"].includes(adminRole)) {
    return bad(res, "Choose one of the three moderator roles.");
  }
  const existing = await User.findOne({ $or: [{ username: username }, { phone: phone }] });
  if (existing) return res.status(409).json({ message: "Username or phone is already registered." });

  // bcrypt.hash does NOT store the actual password. As in regular signup,
  // the original password is only used to generate a safe one-way hash.
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const admin = await User.create({
      firstName, lastName, username, phone, passwordHash,
      role: "admin", adminRole: adminRole, accountStatus: "active",
    });
    return res.status(201).json({ message: "Moderator created.", id: String(admin._id) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "Username or phone already exists." });
    return serverError(res, error);
  }
}

export async function setModeratorStatus(req, res) {
  if (!isId(req.params.id)) return bad(res, "Invalid account ID.");
  if (!["active", "disabled"].includes(req.body.status)) return bad(res, "Choose active or disabled.");
  const moderator = await User.findOne({ _id: req.params.id, role: "admin" });
  if (!moderator) return res.status(404).json({ message: "Moderator not found." });
  if (!moderator.adminRole || moderator.adminRole === "super_admin") {
    return res.status(403).json({ message: "Super administrator accounts cannot be disabled here." });
  }
  moderator.accountStatus = req.body.status;
  await moderator.save();
  return res.json({ message: "Moderator account updated." });
}

// ========================= ADMIN ATTENTION CENTRE =========================
// Rather than invent notification records, we derive CURRENT work from the
// existing bookings, profiles and wallets. A new request automatically shows up.
export async function getAdminAttention(req, res) {
  const role = req.user.adminRole || "super_admin";
  const canDrivers = role === "super_admin" || role === "driver_moderator";
  const canFees = role === "super_admin" || role === "fee_moderator";
  const items = [];

  if (canDrivers) {
    const profiles = await DriverProfile.find().populate("userId", "firstName lastName");
    const weekFromNow = Date.now() + 7 * 24 * 60 * 60 * 1000;
    for (const profile of profiles) {
      const driverName = profile.userId ? profile.userId.firstName + " " + profile.userId.lastName : "Driver";
      const id = profile.userId ? String(profile.userId._id) : "";
      if (profile.verificationStatus === "pending") {
        items.push({ id: "application:" + id, title: "Driver application pending", detail: driverName, to: "/admin/drivers?focus=" + id });
      }
      if (profile.renewal && profile.renewal.status === "pending") {
        items.push({ id: "renewal:" + id, title: "Driver document renewal", detail: driverName, to: "/admin/drivers?focus=" + id });
      }
      for (const field of ["licenseExpiresAt", "orExpiresAt"]) {
        const date = profile[field];
        if (date && date.getTime() <= weekFromNow) {
          items.push({ id: "expiry:" + id + ":" + field + ":" + date.toISOString().slice(0,10), title: "Driver document expiring", detail: driverName + " — " + field, to: "/admin/drivers?focus=" + id });
        }
      }
    }
  }

  if (canFees) {
    const reviews = await Booking.find({ "feeWaiver.status": "pending" });
    for (const booking of reviews) {
      items.push({ id: "fee:" + booking.bookingCode, title: "Fee waiver review", detail: booking.bookingCode, to: "/admin/fee-reviews?focus=" + encodeURIComponent(booking.bookingCode) });
    }
    const wallets = await Wallet.find();
    for (const wallet of wallets) {
      for (const request of wallet.requests) {
        if (request.status === "pending") {
          items.push({ id: "wallet:" + request._id, title: "Wallet request", detail: request.kind, to: "/admin/fee-reviews" });
        }
      }
    }
  }

  const readIds = req.user.readAdminNotifications || [];
  for (const item of items) item.read = readIds.includes(item.id);
  return res.json({ items: items.slice(0, 150) });
}

// Save a small list of read notification IDs on the logged-in admin User.
export async function markAdminAttentionRead(req, res) {
  const id = String(req.body.id || "").slice(0, 180);
  if (!id) return bad(res, "Choose a notification.");
  const admin = await User.findById(req.user._id);
  const previous = admin.readAdminNotifications || [];
  if (!previous.includes(id)) previous.push(id);
  admin.readAdminNotifications = previous.slice(-250);
  await admin.save();
  return res.json({ message: "Notification read." });
}
