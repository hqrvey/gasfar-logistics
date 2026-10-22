import { useCallback, useEffect, useState } from "react";
import { bookingService } from "../services/bookingService.js";
import { useAuth } from "../context/AuthContext.jsx";

// Fetch real bookings from Express. Polling keeps two devices reasonably in sync
// until a real-time Socket.IO connection is introduced later.
export function useBookings(filterFn) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const data = await bookingService.list();
      setBookings(data);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    setBookings([]);
    setLoading(true);
    if (!user) { setLoading(false); return; }
    refresh();
    const timer = setInterval(refresh, 8000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh, user?.id]);

  return {
    all: bookings,
    bookings: filterFn ? bookings.filter(filterFn) : bookings,
    loading,
    error,
    refresh,
  };
}
