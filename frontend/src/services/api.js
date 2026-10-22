// Shared REST helper for React -> Express. The browser sends the secure session
// cookie automatically. Never store passwords or authentication tokens here.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export async function apiRequest(endpoint, options = {}) {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(!isFormData ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || `Request failed (${response.status}).`);
    error.code = data.code;
    error.status = response.status;
    throw error;
  }
  return data;
}
