import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthContext.jsx";

// These are actual booking-state changes detected through authenticated GET
// /bookings polling. They are NOT backend-pushed events or SMS notifications.
const NotificationsContext = createContext(null);
const MAX_NOTICES = 50;

function describeChange(role, booking, previousStatus) {
  const id = booking.id;
  if (role === "driver") {
    if (!previousStatus && booking.status === "pending") return { type: "job", message: `New delivery request ${id} is available.` };
    if (booking.status === "accepted") return { type: "job", message: `Delivery ${id} was assigned to you.` };
    if (booking.status === "cancelled") return { type: "job", message: `Delivery ${id} was cancelled.` };
    if (booking.status === "delivered") return { type: "job", message: `Delivery ${id} was completed.` };
    return null;
  }
  const labels = {
    accepted: "A driver accepted",
    at_pickup: "The driver arrived at pickup for",
    picked_up: "Your package was picked up for",
    arrived: "The driver arrived at drop-off for",
    delivered: "Delivery completed for",
    cancelled: "Delivery cancelled for",
  };
  return labels[booking.status]
    ? { type: "order", message: `${labels[booking.status]} booking ${id}.` }
    : null;
}

export function BookingNotificationsProvider({ role, bookingFeed, children }) {
  const { user } = useAuth();
  const key = `gasfar:booking-notifications:${role}:${user?.id ?? "guest"}`;
  const [items, setItems] = useState(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(key) || "[]");
      return Array.isArray(stored) ? stored.slice(0, MAX_NOTICES) : [];
    } catch { return []; }
  });
  const previouslySeen = useRef(null);

  useEffect(() => {
    if (bookingFeed.loading || bookingFeed.error) return;
    const current = new Map(bookingFeed.bookings.map(booking => [booking.id, booking.status]));
    if (previouslySeen.current) {
      const notices = [];
      for (const booking of bookingFeed.bookings) {
        const oldStatus = previouslySeen.current.get(booking.id);
        if (oldStatus === booking.status) continue;
        const notice = describeChange(role, booking, oldStatus);
        if (notice) notices.push({
          ...notice,
          id: `${booking.id}:${booking.status}`,
          time: new Date().toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
          read: false,
        });
      }
      if (notices.length) setItems(existing => {
        const seen = new Set(existing.map(item => item.id));
        return [...notices.filter(item => !seen.has(item.id)), ...existing].slice(0, MAX_NOTICES);
      });
    }
    previouslySeen.current = current;
  }, [bookingFeed.bookings, bookingFeed.loading, bookingFeed.error, role]);

  useEffect(() => {
    try { window.localStorage.setItem(key, JSON.stringify(items)); }
    catch { /* Private browsing/storage denial: retain in memory only. */ }
  }, [items, key]);

  const markRead = useCallback(id => setItems(list => list.map(item => item.id === id ? { ...item, read: true } : item)), []);
  const markAllRead = useCallback(() => setItems(list => list.map(item => ({ ...item, read: true }))), []);
  const clearAll = useCallback(() => setItems([]), []);
  return (
    <NotificationsContext.Provider value={{ items, markRead, markAllRead, clearAll, bookingFeed }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useBookingNotifications() {
  return useContext(NotificationsContext);
}
