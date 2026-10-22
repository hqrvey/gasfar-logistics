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

    // A driver account must also have an approved driver profile.
    if (user.role === "driver") {
      const profile = await DriverProfile.findOne({ userId: user._id });
      if (!profile || profile.verificationStatus !== "approved") {
        return res.status(403).json({ message: "Driver account is not approved." });
      }
    }

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
