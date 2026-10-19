import React, { useEffect, useState } from "react";
import { FiX } from "react-icons/fi";
import { ArrowLeft, Check, Navigation, Package, ShieldCheck, TriangleAlert, Truck, Zap, ZapOff } from "lucide-react";
import { useBookings } from "../../hooks/useBookings.js";
import { bookingStore } from "../../services/bookingStore.js";
import { ACTIVE_DELIVERY_STATUSES, DRIVER_ACTION, DRIVER_FLOW, peso } from "../../utils/helpers.js";
import { MOCK_DRIVER, MOCK_NOTIFICATIONS_DRIVER } from "../../data/demo/clientMockData.js";
import AppHeader from "../../components/common/AppHeader.jsx";
import { Field, EmptyState, RouteStrip } from "../../components/common/BookingUI.jsx";
import { MapPicker } from "../../components/common/MapComponents.jsx";

// These dialogs are only used on this page, so they stay here.
// Demo-only delivery PIN; real verification must happen on the backend.
const MOCK_DELIVERY_PIN = "1234";
const DeliveryPinModal = ({ booking, onConfirm, onClose }) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [resending, setResending] = useState(false);
  const handleVerify = () => { if (pin.length !== 4) { setError("Please enter the 4-digit PIN."); return; } if (pin !== MOCK_DELIVERY_PIN) { setError("Incorrect demo PIN. Ask the recipient for 1234."); return; } onConfirm(); };
  const handleResend = () => { setResending(true); alert(`[DEMO] No SMS is sent yet. Use PIN 1234 for testing.`); setTimeout(() => setResending(false), 1200); };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="pin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pin-modal__icon"><ShieldCheck size={26} /></div>
        <h3 className="pin-modal__title">Confirm Delivery</h3>
        <p className="pin-modal__desc">Ask the recipient for their 4-digit delivery PIN. For this frontend demo, use 1234 (no SMS is sent yet).</p>
        <div className="pin-modal__recipient"><span className="pin-modal__recipient-label">Recipient</span><span className="pin-modal__recipient-value">{booking.recipientName || booking.customerName} · {booking.recipientPhone || booking.contactNumber}</span></div>
        <input type="text" inputMode="numeric" maxLength={4} className={`pin-modal__input${error ? " pin-modal__input--error" : ""}`} placeholder="••••" value={pin} autoFocus onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 4)); if (error) setError(""); }} />
        {error && <p className="pin-modal__error">{error}</p>}
        <button type="button" className="pin-modal__resend" onClick={handleResend} disabled={resending}>{resending ? "Sending…" : "Resend PIN to recipient"}</button>
        <div className="pin-modal__actions"><button type="button" className="modal-btn modal-btn--ghost" onClick={onClose}>Cancel</button><button type="button" className="modal-btn modal-btn--primary" onClick={handleVerify}><Check size={14} /> Confirm Delivery</button></div>
      </div>
    </div>
  );
};
const CANCEL_REASONS = [
  { id: "vehicle", label: "Vehicle breakdown" },
  { id: "emergency", label: "Personal emergency" },
  { id: "address", label: "Can't locate pickup / drop-off" },
  { id: "package", label: "Package issue (size, weight, contents)" },
  { id: "other", label: "Other" },
];
const CancelDeliveryModal = ({ booking, onConfirm, onClose }) => {
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const handleConfirm = () => { if (!reason || submitting) return; setSubmitting(true); setTimeout(() => onConfirm(reason), 400); };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-card--narrow" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>Cancel Delivery</h3><button className="modal-close" onClick={onClose} aria-label="Close"><FiX size={18} /></button></div>
        <div className="modal-body">
          <div className="modal-form">
            <div className="modal-notice"><TriangleAlert size={14} /><span>Cancelling an active delivery notifies <strong>{booking.customerName}</strong> and affects your rating. A <strong>₱20</strong> cancellation fee is deducted from your wallet.</span></div>
            <div className="input-group"><label className="input-label">Reason <span className="required">*</span></label><select className="field__input select-field" value={reason} onChange={(e) => setReason(e.target.value)}><option value="">Select a reason…</option>{CANCEL_REASONS.map((r) => (<option key={r.id} value={r.id}>{r.label}</option>))}</select></div>
            <Field label="Additional notes (optional)"><textarea className="field__textarea" placeholder="Anything the customer or support should know…" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          </div>
        </div>
        <div className="modal-foot"><button className="modal-btn modal-btn--ghost" onClick={onClose}>Keep Delivery</button><button className="modal-btn modal-btn--danger" disabled={!reason || submitting} onClick={handleConfirm}>{submitting ? "Cancelling…" : "Confirm Cancellation"}</button></div>
      </div>
    </div>
  );
};

