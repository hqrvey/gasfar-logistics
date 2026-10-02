import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import GlobalSearch from "./GlobalSearch.jsx";
import NotificationMenu from "./NotificationMenu.jsx";
import ProfileMenu from "./ProfileMenu.jsx";

export default function Topbar({ onToggleSidebar }) {
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
