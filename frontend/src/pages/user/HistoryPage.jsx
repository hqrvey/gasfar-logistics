import UserLayout from "../../layouts/UserLayout.jsx";
import OrderHistory from "../../components/common/OrderHistory.jsx";
import { MOCK_NOTIFICATIONS_USER } from "../../data/demo/clientMockData.js";

// Role-specific page: shared history UI stays in components/common.
export default function OrderHistoryPage({ reviews, onSubmitReview }) {
  return (
    <UserLayout user={{ name: "Juan Dela Cruz" }} notifications={MOCK_NOTIFICATIONS_USER} hideFooter>
      <OrderHistory role="user" reviews={reviews} onSubmitReview={onSubmitReview} />
    </UserLayout>
  );
}
