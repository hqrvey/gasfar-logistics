import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiX } from "react-icons/fi";
import { ArrowLeft, ArrowRight, Check, Clock, MapPin, Navigation, Package as PackageIcon, Search, Star, TriangleAlert } from "lucide-react";
import { useBookingNotifications } from "../../context/BookingNotificationsContext.jsx";
import { bookingService } from "../../services/bookingService.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { ACTIVE_DELIVERY_STATUSES, DELIVERY_STATUS_LABELS } from "../../utils/helpers.js";
import { MapPicker } from "../../components/common/MapComponents.jsx";
import { isGpsRecent } from "../../utils/gpsFreshness.js";
import UserLayout from "../../layouts/UserLayout.jsx";
import { BookingRequestCard, OngoingDeliveryCard, EmptyState, Field, FareBreakdown } from "../../components/common/BookingUI.jsx";
import { MOCK_NOTIFICATIONS_USER } from "../../data/demo/clientMockData.js";

/* ═══ Active Delivery (user) ═══ */
const ACTIVE_STATUS_LABEL = {
  pending: { label: "Finding a driver for your booking", short: "Finding driver" },
  accepted: { label: DELIVERY_STATUS_LABELS.accepted, short: "Driver assigned" },
  heading_pickup: { label: "Driver is on the way to pickup", short: "On the way" },
  at_pickup: { label: DELIVERY_STATUS_LABELS.at_pickup, short: "At pickup" },
  picked_up: { label: DELIVERY_STATUS_LABELS.picked_up, short: "In transit" },
  arrived: { label: DELIVERY_STATUS_LABELS.arrived, short: "At drop-off" },
  delivered: { label: DELIVERY_STATUS_LABELS.delivered, short: "Delivered" },
};


// List cards intentionally never call the routing API. A customer opens the
// booking details to see the road-based ETA calculated by that booking's map.

function prettyPayment(order) {
  if (String(order.paymentMethod).toLowerCase() !== "cash") return order.paymentMethod || "—";
  return order.paymentSide === "sender"
    ? "Cash · collected by driver after pickup"
    : "Cash · paid by recipient";
}

function pesoAmount(value, fallback) {
  const number = Number(value);
  if (value !== undefined && value !== null && Number.isFinite(number)) {
    return `₱${number.toLocaleString("en-PH")}`;
  }
  return fallback || "—";
}

function bookingSchedule(order) {
  return order.scheduleType === "scheduled" || order.scheduleType === "later"
    ? [order.scheduleDate, order.scheduleTime].filter(Boolean).join(" · ")
    : "Now (ASAP)";
}

// Displays a road ETA only if Geoapify returned an actual driving route.
// MapLibre remains mounted in its existing page; this does not create a map.
function BookingEta({ order }) {
  if (order.status === "accepted" && !order.journeyStartedAt) return <span className="preview-card__eta-to">Not departed</span>;
  if (order.status === "at_pickup") return <span className="preview-card__eta-to">At pickup</span>;
  if (order.status === "arrived") return <span className="preview-card__eta-to">At drop-off</span>;
  if ((order.status === "accepted" && order.journeyStartedAt) || order.status === "picked_up") {
    // Do not fetch driver-to-destination directions for every list card.
    // The selected booking's MapPicker supplies the ETA when it is opened.
    return <span className="preview-card__eta-to">{order.price || "—"}</span>;
  }
  return null;
}

