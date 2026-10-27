import { ArrowRight, MapPin, Navigation, Truck, Zap } from "lucide-react";
import { FiPlus } from "react-icons/fi";
import { FARE_RATES } from "../../utils/pricing.js";

// Small delivery-related UI pieces used by more than one page.
// These stay together because each one is too small to need its own file.

function SqCard({ selected, onClick, Icon, label, sub, compact = false, size, disabled = false }) {
  const classes = [
    "sq-card",
    compact ? "sq-card--compact" : "",
    size === "sm" ? "sq-card--sm" : "",
    selected ? "selected" : "",
    disabled ? "sq-card--disabled" : "",
  ].filter(Boolean).join(" ");

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={classes} aria-pressed={selected}>
      <span className="sq-card__icon">
        <Icon size={compact ? 18 : size === "sm" ? 17 : 20} strokeWidth={1.8} />
      </span>
      {compact ? (
        <span className="sq-card__text">
          <span className="sq-card__label">{label}</span>
          {sub && <span className="sq-card__sub">{sub}</span>}
        </span>
      ) : (
        <>
          <span className="sq-card__label">{label}</span>
          {sub && <span className="sq-card__sub">{sub}</span>}
        </>
      )}
    </button>
  );
}

function LocCard({ type, pin, onEdit, onSave = null }) {
  const isPickup = type === "pickup";
  const locationType = isPickup ? "pickup" : "dropoff";
  const addressText = pin?.address || `Tap to set ${isPickup ? "pickup" : "drop-off"} location`;

  return (
    <div className="loc-card-wrap">
      <button
        type="button"
        onClick={onEdit}
        className={`loc-card loc-card--${locationType}${pin ? " loc-card--set" : ""}`}
      >
        <span className="loc-card__icon"><MapPin size={14} strokeWidth={2} /></span>
        <div className="loc-card__body">
          <div className="loc-card__label">{isPickup ? "PICKUP" : "DROP-OFF"}</div>
          <div className="loc-card__addr">{addressText}</div>
        </div>
        {pin && <Navigation size={13} className="loc-card__nav" />}
      </button>

      {pin && onSave && (
        <button type="button" className="loc-card__save" title="Save as address" onClick={onSave}>
          <FiPlus size={14} />
        </button>
      )}
    </div>
  );
}

function Field({ label, children, half = false, required = false, error = "" }) {
  return (
    <div className={`field${half ? " field--half" : ""}`}>
      <label className="field__label">{label}{required && <span className="required">*</span>}</label>
      {children}
      {error && <span className="field-error" role="alert">{error}</span>}
    </div>
  );
}

function RR({ label, value, price = false }) {
  return (
    <div className="rr-row">
      <span className="rr-row__label">{label}</span>
      <span className={`rr-row__value${price ? " rr-row__value--price" : ""}`}>
        {value || "—"}
      </span>
    </div>
  );
}

function EmptyState({ Icon, title, message, tone = "default" }) {
  return (
    <div className={`empty-state empty-state--${tone}`}>
      <div className="empty-state__icon-wrap">
        <span className="empty-state__pulse" />
        <span className="empty-state__pulse empty-state__pulse--delay" />
        <Icon size={40} strokeWidth={1.6} className="empty-state__icon" />
      </div>
      <p className="empty-state__title">{title}</p>
      {message && <p className="empty-state__message">{message}</p>}
    </div>
  );
}

function ReviewGroup({ title, Icon, children, onEdit = null }) {
  return (
    <div className="rr-group">
      <div className="rr-group__head">
        <Icon size={13} />
        <span className="rr-group__title">{title}</span>
        {onEdit && <button type="button" className="rr-group__edit" onClick={onEdit} aria-label={`Edit ${title}`}>Edit</button>}
      </div>
      {children}
    </div>
  );
}

// One booking-request card shared by the driver's Pick Up list and
// the customer's Pending Bookings list. This keeps the two designs identical.
// The parent page decides what should happen when the card is clicked.
function BookingRequestCard({ booking, onOpen, hideCustomer = false }) {
  const isPriority = booking.deliveryType === "priority";
  const customerName = booking.customerName || "You";
  const paymentMethod = booking.paymentMethod || "Cash";

  return (
    <button type="button" className="booking-pending-card" onClick={onOpen}>
      <div className="booking-pending-card__top">
        <span className={`delivery-type-badge ${isPriority ? "priority" : "regular"}`}>
          {isPriority ? <Zap size={12} /> : <Truck size={12} />}
          <span>{isPriority ? "Priority" : "Regular"}</span>
        </span>
        <span className="booking-pending-card__id">{booking.id}</span>
      </div>

      <div className="booking-pending-card__place">
        <span className="booking-pending-card__pin booking-pending-card__pin--pickup">
          <MapPin size={16} />
        </span>
        <span>
          <small>PICKUP</small>
          <strong>{booking.pickup?.address || "—"}</strong>
        </span>
      </div>

      <div className="booking-pending-card__place">
        <span className="booking-pending-card__pin booking-pending-card__pin--dropoff">
          <MapPin size={16} />
        </span>
        <span>
          <small>DROP-OFF</small>
          <strong>{booking.dropoff?.address || "—"}</strong>
        </span>
      </div>

      <div className="booking-pending-card__tags">
        <span>{booking.vehicleType || "Vehicle"}</span>
        <span>{booking.itemDetails || "Package details"}</span>
      </div>

      <div className="booking-pending-card__foot">
        <span>{hideCustomer ? `Payment: ${paymentMethod}` : `Booked by ${customerName} · ${paymentMethod}`}</span>
        <strong>{booking.price || "—"}</strong>
      </div>
    </button>
  );
}

