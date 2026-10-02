import { Outlet } from "react-router-dom";
import Sidebar from "../components/admin/layout/Sidebar.jsx";
import Topbar from "../components/admin/layout/Topbar.jsx";
import usePersistedState from "../hooks/usePersistedState.js";
import { STORAGE_KEYS } from "../utils/storage.js";

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
