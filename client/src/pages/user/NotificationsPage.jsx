import React, { useState } from "react";
import { AppHeader, ClientLayout } from "../../layouts/ClientLayout.jsx";
import { MOCK_DRIVER, MOCK_NOTIFICATIONS_USER, MOCK_NOTIFICATIONS_DRIVER } from "../../data/clientMockData.js";

const NOTIF_FILTERS = {
  user: [{ id: "all", label: "All" }, { id: "unread", label: "Unread" }, { id: "delivery", label: "Your Deliveries" }, { id: "system", label: "System" }],
  driver: [{ id: "all", label: "All" }, { id: "unread", label: "Unread" }, { id: "job", label: "Job Alerts" }, { id: "earnings", label: "Earnings" }, { id: "account", label: "Account" }],
};
const NotificationsBody = ({ role }) => {
  const isDriver = role === "driver";
  const source = isDriver ? MOCK_NOTIFICATIONS_DRIVER : MOCK_NOTIFICATIONS_USER;
  const filters = NOTIF_FILTERS[role];
  const [items, setItems] = useState(source);
  const [filter, setFilter] = useState("all");
  const unreadCount = items.filter((n) => !n.read).length;
  const filtered = items.filter((n) => { if (filter === "all") return true; if (filter === "unread") return !n.read; return n.type === filter; });
  const countFor = (id) => { if (id === "all") return items.length; if (id === "unread") return unreadCount; return items.filter((n) => n.type === id).length; };
  const markRead = (id) => setItems((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
  const markAllRead = () => setItems((list) => list.map((n) => ({ ...n, read: true })));
  const clearAll = () => { if (confirm("Clear all notifications?")) setItems([]); };
  return (
    <div className="notifications-page">
      <div className="notifications-page__inner">
        <div className="notifications-head">
          <div><h1 className="order-history__title">Notifications</h1><p className="notifications-sub">{unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}</p></div>
          <div className="notifications-head__actions">
            {unreadCount > 0 && (<button type="button" className="bd-mini-btn" onClick={markAllRead}>Mark all read</button>)}
            {items.length > 0 && (<button type="button" className="bd-mini-btn bd-mini-btn--danger" onClick={clearAll}>Clear all</button>)}
          </div>
        </div>
        <div className="notifications-tabs">
          {filters.map((f) => (<button key={f.id} className={`history-tab ${filter === f.id ? "active" : ""}`} onClick={() => setFilter(f.id)}>{f.label}<span className="history-tab__count">{countFor(f.id)}</span></button>))}
        </div>
        {filtered.length === 0 ? (<div className="order-empty"><p>No notifications here.</p></div>) : (
          <div className="notifications-list">
            {filtered.map((n) => (<button key={n.id} type="button" className={`notifications-item ${n.read ? "read" : ""}`} onClick={() => markRead(n.id)}><span className={`notif-dot ${n.read ? "read" : ""}`} /><div className="notifications-item__body"><p className="notif-msg">{n.message}</p><p className="notif-time">{n.time}</p></div>{!n.read && <span className="notifications-item__badge">New</span>}</button>))}
          </div>
        )}
      </div>
    </div>
  );
};
const UserNotificationsPage = () => (
  <ClientLayout user={{ name: "Juan Dela Cruz" }} notifications={MOCK_NOTIFICATIONS_USER} hideFooter><NotificationsBody role="user" /></ClientLayout>
);
const DriverNotificationsPage = () => (
  <div className="driver-shell">
    <AppHeader role="driver" user={{ name: MOCK_DRIVER.name }} notifications={MOCK_NOTIFICATIONS_DRIVER} online={MOCK_DRIVER.online} onToggleOnline={() => {}} walletBalance={MOCK_DRIVER.walletBalance} minBalance={MOCK_DRIVER.minBalance} profilePath="/driver/profile" />
    <div className="driver-body"><NotificationsBody role="driver" /></div>
  </div>
);


export { UserNotificationsPage, DriverNotificationsPage };
