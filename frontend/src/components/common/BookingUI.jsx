import { MapPin, Navigation } from "lucide-react";
import { FiPlus } from "react-icons/fi";

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

function Field({ label, children, half = false }) {
  return (
    <div className={`field${half ? " field--half" : ""}`}>
      <label className="field__label">{label}</label>
      {children}
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

function ReviewGroup({ title, Icon, children }) {
  return (
    <div className="rr-group">
      <div className="rr-group__head">
        <Icon size={13} />
        <span className="rr-group__title">{title}</span>
      </div>
      {children}
    </div>
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

export { SqCard, LocCard, Field, RR, EmptyState, ReviewGroup, RouteStrip };
