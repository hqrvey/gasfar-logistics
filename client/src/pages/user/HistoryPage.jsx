import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { FiPhone } from "react-icons/fi";
import { useBookings } from "../../hooks/useBookings.js";
import { useReviews } from "../../hooks/useReviews.js";
import { groupOf } from "../../utils/helpers.js";
import { MOCK_DRIVER, MOCK_NOTIFICATIONS_USER } from "../../data/clientMockData.js";
import { MapPicker } from "../../components/client/map/MapComponents.jsx";
import { ClientLayout } from "../../layouts/ClientLayout.jsx";
import { StatusBadge, DriverAvatar, UserReviewCard, RouteStrip } from "../../components/client/review/ReviewComponents.jsx";

const STATUS_TABS = ["Completed", "Cancelled"];
const HistoryCard = ({ order, role, onExpand }) => {
  const counterpart = role === "driver" ? { name: order.customerName, meta: `${order.vehicleType} · ${order.bookedAt || order.timeDate}` } : { name: order.driver?.name || order.driverName || "—", meta: `${order.vehicleType} · ${order.bookedAt || order.timeDate}` };
  return (
    <button type="button" className="order-card" onClick={() => onExpand(order)}>
      <div className="order-card__top"><StatusBadge status={order.status} /><span className="order-card__id">{order.id}</span></div>
      <div className="order-card__driver"><DriverAvatar name={counterpart.name} /><div><p className="order-card__driver-name">{counterpart.name}</p><p className="order-card__meta">{counterpart.meta}</p></div></div>
      <RouteStrip pickup={order.pickup} dropoff={order.dropoff} labels={false} />
      {order.contactNumber && (<div className="order-card__row"><FiPhone size={12} /><span>{order.contactNumber}</span></div>)}
      <div className="order-card__footer"><span className="order-card__items">{order.itemDetails}</span><span className="order-card__price">{order.price}</span></div>
      {order.completedAt && (<div className="order-card__timeline-row"><span>Completed</span><span>{order.completedAt}</span></div>)}
      {order.cancelledAt && (<div className="order-card__timeline-row"><span>Cancelled</span><span>{order.cancelledAt}</span></div>)}
    </button>
  );
};
const HistoryDetailsPanel = ({ order, role, onBack, review, onSubmitReview }) => (
  <div className="history-detail-panel">
    <button type="button" className="active-back-link" onClick={onBack}><ArrowLeft size={14} /> Back to history</button>
    <div className="history-detail-panel__head"><StatusBadge status={order.status} /><span className="history-detail-panel__id">{order.id}</span></div>
    <div className="history-detail-panel__person">
      <DriverAvatar name={role === "driver" ? order.customerName : (order.driver?.name || order.driverName)} />
      <div className="history-detail-panel__person-body">
        <p className="history-detail-panel__name">{role === "driver" ? order.customerName : (order.driver?.name || order.driverName)}</p>
        <p className="history-detail-panel__meta">{order.vehicleType} · {order.bookedAt || order.timeDate}</p>
      </div>
    </div>
    <RouteStrip pickup={order.pickup} dropoff={order.dropoff} />
    <div className="order-expand__details">
      <div className="detail-row"><span className="detail-label">Items</span><span className="detail-value">{order.itemDetails}</span></div>
      <div className="detail-row"><span className="detail-label">{role === "driver" ? "Customer Phone" : "Driver Phone"}</span><span className="detail-value">{order.contactNumber || "—"}</span></div>
      <div className="detail-row"><span className="detail-label">Price</span><span className="detail-value detail-value--price">{order.price}</span></div>
      {order.completedAt && <div className="detail-row"><span className="detail-label">Completed</span><span className="detail-value">{order.completedAt}</span></div>}
      {order.cancelledAt && <div className="detail-row"><span className="detail-label">Cancelled</span><span className="detail-value">{order.cancelledAt}</span></div>}
    </div>
    {groupOf(order.status) === "completed" && (<UserReviewCard order={{ ...order, driverName: order.driver?.name || order.driverName }} existingReview={review} onSubmit={onSubmitReview} readOnly={role === "driver"} />)}
  </div>
);

const HistoryPage = ({ role, reviews = {}, onSubmitReview = (...args) => {} }) => {
  const isDriver = role === "driver";
  const { bookings: allBookings } = useBookings();
  const source = allBookings.filter((o) => {
    const isMine = isDriver
  ? o.driver?.name === MOCK_DRIVER.name
  : o.customerName === "Juan Dela Cruz";
    const done = ["delivered", "completed", "cancelled"].includes(o.status);
    return isMine && done;
  });
  const tabs = STATUS_TABS;
  const [activeTab, setActiveTab] = useState("Completed");
  const [expanded, setExpanded] = useState(null);
  const filtered = source.filter((o) => groupOf(o.status) === activeTab.toLowerCase());
  if (expanded) {
    return (
      <div className="history-split">
        <aside className="history-split__panel">
          <HistoryDetailsPanel order={expanded} role={role} onBack={() => setExpanded(null)} review={reviews[expanded.id]} onSubmitReview={isDriver ? undefined : (payload) => onSubmitReview(expanded.id, payload)} />
        </aside>
        <section className="history-split__map"><MapPicker key={expanded.id} viewOnly pickupCoords={expanded.pickup} dropoffCoords={expanded.dropoff} /></section>
      </div>
    );
  }
  return (
    <div className="history-page-wrap">
      <div className="history-body">
        <h1 className="order-history__title">{isDriver ? "Booking History" : "Order History"}</h1>
        <div className="order-history__tabs">
          {tabs.map((tab) => (<button key={tab} className={`history-tab ${activeTab === tab ? "active" : ""}`} onClick={() => { setActiveTab(tab); setExpanded(null); }}>{tab}<span className="history-tab__count">{source.filter((o) => groupOf(o.status) === tab.toLowerCase()).length}</span></button>))}
        </div>
        <div className="order-list">
          {filtered.length === 0 ? (<div className="order-empty"><p>No {activeTab.toLowerCase()} {isDriver ? "bookings" : "orders"}.</p></div>) : (filtered.map((order) => (<HistoryCard key={order.id} order={order} role={role} onExpand={setExpanded} />)))}
        </div>
      </div>
    </div>
  );
};
const OrderHistoryPage = ({ reviews, onSubmitReview }) => (
  <ClientLayout user={{ name: "Juan Dela Cruz" }} notifications={MOCK_NOTIFICATIONS_USER} hideFooter>
    <HistoryPage role="user" reviews={reviews} onSubmitReview={onSubmitReview} />
  </ClientLayout>
);



export { HistoryPage, OrderHistoryPage };
