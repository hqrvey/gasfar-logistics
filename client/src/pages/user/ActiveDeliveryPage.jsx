import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiPhone, FiX } from "react-icons/fi";
import { ArrowLeft, ArrowRight, Check, Clock, MapPin, Navigation, Search, ShieldCheck, Star, TriangleAlert } from "lucide-react";
import { useBookings } from "../../hooks/useBookings.js";
import { bookingStore } from "../../services/bookingStore.js";
import { MapPicker } from "../../components/client/map/MapComponents.jsx";
import { AppHeader, ClientLayout } from "../../layouts/ClientLayout.jsx";
import { EmptyState, Field } from "../../components/client/booking/BookingUI.jsx";
import { MOCK_NOTIFICATIONS_USER } from "../../data/clientMockData.js";

/* ═══ Active Delivery (user) ═══ */
const ACTIVE_STATUS_LABEL = {
  pending:   { label: "Finding a driver for your booking", short: "Finding driver" },
  accepted:  { label: "Driver is on the way to pickup", short: "On the way" },
  picked_up: { label: "Package picked up — in transit", short: "In transit" },
  arrived:   { label: "Driver has arrived at drop-off", short: "At drop-off" },
  delivered: { label: "Delivered", short: "Delivered" },
};
const ACTIVE_STAGES = ["accepted", "picked_up", "arrived", "delivered"];
const ActiveDeliveryListCard = ({ order, onOpen }) => {
  const isPending = order.status === "pending" || !order.driver;
  if (isPending) {
    return (
      <button type="button" className="preview-card preview-card--pending" onClick={() => onOpen(order.id)}>
        <span className="preview-card__avatar preview-card__avatar--pending"><span className="preview-card__pending-pulse" /><Search size={16} /></span>
        <div className="preview-card__body">
          <div className="preview-card__row1"><span className="preview-card__status preview-card__status--pending"><span className="preview-card__pending-dots"><span /><span /><span /></span>{ACTIVE_STATUS_LABEL.pending.short}</span><span className="preview-card__id">{order.id}</span></div>
          <p className="preview-card__driver">Matching you with a nearby driver…</p>
          <p className="preview-card__route">{order.pickup.address.split(",")[0]} → {order.dropoff.address.split(",")[0]}</p>
        </div>
        <div className="preview-card__right"><span className="preview-card__eta-label">Booked</span><span className="preview-card__eta-to">{order.bookedAt || "Just now"}</span></div>
        <span className="preview-card__arrow"><ArrowRight size={16} /></span>
      </button>
    );
  }
  const etaMins = Math.max(1, Math.ceil(order.etaMins || 8));
  const headingTo = (order.status === "picked_up" || order.status === "arrived") ? "drop-off" : "pickup";
  return (
    <button type="button" className="preview-card" onClick={() => onOpen(order.id)}>
      <span className="preview-card__avatar">{order.driver.name.charAt(0)}</span>
      <div className="preview-card__body">
        <div className="preview-card__row1"><span className="preview-card__status"><span className="preview-card__live-dot" />{ACTIVE_STATUS_LABEL[order.status]?.short}</span><span className="preview-card__id">{order.id}</span></div>
        <p className="preview-card__driver">{order.driver.name}<span className="preview-card__vehicle">· {order.driver.vehicleType} · {order.driver.plate}</span></p>
        <p className="preview-card__route">{order.pickup.address.split(",")[0]} → {order.dropoff.address.split(",")[0]}</p>
      </div>
      <div className="preview-card__right"><div className="preview-card__eta"><span className="preview-card__eta-value">{etaMins}</span><span className="preview-card__eta-unit">min</span></div><span className="preview-card__eta-to">to {headingTo}</span></div>
      <span className="preview-card__arrow"><ArrowRight size={16} /></span>
    </button>
  );
};
const ActiveDeliveryTracking = ({ order, onBack }) => {
  const [driverPos, setDriverPos] = useState(order.driverLocation || order.pickup);
  const [eta, setEta] = useState(order.etaMins || 8);
  useEffect(() => {
    const target = (order.status === "picked_up" || order.status === "arrived") ? order.dropoff : order.pickup;
    const timer = setInterval(() => {
      setDriverPos((p) => { const dLat = target.lat - p.lat; const dLng = target.lng - p.lng; if (Math.hypot(dLat, dLng) < 0.0008) return p; return { lat: p.lat + dLat * 0.08, lng: p.lng + dLng * 0.08 }; });
      setEta((e) => Math.max(0, +(e - 0.25).toFixed(2)));
    }, 3000);
    return () => clearInterval(timer);
  }, [order]);
  const currentIdx = ACTIVE_STAGES.indexOf(order.status);
  const statusLabel = ACTIVE_STATUS_LABEL[order.status]?.label || "Tracking";
  const headingTo = (order.status === "picked_up" || order.status === "arrived") ? "drop-off" : "pickup";
  return (
    <div className="bd-shell">
      <div className="bd-panel">
        <div className="bd-inner">
          <button type="button" className="active-back-link" onClick={onBack}><ArrowLeft size={14} /> All active deliveries</button>
          <div className="bd-step-head">
            <div className="bd-step-meta"><span className="bd-step-count">Order {order.id}</span><span className="bd-step-divider" /><span className="bd-step-eyebrow">Live Tracking</span></div>
            <h2 className="bd-step-title">{statusLabel}</h2>
            <p className="bd-step-desc">Follow your rider on the map in real time. ETA updates automatically.</p>
          </div>
          <div className="active-eta-card">
            <div className="active-eta-card__icon"><Clock size={22} /></div>
            <div className="active-eta-card__body"><div className="active-eta-card__label">Estimated arrival</div><div className="active-eta-card__value">{eta <= 0 ? "Arriving now" : `${Math.max(1, Math.ceil(eta))} min`}</div><div className="active-eta-card__sub">to {headingTo}</div></div>
            <div className="active-eta-card__live"><span className="live-dot" /> LIVE</div>
          </div>
          <div className="active-timeline">
            {ACTIVE_STAGES.map((s, i) => {
              const done = i < currentIdx, active = i === currentIdx;
              return (<div key={s} className={`active-timeline__item${done ? " done" : ""}${active ? " active" : ""}`}><span className="active-timeline__dot">{done ? <Check size={12} /> : null}</span><span className="active-timeline__label">{ACTIVE_STATUS_LABEL[s].label}</span></div>);
            })}
          </div>
          <div className="active-driver-card">
            <div className="active-driver-card__avatar">{order.driver.name.charAt(0)}</div>
            <div className="active-driver-card__body">
              <p className="active-driver-card__name">{order.driver.name}</p>
              <p className="active-driver-card__meta"><Star size={12} fill="#F47B20" color="#F47B20" />{order.driver.rating} · {order.driver.trips} trips</p>
              <p className="active-driver-card__vehicle">{order.driver.vehicleType} · {order.driver.plate}</p>
            </div>
          </div>
          <div className="active-details-card">
            <div className="active-details-row"><span className="active-details-row__label">Call Driver</span><span className="active-details-row__value">{order.driver.phone || "—"}</span></div>
            <div className="active-details-route"><span className="route-dot pickup" /><div className="active-details-route__body"><p className="active-details-route__label">Pickup</p><p className="active-details-route__address">{order.pickup.address}</p></div></div>
            <div className="active-details-route"><span className="route-dot dropoff" /><div className="active-details-route__body"><p className="active-details-route__label">Drop-off</p><p className="active-details-route__address">{order.dropoff.address}</p></div></div>
            <div className="active-details-row"><span className="active-details-row__label">Items</span><span className="active-details-row__value">{order.itemDetails}</span></div>
            <div className="active-details-row"><span className="active-details-row__label">Payment</span><span className="active-details-row__value">{order.paymentMethod}</span></div>
            <div className="active-details-row active-details-row--price"><span className="active-details-row__label">Price</span><span className="active-details-row__value active-details-row__value--price">{order.price}</span></div>
          </div>
        </div>
      </div>
      <div className="bd-map"><MapPicker viewOnly pickupCoords={order.pickup} dropoffCoords={order.dropoff} driverCoords={driverPos} /></div>
    </div>
  );
};

