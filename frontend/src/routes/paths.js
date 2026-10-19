// Central place for app URLs. Existing URLs are preserved.
export const ROUTES = {
  login: "/login",
  signup: "/signup",
  forgotPassword: "/forgot-password",
  applicationPending: "/application-pending",

  bookDelivery: "/place-order",
  activeDelivery: "/active-delivery",
  history: "/history",
  userProfile: "/profile",
  userNotifications: "/notifications",

  driverHome: "/driver/home",
  driverHistory: "/driver/history",
  driverProfile: "/driver/profile",
  driverWallet: "/driver/wallet",
  driverNotifications: "/driver/notifications",

  dashboard: "/admin/dashboard",
  users: "/admin/users",
  drivers: "/admin/drivers",
  deliveries: "/admin/deliveries",
  reports: "/admin/reports",
  settings: "/admin/settings",
  profile: "/admin/profile",
};

export const HOME_BY_ROLE = {
  admin: ROUTES.dashboard,
  user: ROUTES.bookDelivery,
  driver: ROUTES.driverHome,
};
