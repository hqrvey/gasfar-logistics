import React from "react";
import AppHeader from "../../components/common/AppHeader.jsx";
import OrderHistory from "../../components/common/OrderHistory.jsx";
import { MOCK_DRIVER, MOCK_NOTIFICATIONS_DRIVER } from "../../data/demo/clientMockData.js";

const DriverHistoryPage = ({ reviews }) => (
  <div className="driver-shell">
    <AppHeader
      role="driver"
      user={{ name: MOCK_DRIVER.name }}
      notifications={MOCK_NOTIFICATIONS_DRIVER}
      online={MOCK_DRIVER.online}
      onToggleOnline={() => {}}
      walletBalance={MOCK_DRIVER.walletBalance}
      minBalance={MOCK_DRIVER.minBalance}
      profilePath="/driver/profile"
      showOnlineToggle={false}
    />
    <div className="driver-body">
      <OrderHistory role="driver" reviews={reviews} />
    </div>
  </div>
);

export default DriverHistoryPage;
