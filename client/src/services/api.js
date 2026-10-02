/**
 * REST API entry point for the MERN version of GASFAR.
 *
 * The current prototype still uses localStorage stores for bookings and reviews.
 * When the Express backend is ready, feature services can use apiRequest()
 * instead of putting fetch() calls inside page components.
 */

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `API request failed: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("application/json") ? response.json() : response.text();
}
