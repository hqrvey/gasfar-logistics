import jwt from "jsonwebtoken";
import User from "../models/User.js";
import DriverProfile from "../models/DriverProfile.js";

export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.gasfar_session;
    if (!token) return res.status(401).json({ message: "Please log in." });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.purpose !== "session") return res.status(401).json({ message: "Invalid session." });
    const user = await User.findById(payload.userId);
    if (!user || user.accountStatus !== "active") return res.status(401).json({ message: "Session no longer valid." });
    if (user.role === "driver") {
      const profile = await DriverProfile.findOne({ userId: user._id });
      if (!profile || profile.verificationStatus !== "approved") {
        return res.status(403).json({ message: "Driver account is not approved." });
      }
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: "Please log in again." });
  }
}

export function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ message: "You do not have permission." });
    next();
  };
}
