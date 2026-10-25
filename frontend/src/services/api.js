/*
 * api.js — One small function that connects React to the Express REST API.
 * ThinkBoard calls an HTTP API from its pages. GASFAR uses the SAME idea,
 * but keeps repeated fetch() settings (base URL + login cookie) in one place.
 *
 * Example: bookingService.create(details) -> apiRequest("/bookings", ...)
 *          -> Express POST /api/bookings -> createBooking() -> MongoDB.
 */
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export async function apiRequest(endpoint, options = {}) {
  // options is the object the service passed us: method, body, and optional headers.
  // GET is the default if the service did not choose another HTTP method.
  const method = options.method || "GET";
  const body = options.body;

  // FormData contains files (profile photos, registration documents).
  // Browsers must create the multipart boundary themselves; do NOT set JSON
  // Content-Type on FormData requests.
  const isFileUpload = body instanceof FormData;
  const headers = {};
  if (!isFileUpload) {
    headers["Content-Type"] = "application/json";
  }

  // Copy any additional headers the caller supplied.
  if (options.headers) {
    for (const name of Object.keys(options.headers)) {
      headers[name] = options.headers[name];
    }
  }

  // fetch() sends an HTTP request. "credentials: include" sends the HttpOnly
  // cookie created during login, so Express knows who made this request.
  const response = await fetch(API_URL + endpoint, {
    method: method,
    body: body,
    headers: headers,
    credentials: "include",
  });

  // Express normally returns JSON. A failed/empty response might not, so
  // use an empty object when response.json() cannot parse the response.
  let data = {};
  try {
    data = await response.json();
  } catch (error) {
    data = {};
  }

  // HTTP 400/401/403/etc. means React should show an error, not success.
  if (!response.ok) {
    const message = data.message || "Request failed (" + response.status + ").";
    const error = new Error(message);
    error.code = data.code;
    error.status = response.status;
    throw error;
  }

  // The service or React page receives the plain JavaScript object from JSON.
  return data;
}
