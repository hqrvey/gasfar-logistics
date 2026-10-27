import { useState } from "react";
import { useBookingNotifications } from "../../context/BookingNotificationsContext.jsx";

const FILTERS = {
  customer: [
    { id: "all", label: "All" },
    { id: "unread", label: "Unread" },
    { id: "order", label: "Your Deliveries" },
    { id: "system", label: "System" },
  ],
  driver: [
    { id: "all", label: "All" },
    { id: "unread", label: "Unread" },
    { id: "job", label: "Job Alerts" },
    { id: "earnings", label: "Earnings" },
    { id: "account", label: "Account" },
  ],
};

// Booking-state notifications come from authenticated polling and persisted local read state.
export default function NotificationsView({ role }) {
  const notifications = useBookingNotifications();
  const { items = [], markRead = () => {}, markAllRead = () => {}, clearAll = () => {} } = notifications || {};
  const [filter, setFilter] = useState("all");
  const unreadCount = items.filter((item) => !item.read).length;

  function matchesFilter(item, selectedFilter) {
    if (selectedFilter === "all") return true;
    if (selectedFilter === "unread") return !item.read;
    return item.type === selectedFilter;
  }

  const visibleItems = items.filter((item) => matchesFilter(item, filter));

  function countFor(selectedFilter) {
    return items.filter((item) => matchesFilter(item, selectedFilter)).length;
  }

  function confirmClearAll() {
    if (window.confirm("Clear all notifications?")) clearAll();
  }

  return (
    <div className="notifications-page">
      <div className="notifications-page__inner">
        <div className="notifications-head">
          <div>
            <h1 className="order-history__title">Notifications</h1>
            <p className="notifications-sub">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </p>
          </div>
          <div className="notifications-head__actions">
            {unreadCount > 0 && (
              <button type="button" className="bd-mini-btn" onClick={markAllRead}>Mark all read</button>
            )}
            {items.length > 0 && (
              <button type="button" className="bd-mini-btn bd-mini-btn--danger" onClick={confirmClearAll}>Clear all</button>
            )}
          </div>
        </div>

        <div className="notifications-tabs">
          {FILTERS[role].map((option) => (
            <button
              key={option.id}
              className={`history-tab ${filter === option.id ? "active" : ""}`}
              onClick={() => setFilter(option.id)}
            >
              {option.label}
              <span className="history-tab__count">{countFor(option.id)}</span>
            </button>
          ))}
        </div>

        {visibleItems.length === 0 ? (
          <div className="order-empty"><p>No notifications here.</p></div>
        ) : (
          <div className="notifications-list">
            {visibleItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`notifications-item ${item.read ? "read" : ""}`}
                onClick={() => markRead(item.id)}
              >
                <span className={`notif-dot ${item.read ? "read" : ""}`} />
                <div className="notifications-item__body">
                  <p className="notif-msg">{item.message}</p>
                  <p className="notif-time">{item.time}</p>
                </div>
                {!item.read && <span className="notifications-item__badge">New</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