// The tracking UI uses FIVE shared milestones on both customer and driver views.
// "accepted" stays a separate header state; the visible stepper starts once the
// driver is ready to head to pickup.
const ACTIVE_STAGES = ["heading_pickup", "at_pickup", "picked_up", "arrived", "delivered"];
const TIMELINE_LABELS = {
  heading_pickup: "Head to pickup",
  at_pickup: "Arrived at pickup",
  picked_up: "Package picked up",
  arrived: "Arrived at drop-off",
  delivered: "Delivered",
};
const TIMELINE_DESCRIPTIONS = {
  heading_pickup: "Driver is on the way to the pickup location",
  at_pickup: "Driver has reached the pickup point",
  picked_up: "Parcel is already with the driver",
  arrived: "Driver reached the drop-off location",
  delivered: "Booking has been completed successfully",
};
const TIMELINE_ICONS = {
  heading_pickup: Navigation,
  at_pickup: MapPin,
  picked_up: PackageIcon,
  arrived: MapPin,
  delivered: Check,
};
function visualStatus(order) {
  if (order.status === "accepted" && order.journeyStartedAt) return "heading_pickup";
  return order.status;
}
function currentTimelineStatus(order) {
  return visualStatus(order) === "accepted" ? "heading_pickup" : visualStatus(order);
}
function statusTone(order) {
  if (order.status === "pending" || !order.driver) return "pending";
  if (order.status === "accepted" && !order.journeyStartedAt) return "assigned";
  if (order.status === "accepted" && order.journeyStartedAt) return "enroute";
  if (order.status === "picked_up") return "transit";
  if (order.status === "at_pickup" || order.status === "arrived") return "arrived";
  if (order.status === "delivered") return "done";
  return "enroute";
}
function shortRouteText(order) {
  const pickup = order.pickup?.address?.split(",")?.[0] || "Pickup";
  const dropoff = order.dropoff?.address?.split(",")?.[0] || "Drop-off";
  return `${pickup} → ${dropoff}`;
}
const ActiveDeliveryListCard = ({ order, onOpen }) => {
  const isPending = order.status === "pending" || !order.driver;
  if (isPending) {
    // Share the exact same card as the driver's available-job list.
    // Only the click destination differs between the two pages.
    return <BookingRequestCard booking={order} onOpen={() => onOpen(order.id)} />;
  }

  const displayStatus = visualStatus(order);
  const driver = order.driver || {};
  const vehicleDetails = [driver.vehicleType, driver.plate].filter(Boolean).join(" · ");
  return (
    <OngoingDeliveryCard
      bookingId={order.id}
      name={driver.name || "Assigned driver"}
      details={"Driver"}
      route={shortRouteText(order)}
      status={displayStatus === "accepted" ? "Driver assigned" : ACTIVE_STATUS_LABEL[displayStatus]?.short || "In progress"}
      tone={statusTone(order)}
      right={<BookingEta order={order} />}
      onOpen={() => onOpen(order.id)}
    />
  );
};
const ActiveDeliveryTracking = ({ order, onBack, onHistory, onCancel, pendingCancel, onUndo }) => {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [pickupEta, setPickupEta] = useState(null);
  const [now, setNow] = useState(Date.now());

  // Update the "last GPS update" message even if no new position arrives.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  // The timeline is calculated from the SINGLE status returned by Express.
  // The customer cannot advance these steps: only the assigned driver can.
  const timelineStatus = currentTimelineStatus(order);
  const currentIdx = ACTIVE_STAGES.indexOf(timelineStatus);
  const finished = order.status === "delivered" || order.status === "cancelled";
  // GPS older than two minutes is STALE, but the last known real location stays visible.
  const gpsFresh = isGpsRecent(order, now);
  // "accepted" means a driver claimed this booking. The driver only starts
  // travelling after clicking Head to Pickup, which saves journeyStartedAt.
  const waitingToDepart = order.status === "accepted" && !order.journeyStartedAt;
  const headingToPickup = order.status === "accepted" && Boolean(order.journeyStartedAt);
  const statusLabel = order.status === "accepted" && !order.journeyStartedAt
    ? "Driver accepted your booking"
    : ACTIVE_STATUS_LABEL[visualStatus(order)]?.label || "Tracking";

  let arrivalMessage = "Delivery in progress";
  if (waitingToDepart) arrivalMessage = "Your driver is preparing to head to pickup";
  if (headingToPickup) arrivalMessage = !gpsFresh ? "Waiting for a recent GPS update…" : pickupEta === 0 ? "Driver is near pickup" : pickupEta != null ? `${pickupEta} min to pickup` : "Calculating pickup ETA…";
  if (order.status === "at_pickup") arrivalMessage = "Driver is at the pickup location";
  if (order.status === "picked_up") arrivalMessage = !gpsFresh ? "Waiting for a recent GPS update…" : pickupEta === 0 ? "Driver is near drop-off" : pickupEta != null ? `${pickupEta} min to drop-off` : "Calculating drop-off ETA…";
  if (order.status === "arrived") arrivalMessage = "Driver is at the drop-off location";
  if (order.status === "delivered") arrivalMessage = "Delivery completed";
  if (order.status === "cancelled") arrivalMessage = "This delivery was cancelled";

  // MapPicker supplies a real Geoapify road ETA. No simulated countdown.
  const handleDriverRoute = (route) => setPickupEta(route?.duration ?? null);
  // When the driver changes travel legs, do not show the previous leg's ETA.
  useEffect(() => { setPickupEta(null); }, [order.id, order.status]);
  const waitingForSenderCash = order.status === "picked_up" &&
    order.paymentMethod?.toLowerCase() === "cash" &&
    order.paymentSide === "sender" && Number(order.amountDue) > 0 && !order.cashCollectedAt;

  return (
    <div className="bd-shell">
      <div className="bd-panel">
        <div className="bd-inner">
          <button type="button" className="active-back-link" onClick={onBack}>
            <ArrowLeft size={14} /> All active deliveries
          </button>
          <div className="bd-step-head">
            <div className="bd-step-meta">
              <span className="bd-step-count">Order {order.id}</span>
              <span className="bd-step-divider" />
              <span className="bd-step-eyebrow">{finished ? "Delivery update" : "Delivery tracking"}</span>
            </div>
            <h2 className="bd-step-title">{statusLabel}</h2>
            <p className="bd-step-desc">
              {finished ? arrivalMessage : "Follow your delivery progress below."}
            </p>
          </div>
          {waitingForSenderCash && (
            <div className="modal-notice delivery-cash-notice" role="status">
              <TriangleAlert size={18} />
              <span>Your package has been picked up. Please pay <strong>{pesoAmount(order.amountDue, order.price)}</strong> in cash to the driver. The driver must confirm receipt before proceeding to drop-off.</span>
            </div>
          )}
          <div className="active-eta-card" role="status" aria-live="polite">
            <div className="active-eta-card__icon">
              {order.status === "at_pickup" || order.status === "arrived" || order.status === "delivered"
                ? <Check size={22} /> : <Clock size={22} />}
            </div>
            <div className="active-eta-card__body">
              <div className="active-eta-card__label">
                {waitingToDepart ? "Driver status" :
                  order.status === "at_pickup" || order.status === "arrived" ? "Arrived" :
                  headingToPickup || order.status === "picked_up" ? "Estimated arrival" : "Delivery status"}
              </div>
              <div className="active-eta-card__value">
                {waitingToDepart ? "Getting ready" :
                  order.status === "at_pickup" ? "At pickup" :
                  order.status === "arrived" ? "At drop-off" :
                  (headingToPickup || order.status === "picked_up") && pickupEta !== null && gpsFresh
                    ? `${Math.max(1, Math.ceil(pickupEta))} min` : arrivalMessage}
              </div>
              <div className="active-eta-card__sub">
                {waitingToDepart ? "ETA shows once your driver clicks Head to Pickup" :
                  headingToPickup || order.status === "picked_up"
                    ? gpsFresh ? `To ${headingToPickup ? "pickup" : "drop-off"} · updated from the driver's GPS` : "Last known GPS shown on map; ETA may be outdated"
                    : finished ? "This booking is no longer active" :
                      gpsFresh ? "Driver GPS updated recently" : "Last known GPS shown on map"}
              </div>
            </div>
            {gpsFresh && !finished && (
              <div className="active-eta-card__live"><span className="live-dot" /> GPS</div>
            )}
          </div>

          {headingToPickup && (
            <p className="active-cancel-note">
              Your driver has started heading to pickup. You cannot cancel from this page; contact support for assistance.
            </p>
          )}

          {order.status !== "cancelled" && (
            <div className="active-timeline active-timeline--rich" aria-label="Delivery progress">
              {ACTIVE_STAGES.map((status, index) => {
                const done = index < currentIdx || order.status === "delivered";
                const active = index === currentIdx && order.status !== "delivered";
                const Icon = TIMELINE_ICONS[status];
                return (
                  <div key={status} className={`active-timeline__item${done ? " done" : ""}${active ? " active" : ""}`}>
                    <span className="active-timeline__dot">{done ? <Check size={12} /> : <Icon size={12} />}</span>
                    <span className="active-timeline__copy">
                      <span className="active-timeline__label">{TIMELINE_LABELS[status]}</span>
                      <span className="active-timeline__desc">{TIMELINE_DESCRIPTIONS[status]}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {finished && (
            <div className="active-actions">
              <button type="button" className="btn-bd-next" onClick={onHistory}>
                View delivery history <ArrowRight size={14} />
              </button>
            </div>
          )}

          {order.driver && (
            <div className="active-driver-card">
              <div className="active-driver-card__avatar">
                {order.driver.photo ? <img src={order.driver.photo} alt="Driver profile" className="active-driver-card__photo" /> : (order.driver.name?.charAt(0) || "D")}
              </div>
              <div className="active-driver-card__body">
                <p className="active-driver-card__name">{order.driver.name}</p>
                <p className="active-driver-card__meta"><Star size={12} fill="#F47B20" color="#F47B20" />{order.driver.rating} · {order.driver.trips} trips</p>
                <p className="active-driver-card__vehicle">{order.driver.vehicleType} · {order.driver.plate}</p>
              </div>
            </div>
          )}
          <div className="active-details-card">
            <div className="active-details-row"><span className="active-details-row__label">Call Driver</span><span className="active-details-row__value">{order.driver?.phone || "—"}</span></div>
            <div className="active-details-route"><span className="route-dot pickup" /><div className="active-details-route__body"><p className="active-details-route__label">Pickup</p><p className="active-details-route__address">{order.pickup.address}</p></div></div>
            <div className="active-details-route"><span className="route-dot dropoff" /><div className="active-details-route__body"><p className="active-details-route__label">Drop-off</p><p className="active-details-route__address">{order.dropoff.address}</p></div></div>
            <div className="active-details-row"><span className="active-details-row__label">Recipient</span><span className="active-details-row__value">{order.recipientName || "—"}</span></div>
            <div className="active-details-row"><span className="active-details-row__label">Recipient phone</span><span className="active-details-row__value">{order.recipientPhone || "—"}</span></div>
            <div className="active-details-row"><span className="active-details-row__label">Vehicle</span><span className="active-details-row__value">{order.vehicleType || "—"}</span></div>
            <div className="active-details-row"><span className="active-details-row__label">Delivery type</span><span className="active-details-row__value">{order.deliveryType === "priority" ? "Priority" : "Regular"}</span></div>
            <div className="active-details-row"><span className="active-details-row__label">Items</span><span className="active-details-row__value">{order.itemDetails}</span></div>
            <div className="active-details-row"><span className="active-details-row__label">Weight</span><span className="active-details-row__value">{order.itemWeight || "—"}</span></div>
            {order.handlingInstructions?.length > 0 && <div className="active-details-row"><span className="active-details-row__label">Handling</span><span className="active-details-row__value">{order.handlingInstructions.join(", ")}</span></div>}
            {order.notesToDriver && <div className="active-details-row"><span className="active-details-row__label">Notes to driver</span><span className="active-details-row__value">{order.notesToDriver}</span></div>}
            <div className="active-details-row"><span className="active-details-row__label">Item photo</span><span className="active-details-row__value">{order.itemPhotoUrl ? <a href={(import.meta.env.VITE_API_URL || "http://localhost:5001/api") + order.itemPhotoUrl} target="_blank" rel="noreferrer">View uploaded photo</a> : "No photo attached"}</span></div>
            <div className="active-details-row"><span className="active-details-row__label">Payment</span><span className="active-details-row__value">{prettyPayment(order)}{order.cashCollectedAt ? " · Collected" : ""}</span></div>
            <div className="active-details-row active-details-row--price"><span className="active-details-row__label">Price</span><span className="active-details-row__value active-details-row__value--price">{order.price}</span></div>
          </div>

          {/* Keep cancellation INSIDE the scrollable details panel.
              bd-shell must contain only two layout columns: bd-panel and bd-map.
              The modal itself can remain outside because it is a fixed overlay. */}
          {waitingToDepart && !pendingCancel && (
            <div className="active-actions">
              <button type="button" className="btn-user-cancel" onClick={() => setShowCancelModal(true)}>
                Cancel before pickup
              </button>
            </div>
          )}
        </div>
      </div>
      {showCancelModal && <UserCancelOrderModal order={order} onClose={() => setShowCancelModal(false)}
        onConfirm={async reason => { await onCancel(order.id, reason); setShowCancelModal(false); }} />}
      <div className="bd-map">
        <MapPicker
          key={order.id}
          viewOnly
          focusOnRoute
          showDriverMarker
          pickupCoords={order.pickup}
          dropoffCoords={order.dropoff}
          driverCoords={order.driverLocation || null}
          showDriverToPickup={order.status === "accepted" || order.status === "picked_up"}
          driverRouteTarget={order.status === "picked_up" ? "dropoff" : "pickup"}
          onDriverRouteChange={handleDriverRoute}
        />
      </div>
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
  async function handleConfirm() {
    if (!reason || submitting) return;
    setSubmitting(true);
    const label = USER_CANCEL_REASONS.find((r) => r.id === reason)?.label || reason;
    try {
      await onConfirm(notes ? `${label}: ${notes.trim()}` : label);
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-card--narrow" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>Cancel Booking</h3><button className="modal-close" onClick={onClose} aria-label="Close"><FiX size={18} /></button></div>
        <div className="modal-body">
          <div className="modal-form">
            <div className="modal-notice"><TriangleAlert size={14} /><span>You're about to cancel <strong>{order.id}</strong>. Your booking will be cancelled after a five-second undo window. The backend enforces any applicable rules.</span></div>
            <div className="input-group"><label className="input-label">Reason <span className="required">*</span></label><select className="field__input select-field" value={reason} onChange={(e) => setReason(e.target.value)}><option value="">Select a reason…</option>{USER_CANCEL_REASONS.map((r) => (<option key={r.id} value={r.id}>{r.label}</option>))}</select></div>
            <Field label="Additional notes (optional)"><textarea className="field__textarea" placeholder="Anything else we should know?" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          </div>
        </div>
        <div className="modal-foot"><button className="modal-btn modal-btn--ghost" onClick={onClose}>Keep Booking</button><button className="modal-btn modal-btn--danger" disabled={!reason || submitting} onClick={handleConfirm}>{submitting ? "Cancelling…" : "Confirm Cancellation"}</button></div>
      </div>
    </div>
  );
};
const PendingDeliveryTracking = ({ order, onBack, onCancel = (...args) => {}, pendingCancel, onUndo }) => {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const scheduledAt = order.scheduleDate && order.scheduleTime &&
    new Date(`${order.scheduleDate}T${order.scheduleTime}:00+08:00`).getTime();
  const waitingForSchedule = (order.scheduleType === "scheduled" || order.scheduleType === "later") &&
    Number.isFinite(scheduledAt) && scheduledAt - Date.now() > 60 * 60 * 1000;
  return (
    <div className="bd-shell">
      <div className="bd-panel">
        <div className="bd-inner">
          <button type="button" className="active-back-link" onClick={onBack}><ArrowLeft size={14} /> All deliveries</button>
          <div className="bd-step-head">
            <div className="bd-step-meta"><span className="bd-step-count">Order {order.id}</span><span className="bd-step-divider" /><span className="bd-step-eyebrow">Matching</span></div>
            <h2 className="bd-step-title">{waitingForSchedule ? "Delivery scheduled" : "Finding a driver…"}</h2>
            <p className="bd-step-desc">{waitingForSchedule
              ? "Your booking is saved. Driver matching begins closer to the scheduled pickup time. Check this page for updates."
              : "Your booking is awaiting a driver. This page refreshes for acceptance updates."}</p>
          </div>
          <div className="pending-hero">
            <div className="pending-hero__radar"><span className="pending-hero__ring" /><span className="pending-hero__ring pending-hero__ring--d1" /><span className="pending-hero__ring pending-hero__ring--d2" /><span className="pending-hero__core"><Search size={18} /></span></div>
            <div className="pending-hero__body"><div className="pending-hero__label">{waitingForSchedule ? "Scheduled" : "Searching"}</div><div className="pending-hero__value">{waitingForSchedule ? "Waiting for pickup window" : "Looking for a driver…"}</div><div className="pending-hero__sub">{waitingForSchedule ? "Matching starts closer to your scheduled time" : "Checking for an available driver"}</div></div>
          </div>
          <div className="active-details-card">
            <div className="active-details-route"><span className="booking-pending-card__pin booking-pending-card__pin--pickup"><MapPin size={16} /></span><div className="active-details-route__body"><p className="active-details-route__label">Pickup</p><p className="active-details-route__address">{order.pickup?.address || "—"}</p></div></div>
            <div className="active-details-route"><span className="booking-pending-card__pin booking-pending-card__pin--dropoff"><MapPin size={16} /></span><div className="active-details-route__body"><p className="active-details-route__label">Drop-off</p><p className="active-details-route__address">{order.dropoff?.address || "—"}</p></div></div>
            <div className="active-details-row"><span className="active-details-row__label">Recipient</span><span className="active-details-row__value">{order.recipientName || "—"}</span></div>
            <div className="active-details-row"><span className="active-details-row__label">Recipient's phone</span><span className="active-details-row__value">{order.recipientPhone || "—"}</span></div>
            {order.recipientUnit && <div className="active-details-row"><span className="active-details-row__label">Unit / Floor</span><span className="active-details-row__value">{order.recipientUnit}</span></div>}
            <div className="active-details-row"><span className="active-details-row__label">Vehicle</span><span className="active-details-row__value">{order.vehicleType || "—"}</span></div>
            <div className="active-details-row"><span className="active-details-row__label">Delivery type</span><span className="active-details-row__value">{order.deliveryType === "priority" ? "Priority" : "Regular"}</span></div>
            <div className="active-details-row"><span className="active-details-row__label">Items</span><span className="active-details-row__value">{order.itemDetails || "—"}</span></div>
            <div className="active-details-row"><span className="active-details-row__label">Weight</span><span className="active-details-row__value">{order.itemWeight || "—"}</span></div>
            {order.handlingInstructions?.length > 0 && <div className="active-details-row"><span className="active-details-row__label">Handling</span><span className="active-details-row__value">{order.handlingInstructions.join(", ")}</span></div>}
            {order.notesToDriver && <div className="active-details-row"><span className="active-details-row__label">Notes to driver</span><span className="active-details-row__value">{order.notesToDriver}</span></div>}
            <div className="active-details-row"><span className="active-details-row__label">Item photo</span><span className="active-details-row__value">{order.itemPhotoUrl ? <a href={(import.meta.env.VITE_API_URL || "http://localhost:5001/api") + order.itemPhotoUrl} target="_blank" rel="noreferrer">View uploaded photo</a> : "No photo attached"}</span></div>
            <div className="active-details-row"><span className="active-details-row__label">Schedule</span><span className="active-details-row__value">{bookingSchedule(order)}</span></div>
            <div className="active-details-row"><span className="active-details-row__label">Payment</span><span className="active-details-row__value">{prettyPayment(order)}</span></div>
          </div>
          {/* Keep the detailed price card separate from the white booking-details card. */}
          {order.fareBreakdown ? <FareBreakdown breakdown={order.fareBreakdown} vehicleLabel={order.vehicleType} credit={Number(order.creditApplied) || 0} /> :
            <div className="active-details-card"><div className="active-details-row"><span className="active-details-row__label">Total fare</span><strong>{order.price}</strong></div></div>}
          {pendingCancel && pendingCancel.orderId === order.id ? <div className="feature-notice">Cancellation will be submitted in 5 seconds. <button onClick={onUndo}>Undo cancellation</button></div> : <div className="active-actions"><button type="button" className="btn-user-cancel" onClick={() => setShowCancelModal(true)}><FiX size={14} /> Cancel Booking</button></div>}
        </div>
      </div>
      <div className="bd-map"><MapPicker key={order.id} viewOnly focusOnRoute pickupCoords={order.pickup} dropoffCoords={order.dropoff} /></div>
      {showCancelModal && (<UserCancelOrderModal order={order} onClose={() => setShowCancelModal(false)} onConfirm={async (reason) => { await onCancel(order.id, reason); setShowCancelModal(false); }} />)}
    </div>
  );
};

// CUSTOMER TRACKING: Displays the SAME MongoDB booking the driver changes.
// Every refresh gets the latest stage + GPS point from GET /api/bookings.
const ActiveDeliveryPage = () => {
  const navigate = useNavigate();
  // "orders" is the JSON booking list from Express, stored in React state.
  const { bookings: orders, loading, error: loadError, refresh } = useBookingNotifications().bookingFeed;
  const { user } = useAuth();
  const [actionError, setActionError] = useState("");
  const [pendingCancel, setPendingCancel] = useState(null);
  const [undoSeconds, setUndoSeconds] = useState(5);
  const cancelTimer = React.useRef(null);
  const pendingCancelRef = React.useRef(null);
  // A one-second timer updates only the Undo label, not the database.
  useEffect(() => {
    if (!pendingCancel) return;
    setUndoSeconds(5);
    const id = setInterval(() => setUndoSeconds((previous) => Math.max(0, previous - 1)), 1000);
    return () => clearInterval(id);
  }, [pendingCancel?.orderId]);
  // Leaving the page must NOT bypass the user's five-second Undo window.
  // An unsent cancellation is discarded; the booking remains unchanged.
  useEffect(() => () => {
    if (cancelTimer.current) clearTimeout(cancelTimer.current);
    pendingCancelRef.current = null;
  }, []);
  const [expandedId, setExpandedId] = useState(null);
  const [tab, setTab] = useState("pending");
  const expandedOrder = orders.find((o) => o.id === expandedId) || null;
  // Split records by status for the two existing tabs.
  const pendingOrders = orders.filter((o) => o.status === "pending" && o.id !== pendingCancel?.orderId);
  const activeOrders = orders.filter((o) => ACTIVE_DELIVERY_STATUSES.includes(o.status) && o.id !== pendingCancel?.orderId);
  const visibleOrders = tab === "pending" ? pendingOrders : activeOrders;

  // Sends PATCH /api/bookings/:id/cancel; backend checks customer ownership.
  async function handleCancel(orderId, reason) {
    // Delay the request for five seconds. Clicking Undo cancels this timer.
    // Until the timer fires, MongoDB booking status stays unchanged.
    if (cancelTimer.current) clearTimeout(cancelTimer.current);
    pendingCancelRef.current = { orderId, reason };
    setPendingCancel({ orderId, reason });
    setExpandedId(null); // Return to list so the global Undo toast is visible.
    cancelTimer.current = setTimeout(async () => {
      pendingCancelRef.current = null;
      setPendingCancel(null);
      cancelTimer.current = null;
      setActionError("");
      try {
      await bookingService.cancel(orderId, reason);
      // Fetch again so the cancelled booking disappears from active tracking.
      await refresh();
      setExpandedId(null);
    } catch (error) {
      setActionError(error.message);
      alert(error.message);
      }
    }, 5000);
  }

  function handleUndoCancellation() {
    clearTimeout(cancelTimer.current);
    cancelTimer.current = null;
    pendingCancelRef.current = null;
    setPendingCancel(null);
  }
  const undoToast = pendingCancel && (
    <div className="undo-toast" role="status" aria-live="polite">
      <span className="undo-toast__text">Booking <strong>{pendingCancel.orderId}</strong> cancellation pending</span>
      <button type="button" className="undo-toast__btn" onClick={handleUndoCancellation}>Undo · {undoSeconds}s</button>
      <span key={pendingCancel.orderId} className="undo-toast__bar" style={{ animationDuration: "5s" }} />
    </div>
  );

  if (loading) return <UserLayout hideFooter><div role="status" style={{ padding: 24 }}>Loading bookings…</div></UserLayout>;

  if (orders.length === 0) {
    return (
      <UserLayout user={{ name: `${user?.firstName || ""} ${user?.lastName || ""}`.trim() }} notifications={MOCK_NOTIFICATIONS_USER} hideFooter>
        <div className="bd-shell">
          <div className="bd-panel">
            <div className="active-empty">
              {loadError && <p role="alert" style={{ color: "#b42318" }}>{loadError}</p>}
              <EmptyState Icon={Navigation} title="No active deliveries" message="Book a delivery to see your rider's live location and ETA here." />
              <button className="btn-bd-next" type="button" onClick={() => navigate("/place-order")}>Book a Delivery <ArrowRight size={14} /></button>
            </div>
          </div>
          <div className="bd-map"><MapPicker viewOnly /></div>
        </div>
        {undoToast}
      </UserLayout>
    );
  }

  if (expandedOrder) {
    return (
      <UserLayout user={{ name: `${user?.firstName || ""} ${user?.lastName || ""}`.trim() }} notifications={MOCK_NOTIFICATIONS_USER} hideFooter>
        {expandedOrder.status === "pending" ? (
          <PendingDeliveryTracking order={expandedOrder} onBack={() => setExpandedId(null)} onCancel={handleCancel} pendingCancel={pendingCancel} onUndo={handleUndoCancellation} />
        ) : (
          <ActiveDeliveryTracking
            order={expandedOrder}
            onBack={() => setExpandedId(null)}
            onHistory={() => navigate("/history")}
            onCancel={handleCancel}
            pendingCancel={pendingCancel}
            onUndo={handleUndoCancellation}
          />
        )}
        {undoToast}
      </UserLayout>
    );
  }

  return (
    <UserLayout user={{ name: `${user?.firstName || ""} ${user?.lastName || ""}`.trim() }} notifications={MOCK_NOTIFICATIONS_USER} hideFooter>
      <div className="bd-shell">
        <div className="bd-panel">
          <div className="bd-inner">
            {loadError && <p role="alert" style={{ color: "#b42318" }}>{loadError}</p>}
            {actionError && <p role="alert" style={{ color: "#b42318" }}>{actionError}</p>}
            <div className="bd-step-head">
              <div className="bd-step-meta"><span className="bd-step-count">{pendingOrders.length + activeOrders.length} Total</span><span className="bd-step-divider" /><span className="bd-step-eyebrow">Bookings and Deliveries</span></div>
              <h2 className="bd-step-title">Manage Bookings and Deliveries</h2>
              <p className="bd-step-desc">Track ongoing deliveries and follow up on bookings waiting for a driver.</p>
            </div>
            <div className="driver-home__tabs">
              <button className={`driver-home__tab ${tab === "pending" ? "active" : ""}`} onClick={() => setTab("pending")}>Pending Bookings<span className="driver-home__tab-count">{pendingOrders.length}</span></button>
              <button className={`driver-home__tab ${tab === "active" ? "active" : ""}`} onClick={() => setTab("active")}>Track Ongoing<span className="driver-home__tab-count">{activeOrders.length}</span></button>
            </div>
            {visibleOrders.length === 0 ? (
              <div className="manage-empty">
                <EmptyState Icon={tab === "pending" ? Clock : Navigation} title={tab === "pending" ? "No pending bookings" : "No active deliveries"} message={tab === "pending" ? "Any booking that hasn't matched with a driver yet will show up here." : "Once a driver accepts your booking, it moves here for live tracking."} />
              </div>
            ) : (
              <div className="active-delivery-list">
                {visibleOrders.map((o) => (<div key={o.id}><ActiveDeliveryListCard order={o} onOpen={setExpandedId} /></div>))}
              </div>
            )}
          </div>
        </div>
        <div className="bd-map">
          {/* Never preview a random booking. No pins, route, or driver GPS
              are shown until a pending/ongoing card is explicitly opened. */}
          <MapPicker viewOnly />
        </div>
      </div>
      {undoToast}
    </UserLayout>
  );
};


export default ActiveDeliveryPage;
