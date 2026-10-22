// SHARED REACT HOOK: Keep booking records in React state for any logged-in role.
// "Hook" here simply means reusable React state + data-loading logic.
import { useCallback, useEffect, useState } from "react";
import { bookingService } from "../services/bookingService.js";
import { useAuth } from "../context/AuthContext.jsx";

export function useBookings(filterFn) {
  const { user } = useAuth(); // Current logged-in user (or null).
  const [bookings, setBookings] = useState([]); // MongoDB records shown by React.
  const [loading, setLoading] = useState(true); // Show loading placeholder initially.
  const [error, setError] = useState(""); // Show an API error if loading fails.

  // useCallback keeps the same refresh function until the account changes.
  const refresh = useCallback(async () => {
    if (!user) return; // An unauthenticated visitor shouldn't request bookings.
    try {
      const result = await bookingService.list(); // Calls GET /api/bookings.
      setBookings(result); // Save the returned array; React rerenders the page.
      setError(""); // Clear a previous temporary error after successful refresh.
    } catch (err) {
      setError(err.message); // Example: network failure, session expired, etc.
    } finally {
      setLoading(false); // Stop showing the loading indicator.
    }
  }, [user?.id]);

  useEffect(() => {
    // Start fresh when a different customer or driver logs in.
    setBookings([]);
    setLoading(true);
    if (!user) {
      setLoading(false);
      return;
    }

    refresh(); // Load immediately when the page opens.
    // Poll every 8 seconds until we add WebSocket-based real-time updates.
    const timer = setInterval(refresh, 8000);
    const refreshOnFocus = () => refresh(); // Also refresh when revisiting the tab.
    window.addEventListener("focus", refreshOnFocus);

    // Cleanup stops polling when navigating away/unmounting this component.
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [refresh, user?.id]);

  // Pages may optionally filter the role-appropriate bookings by status.
  const filteredBookings = filterFn ? bookings.filter(filterFn) : bookings;
  return { all: bookings, bookings: filteredBookings, loading, error, refresh };
}
