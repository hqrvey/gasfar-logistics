import AppHeader from "../../components/common/AppHeader.jsx";
import NotificationsView from "../../components/common/NotificationsView.jsx";
import { MOCK_DRIVER, MOCK_NOTIFICATIONS_DRIVER } from "../../data/demo/clientMockData.js";

export default function DriverNotificationsPage() {
  return (
    <div className="driver-shell">
      <AppHeader
        role="driver"
        user={{ name: MOCK_DRIVER.name }}
        notifications={MOCK_NOTIFICATIONS_DRIVER}
        online={MOCK_DRIVER.online}
        walletBalance={MOCK_DRIVER.walletBalance}
        minBalance={MOCK_DRIVER.minBalance}
        profilePath="/driver/profile"
      />
      <div className="driver-body">
        <NotificationsView role="driver" />
      </div>
    </div>
  );
}
