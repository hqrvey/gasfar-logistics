/*
  AUTH MIDDLEWARE

  Middleware runs BEFORE a controller. It is a function with three parameters:
    req  = data about the incoming HTTP request
    res  = object used to send an HTTP response
    next = function that passes the request forward

  Login sets a signed cookie called gasfar_session. requireAuth reads it and
  finds the REAL account in MongoDB, then adds that account to req.user.
*/
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import DriverProfile from "../models/DriverProfile.js";

export async function requireAuth(req, res, next) {
  try {
    // cookieParser() in server.js created req.cookies.
    const token = req.cookies && req.cookies.gasfar_session;
    if (!token) return res.status(401).json({ message: "Please log in." });

    // jwt.verify checks the signature and the expiration date of the token.
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.purpose !== "session") {
      return res.status(401).json({ message: "Invalid session." });
    }

    // Do not trust a role sent by React; retrieve the user's true role from DB.
    const user = await User.findById(payload.userId);
    if (!user || user.accountStatus !== "active") {
      return res.status(401).json({ message: "Session no longer valid." });
    }

    // Drivers can sign in and read their verification status, even if pending.
    // Only requireApprovedDriver permits delivery-changing requests.

    req.user = user; // Now controllers can read req.user._id and req.user.role.
    next(); // Run the next middleware or the controller.
  } catch (error) {
    return res.status(401).json({ message: "Please log in again." });
  }
}

// Example: allowRoles("driver") allows only drivers to accept deliveries.
// ...roles means "collect arguments in an array"; called a REST PARAMETER.
export function allowRoles(...roles) {
  // Return a middleware function configured with the allowed roles.
  return function (req, res, next) {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "You do not have permission." });
    }
    next();
  };
}

// Used ONLY on routes that a driver must be approved to perform.
export async function requireApprovedDriver(req, res, next) {
  if (req.user.role !== "driver") return next();
  try {
    const profile = await DriverProfile.findOne({ userId: req.user._id });
    if (!profile || profile.verificationStatus !== "approved") return res.status(403).json({ message: "Driver approval is required for deliveries." });
    for (const date of [profile.licenseExpiresAt, profile.orExpiresAt]) {
      if (date && date.getTime() < Date.now()) return res.status(403).json({ message: "Renew expired driver documents before accepting work." });
    }
    next();
  } catch (error) { return res.status(500).json({ message: "Could not check driver approval." }); }
}


// Moderator permissions: Express checks these on EVERY protected request.
// React hiding a button is useful for navigation, but is NOT authorization.
export function allowAdminSections(...sections) {
  return function (req, res, next) {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Administrator access required." });
    }

    // Existing admins created before this change have no adminRole field.
    // Treat those trusted admin accounts as super admins for compatibility.
    const adminRole = req.user.adminRole || "super_admin";
    if (adminRole === "super_admin") return next();

    const allowed = {
      user_moderator: ["users"],
      driver_moderator: ["drivers"],
      fee_moderator: ["fees"],
    };
    const roleSections = allowed[adminRole] || [];
    const permitted = sections.some(section => roleSections.includes(section));
    if (!permitted) {
      return res.status(403).json({ message: "Your moderator role does not allow this action." });
    }
    next();
  };
}

// This middleware is used for the Moderator Accounts screen only.
export function requireSuperAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Administrator access required." });
  }
  if (req.user.adminRole && req.user.adminRole !== "super_admin") {
    return res.status(403).json({ message: "Super administrator access required." });
  }
  next();
}
