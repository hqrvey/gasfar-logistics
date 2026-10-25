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

  // GET /api/bookings/history -> Express returns only this user's past bookings.
  // It works for customer AND driver because the backend checks the login cookie.
  async history() {
    const result = await apiRequest("/bookings/history");
    return result.bookings;
  },

  // POST /api/bookings/:id/review -> save the customer's stars in MongoDB.
  review(id, rating, comment) {
    return apiRequest(`${bookingUrl(id)}/review`, {
      method: "POST",
      body: JSON.stringify({ rating: rating, comment: comment }),
    });
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

  // Extra steps keep the existing delivery status names and maps working.
  startPickup(id) {
    // PATCH tells Express to change the booking's existing journey state.
    return apiRequest(`${bookingUrl(id)}/start-pickup`, { method: "PATCH" });
  },

  collectCash(id) {
    // The driver confirms that they collected money from the assigned payer.
    return apiRequest(`${bookingUrl(id)}/collect-cash`, { method: "PATCH" });
  },
  requestFeeWaiver(id, reason, proof) {
    // JSON for text-only requests; FormData when the driver attaches a photo.
    if (proof) {
      // When there is a file, send multipart FormData instead of JSON.
      const form = new FormData();
      form.append("reason", reason);
      form.append("proof", proof);
      return apiRequest(`${bookingUrl(id)}/fee-waiver`, { method: "POST", body: form });
    }
    // Without a proof image, a normal JSON request is enough.
    return apiRequest(`${bookingUrl(id)}/fee-waiver`, {
      method: "POST",
      body: JSON.stringify({ reason: reason }),
    });
  },
  reportIssue(id, reason) {
    // An emergency/incident report does not automatically cancel a collected parcel.
    return apiRequest(`${bookingUrl(id)}/issue`, {
      method: "POST",
      body: JSON.stringify({ reason: reason }),
    });
  },
  attachPhoto(id, file) {
    const form = new FormData();
    form.append("photo", file);
    return apiRequest(`${bookingUrl(id)}/item-photo`, { method: "POST", body: form });
  },

  // Driver GPS -> Express -> MongoDB. Customer retrieves it with list().
  updateLocation(id, coords) {
    return apiRequest(`${bookingUrl(id)}/location`, {
      method: "PATCH",
      body: JSON.stringify(coords), // { lat: ..., lng: ... }
    });
  },
};
