// All admin sidebar and header behavior lives here because no other pages use it.
import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3, Bell, ChevronDown, LayoutDashboard, LogOut,
  Menu, Package, Search, Settings, Truck, UserCircle, Users, Shield,
} from "lucide-react";
import logo from "../assets/logos/gaspar-logo2.png";
import { useAuth } from "../context/AuthContext.jsx";
import { ROUTES } from "../routes/paths.js";
import { extraService } from "../services/extraService.js";
import usePersistedState from "../hooks/usePersistedState.js";
import { STORAGE_KEYS } from "../utils/storage.js";

// Links for the admin sidebar. Add new admin pages here.
const NAV_ITEMS = [
  { to: ROUTES.dashboard, label: "Dashboard", icon: LayoutDashboard },
  { to: ROUTES.users, label: "User Management", icon: Users },
  { to: ROUTES.drivers, label: "Driver Management", icon: Truck },
  { to: ROUTES.deliveries, label: "Delivery Management", icon: Package },
  { to: ROUTES.reports, label: "Reports & Analytics", icon: BarChart3 },
  { to: "/admin/fee-reviews", label: "Fee & Wallet Reviews", icon: BarChart3 },
  { to: ROUTES.adminNotifications, label: "Notifications", icon: Bell },
  { to: ROUTES.roles, label: "Roles & Moderators", icon: Shield },
];
const SETTINGS_ITEM = { to: ROUTES.settings, label: "Settings", icon: Settings };

// Sidebar
function SidebarLink({ to, label, icon: Icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => (isActive ? "navItem active" : "navItem")}
    >
      <Icon size={19} />
      <span>{label}</span>
    </NavLink>
  );
}

function Sidebar({ collapsed }) {
  const { user } = useAuth();
  // Moderators see only pages they are allowed to open.
  const adminRole = user?.adminRole || "super_admin";
  function visible(item) {
    if (item.to === ROUTES.adminNotifications) return true;
    if (adminRole === "super_admin") return true;
    if (adminRole === "user_moderator") return item.to === ROUTES.users;
    if (adminRole === "driver_moderator") return item.to === ROUTES.drivers;
    if (adminRole === "fee_moderator") return item.to === "/admin/fee-reviews";
    return false;
  }
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brandMark">
          <img src={logo} alt="GASFAR" />
        </div>

        {!collapsed && (
          <div>
            <strong>GASFAR</strong>
            <span>LOGISTICS &amp; DELIVERY</span>
          </div>
        )}
      </div>

      <div className="sectionLabel">MAIN MENU</div>

      <nav>
        {NAV_ITEMS.filter(visible).map((item) => (
          <SidebarLink key={item.to} {...item} />
        ))}
      </nav>

      <div className="sectionLabel systemLabel">SYSTEM</div>

      {(user?.adminRole === "super_admin" || !user?.adminRole) && <SidebarLink {...SETTINGS_ITEM} />}
    </aside>
  );
}

// GlobalSearch: get real records from Express, never INITIAL_USERS mock arrays.
function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState([]);
  const navigate = useNavigate();
  const { user } = useAuth();
  useEffect(() => {
    let active = true;
    async function load() {
      const role = user?.adminRole || "super_admin";
      const data = [];
      // One API request for each section the moderator can actually access.
      try {
        if (role === "super_admin" || role === "user_moderator") {
          const response = await extraService.adminUsers();
          for (const account of response.users) data.push({ type: "Customer", id: account.id, name: account.firstName + " " + account.lastName, to: ROUTES.users });
        }
        if (role === "super_admin" || role === "driver_moderator") {
          const response = await extraService.adminDrivers();
          for (const profile of response.profiles) {
            if (profile.userId) data.push({ type: "Driver", id: profile.userId._id, name: profile.userId.firstName + " " + profile.userId.lastName, to: ROUTES.drivers });
          }
        }
        if (role === "super_admin") {
          const response = await extraService.deliveries();
          for (const booking of response.bookings) data.push({ type: "Booking", id: booking.id, name: booking.customer, to: ROUTES.deliveries });
        }
      } catch (error) { console.warn("Admin search:", error.message); }
      if (active) setRecords(data);
    }
    load();
    return () => { active = false; };
  }, [user?.adminRole]);

  const results = records.filter(item => (item.name + " " + item.id).toLowerCase().includes(query.toLowerCase())).slice(0, 6);
  function open(result) {
    navigate(result.to + "?focus=" + encodeURIComponent(result.id));
    setQuery("");
  }
  return <div className="searchWrap">
    <div className="searchBox"><Search size={17}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search MongoDB records..." /></div>
    {query && <div className="searchResults">
      {results.length ? results.map(result => <button key={result.type + result.id} onClick={() => open(result)}>
        <span><b>{result.name}</b><small>{result.type} • {result.id}</small></span><ChevronDown size={13}/>
      </button>) : <div className="noResults">No matching records.</div>}
    </div>}
  </div>;
}

