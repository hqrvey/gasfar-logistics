import { useAuth } from "../../context/AuthContext.jsx";
import UserLayout from "../../layouts/UserLayout.jsx";
import OrderHistory from "../../components/common/OrderHistory.jsx";
import { MOCK_NOTIFICATIONS_USER } from "../../data/demo/clientMockData.js";

// Role-specific page: shared history UI stays in components/common.
export default function OrderHistoryPage() {
  const { user } = useAuth();
  return (
    <UserLayout user={{ name: `${user?.firstName || ""} ${user?.lastName || ""}`.trim() }} notifications={MOCK_NOTIFICATIONS_USER} hideFooter>
      <OrderHistory role="customer" />
    </UserLayout>
  );
}
