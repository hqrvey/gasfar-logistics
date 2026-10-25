import useDriverWallet from "../../hooks/useDriverWallet.js";
import AppHeader from "../../components/common/AppHeader.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import NotificationsView from "../../components/common/NotificationsView.jsx";
import { MOCK_DRIVER, MOCK_NOTIFICATIONS_DRIVER } from "../../data/demo/clientMockData.js";

export default function DriverNotificationsPage() {
  const { user } = useAuth();
  const walletBalance = useDriverWallet();
  return (
    <div className="driver-shell">
      <AppHeader
        role="driver"
        user={{ name: `${user?.firstName || ""} ${user?.lastName || ""}`.trim() }}
        notifications={MOCK_NOTIFICATIONS_DRIVER}
        online={MOCK_DRIVER.online}
        walletBalance={walletBalance}
        minBalance={25}
        profilePath="/driver/profile"
      />
      <div className="driver-body">
        <NotificationsView role="driver" />
      </div>
    </div>
  );
}
