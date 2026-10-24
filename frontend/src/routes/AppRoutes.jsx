import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

// Pages that everyone can visit
import LoginPage from "../pages/auth/LoginPage.jsx";
import { SignupPage, ApplicationPendingPage } from "../pages/auth/SignupPage.jsx";
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage.jsx";

// Customer pages
import BookDeliveryPage from "../pages/user/BookDeliveryPage.jsx";
import ActiveDeliveryPage from "../pages/user/ActiveDeliveryPage.jsx";
import OrderHistoryPage from "../pages/user/HistoryPage.jsx";
import UserProfilePage from "../pages/user/UserProfilePage.jsx";
import UserNotificationsPage from "../pages/user/NotificationsPage.jsx";

// Driver pages
import DriverHomePage from "../pages/driver/DriverHomePage.jsx";
import DriverHistoryPage from "../pages/driver/DriverHistoryPage.jsx";
import DriverProfilePage from "../pages/driver/DriverProfilePage.jsx";
import DriverWalletPage from "../pages/driver/DriverWalletPage.jsx";
import DriverNotificationsPage from "../pages/driver/NotificationsPage.jsx";

// Admin pages
import DashboardPage from "../pages/admin/DashboardPage.jsx";
import UsersPage from "../pages/admin/UsersPage.jsx";
import DriversPage from "../pages/admin/DriversPage.jsx";
import DeliveriesPage from "../pages/admin/DeliveriesPage.jsx";
import ReportsPage from "../pages/admin/ReportsPage.jsx";
import AdminProfilePage from "../pages/admin/ProfilePage.jsx";
import SettingsPage from "../pages/admin/SettingsPage.jsx";
import NotFoundPage from "../pages/admin/NotFoundPage.jsx";

import AdminLayout from "../layouts/AdminLayout.jsx";
import { ROUTES } from "./paths.js";

// The pages below this route are visible only to the chosen role.
// IMPORTANT: Real security will also be checked by Express on every API request.
function ProtectedRoute({ allowedRole }) {
  const { loggedIn, role, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div role="status" style={{ padding: 24 }}>Checking session…</div>;

  if (!loggedIn || role !== allowedRole) {
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export default function AppRoutes({
  savedAddresses,
  onSaveAddress,
  onUpdateAddress,
  onDeleteAddress,
}) {
  return (
    <Routes>
      {/* Public pages */}
      <Route path={ROUTES.login} element={<LoginPage />} />
      <Route path={ROUTES.signup} element={<SignupPage />} />
      <Route path={ROUTES.applicationPending} element={<ApplicationPendingPage />} />
      <Route path={ROUTES.forgotPassword} element={<ForgotPasswordPage />} />

      {/* Customer pages */}
      <Route element={<ProtectedRoute allowedRole="customer" />}>
        <Route path={ROUTES.bookDelivery} element={<BookDeliveryPage savedAddresses={savedAddresses} onSaveAddress={onSaveAddress} />} />
        <Route path={ROUTES.activeDelivery} element={<ActiveDeliveryPage />} />
        <Route path={ROUTES.history} element={<OrderHistoryPage />} />
        <Route path={ROUTES.userProfile} element={<UserProfilePage savedAddresses={savedAddresses} onSaveAddress={onSaveAddress} onUpdateAddress={onUpdateAddress} onDeleteAddress={onDeleteAddress} />} />
        <Route path={ROUTES.userNotifications} element={<UserNotificationsPage />} />
      </Route>

      {/* Driver pages */}
      <Route element={<ProtectedRoute allowedRole="driver" />}>
        <Route path={ROUTES.driverHome} element={<DriverHomePage />} />
        <Route path={ROUTES.driverHistory} element={<DriverHistoryPage />} />
        <Route path={ROUTES.driverProfile} element={<DriverProfilePage />} />
        <Route path={ROUTES.driverWallet} element={<DriverWalletPage />} />
        <Route path={ROUTES.driverNotifications} element={<DriverNotificationsPage />} />
      </Route>

      {/* Administrator pages share one sidebar layout */}
      <Route element={<ProtectedRoute allowedRole="admin" />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to={ROUTES.dashboard} replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="drivers" element={<DriversPage />} />
          <Route path="deliveries" element={<DeliveriesPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="profile" element={<AdminProfilePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>

      {/* Unknown pages go to login */}
      <Route path="*" element={<Navigate to={ROUTES.login} replace />} />
    </Routes>
  );
}
