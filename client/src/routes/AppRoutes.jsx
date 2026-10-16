import { Navigate, Route, Routes } from "react-router-dom";

// Shared authentication pages for Admin, User, and Driver.
import LoginPage from "../pages/auth/LoginPage";
import { SignupPage, ApplicationPendingPage } from "../pages/auth/SignupPage";
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage";

// User pages.
import BookDeliveryPage from "../pages/user/BookDeliveryPage";
import ActiveDeliveryPage from "../pages/user/ActiveDeliveryPage";
import { OrderHistoryPage } from "../pages/user/HistoryPage";
import UserProfilePage from "../pages/user/UserProfilePage";
import { UserNotificationsPage } from "../pages/user/NotificationsPage";

// Driver pages.
import DriverHomePage from "../pages/driver/DriverHomePage";
import DriverHistoryPage from "../pages/driver/DriverHistoryPage";
import DriverProfilePage from "../pages/driver/DriverProfilePage";
import DriverWalletPage from "../pages/driver/DriverWalletPage";
import { DriverNotificationsPage } from "../pages/driver/NotificationsPage";

// Admin pages.
import DashboardPage from "../pages/admin/DashboardPage";
import UsersPage from "../pages/admin/UsersPage";
import DriversPage from "../pages/admin/DriversPage";
import DeliveriesPage from "../pages/admin/DeliveriesPage";
import ReportsPage from "../pages/admin/ReportsPage";
import AdminProfilePage from "../pages/admin/ProfilePage";
import SettingsPage from "../pages/admin/SettingsPage";
import NotFoundPage from "../pages/admin/NotFoundPage";

// Layouts and admin protection.
import AdminLayout from "../layouts/AdminLayout";
import ProtectedAdminRoute from "./ProtectedAdminRoute";
import { ROUTES } from "./paths";


function AppRoutes({
  savedAddresses,
  onSaveAddress,
  onUpdateAddress,
  onDeleteAddress,
  reviews,
  onSubmitReview,
}) {
  return (
    <Routes>
      {/* Public authentication */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/application-pending" element={<ApplicationPendingPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* User */}
      <Route path="/place-order" element={<BookDeliveryPage savedAddresses={savedAddresses} onSaveAddress={onSaveAddress} />} />
      <Route path="/active-delivery" element={<ActiveDeliveryPage />} />
      <Route path="/history" element={<OrderHistoryPage reviews={reviews} onSubmitReview={onSubmitReview} />} />
      <Route path="/profile" element={<UserProfilePage savedAddresses={savedAddresses} onSaveAddress={onSaveAddress} onUpdateAddress={onUpdateAddress} onDeleteAddress={onDeleteAddress} />} />
      <Route path="/notifications" element={<UserNotificationsPage />} />

      {/* Driver */}
      <Route path="/driver/home" element={<DriverHomePage />} />
      <Route path="/driver/history" element={<DriverHistoryPage reviews={reviews} />} />
      <Route path="/driver/profile" element={<DriverProfilePage />} />
      <Route path="/driver/wallet" element={<DriverWalletPage />} />
      <Route path="/driver/notifications" element={<DriverNotificationsPage />} />

      {/* Admin protected pages */}
      <Route path="/admin" element={<ProtectedAdminRoute />}>
        <Route element={<AdminLayout />}>
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

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default AppRoutes;
