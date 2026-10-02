import { NavLink } from "react-router-dom";
import { NAV_ITEMS, SETTINGS_ITEM } from "../../../data/adminNavigation.js";

import logo from "../../../assets/logos/gaspar-logo2.png";

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

export default function Sidebar({ collapsed }) {
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
