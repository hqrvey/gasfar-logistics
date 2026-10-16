import {
  LayoutDashboard,
  Users,
  Truck,
  Package,
  Flag,
  BarChart3,
  Settings,
} from "lucide-react";
import { ROUTES } from "../routes/paths.js";

export const NAV_ITEMS = [
  { to: ROUTES.dashboard, label: "Dashboard", icon: LayoutDashboard },
  { to: ROUTES.users, label: "User Management", icon: Users },
  { to: ROUTES.drivers, label: "Driver Management", icon: Truck },
  { to: ROUTES.deliveries, label: "Delivery Management", icon: Package },
  { to: ROUTES.reports, label: "Reports & Analytics", icon: BarChart3 },
];

export const SETTINGS_ITEM = { to: ROUTES.settings, label: "Settings", icon: Settings };
