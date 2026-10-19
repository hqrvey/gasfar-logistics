import UserLayout from "../../layouts/UserLayout.jsx";
import NotificationsView from "../../components/common/NotificationsView.jsx";
import { MOCK_NOTIFICATIONS_USER } from "../../data/demo/clientMockData.js";

export default function UserNotificationsPage() {
  return (
    <UserLayout user={{ name: "Juan Dela Cruz" }} notifications={MOCK_NOTIFICATIONS_USER} hideFooter>
      <NotificationsView role="user" />
    </UserLayout>
  );
}
