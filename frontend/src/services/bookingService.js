// BOOKING SERVICE: The ONLY place React pages need to know booking API URLs.
// There is no direct MongoDB connection in React; all data travels through Express.
import { apiRequest } from "./api.js";

// Encode booking codes safely before putting them into a URL.
function bookingUrl(id) {
  return `/bookings/${encodeURIComponent(id)}`;
}

// Object groups booking REST actions for both customer and driver pages.
export const bookingService = {
  // GET /api/bookings -> controller getBookings() -> MongoDB -> bookings[]
  async list() {
    const result = await apiRequest("/bookings");
    return result.bookings; // useBookings() saves this array into React state.
  },

  // POST /api/bookings -> controller createBooking() -> new MongoDB document.
  create(details) {
    return apiRequest("/bookings", {
      method: "POST",
      body: JSON.stringify(details), // JS object -> JSON string for Express.
    });
  },

  // PATCH means change ONE existing booking, not create a new one.
  accept(id) {
    return apiRequest(`${bookingUrl(id)}/accept`, { method: "PATCH" });
  },
  decline(id) {
    return apiRequest(`${bookingUrl(id)}/decline`, { method: "PATCH" });
  },

  // Used for: accepted -> at_pickup -> picked_up -> arrived.
  changeStatus(id, status) {
    return apiRequest(`${bookingUrl(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  // Only this endpoint can change "arrived" to "delivered" after PIN verification.
  verifyDelivery(id, pin) {
    return apiRequest(`${bookingUrl(id)}/verify-delivery`, {
      method: "POST",
      body: JSON.stringify({ pin }),
    });
  },

  // Ask Express/TextBee to send the recipient a NEW delivery PIN.
  resendPin(id) {
    return apiRequest(`${bookingUrl(id)}/resend-pin`, { method: "POST" });
  },

  // Backend decides whether this role and delivery stage allow cancellation.
  cancel(id, reason) {
    return apiRequest(`${bookingUrl(id)}/cancel`, {
      method: "PATCH",
      body: JSON.stringify({ reason }),
    });
  },

  // Driver GPS -> Express -> MongoDB. Customer retrieves it with list().
  updateLocation(id, coords) {
    return apiRequest(`${bookingUrl(id)}/location`, {
      method: "PATCH",
      body: JSON.stringify(coords), // { lat: ..., lng: ... }
    });
  },
};