/* ═══ Cancel modals ═══ */
const USER_CANCEL_REASONS = [
  { id: "changed-mind", label: "Changed my mind" },
  { id: "wrong-details", label: "Wrong pickup / drop-off details" },
  { id: "wait-too-long", label: "Taking too long to find a driver" },
  { id: "duplicate", label: "Duplicate booking" },
  { id: "other", label: "Other" },
];
const UserCancelOrderModal = ({ order, onConfirm, onClose }) => {
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const handleConfirm = () => { if (!reason || submitting) return; setSubmitting(true); const label = USER_CANCEL_REASONS.find((r) => r.id === reason)?.label || reason; setTimeout(() => onConfirm(label), 400); };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-card--narrow" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>Cancel Booking</h3><button className="modal-close" onClick={onClose} aria-label="Close"><FiX size={18} /></button></div>
        <div className="modal-body">
          <div className="modal-form">
            <div className="modal-notice"><TriangleAlert size={14} /><span>You're about to cancel <strong>{order.id}</strong>. No driver has been assigned yet, so there's no cancellation fee.</span></div>
            <div className="input-group"><label className="input-label">Reason <span className="required">*</span></label><select className="field__input select-field" value={reason} onChange={(e) => setReason(e.target.value)}><option value="">Select a reason…</option>{USER_CANCEL_REASONS.map((r) => (<option key={r.id} value={r.id}>{r.label}</option>))}</select></div>
            <Field label="Additional notes (optional)"><textarea className="field__textarea" placeholder="Anything else we should know?" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          </div>
        </div>
        <div className="modal-foot"><button className="modal-btn modal-btn--ghost" onClick={onClose}>Keep Booking</button><button className="modal-btn modal-btn--danger" disabled={!reason || submitting} onClick={handleConfirm}>{submitting ? "Cancelling…" : "Confirm Cancellation"}</button></div>
      </div>
    </div>
  );
};
const PendingDeliveryTracking = ({ order, onBack, onCancel = (...args) => {} }) => {
  const [showCancelModal, setShowCancelModal] = useState(false);
  return (
    <div className="bd-shell">
      <div className="bd-panel">
        <div className="bd-inner">
          <button type="button" className="active-back-link" onClick={onBack}><ArrowLeft size={14} /> All deliveries</button>
          <div className="bd-step-head">
            <div className="bd-step-meta"><span className="bd-step-count">Order {order.id}</span><span className="bd-step-divider" /><span className="bd-step-eyebrow">Matching</span></div>
            <h2 className="bd-step-title">Finding a driver…</h2>
            <p className="bd-step-desc">We're notifying nearby drivers about your booking. You'll be alerted the moment someone accepts.</p>
          </div>
          <div className="pending-hero">
            <div className="pending-hero__radar"><span className="pending-hero__ring" /><span className="pending-hero__ring pending-hero__ring--d1" /><span className="pending-hero__ring pending-hero__ring--d2" /><span className="pending-hero__core"><Search size={18} /></span></div>
            <div className="pending-hero__body"><div className="pending-hero__label">Searching</div><div className="pending-hero__value">Looking for a driver…</div><div className="pending-hero__sub">Drivers nearby are being notified</div></div>
          </div>
          <div className="active-details-card">
            <div className="active-details-route"><span className="route-dot pickup" /><div className="active-details-route__body"><p className="active-details-route__label">Pickup</p><p className="active-details-route__address">{order.pickup.address}</p></div></div>
            <div className="active-details-route"><span className="route-dot dropoff" /><div className="active-details-route__body"><p className="active-details-route__label">Drop-off</p><p className="active-details-route__address">{order.dropoff.address}</p></div></div>
            <div className="active-details-row"><span className="active-details-row__label">Items</span><span className="active-details-row__value">{order.itemDetails}</span></div>
            <div className="active-details-row"><span className="active-details-row__label">Payment</span><span className="active-details-row__value">{order.paymentMethod}</span></div>
            <div className="active-details-row active-details-row--price"><span className="active-details-row__label">Price</span><span className="active-details-row__value active-details-row__value--price">{order.price}</span></div>
          </div>
          <div className="active-actions"><button type="button" className="btn-user-cancel" onClick={() => setShowCancelModal(true)}><FiX size={14} /> Cancel Booking</button></div>
        </div>
      </div>
      <div className="bd-map"><MapPicker viewOnly pickupCoords={order.pickup} dropoffCoords={order.dropoff} /></div>
      {showCancelModal && (<UserCancelOrderModal order={order} onClose={() => setShowCancelModal(false)} onConfirm={(reason) => { setShowCancelModal(false); onCancel(order.id, reason); }} />)}
    </div>
  );
};

