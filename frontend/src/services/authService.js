// AUTH SERVICE: React calls Express's /api/auth/... endpoints through apiRequest().
import { apiRequest } from "./api.js";

export const authService = {
  // Step 1 of registration: ask the backend/TextBee to send an SMS OTP.
  sendCode(phone) {
    return apiRequest("/auth/send-code", {
      method: "POST",
      body: JSON.stringify({ phone }),
    });
  },

  // Step 2: verify the code. Express returns a temporary verificationToken.
  verifyCode(phone, code) {
    return apiRequest("/auth/verify-code", {
      method: "POST",
      body: JSON.stringify({ phone, code }),
    });
  },

  // Step 3: Create a MongoDB User; driver signup also creates DriverProfile.
  register(details, documents) {
    if (details.role === "driver") {
      // Driver forms include files, so use FormData (multipart/form-data).
      const data = new FormData();
      for (const [name, value] of Object.entries(details)) {
        data.append(name, String(value ?? ""));
      }
      for (const [name, file] of Object.entries(documents)) {
        if (file) data.append(name, file);
      }
      return apiRequest("/auth/register", { method: "POST", body: data });
    }

    // Customers submit ordinary JSON because there are no required document uploads.
    return apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify(details),
    });
  },

  // Login gives us a browser HttpOnly session cookie + safe user JSON.
  login(identifier, password, remember) {
    return apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password, remember }),
    });
  },

  // Check a previously saved cookie when React is refreshed.
  me() {
    return apiRequest("/auth/me");
  },

  // Tell Express to remove the login cookie.
  logout() {
    return apiRequest("/auth/logout", { method: "POST" });
  },
};
