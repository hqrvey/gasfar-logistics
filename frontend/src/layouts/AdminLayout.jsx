// All admin sidebar and header behavior lives here because no other pages use it.
import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3, Bell, ChevronDown, LayoutDashboard, LogOut,
  Menu, Package, Search, Settings, Truck, UserCircle, Users,
} from "lucide-react";
import logo from "../assets/logos/gaspar-logo2.png";
import { useAuth } from "../context/AuthContext.jsx";
import { ROUTES } from "../routes/paths.js";
import { INITIAL_DELIVERIES, INITIAL_DRIVERS, INITIAL_USERS } from "../data/demo/adminMockData.js";
import usePersistedState from "../hooks/usePersistedState.js";
import { STORAGE_KEYS } from "../utils/storage.js";

// Links for the admin sidebar. Add new admin pages here.
const NAV_ITEMS = [
  { to: ROUTES.dashboard, label: "Dashboard", icon: LayoutDashboard },
  { to: ROUTES.users, label: "User Management", icon: Users },
  { to: ROUTES.drivers, label: "Driver Management", icon: Truck },
  { to: ROUTES.deliveries, label: "Delivery Management", icon: Package },
  { to: ROUTES.reports, label: "Reports & Analytics", icon: BarChart3 },
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
        {NAV_ITEMS.map((item) => (
          <SidebarLink key={item.to} {...item} />
        ))}
      </nav>

      <div className="sectionLabel systemLabel">SYSTEM</div>

      <SidebarLink {...SETTINGS_ITEM} />
    </aside>
  );
}

// GlobalSearch
const SOURCES = [
  { type: "User", rows: INITIAL_USERS, to: ROUTES.users, label: (row) => row[1] },
  { type: "Driver", rows: INITIAL_DRIVERS, to: ROUTES.drivers, label: (row) => row[1] },
  { type: "Booking", rows: INITIAL_DELIVERIES, to: ROUTES.deliveries, label: (row) => row[0] },
];

function searchAll(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return SOURCES.flatMap(({ type, rows, to, label }) =>
    rows
      .filter((row) => row.join(" ").toLowerCase().includes(q))
      .map((row) => ({ type, id: row[0], name: label(row), to }))
  ).slice(0, 6);
}

function GlobalSearch() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const results = useMemo(() => searchAll(query), [query]);

  const open = (result) => {
    navigate(result.to);
    setQuery("");
  };

  return (
    <div className="searchWrap">
      <div className="searchBox">
        <Search size={17} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search users, drivers, bookings..."
        />
      </div>

      {query && (
        <div className="searchResults">
          {results.length ? (
            results.map((result) => (
              <button key={`${result.type}-${result.id}`} onClick={() => open(result)}>
                <span>
                  <b>{result.name}</b>
                  <small>
                    {result.type} • {result.id}
                  </small>
                </span>
                <ChevronDown size={13} />
              </button>
            ))
          ) : (
            <div className="noResults">No matching users, drivers, or bookings.</div>
          )}
        </div>
      )}
    </div>
  );
}

// NotificationMenu
const NOTIFICATIONS = [
  {
    tone: "red",
    title: "New complaint received",
    text: "Customer reported a driver incident.",
    to: ROUTES.complaints,
  },
  {
    tone: "orange",
    title: "Driver verification pending",
    text: "A new application needs review.",
    to: ROUTES.drivers,
  },
  {
    tone: "blue",
    title: "Delivery update",
    text: "A booking status changed.",
    to: ROUTES.deliveries,
  },
];

function NotificationMenu({ open, onToggle }) {
  const navigate = useNavigate();

  return (
    <div className="dropWrap">
      <button className="iconButton notification" onClick={onToggle} title="Notifications">
        <Bell size={18} />
        <i />
      </button>

      {open && (
        <div className="dropdown notificationDrop">
          <div className="dropTitle">
            Notifications <span>{NOTIFICATIONS.length} new</span>
          </div>

          {NOTIFICATIONS.map(({ tone, title, text, to }) => (
            <button key={title} onClick={() => navigate(to)}>
              <span className={`notifDot ${tone}`} />
              <span>
                <b>{title}</b>
                <small>{text}</small>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ProfileMenu
function ProfileMenu({ open, onToggle }) {
  const { name, photo, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate(ROUTES.login, { replace: true });
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
          <small>Operations Admin</small>
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
