import { useBookingNotifications } from "../../context/BookingNotificationsContext.jsx";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FiBell, FiChevronDown, FiLogOut, FiSettings, FiUser } from "react-icons/fi";
import { Wallet } from "lucide-react";
import logo from "../../assets/logos/gaspar-logo2.png";
import { peso } from "../../utils/helpers.js";
import { useAuth } from "../../context/AuthContext.jsx";

// The links are only used by this header.
export const USER_NAV = [
  { label: "Book Delivery", path: "/place-order" },
  { label: "Manage Deliveries", path: "/active-delivery" },
  { label: "History", path: "/history" },
];

export const DRIVER_NAV = [
  { label: "Nearby Requests", path: "/driver/home" },
  { label: "History", path: "/driver/history" },
  { label: "Wallet", path: "/driver/wallet" },
];

// Both customers and drivers use this header with different navigation links.
export default function AppHeader({
  role = "customer",
  user,
  notifications = [],
  online = true,
  onToggleOnline = null,
  walletBalance = null,
  minBalance = 25,
  profilePath,
  showOnlineToggle = false,
}) {
  const bookingNotices = useBookingNotifications();
  notifications = bookingNotices?.items ?? notifications;
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user: authenticatedUser } = useAuth();

  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const isDriver = role === "driver";
  const displayName =
    user?.name ||
    [authenticatedUser?.firstName, authenticatedUser?.lastName]
      .filter(Boolean)
      .join(" ") ||
    (isDriver ? "Driver" : "Customer");

  const navigation = isDriver ? DRIVER_NAV : USER_NAV;
  const unreadCount = notifications.filter((item) => !item.read).length;
  const lowBalance = isDriver && walletBalance !== null && walletBalance < minBalance;

  function isActive(path) {
    return location.pathname === path || location.pathname.startsWith(path + "/");
  }

  async function handleLogout() {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch { alert("Logout failed. Please check your connection."); }
  }

  function toggleNotifications() {
    setNotifOpen(!notifOpen);
    setProfileOpen(false);
  }

  function toggleProfile() {
    setProfileOpen(!profileOpen);
    setNotifOpen(false);
  }

  return (
    <header className="client-header">
      <div className="client-header__left">
        <img src={logo} alt="GASFAR" className="client-header__logo" />
      </div>

      <nav className="client-header__nav">
        {navigation.map((link) => (
          <button
            key={link.path}
            className={`client-header__nav-link ${isActive(link.path) ? "active" : ""}`}
            onClick={() => navigate(link.path)}
          >
            {link.label}
          </button>
        ))}
      </nav>

      <div className="client-header__right">
        {isDriver && (
          <>
            {showOnlineToggle && (
              <button
                type="button"
                className={`online-switch ${online ? "online-switch--on" : ""}`}
                onClick={() => onToggleOnline?.(!online)}
                aria-pressed={online}
                title={online ? "You're online — tap to go offline" : "You're offline — tap to go online"}
              >
                <span className="online-switch__track"><span className="online-switch__thumb" /></span>
                <span className="online-switch__label">{online ? "Online" : "Offline"}</span>
              </button>
            )}

            {walletBalance !== null && (
              <button
                className={`wallet-chip ${lowBalance ? "wallet-chip--low" : ""}`}
                onClick={() => navigate("/driver/wallet")}
                title={lowBalance ? "Low balance — top up to accept bookings" : "View wallet"}
              >
                <Wallet size={14} />
                <span>{peso(walletBalance)}</span>
              </button>
            )}
          </>
        )}

        <div className="client-header__notif-wrap">
          <button className="client-header__icon-btn" onClick={toggleNotifications} aria-label="Notifications">
            <FiBell size={20} />
            {unreadCount > 0 && <span className="client-header__badge">{unreadCount}</span>}
          </button>

          {notifOpen && (
            <div className="client-header__dropdown notif-dropdown">
              <p className="dropdown-title">Notifications</p>
              {notifications.length === 0 ? (
                <div className="notif-empty">No notifications yet.</div>
              ) : (
                notifications.slice(0, 4).map((item) => (
                  <div key={item.id} className={`notif-item ${item.read ? "read" : ""}`}>
                    <span className={`notif-dot ${item.read ? "read" : ""}`} />
                    <div>
                      <p className="notif-msg">{item.message}</p>
                      <p className="notif-time">{item.time}</p>
                    </div>
                  </div>
                ))
              )}
              <button
                type="button"
                className="notif-view-all"
                onClick={() => {
                  setNotifOpen(false);
                  navigate(isDriver ? "/driver/notifications" : "/notifications");
                }}
              >
                View all notifications
              </button>
            </div>
          )}
        </div>

        <div className="client-header__profile-wrap">
          <button className="client-header__profile-btn" onClick={toggleProfile}>
            <span className="client-header__avatar"><FiUser size={18} /></span>
            <span className="client-header__username">{isDriver ? displayName : `Hi, ${displayName}`}</span>
            <FiChevronDown size={16} className={`chevron ${profileOpen ? "open" : ""}`} />
          </button>

          {profileOpen && (
            <div className="client-header__dropdown profile-dropdown">
              <button
                className="dropdown-item"
                onClick={() => {
                  setProfileOpen(false);
                  navigate(profilePath);
                }}
              >
                <FiSettings size={15} /> Profile Settings
              </button>
              <div className="dropdown-divider" />
              <button className="dropdown-item danger" onClick={handleLogout}>
                <FiLogOut size={15} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
