import { apiRequest } from "./api.js";

// One REST API service is shared by customer, driver and admin pages.
// Authentication is handled by the secure session cookie in apiRequest().
export const bookingService = {
  async list() {
    const result = await apiRequest("/bookings");
    return result.bookings;
  },
  create(details) {
    return apiRequest("/bookings", { method: "POST", body: JSON.stringify(details) });
  },
  accept(id) {
    return apiRequest(`/bookings/${encodeURIComponent(id)}/accept`, { method: "PATCH" });
  },
  decline(id) {
    return apiRequest(`/bookings/${encodeURIComponent(id)}/decline`, { method: "PATCH" });
  },
  changeStatus(id, status) {
    return apiRequest(`/bookings/${encodeURIComponent(id)}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
  },
  verifyDelivery(id, pin) {
    return apiRequest(`/bookings/${encodeURIComponent(id)}/verify-delivery`, { method: "POST", body: JSON.stringify({ pin }) });
  },
  resendPin(id) {
    return apiRequest(`/bookings/${encodeURIComponent(id)}/resend-pin`, { method: "POST" });
  },
  cancel(id, reason) {
    return apiRequest(`/bookings/${encodeURIComponent(id)}/cancel`, { method: "PATCH", body: JSON.stringify({ reason }) });
  },
  updateLocation(id, coords) {
    return apiRequest(`/bookings/${encodeURIComponent(id)}/location`, { method: "PATCH", body: JSON.stringify(coords) });
  },
};
