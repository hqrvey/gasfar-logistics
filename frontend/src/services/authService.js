import { apiRequest } from "./api.js";

export const authService = {
  sendCode(phone) {
    return apiRequest("/auth/send-code", { method: "POST", body: JSON.stringify({ phone }) });
  },
  verifyCode(phone, code) {
    return apiRequest("/auth/verify-code", { method: "POST", body: JSON.stringify({ phone, code }) });
  },
  register(details, documents) {
    if (details.role === "driver") {
      const data = new FormData();
      Object.entries(details).forEach(([key, value]) => data.append(key, String(value ?? "")));
      Object.entries(documents).forEach(([key, file]) => {
        if (file) data.append(key, file);
      });
      return apiRequest("/auth/register", { method: "POST", body: data });
    }
    return apiRequest("/auth/register", { method: "POST", body: JSON.stringify(details) });
  },
  login(identifier, password, remember) {
    return apiRequest("/auth/login", {
      method: "POST", body: JSON.stringify({ identifier, password, remember }),
    });
  },
  me() { return apiRequest("/auth/me"); },
  logout() { return apiRequest("/auth/logout", { method: "POST" }); },
};
