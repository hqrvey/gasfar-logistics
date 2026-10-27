// SHARED REACT HOOK: Keep booking records in React state for any logged-in role.
// "Hook" here simply means reusable React state + data-loading logic.
import { useCallback, useEffect, useRef, useState } from "react";
import { bookingService } from "../services/bookingService.js";
import { useAuth } from "../context/AuthContext.jsx";

export function useBookings(filterFn) {
  const { user } = useAuth(); // Current logged-in user (or null).
  const [bookings, setBookings] = useState([]); // MongoDB records shown by React.
  const [loading, setLoading] = useState(true); // Show loading placeholder initially.
  const [error, setError] = useState(""); // Show an API error if loading fails.
  const requestSeq = useRef(0);
  const pollingRef = useRef(false);

  // useCallback keeps the same refresh function until the account changes.
  const refresh = useCallback(async (options = {}) => {
    if (!user) return; // An unauthenticated visitor shouldn't request bookings.
    // Coalesce slow background polls. Explicit refreshes after a mutation still
    // start a newer request, and only the newest response is allowed to win.
    if (options.background && pollingRef.current) return;
    if (options.background) pollingRef.current = true;
    const seq = ++requestSeq.current;
    try {
      const result = await bookingService.list(); // Calls GET /api/bookings.
      if (seq !== requestSeq.current) return; // A newer request won the race.
      setBookings(result); // Save the returned array; React rerenders the page.
      setError(""); // Clear a previous temporary error after successful refresh.
    } catch (err) {
      if (seq === requestSeq.current) setError(err.message); // Example: network failure, session expired, etc.
    } finally {
      if (options.background) pollingRef.current = false;
      if (seq === requestSeq.current) setLoading(false); // Latest request only.
    }
  }, [user?.id]);

  useEffect(() => {
    // Start fresh when a different customer or driver logs in.
    ++requestSeq.current; // Invalidate earlier account or unmounted requests.
    pollingRef.current = false;
    setBookings([]);
    setLoading(true);
    if (!user) {
      setLoading(false);
      return;
    }

    refresh(); // Load immediately when the page opens.
    // Poll every 8 seconds until we add WebSocket-based real-time updates.
    const timer = setInterval(() => refresh({ background: true }), 8000);
    const refreshOnFocus = () => refresh(); // Also refresh when revisiting the tab.
    window.addEventListener("focus", refreshOnFocus);

    // Cleanup stops polling when navigating away/unmounting this component.
    return () => {
      ++requestSeq.current;
      clearInterval(timer);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [refresh, user?.id]);

  // Pages may optionally filter the role-appropriate bookings by status.
  const filteredBookings = filterFn ? bookings.filter(filterFn) : bookings;
  return { all: bookings, bookings: filteredBookings, loading, error, refresh };
}
