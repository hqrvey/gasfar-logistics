import UserLayout from "../../layouts/UserLayout.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import NotificationsView from "../../components/common/NotificationsView.jsx";
import { MOCK_NOTIFICATIONS_USER } from "../../data/demo/clientMockData.js";

export default function UserNotificationsPage() {
  const { user } = useAuth();
  return (
    <UserLayout user={{ name: `${user?.firstName || ""} ${user?.lastName || ""}`.trim() }} notifications={MOCK_NOTIFICATIONS_USER} hideFooter>
      <NotificationsView role="customer" />
    </UserLayout>
  );
}
