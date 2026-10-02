import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FiBell, FiChevronDown, FiLogOut, FiSettings, FiUser } from "react-icons/fi";
import { Wallet } from "lucide-react";
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaTwitter } from "react-icons/fa";
import logo from "../assets/logos/gaspar-logo2.png";
import { DRIVER_NAV, USER_NAV } from "../data/clientNavigation.js";
import { peso } from "../utils/helpers.js";

const AppHeader = ({ role = "user", user, notifications = [], online = true, onToggleOnline = null, walletBalance = null, minBalance = 25, profilePath, showOnlineToggle = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const nav = role === "driver" ? DRIVER_NAV : USER_NAV;
  const isActive = (p) => location.pathname === p || location.pathname.startsWith(p + "/");
  const unread = notifications.filter(n => !n.read).length;
  const lowBal = role === "driver" && walletBalance != null && walletBalance < minBalance;
  return (
    <header className="client-header">
      <div className="client-header__left"><img src={logo} alt="GASFAR" className="client-header__logo" /></div>
      <nav className="client-header__nav">
        {nav.map((link) => (<button key={link.path} className={`client-header__nav-link ${isActive(link.path) ? "active" : ""}`} onClick={() => navigate(link.path)}>{link.label}</button>))}
      </nav>
      <div className="client-header__right">
        {role === "driver" && (
          <>
            {showOnlineToggle && (
              <button type="button" className={`online-switch ${online ? "online-switch--on" : ""}`} onClick={() => onToggleOnline?.(!online)} aria-pressed={online} title={online ? "You're online — tap to go offline" : "You're offline — tap to go online"}>
                <span className="online-switch__track"><span className="online-switch__thumb" /></span>
                <span className="online-switch__label">{online ? "Online" : "Offline"}</span>
              </button>
            )}
            {walletBalance != null && (<button className={`wallet-chip ${lowBal ? "wallet-chip--low" : ""}`} onClick={() => navigate("/driver/wallet")} title={lowBal ? "Low balance — top up to accept bookings" : "View wallet"}><Wallet size={14} /><span>{peso(walletBalance)}</span></button>)}
          </>
        )}
        <div className="client-header__notif-wrap">
          <button className="client-header__icon-btn" onClick={() => { setNotifOpen((v) => !v); setProfileOpen(false); }}><FiBell size={20} />{unread > 0 && <span className="client-header__badge">{unread}</span>}</button>
          {notifOpen && (
            <div className="client-header__dropdown notif-dropdown">
              <p className="dropdown-title">Notifications</p>
              {notifications.length === 0 ? (<div className="notif-empty">No notifications yet.</div>) : notifications.slice(0, 4).map((n) => (<div key={n.id} className={`notif-item ${n.read ? "read" : ""}`}><span className={`notif-dot ${n.read ? "read" : ""}`} /><div><p className="notif-msg">{n.message}</p><p className="notif-time">{n.time}</p></div></div>))}
              <button type="button" className="notif-view-all" onClick={() => { setNotifOpen(false); navigate(role === "driver" ? "/driver/notifications" : "/notifications"); }}>View all notifications</button>
            </div>
          )}
        </div>
        <div className="client-header__profile-wrap">
          <button className="client-header__profile-btn" onClick={() => { setProfileOpen((v) => !v); setNotifOpen(false); }}>
            <span className="client-header__avatar"><FiUser size={18} /></span>
            <span className="client-header__username">{role === "driver" ? user.name : `Hi, ${user.name}`}</span>
            <FiChevronDown size={16} className={`chevron ${profileOpen ? "open" : ""}`} />
          </button>
          {profileOpen && (
            <div className="client-header__dropdown profile-dropdown">
              <button className="dropdown-item" onClick={() => { setProfileOpen(false); navigate(profilePath); }}><FiSettings size={15} /> Profile Settings</button>
              <div className="dropdown-divider" />
              <button className="dropdown-item danger" onClick={() => navigate("/login")}><FiLogOut size={15} /> Logout</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

/* ═══ ClientLayout ═══ */
const ClientLayout = ({ children, hideFooter = false, user, notifications }) => (
  <div className="client-layout">
    <AppHeader role="user" user={user} notifications={notifications} profilePath="/profile" />
    <main className="client-main">{children}</main>
    {!hideFooter && (
      <footer className="client-footer">
        <div className="client-footer__inner">
          <div className="footer-brand">
            <img src={logo} alt="GASFAR" className="footer-brand__logo" />
            <p className="footer-brand__desc">GASFAR is a reliable delivery and logistics system that connects you to trusted drivers to deliver your items safely and on time.</p>
            <div className="footer-brand__contact">
              <p className="footer-section__item">0917 123 4567</p>
              <p className="footer-section__item">support@gasfar.com</p>
              <p className="footer-section__item">Bulacan, Philippines</p>
            </div>
            <div className="footer-socials">
              <a href="#!" className="footer-social-btn"><FaFacebookF size={14} /></a>
              <a href="#!" className="footer-social-btn"><FaInstagram size={14} /></a>
              <a href="#!" className="footer-social-btn"><FaTwitter size={14} /></a>
              <a href="#!" className="footer-social-btn"><FaLinkedinIn size={14} /></a>
            </div>
          </div>
          <div className="footer-section">
            <p className="footer-section__title">COMPANY</p>
            <a href="#!" className="footer-section__link">About GASFAR</a>
            <a href="#!" className="footer-section__link">Careers</a>
            <a href="#!" className="footer-section__link">Press &amp; Media</a>
            <a href="#!" className="footer-section__link">Contact Us</a>
            <a href="#!" className="footer-section__link">Privacy Policy</a>
            <a href="#!" className="footer-section__link">Terms of Service</a>
          </div>
          <div className="footer-section">
            <p className="footer-section__title">FOR USERS</p>
            <a href="#!" className="footer-section__link">How It Works</a>
            <a href="#!" className="footer-section__link">Pricing</a>
            <a href="#!" className="footer-section__link">Safety</a>
            <a href="#!" className="footer-section__link">FAQ</a>
            <a href="#!" className="footer-section__link">User Blog</a>
          </div>
          <div className="footer-section">
            <p className="footer-section__title">FOR DRIVERS</p>
            <a href="#!" className="footer-section__link">Become a Driver</a>
            <a href="#!" className="footer-section__link">Requirements</a>
            <a href="#!" className="footer-section__link">Earnings</a>
            <a href="#!" className="footer-section__link">Driver Support</a>
            <a href="#!" className="footer-section__link">Driver Blog</a>
          </div>
        </div>
        <div className="client-footer__copy">© 2026 GASFAR. All rights reserved.</div>
      </footer>
    )}
  </div>

);

export { AppHeader, ClientLayout };
