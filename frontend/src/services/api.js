// CENTRAL REST API HELPER: Every frontend service sends HTTP requests through here.
// React -> fetch() -> Express API -> Mongoose -> MongoDB -> JSON response -> React.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

// endpoint example: "/bookings"; options may specify method and JSON body.
export async function apiRequest(endpoint, options = {}) {
  // FormData is used when signup includes uploaded driver documents.
  const isFormData = options.body instanceof FormData;

  // fetch() sends the request from the browser to Express.
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options, // Copies the method (GET/POST/PATCH) and request body.
    credentials: "include", // Sends the secure login cookie with every request.
    headers: {
      // JSON requests need a Content-Type header; FormData sets its own.
      ...(!isFormData ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });

  // Express returns JSON, which becomes a normal JavaScript object here.
  const data = await response.json().catch(() => ({}));

  // A 400, 401, 403, 409 or 500 response should not look like success in React.
  if (!response.ok) {
    const error = new Error(data.message || `Request failed (${response.status}).`);
    error.code = data.code; // Optional backend error code.
    error.status = response.status; // Useful for troubleshooting in DevTools.
    throw error; // The page's catch block can show this message to the user.
  }

  return data; // Example: { booking: {...} } or { bookings: [...] }.
}
