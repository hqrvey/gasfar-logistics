import React, { useEffect, useState } from "react";
import { FiX } from "react-icons/fi";
import { ArrowLeft, Check, ChevronDown, ChevronUp, Clock3, MapPin, Navigation, Package, ShieldCheck, TriangleAlert, Truck, Wallet, Zap, ZapOff } from "lucide-react";
import { useDriverTracking } from "../../context/DriverTrackingContext.jsx";
import useDriverWallet from "../../hooks/useDriverWallet.js";
import { bookingService } from "../../services/bookingService.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { ACTIVE_DELIVERY_STATUSES, DRIVER_ACTION, DRIVER_FLOW, peso } from "../../utils/helpers.js";
import { MOCK_DRIVER, MOCK_NOTIFICATIONS_DRIVER } from "../../data/demo/clientMockData.js";
import AppHeader from "../../components/common/AppHeader.jsx";
import { BookingRequestCard, OngoingDeliveryCard, Field, EmptyState, RouteStrip } from "../../components/common/BookingUI.jsx";
import { MapPicker } from "../../components/common/MapComponents.jsx";

// The PIN is checked by Express, never compared with a hardcoded frontend value.
function DeliveryPinModal({ booking, onConfirm, onResend, onClose }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleVerify() {
    if (pin.length !== 4 || pending) { setError("Enter the recipient's 4-digit PIN."); return; }
    setPending(true);
    setError("");
    try {
      await onConfirm(pin);
      onClose();
    } catch (err) { setError(err.message); }
    finally { setPending(false); }
  }

  async function handleResend() {
    setPending(true);
    setError("");
    try { const result = await onResend(); alert(result.message); }
    catch (err) { setError(err.message); }
    finally { setPending(false); }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="pin-modal" onClick={(event) => event.stopPropagation()}>
        <div className="pin-modal__icon"><ShieldCheck size={26} /></div>
        <h3 className="pin-modal__title">Confirm Delivery</h3>
        <p className="pin-modal__desc">Ask the recipient for the 4-digit PIN sent by SMS. Only the backend can verify it.</p>
        <div className="pin-modal__recipient"><span className="pin-modal__recipient-label">Recipient</span><span className="pin-modal__recipient-value">{booking.recipientName} · {booking.recipientPhone}</span></div>
        <input type="text" inputMode="numeric" maxLength={4} className={`pin-modal__input${error ? " pin-modal__input--error" : ""}`} placeholder="••••" value={pin} autoFocus onChange={(event) => { setPin(event.target.value.replace(/\D/g, "").slice(0, 4)); setError(""); }} />
        {error && <p className="pin-modal__error" role="alert">{error}</p>}
        <button type="button" className="pin-modal__resend" onClick={handleResend} disabled={pending}>{pending ? "Please wait…" : "Resend PIN to recipient"}</button>
        <div className="pin-modal__actions"><button type="button" className="modal-btn modal-btn--ghost" onClick={onClose}>Cancel</button><button type="button" className="modal-btn modal-btn--primary" onClick={handleVerify} disabled={pending}><Check size={14} /> {pending ? "Verifying…" : "Confirm Delivery"}</button></div>
      </div>
    </div>
  );
}
// The popup mirrors the prototype, but saves cash collection using the real REST API.
function CashCollectModal({ booking, onConfirm, onClose, busy }) {
  const [errorMessage, setErrorMessage] = useState("");
  async function confirmCash() {
    setErrorMessage("");
    try { await onConfirm(); }
    catch (error) { setErrorMessage(error.message); }
  }
  const amount = Number(booking.amountDue);
  const coveredByCredit = Number.isFinite(amount) && amount <= 0;
  const amountLabel = Number.isFinite(amount) ? peso(amount) : booking.price;
  const payerName = booking.paymentSide === "recipient"
    ? (booking.recipientName || "the recipient")
    : (booking.customerName || "the sender");

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="pin-modal" onClick={(event) => event.stopPropagation()}>
        <div className="pin-modal__icon"><Wallet size={26} /></div>
        <h3 className="pin-modal__title">{coveredByCredit ? "Confirm covered fare" : "Cash received?"}</h3>
        <p className="pin-modal__desc">
          {coveredByCredit
            ? "This delivery has no remaining cash due. Record the covered fare to continue; do not ask the customer to pay."
            : <>{booking.paymentSide === "recipient" ? "You have arrived at the drop-off." : "You've picked up the package."} Collect <strong>{amountLabel}</strong> from {payerName}. Confirm only after you actually receive the cash.</>}
        </p>
        {errorMessage && <p className="pin-modal__error" role="alert">{errorMessage}</p>}
        <div className="pin-modal__actions">
          <button type="button" className="modal-btn modal-btn--ghost" onClick={onClose} disabled={busy}>Not yet</button>
          <button type="button" className="modal-btn modal-btn--primary" onClick={confirmCash} disabled={busy}>
            <Check size={14} /> {busy ? "Saving…" : coveredByCredit ? "Confirm no cash due" : `I received ${amountLabel}`}
          </button>
        </div>
      </div>
    </div>
  );
}
const CANCEL_REASONS = [
  { id: "vehicle", label: "Vehicle breakdown" },
  { id: "emergency", label: "Personal emergency" },
  { id: "address", label: "Can't locate pickup / drop-off" },
  { id: "package", label: "Package issue (size, weight, contents)" },
  { id: "other", label: "Other" },
];
const DELIVERY_STEPS = ["heading_pickup", "at_pickup", "picked_up", "arrived", "delivered"];
const DELIVERY_STEP_LABELS = {
  heading_pickup: "Head to pickup",
  at_pickup: "Arrived at pickup",
  picked_up: "Package picked up",
  arrived: "Arrived at drop-off",
  delivered: "Delivered",
};
const DELIVERY_STEP_DESCRIPTIONS = {
  heading_pickup: "Start navigating to the sender",
  at_pickup: "You reached the pickup point",
  picked_up: "Parcel is already with you",
  arrived: "Reach the recipient before confirming",
  delivered: "Finish with the recipient PIN",
};
const DELIVERY_STEP_ICONS = {
  heading_pickup: Navigation,
  at_pickup: MapPin,
  picked_up: Package,
  arrived: MapPin,
  delivered: Check,
};
function bookingTimelineStage(booking) {
  if (booking.status === "accepted") return "heading_pickup";
  return booking.status;
}
function statusTone(status, journeyStartedAt) {
  if (status === "accepted" && !journeyStartedAt) return "assigned";
  if (status === "accepted" && journeyStartedAt) return "enroute";
  if (status === "picked_up") return "transit";
  if (status === "at_pickup" || status === "arrived") return "arrived";
  if (status === "delivered") return "done";
  return "enroute";
}
const DeliveryStageTracker = ({ booking }) => {
  const activeStatus = bookingTimelineStage(booking);
  const currentIdx = DELIVERY_STEPS.indexOf(activeStatus);
  return (
    <div className="active-timeline active-timeline--rich active-timeline--driver" aria-label="Delivery progress">
      {DELIVERY_STEPS.map((status, index) => {
        const done = index < currentIdx || booking.status === "delivered";
        const active = index === currentIdx && booking.status !== "delivered";
        const Icon = DELIVERY_STEP_ICONS[status];
        return (
          <div key={status} className={`active-timeline__item${done ? " done" : ""}${active ? " active" : ""}`}>
            <span className="active-timeline__dot">{done ? <Check size={12} /> : <Icon size={12} />}</span>
            <span className="active-timeline__copy">
              <span className="active-timeline__label">{DELIVERY_STEP_LABELS[status]}</span>
              <span className="active-timeline__desc">{DELIVERY_STEP_DESCRIPTIONS[status]}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
};

const CancelDeliveryModal = ({ booking, onConfirm, onClose }) => {
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [requestWaiver, setRequestWaiver] = useState(false);
  const [proof, setProof] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  // Exact cancellation fees remain a backend decision; these numbers only
  // explain the known current policy, not what the database will charge.
  const estimatedFee = booking.status === "at_pickup" ? 20 : booking.journeyStartedAt ? 10 : 0;
  const handleConfirm = async () => {
    if (!reason || submitting) return;
    setSubmitting(true);
    setErrorMessage("");
    try {
      const explanation = notes ? `${reason}: ${notes.trim()}` : reason;
      await onConfirm(explanation, requestWaiver && estimatedFee > 0, proof);
      onClose();
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-card--narrow" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>Cancel Delivery</h3><button className="modal-close" onClick={onClose} aria-label="Close"><FiX size={18} /></button></div>
        <div className="modal-body">
          <div className="modal-form">
            <div className="modal-notice"><TriangleAlert size={14} /><span>Cancelling releases this booking before package pickup. {estimatedFee === 0 ? "No cancellation fee is expected before starting the journey." : `This stage may incur a ${peso(estimatedFee)} cancellation fee. The backend makes the final decision.`}</span></div>
            <div className="input-group"><label className="input-label">Reason <span className="required">*</span></label><select className="field__input select-field" value={reason} onChange={(e) => setReason(e.target.value)}><option value="">Select a reason…</option>{CANCEL_REASONS.map((r) => (<option key={r.id} value={r.id}>{r.label}</option>))}</select></div>
            <Field label="Additional notes (optional)"><textarea className="field__textarea" placeholder="Anything the customer or support should know…" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
            {estimatedFee > 0 && (
              <label className="cancel-waiver">
                <input type="checkbox" checked={requestWaiver} onChange={(event) => setRequestWaiver(event.target.checked)} />
                <span><strong>Request a cancellation-fee review</strong><small>An administrator can review your explanation and optional evidence after cancellation.</small></span>
              </label>
            )}
            {requestWaiver && estimatedFee > 0 && (
              <div className="input-group">
                <label className="input-label" htmlFor="driver-cancel-proof">Supporting photo (optional)</label>
                <input id="driver-cancel-proof" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setProof(event.target.files?.[0] || null)} />
              </div>
            )}
            {errorMessage && <p className="feature-error" role="alert">{errorMessage}</p>}
          </div>
        </div>
        <div className="modal-foot"><button className="modal-btn modal-btn--ghost" onClick={onClose}>Keep Delivery</button><button className="modal-btn modal-btn--danger" disabled={!reason || submitting} onClick={handleConfirm}>{submitting ? "Cancelling…" : "Confirm Cancellation"}</button></div>
      </div>
    </div>
  );
};

/* ═══ Driver Home ═══ */
// Uses the same component and CSS as customer Pending Bookings.
// We pass the selected booking to the existing driver-page handler.
const BookingCard = ({ booking, onExpand }) => (
  <BookingRequestCard booking={booking} hideCustomer onOpen={() => onExpand(booking)} />
);

const BookingExpand = ({ booking, onClose, onStatusChange, onStartPickup, onCollectCash, onResendPin, busy }) => {
  const [showPinModal, setShowPinModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showCashModal, setShowCashModal] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const currentIdx = DRIVER_FLOW.indexOf(booking.status === "pending" ? null : booking.status);
  const canAdvance = booking.status === "pending" || currentIdx < DRIVER_FLOW.length - 1;
  const canCancelActive = ["accepted", "at_pickup"].includes(booking.status);
  const cashReady = String(booking.paymentMethod).toLowerCase() === "cash" && !booking.cashCollectedAt && (
    (booking.paymentSide === "sender" && ["picked_up", "arrived"].includes(booking.status)) ||
    (booking.paymentSide === "recipient" && booking.status === "arrived")
  );
  // Sender-paid cash is collected AFTER pickup, before continuing to drop-off.
  // Recipient-paid older bookings are supported at arrival instead.
  const cashStageIsNext = Boolean(cashReady);
  const handleAction = () => {
    if (cashStageIsNext) {
      setShowCashModal(true);
      return;
    }
    if (booking.status === "pending") {
      onStatusChange("accepted");
      return;
    }
    // "Head to Pickup" records the start of the trip but does not mark
    // the driver as arrived. Keep the same accepted status until arrival.
    // This calls our existing Express endpoint, which saves journeyStartedAt.
    if (booking.status === "accepted" && !booking.journeyStartedAt) {
      onStartPickup();
      return;
    }
    if (booking.status === "arrived") {
      setShowPinModal(true);
      return;
    }

    // Accepted (journey started) -> At pickup -> Picked up -> At drop-off.
    const next = DRIVER_FLOW[currentIdx + 1];
    onStatusChange(next);

  };
  async function handleCashConfirm() {
    // The parent calls PATCH /api/bookings/:id/collect-cash and reloads MongoDB.
    await onCollectCash();
    setShowCashModal(false);
  }
  const reportIssue = async () => {
    const reason = window.prompt("Explain what happened to the parcel. Contact admin for help (minimum 5 characters):");
    if (!reason) return;
    try {
      await bookingService.reportIssue(booking.id, reason);
      alert("Issue reported to admin. Keep the parcel safe; the booking stays active.");
    } catch (problem) { alert(problem.message); }
  };
  const handleDecline = () => { if (confirm(`Decline booking ${booking.id}?`)) { onStatusChange("declined"); onClose(); } };
  async function handleCancelActive(reason, requestWaiver, proof) {
    // Cancel first so MongoDB records the actual stage and fee.
    await onStatusChange("cancelled", reason);
    if (requestWaiver) {
      try {
        await bookingService.requestFeeWaiver(booking.id, reason, proof);
        alert("Cancellation recorded. Your fee-review request was sent to an administrator.");
      } catch (error) {
        alert(`Cancellation recorded, but the fee-review request could not be submitted: ${error.message}`);
      }
    }
  }
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
        <div className="order-expand__summary">
          <div className="order-expand__summary-item">
            <span className="detail-label">Delivery fee</span>
            <span className="detail-value detail-value--price">{booking.price}</span>
          </div>
          <div className="order-expand__summary-item order-expand__summary-item--right">
            <span className="detail-label">Payment</span>
            <span className="detail-value">{booking.paymentMethod || "Cash"}</span>
          </div>
        </div>
        {booking.status !== "pending" && <DeliveryStageTracker booking={booking} />}
        <button type="button" className="order-expand__toggle" onClick={() => setShowDetails(!showDetails)} aria-expanded={showDetails}>
          {showDetails ? "Hide full details" : "View full details & earnings"}
          {showDetails ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
        {showDetails && (
          <>
            <div className="order-expand__details">
              {booking.status !== "pending" && <div className="detail-row"><span className="detail-label">Booked by</span><span className="detail-value">{booking.customerName}</span></div>}
              {booking.status !== "pending" && (
                <>
                  <div className="detail-row"><span className="detail-label">Booker's phone</span><span className="detail-value">{booking.contactNumber || "—"}</span></div>
                  <div className="detail-row"><span className="detail-label">Recipient</span><span className="detail-value">{booking.recipientName || "—"}</span></div>
                  <div className="detail-row"><span className="detail-label">Recipient phone</span><span className="detail-value">{booking.recipientPhone || "—"}</span></div>
                  {booking.recipientUnit && <div className="detail-row"><span className="detail-label">Unit / Floor</span><span className="detail-value">{booking.recipientUnit}</span></div>}
                </>
              )}
              <div className="detail-row"><span className="detail-label">Vehicle</span><span className="detail-value">{booking.vehicleType}</span></div>
              <div className="detail-row"><span className="detail-label">Items</span><span className="detail-value">{booking.itemDetails}</span></div>
              {booking.handlingInstructions?.length > 0 && <div className="detail-row"><span className="detail-label">Handling</span><span className="detail-value">{booking.handlingInstructions.join(", ")}</span></div>}
              {booking.notesToDriver && <div className="detail-row"><span className="detail-label">Notes</span><span className="detail-value">{booking.notesToDriver}</span></div>}
              {booking.itemPhotoUrl && <div className="detail-row"><span className="detail-label">Parcel photo</span><span className="detail-value"><a href={(import.meta.env.VITE_API_URL || "http://localhost:5001/api") + booking.itemPhotoUrl} target="_blank" rel="noreferrer">View uploaded parcel photo</a></span></div>}
              <div className="detail-row"><span className="detail-label">Payment</span><span className="detail-value">{booking.paymentMethod} · {booking.paymentSide === "sender" ? Number(booking.amountDue) <= 0 ? "No cash due (credits applied)" : "Collect from sender after pickup" : Number(booking.amountDue) <= 0 ? "No cash due (credits applied)" : "Collect from recipient at drop-off"}{booking.cashCollectedAt ? " · Collected" : ""}</span></div>
            </div>
            <div className="earnings-box">
              <div className="earnings-box__row"><span>Delivery fee</span><span>{booking.price}</span></div>
              {Number(booking.creditApplied) > 0 && <div className="earnings-box__row earnings-box__row--note"><span>Customer credit applied: {peso(booking.creditApplied)}. {Number(booking.amountDue) > 0 ? `Collect ${peso(booking.amountDue)} in cash.` : "No cash due."}</span></div>}
              <div className="earnings-box__row earnings-box__row--minus"><span>GASFAR commission (15%)</span><span>−{peso(Math.round(Number(booking.feeCentavos || 0) / 100 * 0.15))}</span></div>
              <div className="earnings-box__row earnings-box__row--total"><span>Estimated earnings</span><span>{peso(Math.round(Number(booking.feeCentavos || 0) / 100 * 0.85))}</span></div>
              <p className="earnings-box__note">The backend confirms your wallet settlement when the delivery is completed.</p>
            </div>
          </>
        )}
        {booking.status === "pending" && (<div className="driver-action-row"><button className="btn-driver-decline" onClick={handleDecline}>Decline</button><button className="btn-driver-accept" onClick={handleAction} disabled={busy}>{busy ? "Saving…" : "Accept Booking"}</button></div>)}
        {booking.status !== "pending" && canAdvance && (
          <div className="driver-expand__actions">
            {canCancelActive && (<button className="btn-decline-booking" onClick={() => setShowCancelModal(true)}>Cancel</button>)}
            {/* Only ONE primary button is shown at a time:
                Accepted + not started -> Head to Pickup.
                Accepted + started -> I Have Arrived at Pickup.
                Other stages keep their existing delivery buttons. */}
            <button className="btn-driver-action" onClick={handleAction} disabled={busy}>
              {busy ? "Saving…" : cashReady
                ? Number(booking.amountDue) <= 0 ? "Confirm covered fare" : `Collect ${peso(Number(booking.amountDue) || 0)} Cash`
                : booking.status === "accepted" && !booking.journeyStartedAt
                  ? "Head to Pickup"
                  : DRIVER_ACTION[booking.status]}
            </button>
          </div>
        )}
        {["picked_up", "arrived"].includes(booking.status) && <div className="feature-notice">
          Unable to continue with the parcel? You cannot cancel after pickup.
          <button type="button" onClick={reportIssue}>Report a delivery issue</button>
        </div>}
        {booking.status === "delivered" && (<div className="driver-completed-msg">✅ Delivery completed!</div>)}
      </div>
      {showCashModal && <CashCollectModal booking={booking} busy={busy} onClose={() => setShowCashModal(false)} onConfirm={handleCashConfirm} />}
      {showPinModal && (<DeliveryPinModal booking={booking} onClose={() => setShowPinModal(false)} onResend={onResendPin} onConfirm={(pin) => onStatusChange("delivered", null, pin)} />)}
      {showCancelModal && (<CancelDeliveryModal booking={booking} onClose={() => setShowCancelModal(false)} onConfirm={handleCancelActive} />)}
    </div>
  );
};
// Driver and customer ongoing cards share the same layout and typography.
// The driver sees the fare; the customer sees the ETA in that position.
const ActiveDeliveryCard = ({ booking, status, onExpand }) => {
  const info = {
    accepted: booking.journeyStartedAt
      ? { label: "On the way", tone: "enroute" }
      : { label: "Ready to head out", tone: "assigned" },
    at_pickup: { label: "At pickup", tone: "arrived" },
    picked_up: { label: "In transit", tone: "transit" },
    arrived: { label: "At drop-off", tone: "arrived" },
    delivered: { label: "Delivered", tone: "done" },
  }[status] || { label: "In progress", tone: "enroute" };

  const pickup = booking.pickup?.address?.split(",")?.[0] || "Pickup";
  const dropoff = booking.dropoff?.address?.split(",")?.[0] || "Drop-off";
  const vehicleDetails = [booking.vehicleType, booking.driver?.plate || booking.plate || "Assigned booking"]
    .filter(Boolean).join(" · ");

  return (
    <OngoingDeliveryCard
      bookingId={booking.id}
      name={booking.customerName || "Customer"}
      details={"Customer"}
      route={`${pickup} → ${dropoff}`}
      status={info.label}
      tone={info.tone}
      right={<span className="preview-card__price">{booking.price || "—"}</span>}
      onOpen={onExpand}
    />
  );
};

// DRIVER PAGE: Reads bookings from Express and advances their delivery statuses.
const DriverHomePage = () => {
  // useBookings calls GET /api/bookings and refreshes approximately every 8 seconds.
  // The backend shows eligible pending jobs and this driver's assigned jobs.
  const { bookings, loading, error: loadError, refresh, myLocation, gpsMessage } = useDriverTracking();
  const { user } = useAuth();
  const walletBalance = useDriverWallet();
  const [actionError, setActionError] = useState("");
  const [completedMessage, setCompletedMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [online, setOnline] = useState(true);
  const [activeTab, setActiveTab] = useState("available");

  const expanded = bookings.find((b) => b.id === expandedId) || null;
  // Switching the selected booking clears errors from the previous booking.
  useEffect(() => { setActionError(""); }, [expandedId]);

  // The accepted stage has ONE "Head to Pickup" button.
  // It saves journeyStartedAt without advancing to "at_pickup".
  // Only after this finishes does the button become "I Have Arrived at Pickup".
  async function handleStartPickup() {
    if (!expandedId || busy) return;
    setBusy(true);
    setActionError("");
    try {
      await bookingService.startPickup(expandedId);
      await refresh(); // Ask MongoDB for the updated journeyStartedAt value.
    } catch (error) {
      setActionError(error.message);
    } finally {
      setBusy(false);
    }
  }

  // DRIVER ACTION FLOW:
  // The buttons in BookingExpand() call this one function for all stages.
  // "accepted" -> driver accepts; "at_pickup" -> arrived at pickup;
  // "picked_up" -> package collected; "arrived" -> reached destination;
  // "delivered" -> PIN verification, handled separately by Express.
  async function handleStatusChange(newStatus, reason, pin) {
    if (!expandedId || busy) return;
    // A frontend proximity warning prevents accidental "Arrived" taps.
    // Express MUST enforce the same rule; this can be bypassed with direct HTTP.
    if (["at_pickup", "arrived"].includes(newStatus)) {
      const booking = bookings.find(item => item.id === expandedId);
      const destination = newStatus === "at_pickup" ? booking?.pickup : booking?.dropoff;
      if (newStatus === "at_pickup" && !booking?.journeyStartedAt) {
        setActionError("Start the pickup journey before marking arrival.");
        return;
      }
      if (!myLocation || !Number.isFinite(destination?.lat) || !Number.isFinite(destination?.lng)) {
        setActionError("A recent, accurate GPS fix is required before marking arrival.");
        return;
      }
      const radians = degrees => degrees * Math.PI / 180;
      const dLat = radians(destination.lat - myLocation.lat);
      const dLng = radians(destination.lng - myLocation.lng);
      const h = Math.sin(dLat / 2) ** 2 +
        Math.cos(radians(myLocation.lat)) * Math.cos(radians(destination.lat)) * Math.sin(dLng / 2) ** 2;
      const metres = 6_371_000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
      if (metres > 250) {
        setActionError(`You are approximately ${Math.round(metres)} m from the ${newStatus === "at_pickup" ? "pickup" : "drop-off"}. Move within 250 m before marking arrival.`);
        return;
      }
    }
    setBusy(true);
    setActionError("");
    try {
      let result;

      // Pick the REST endpoint for the button the driver clicked.
      if (newStatus === "accepted") {
        result = await bookingService.accept(expandedId);
      } else if (newStatus === "declined") {
        result = await bookingService.decline(expandedId);
      } else if (newStatus === "cancelled") {
        result = await bookingService.cancel(expandedId, reason);
      } else if (newStatus === "delivered") {
        // Never compare the PIN in React! Express checks its secure hash.
        result = await bookingService.verifyDelivery(expandedId, pin);
      } else {
        result = await bookingService.changeStatus(expandedId, newStatus);
      }
      // Read updated bookings from MongoDB so the UI displays the new status.
      await refresh();
      if (newStatus === "accepted") setActiveTab("active");
      if (newStatus === "delivered") setCompletedMessage("Delivery completed! The booking has moved to your history.");
      if (["accepted", "declined", "cancelled", "delivered"].includes(newStatus)) setExpandedId(null);
      if (result.smsSent === false) alert(result.message);
      return result;
    } catch (error) {
      // The PIN and cancellation modals already show these errors locally.
      // Do not leave an "Incorrect PIN" message beneath a different booking.
      if (["delivered", "cancelled"].includes(newStatus)) throw error;
      setActionError(error.message);
    } finally { setBusy(false); }
  }

  async function handleCollectCash() {
    if (!expandedId || busy) return;
    setBusy(true);
    setActionError("");
    try {
      await bookingService.collectCash(expandedId);
      await refresh();
    } catch (error) {
      setActionError(error.message);
      throw error;
    } finally {
      setBusy(false);
    }
  }

  // React only renders these lists; Express decides what driver may access.
  const availableBookings = bookings.filter(
    (b) => b.status === "pending"
  );
  // Calculate straight-line distance for the driver's LOCAL nearby-pickup map.
  // This is a display filter; backend vehicle matching and booking acceptance
  // remain authoritative. Distant jobs can still appear in the full list.
  function gpsDistanceMeters(a, b) {
    const rad = number => number * Math.PI / 180;
    const dLat = rad(b.lat - a.lat);
    const dLng = rad(b.lng - a.lng);
    const distance = Math.sin(dLat/2)**2 + Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;
    return 6371000 * 2 * Math.atan2(Math.sqrt(distance), Math.sqrt(1-distance));
  }
  const nearbyBookings = !myLocation ? [] : availableBookings.filter(b =>
    b.pickup && Number.isFinite(b.pickup.lat) && Number.isFinite(b.pickup.lng)
    && gpsDistanceMeters(myLocation, b.pickup) <= 1000
  );

  const activeDeliveries = bookings.filter(
    (b) => ACTIVE_DELIVERY_STATUSES.includes(b.status) && b.driverId === user?.id
  );
   
    /* ── Subpage view kapag may naka-expand na booking ── */
  if (expanded && ["pending", ...ACTIVE_DELIVERY_STATUSES].includes(expanded.status)) {
    const isPending = expanded.status === "pending";
    return (
      <div className="driver-shell">
        <AppHeader role="driver" user={{ name: `${user?.firstName || ""} ${user?.lastName || ""}`.trim() }} notifications={MOCK_NOTIFICATIONS_DRIVER} online={online} onToggleOnline={setOnline} walletBalance={walletBalance} minBalance={25} profilePath="/driver/profile" showOnlineToggle={false} />
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
                <BookingExpand booking={expanded} onClose={() => setExpandedId(null)} onStatusChange={handleStatusChange} onStartPickup={handleStartPickup} onCollectCash={handleCollectCash} onResendPin={() => bookingService.resendPin(expanded.id)} busy={busy} />
                {actionError && <p role="alert" style={{ color: "#b42318", marginTop: 12 }}>{actionError}</p>}
                {gpsMessage && <p role="status" style={{ marginTop: 12, color: "#965c00" }}>{gpsMessage}</p>}
              </div>
            </div>
            <div className="bd-map">
              <MapPicker
                key={expanded.id}
                viewOnly
                focusOnRoute
                showDriverMarker
                pickupCoords={expanded.pickup}
                dropoffCoords={expanded.dropoff}
                driverCoords={myLocation}
                viewerCoords={myLocation}
                showDriverToPickup={expanded.status === "pending" || expanded.status === "accepted" || expanded.status === "picked_up"}
                driverRouteTarget={expanded.status === "picked_up" ? "dropoff" : "pickup"}
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
      <AppHeader role="driver" user={{ name: `${user?.firstName || ""} ${user?.lastName || ""}`.trim() }} notifications={MOCK_NOTIFICATIONS_DRIVER} online={online} onToggleOnline={setOnline} walletBalance={walletBalance} minBalance={25} profilePath="/driver/profile" showOnlineToggle={activeTab === "available"} />
      <div className="driver-body">
        <div className="driver-home__content">
          <div className="driver-home__panel">
            <div className="driver-home__inner">
              {completedMessage && <div className="feature-notice" role="status"><Check size={16} /> {completedMessage} <button type="button" onClick={() => setCompletedMessage("")}>Dismiss</button></div>}
              {loading && <p role="status">Loading bookings…</p>}
              {loadError && <p role="alert" style={{ color: "#b42318" }}>{loadError}</p>}
              {actionError && <p role="alert" style={{ color: "#b42318" }}>{actionError}</p>}
              <div className="bd-step-head">
                <div className="bd-step-meta"><span className="bd-step-count">{availableBookings.length} {availableBookings.length === 1 ? "Job" : "Jobs"} Available</span><span className="bd-step-divider" /><span className="bd-step-eyebrow">Driver Dashboard</span></div>
                <h2 className="bd-step-title">Your Deliveries</h2>
                <p className="bd-step-desc">Pick up new jobs or follow through on deliveries you've already accepted.</p>
              </div>
              <div className={`driver-home__tabs${activeTab === "active" ? " driver-home__tabs--ongoing" : ""}`}>
                <button className={`driver-home__tab ${activeTab === "available" ? "active" : ""}`} onClick={() => { setActiveTab("available"); setExpandedId(null); }}>Pick Up<span className="driver-home__tab-count">{availableBookings.length}</span></button>
                <button className={`driver-home__tab ${activeTab === "active" ? "active" : ""}`} onClick={() => { setActiveTab("active"); setExpandedId(null); }}>Ongoing Deliveries<span className="driver-home__tab-count">{activeDeliveries.length}</span></button>
              </div>

              {activeTab === "available" && (
                <>
                  {!online && (
                    <EmptyState
                      Icon={ZapOff}
                      title="You're offline"
                      message="Go online to see available bookings and start accepting deliveries."
                    />
                  )}
                  <div className="driver-home__list">
                    {online && availableBookings.length === 0 && (<EmptyState Icon={Package} title="No bookings right now" message="You'll be notified the moment a new delivery request matches your vehicle." />)}
                    {online && availableBookings.map((b) => (<BookingCard key={b.id} booking={b} onExpand={(b) => setExpandedId(b.id)} />))}
                  </div>
                </>
              )}

              {activeTab === "active" && (
                <>
                  {/* The tab already shows the count; keep the card directly below it. */}
                  <div className="driver-home__list driver-home__list--ongoing">
                    {activeDeliveries.length === 0 && (<EmptyState Icon={Navigation} title="No active deliveries" message="Accept a booking from the Pick Up tab to get started." />)}
                    {activeDeliveries.map((b) => (<ActiveDeliveryCard key={b.id} booking={b} status={b.status} onExpand={() => setExpandedId(b.id)} />))}
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="driver-home__map">
            <MapPicker
              viewOnly pickupCoords={null} dropoffCoords={null}
              showDriverMarker
              driverCoords={myLocation}
              viewerCoords={myLocation}
              nearbyPickups={activeTab === "available" ? nearbyBookings : []}
              onNearbyPickupClick={setExpandedId}
            />
            {activeTab === "available" && <p className="feature-mini">{myLocation ? nearbyBookings.length + " pickup pins within 1 km. Click a pin to open the booking." : "Enable device location to see pickup pins within 1 km."} All vehicle-eligible jobs remain in the list.</p>}
          </div>
        </div>
      </div>
    </div>
  );

};


export default DriverHomePage;