// Both "Ongoing Deliveries" and "Track Ongoing" use one card layout.
// The two pages provide different content, but spacing/fonts stay identical.
function OngoingDeliveryCard({ bookingId, name, details, route, status, tone, right, onOpen }) {
  const initial = (name || "D").charAt(0).toUpperCase();

  return (
    <button
      type="button"
      className={`preview-card preview-card--flat preview-card--ongoing preview-card--${tone}`}
      onClick={onOpen}
    >
      <span className="preview-card__avatar">{initial}</span>

      {/* The booking ID belongs in the top-right corner of the whole card,
          not beside the status label in the middle of the text column. */}
      <span className="preview-card__id">{bookingId}</span>

      <span className="preview-card__body">
        <span className={`preview-card__status preview-card__status--${tone}`}>
          <span className="preview-card__live-dot" />
          {status}
        </span>
        <span className="preview-card__driver">
          {name}
          {details && <span className="preview-card__vehicle">· {details}</span>}
        </span>
        <span className="preview-card__route">{route}</span>
      </span>

      <span className="preview-card__right">{right}</span>
      <span className="preview-card__arrow"><ArrowRight size={16} /></span>
    </button>
  );
}

function RouteStrip({ pickup, dropoff, labels = true }) {
  return (
    <div className="route-strip">
      <div className="route-item">
        <span className="route-dot pickup" />
        <div>
          {labels && <p className="route-label">Pickup</p>}
          <p className="route-address">{pickup.address}</p>
        </div>
      </div>
      <div className="route-line-small" />
      <div className="route-item">
        <span className="route-dot dropoff" />
        <div>
          {labels && <p className="route-label">Drop-off</p>}
          <p className="route-address">{dropoff.address}</p>
        </div>
      </div>
    </div>
  );
}

// Same itemized fare presentation as the groupmate's booking wizard.
// Numeric amounts still come from the existing shared pricing function;
// the official price is recalculated by Express when the booking is created.
function FareBreakdown({ breakdown, vehicleLabel, credit = 0 }) {
  if (!breakdown) return null;
  const { base, firstKm, extraKm, priority, total, distanceKm } = breakdown;
  // Backend history objects contain the actual amounts but not tier labels.
  // Derive the labels from the same vehicle table used by the booking form.
  const vehicleKey = String(vehicleLabel || "").toLowerCase();
  const rate = FARE_RATES[vehicleKey];
  const firstDistance = breakdown.firstDistance ?? Math.min(Number(distanceKm || 0), rate?.split || 5);
  const extraDistance = breakdown.extraDistance ?? Math.max(0, Number(distanceKm || 0) - (rate?.split || 5));
  const firstRate = breakdown.firstRate ?? rate?.first ?? 0;
  const extraRate = breakdown.extraRate ?? rate?.extra ?? 0;
  const pesos = value => "₱" + Number(value || 0).toLocaleString("en-PH");
  return (
    <div className="fare-bd">
      <div className="fare-bd__head">
        <span className="fare-bd__title">Price breakdown</span>
        <span className="fare-bd__meta">{vehicleLabel} · {Number(distanceKm).toFixed(1)} km</span>
      </div>
      <div className="fare-bd__row">
        <span className="fare-bd__item"><span className="fare-bd__name">Base fare</span><span className="fare-bd__calc">Pickup and handling</span></span>
        <span className="fare-bd__amt">{pesos(base)}</span>
      </div>
      <div className="fare-bd__row">
        <span className="fare-bd__item"><span className="fare-bd__name">First {rate?.split || firstDistance} km</span><span className="fare-bd__calc">{firstDistance} km × {pesos(firstRate)}/km</span></span>
        <span className="fare-bd__amt">{pesos(firstKm)}</span>
      </div>
      {extraDistance > 0 && <div className="fare-bd__row">
        <span className="fare-bd__item"><span className="fare-bd__name">Beyond {rate?.split || firstDistance} km</span><span className="fare-bd__calc">{extraDistance.toFixed(1)} km × {pesos(extraRate)}/km</span></span>
        <span className="fare-bd__amt">{pesos(extraKm)}</span>
      </div>}
      {priority > 0 && <div className="fare-bd__row">
        <span className="fare-bd__item"><span className="fare-bd__name">Priority service</span><span className="fare-bd__calc">20% surcharge</span></span>
        <span className="fare-bd__amt">+{pesos(priority)}</span>
      </div>}
      {credit > 0 && <div className="fare-bd__row fare-bd__row--credit">
        <span className="fare-bd__item"><span className="fare-bd__name">Available credit</span></span>
        <span className="fare-bd__amt">−{pesos(Math.min(total, credit))}</span>
      </div>}
      <div className="fare-bd__total">
        <span>{credit > 0 ? "Estimated amount due" : "Total"}</span>
        <span className="fare-bd__total-amt">{pesos(Math.max(0, total - credit))}</span>
      </div>
    </div>
  );
}

export { SqCard, LocCard, Field, RR, EmptyState, ReviewGroup, RouteStrip, BookingRequestCard, OngoingDeliveryCard, FareBreakdown };