/* ═══ Driver Home ═══ */
const BookingCard = ({ booking, onExpand }) => (
  <button type="button" className="order-card driver-booking-card" onClick={() => onExpand(booking)}>
    <div className="order-card__top">
      <span className={`delivery-type-badge ${booking.deliveryType}`}>{booking.deliveryType === "priority" ? <Zap size={12} /> : <Truck size={12} />}<span>{booking.deliveryType === "priority" ? "Priority" : "Regular"}</span></span>
      <span className="order-card__id">{booking.id}</span>
    </div>
    <RouteStrip pickup={booking.pickup} dropoff={booking.dropoff} labels={false} />
    <div className="order-card__footer"><div className="order-card__customer"><span className="order-card__items">{booking.customerName}</span></div><span className="order-card__price">{booking.price}</span></div>
  </button>
);
const BookingExpand = ({ booking, onClose, onStatusChange }) => {
  const [showPinModal, setShowPinModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const currentIdx = DRIVER_FLOW.indexOf(booking.status === "pending" ? null : booking.status);
  const canAdvance = booking.status === "pending" || currentIdx < DRIVER_FLOW.length - 1;
  const canCancelActive = ACTIVE_DELIVERY_STATUSES.includes(booking.status);
  const handleAction = () => {
    if (booking.status === "pending") {
      onStatusChange("accepted");
      return;
    }
    if (booking.status === "arrived") {
      setShowPinModal(true);
      return;
    }

    // Accepted -> At pickup -> Picked up -> At drop-off -> Delivered.
    const next = DRIVER_FLOW[currentIdx + 1];
    onStatusChange(next);
    if (next === "arrived") {
      alert(`[DEMO] Ask the recipient for the delivery PIN (1234). No SMS has been sent.`);
    }
  };
  const handleDecline = () => { if (confirm(`Decline booking ${booking.id}?`)) { onStatusChange("declined"); onClose(); } };
  const handleCancelActive = (reason) => { onStatusChange("cancelled", reason); onClose(); };
  return (
    <div className="order-expand order-expand--driver">
      <div className="order-expand__body">
        <div className="order-expand__header">
          <div>
            <span className={`delivery-type-badge ${booking.deliveryType}`}>{booking.deliveryType === "priority" ? <Zap size={12} /> : <Truck size={12} />}<span>{booking.deliveryType === "priority" ? "Priority" : "Regular"}</span></span>
            <p className="order-expand__id">{booking.id}</p>
          </div>
          <button className="order-expand__close" onClick={onClose} aria-label="Close"><FiX size={20} /></button>
        </div>
        <RouteStrip pickup={booking.pickup} dropoff={booking.dropoff} />
        <div className="order-expand__details">
          <div className="detail-row"><span className="detail-label">Customer</span><span className="detail-value">{booking.customerName}</span></div>
          <div className="detail-row"><span className="detail-label">Vehicle</span><span className="detail-value">{booking.vehicleType}</span></div>
          <div className="detail-row"><span className="detail-label">Items</span><span className="detail-value">{booking.itemDetails}</span></div>
          <div className="detail-row"><span className="detail-label">Contact</span><span className="detail-value">{booking.contactNumber}</span></div>
          <div className="detail-row"><span className="detail-label">Price</span><span className="detail-value detail-value--price">{booking.price}</span></div>
          <div className="detail-row"><span className="detail-label">Commission</span><span className="detail-value">−{peso(Math.round(parseInt(booking.price.replace(/[^\d]/g, ""), 10) * 0.1))}</span></div>
        </div>
        {booking.status === "pending" && (<div className="driver-action-row"><button className="btn-driver-decline" onClick={handleDecline}>Decline</button><button className="btn-driver-accept" onClick={handleAction}>Accept Booking</button></div>)}
        {booking.status !== "pending" && canAdvance && (
          <div className="driver-expand__actions">
            {canCancelActive && (<button className="btn-decline-booking" onClick={() => setShowCancelModal(true)}>Cancel</button>)}
            <button className="btn-driver-action" onClick={handleAction}>{DRIVER_ACTION[booking.status]}</button>
          </div>
        )}
        {booking.status === "delivered" && (<div className="driver-completed-msg">✅ Delivery completed!</div>)}
      </div>
      {showPinModal && (<DeliveryPinModal booking={booking} onClose={() => setShowPinModal(false)} onConfirm={() => { setShowPinModal(false); onStatusChange("delivered"); }} />)}
      {showCancelModal && (<CancelDeliveryModal booking={booking} onClose={() => setShowCancelModal(false)} onConfirm={handleCancelActive} />)}
    </div>
  );
};
const ActiveDeliveryCard = ({ booking, status, onExpand }) => {
  const getStatusInfo = (status) => {
    const info = {
      accepted: { label: "Heading to Pickup", color: "badge-accepted" },
      at_pickup: { label: "At Pickup", color: "badge-accepted" },
      picked_up: { label: "In Transit", color: "badge-in-transit" },
      arrived: { label: "At Drop-off", color: "badge-arrived" },
    };
    return info[status] || info.accepted;
  };
  const statusInfo = getStatusInfo(status);
  return (
    <button type="button" className="active-delivery-card" onClick={onExpand}>
      <div className="active-delivery-card__top"><span className={`active-delivery-status-badge ${statusInfo.color}`}><span className="delivery-status-dot" /><span>{statusInfo.label}</span></span><span className="active-delivery-card__id">{booking.id}</span></div>
      <RouteStrip pickup={booking.pickup} dropoff={booking.dropoff} labels={false} />
      <div className="active-delivery-card__footer">
        <div className="active-delivery-card__info"><p className="active-delivery-card__customer">{booking.customerName}</p><p className="active-delivery-card__meta">{booking.vehicleType}</p></div>
        <span className="active-delivery-card__price">{booking.price}</span>
      </div>
    </button>
  );
};

/* ⬇⬇ DriverHomePage — binabasa na galing sa store, at nagsusulat na rin */
const DriverHomePage = () => {
  const { bookings } = useBookings();
  const [expandedId, setExpandedId] = useState(null);
  const [online, setOnline] = useState(true);
  const [activeTab, setActiveTab] = useState("available");
  const [myLocation, setMyLocation] = useState(null);
  const [gpsMessage, setGpsMessage] = useState("Waiting for GPS location…");

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsMessage("This browser does not support location sharing.");
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsMessage("");
      },
      (err) => setGpsMessage(`GPS unavailable: ${err.message}`),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // While this driver has an active job, share their real browser GPS position
  // with the demo booking store. This works in tabs on the same origin only;
  // the future backend must broadcast GPS updates between devices.
  useEffect(() => {
    if (!myLocation) return;

    const now = Date.now();
    for (const booking of bookings) {
      if (!ACTIVE_DELIVERY_STATUSES.includes(booking.status)) continue;
      if (booking.driver?.name !== MOCK_DRIVER.name) continue;

      const last = booking.driverLocation;
      const moved = !last || Math.hypot(
        myLocation.lat - last.lat,
        myLocation.lng - last.lng
      ) > 0.0003; // Roughly 30 metres.
      const old = now - (booking.locationUpdatedAt || 0) > 30000;

      if (moved || old) {
        bookingStore.update(booking.id, {
          driverLocation: myLocation,
          locationUpdatedAt: now,
        });
      }
    }
  }, [myLocation, bookings]);

  const expanded = bookings.find((b) => b.id === expandedId) || null;

  const handleStatusChange = (newStatus, reason) => {
    if (!expandedId) return;
    const current = bookings.find((b) => b.id === expandedId);
    if (!current) return;

    // Only allow the next stage. The future Express API must enforce this too.
    const nextStatus = {
      pending: "accepted",
      accepted: "at_pickup",
      at_pickup: "picked_up",
      picked_up: "arrived",
      arrived: "delivered",
    }[current.status];
    if (newStatus === "declined" && current.status !== "pending") return;
    if (newStatus === "cancelled" && !ACTIVE_DELIVERY_STATUSES.includes(current.status)) return;
    if (!["declined", "cancelled", nextStatus].includes(newStatus)) return;
    if (current.status !== "pending" && current.driver?.name !== MOCK_DRIVER.name) return;

    if (newStatus === "declined") {
      // Driver only declines the offer; booking stays pending for other drivers.
      bookingStore.update(expandedId, {
        declinedBy: [...(current.declinedBy || []), MOCK_DRIVER.name],
      });
      setExpandedId(null);
      return;
    }

    if (newStatus === "cancelled") {
      bookingStore.update(expandedId, {
        status: "cancelled",
        cancelReason: reason,
        cancelledBy: "driver",
        cancelledAt: new Date().toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" }),
      });
      setExpandedId(null);
      return;
    }

    if (newStatus === "accepted") {
      bookingStore.update(expandedId, {
        status: "accepted",
        driver: {
          name: MOCK_DRIVER.name,
          rating: MOCK_DRIVER.rating,
          trips: MOCK_DRIVER.trips,
          vehicleType: current.vehicleType,
          plate: MOCK_DRIVER.vehicle.plate,
          phone: MOCK_DRIVER.phone,
        },
        // Never invent a starting GPS position or ETA.
        driverLocation: myLocation,
        locationUpdatedAt: myLocation ? Date.now() : null,
        etaMins: null,
        acceptedAt: Date.now(),
      });
      setExpandedId(null);
      setActiveTab("active");
      return;
    }

    if (newStatus === "delivered") {
      bookingStore.update(expandedId, {
        status: "delivered",
        completedAt: new Date().toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" }),
      });
      setExpandedId(null);
      return;
    }

    const timestamps = {
      at_pickup: "arrivedAtPickupAt",
      picked_up: "pickedUpAt",
      arrived: "arrivedAtDropoffAt",
    };
    bookingStore.update(expandedId, {
      status: newStatus,
      ...(timestamps[newStatus] ? { [timestamps[newStatus]]: Date.now() } : {}),
    });
  };

  const availableBookings = bookings.filter(
    (b) => b.status === "pending" && !(b.declinedBy || []).includes(MOCK_DRIVER.name)
  );
  const activeDeliveries = bookings.filter(
    (b) => ACTIVE_DELIVERY_STATUSES.includes(b.status) && b.driver?.name === MOCK_DRIVER.name
  );
   
    /* ── Subpage view kapag may naka-expand na booking ── */
  if (expanded && ["pending", ...ACTIVE_DELIVERY_STATUSES].includes(expanded.status)) {
    const isPending = expanded.status === "pending";
    return (
      <div className="driver-shell">
        <AppHeader role="driver" user={{ name: MOCK_DRIVER.name }} notifications={MOCK_NOTIFICATIONS_DRIVER} online={online} onToggleOnline={setOnline} walletBalance={MOCK_DRIVER.walletBalance} minBalance={MOCK_DRIVER.minBalance} profilePath="/driver/profile" showOnlineToggle={false} />
        <div className="driver-body">
          <div className="bd-shell">
            <div className="bd-panel">
              <div className="bd-inner">
                <button type="button" className="active-back-link" onClick={() => setExpandedId(null)}>
                  <ArrowLeft size={14} /> Back to {isPending ? "Pick Up" : "Ongoing Deliveries"}
                </button>
                <div className="bd-step-head">
                  <div className="bd-step-meta">
                    <span className="bd-step-count">Order {expanded.id}</span>
                    <span className="bd-step-divider" />
                    <span className="bd-step-eyebrow">{isPending ? "New Job" : "Active Delivery"}</span>
                  </div>
                  <h2 className="bd-step-title">{isPending ? "Job Details" : "Manage Delivery"}</h2>
                  <p className="bd-step-desc">{isPending ? "Review the details and accept or decline this booking." : "Update the delivery status as you complete each step."}</p>
                </div>
                <BookingExpand booking={expanded} onClose={() => setExpandedId(null)} onStatusChange={handleStatusChange} />
                {!isPending && gpsMessage && <p role="status" style={{ marginTop: 12, color: "#965c00" }}>{gpsMessage} Driver-to-pickup routing requires location permission.</p>}
              </div>
            </div>
            <div className="bd-map">
              <MapPicker
                viewOnly
                pickupCoords={expanded.pickup}
                dropoffCoords={expanded.dropoff}
                driverCoords={isPending ? null : myLocation}
                showDriverToPickup={expanded.status === "accepted"}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── List view (default) ── */
  return (
    <div className="driver-shell">
      <AppHeader role="driver" user={{ name: MOCK_DRIVER.name }} notifications={MOCK_NOTIFICATIONS_DRIVER} online={online} onToggleOnline={setOnline} walletBalance={MOCK_DRIVER.walletBalance} minBalance={MOCK_DRIVER.minBalance} profilePath="/driver/profile" showOnlineToggle={activeTab === "available"} />
      <div className="driver-body">
        <div className="driver-home__content">
          <div className="driver-home__panel">
            <div className="driver-home__inner">
              <div className="bd-step-head">
                <div className="bd-step-meta"><span className="bd-step-count">{availableBookings.length} {availableBookings.length === 1 ? "Job" : "Jobs"} Available</span><span className="bd-step-divider" /><span className="bd-step-eyebrow">Driver Dashboard</span></div>
                <h2 className="bd-step-title">Your Deliveries</h2>
                <p className="bd-step-desc">Pick up new jobs or follow through on deliveries you've already accepted.</p>
              </div>
              <div className="driver-home__tabs">
                <button className={`driver-home__tab ${activeTab === "available" ? "active" : ""}`} onClick={() => { setActiveTab("available"); setExpandedId(null); }}>Pick Up<span className="driver-home__tab-count">{availableBookings.length}</span></button>
                <button className={`driver-home__tab ${activeTab === "active" ? "active" : ""}`} onClick={() => { setActiveTab("active"); setExpandedId(null); }}>Ongoing Deliveries<span className="driver-home__tab-count">{activeDeliveries.length}</span></button>
              </div>

              {activeTab === "available" && (
                <>
                  {!online ? (
                    <EmptyState
                      Icon={ZapOff}
                      title="You're offline"
                      message="Go online to see available bookings and start accepting deliveries."
                    />
                  ) : (
                    <h2 className="driver-home__headline">
                      {availableBookings.length === 0
                        ? "No bookings available"
                        : `${availableBookings.length} ${availableBookings.length === 1 ? "Booking" : "Bookings"} Available`}
                    </h2>
                  )}
                  <div className="driver-home__list">
                    {online && availableBookings.length === 0 && (<EmptyState Icon={Package} title="No bookings right now" message="You'll be notified the moment a new delivery request matches your vehicle." />)}
                    {online && availableBookings.map((b) => (<BookingCard key={b.id} booking={b} onExpand={(b) => setExpandedId(b.id)} />))}
                  </div>
                </>
              )}

              {activeTab === "active" && (
                <>
                  <h2 className="driver-home__headline">{activeDeliveries.length === 0 ? "No active deliveries" : `${activeDeliveries.length} Deliver${activeDeliveries.length === 1 ? "y" : "ies"} in Progress`}</h2>
                  <div className="driver-home__list">
                    {activeDeliveries.length === 0 && (<EmptyState Icon={Navigation} title="No active deliveries" message="Accept a booking from the Pick Up tab to get started." />)}
                    {activeDeliveries.map((b) => (<ActiveDeliveryCard key={b.id} booking={b} status={b.status} onExpand={() => setExpandedId(b.id)} />))}
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="driver-home__map">
            <MapPicker viewOnly pickupCoords={null} dropoffCoords={null} driverCoords={myLocation} />
          </div>
        </div>
      </div>
    </div>
  );

};


export default DriverHomePage;