// The bell shows the FIVE newest outstanding tasks from MongoDB.
function NotificationMenu({ open, onToggle }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  async function reload() {
    try { const result = await extraService.adminAttention(); setItems(result.items); }
    catch (error) { console.warn("Admin notifications:", error.message); }
  }
  useEffect(() => { reload(); }, []);
  useEffect(() => { if (open) reload(); }, [open]);
  const unread = items.filter(item => !item.read);
  async function openTask(item) {
    try { await extraService.markAttentionRead(item.id); }
    catch (error) { console.warn(error.message); }
    onToggle();
    navigate(item.to);
  }
  return <div className="dropWrap">
    <button className="iconButton notification" onClick={onToggle} title="Notifications"><Bell size={18}/>{unread.length > 0 && <i />}</button>
    {open && <div className="dropdown notificationDrop">
      <div className="dropTitle">Notifications <span>{unread.length} unread</span></div>
      {unread.length === 0 && <p className="feature-mini">Nothing needs attention.</p>}
      {unread.slice(0,5).map(item => <button key={item.id} onClick={() => openTask(item)}>
        <span className="notifDot orange"/><span><b>{item.title}</b><small>{item.detail}</small></span>
      </button>)}
      <button onClick={() => { navigate(ROUTES.adminNotifications); onToggle(); }}>View all notifications</button>
    </div>}
  </div>;
}

// ProfileMenu
function ProfileMenu({ open, onToggle }) {
  const { name, photo, logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate(ROUTES.login, { replace: true });
    } catch { alert("Logout failed. Please check your connection."); }
  };

  return (
    <div className="dropWrap">
      <button className="profile profileButton" onClick={onToggle}>
        {photo ? (
          <img src={photo} alt="Admin" className="adminAvatar adminAvatarPhoto" />
        ) : (
          <div className="adminAvatar">AD</div>
        )}

        <div>
          <b>{name}</b>
          <small>{(user?.adminRole || "super_admin").replaceAll("_", " ")}</small>
        </div>

        <ChevronDown size={15} />
      </button>

      {open && (
        <div className="dropdown profileDrop">
          <button onClick={() => navigate(ROUTES.profile)}>
            <UserCircle size={16} />
            Profile
          </button>

          <button className="dangerItem" onClick={handleLogout}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

// Topbar
function Topbar({ onToggleSidebar }) {
  // Only one dropdown is open at a time: "notifications" | "profile" | null
  const [openMenu, setOpenMenu] = useState(null);
  const { pathname } = useLocation();

  // Close any open dropdown after navigating.
  useEffect(() => {
    setOpenMenu(null);
  }, [pathname]);

  const toggle = (name) => setOpenMenu((current) => (current === name ? null : name));

  return (
    <header className="topbar">
      <button className="iconButton" onClick={onToggleSidebar} title="Toggle sidebar">
        <Menu size={21} />
      </button>

      <GlobalSearch />

      <div className="topRight">
        <NotificationMenu
          open={openMenu === "notifications"}
          onToggle={() => toggle("notifications")}
        />
        <ProfileMenu
          open={openMenu === "profile"}
          onToggle={() => toggle("profile")}
        />
      </div>
    </header>
  );
}

// Full admin layout
export default function AdminLayout() {
  const [collapsed, setCollapsed] = usePersistedState(STORAGE_KEYS.sidebar, false);

  return (
    <div className={`admin-app app ${collapsed ? "collapsed" : ""}`}>
      <Sidebar collapsed={collapsed} />

      <main className="main">
        <Topbar onToggleSidebar={() => setCollapsed((value) => !value)} />
        <Outlet />
      </main>
    </div>
  );
}