/* ⬇⬇ ActiveDeliveryPage — binabasa na galing sa store */
const ActiveDeliveryPage = () => {
  const navigate = useNavigate();
  const { bookings: orders, update: updateOrder } = useBookings();
  const [expandedId, setExpandedId] = useState(null);
  const [hoverId, setHoverId] = useState(null);
  const [tab, setTab] = useState("pending");
  const expandedOrder = orders.find((o) => o.id === expandedId) || null;
  const pendingOrders = orders.filter((o) => o.status === "pending");
  const activeOrders = orders.filter((o) => ["accepted", "picked_up", "arrived"].includes(o.status));
  const visibleOrders = tab === "pending" ? pendingOrders : activeOrders;

  const handleCancel = (orderId, reason) => {
    updateOrder(orderId, {
      status: "cancelled",
      cancelReason: reason,
      cancelledBy: "user",
      cancelledAt: new Date().toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" }),
    });
    setExpandedId(null);
    setHoverId(null);
  };

  if (orders.length === 0) {
    return (
      <ClientLayout user={{ name: "Juan Dela Cruz" }} notifications={MOCK_NOTIFICATIONS_USER} hideFooter>
        <div className="active-empty">
          <EmptyState Icon={Navigation} title="No active deliveries" message="Book a delivery to see your rider's live location and ETA here." />
          <button className="btn-bd-next" type="button" onClick={() => navigate("/place-order")}>Book a Delivery <ArrowRight size={14} /></button>
        </div>
      </ClientLayout>
    );
  }

  if (expandedOrder) {
    return (
      <ClientLayout user={{ name: "Juan Dela Cruz" }} notifications={MOCK_NOTIFICATIONS_USER} hideFooter>
        {expandedOrder.status === "pending" ? (
          <PendingDeliveryTracking order={expandedOrder} onBack={() => setExpandedId(null)} onCancel={handleCancel} />
        ) : (
          <ActiveDeliveryTracking order={expandedOrder} onBack={() => setExpandedId(null)} onCancel={handleCancel} />
        )}
      </ClientLayout>
    );
  }

  const previewOrder = visibleOrders.find((o) => o.id === hoverId) || visibleOrders[0] || null;

  return (
    <ClientLayout user={{ name: "Juan Dela Cruz" }} notifications={MOCK_NOTIFICATIONS_USER} hideFooter>
      <div className="bd-shell">
        <div className="bd-panel">
          <div className="bd-inner">
            <div className="bd-step-head">
              <div className="bd-step-meta"><span className="bd-step-count">{pendingOrders.length + activeOrders.length} Total</span><span className="bd-step-divider" /><span className="bd-step-eyebrow">Bookings and Deliveries</span></div>
              <h2 className="bd-step-title">Manage Bookings and Deliveries</h2>
              <p className="bd-step-desc">Track ongoing deliveries and follow up on bookings waiting for a driver.</p>
            </div>
            <div className="driver-home__tabs">
              <button className={`driver-home__tab ${tab === "pending" ? "active" : ""}`} onClick={() => { setTab("pending"); setHoverId(null); }}>Pending Bookings<span className="driver-home__tab-count">{pendingOrders.length}</span></button>
              <button className={`driver-home__tab ${tab === "active" ? "active" : ""}`} onClick={() => { setTab("active"); setHoverId(null); }}>Track Ongoing<span className="driver-home__tab-count">{activeOrders.length}</span></button>
            </div>
            {visibleOrders.length === 0 ? (
              <div className="manage-empty">
                <EmptyState Icon={tab === "pending" ? Clock : Navigation} title={tab === "pending" ? "No pending bookings" : "No active deliveries"} message={tab === "pending" ? "Any booking that hasn't matched with a driver yet will show up here." : "Once a driver accepts your booking, it moves here for live tracking."} />
              </div>
            ) : (
              <div className="active-delivery-list">
                {visibleOrders.map((o) => (<div key={o.id} onMouseEnter={() => setHoverId(o.id)} onMouseLeave={() => setHoverId(null)}><ActiveDeliveryListCard order={o} onOpen={setExpandedId} /></div>))}
              </div>
            )}
          </div>
        </div>
        <div className="bd-map">
          {previewOrder ? (<MapPicker viewOnly pickupCoords={previewOrder.pickup} dropoffCoords={previewOrder.dropoff} driverCoords={previewOrder.driverLocation} />) : (<div className="bd-map__placeholder"><MapPin size={36} /><p>No route to preview</p></div>)}
        </div>
      </div>
    </ClientLayout>
  );
};


export default ActiveDeliveryPage;
