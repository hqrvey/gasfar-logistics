import React from "react";
import { MapPin, Navigation } from "lucide-react";
import { FiPlus } from "react-icons/fi";

const SqCard = ({ selected, onClick, Icon, label, sub = undefined, compact = false, size = undefined, disabled = false }) => (
  <button type="button" onClick={onClick} disabled={disabled} className={"sq-card" + (compact ? " sq-card--compact" : "") + (size === "sm" ? " sq-card--sm" : "") + (selected ? " selected" : "") + (disabled ? " sq-card--disabled" : "")} aria-pressed={selected}>
    <span className="sq-card__icon"><Icon size={compact ? 18 : size === "sm" ? 17 : 20} strokeWidth={1.8} /></span>
    {compact ? (
      <span className="sq-card__text"><span className="sq-card__label">{label}</span>{sub && <span className="sq-card__sub">{sub}</span>}</span>
    ) : (
      <><span className="sq-card__label">{label}</span>{sub && <span className="sq-card__sub">{sub}</span>}</>
    )}
  </button>
);
const LocCard = ({ type, pin, onEdit, onSave = null }) => {
  const isPick = type === "pickup";
  return (
    <div className="loc-card-wrap">
      <button type="button" onClick={onEdit} className={`loc-card loc-card--${isPick ? "pickup" : "dropoff"}${pin ? " loc-card--set" : ""}`}>
        <span className="loc-card__icon"><MapPin size={14} strokeWidth={2} /></span>
        <div className="loc-card__body"><div className="loc-card__label">{isPick ? "PICKUP" : "DROP-OFF"}</div><div className="loc-card__addr">{pin ? pin.address : `Tap to set ${isPick ? "pickup" : "drop-off"} location`}</div></div>
        {pin && <Navigation size={13} className="loc-card__nav" />}
      </button>
      {pin && onSave && (<button type="button" className="loc-card__save" title="Save as address" onClick={onSave}><FiPlus size={14} /></button>)}
    </div>
  );
};
const Field = ({ label, children, half = false }) => (<div className={`field${half ? " field--half" : ""}`}><label className="field__label">{label}</label>{children}</div>);
const RR = ({ label, value, price = false }) => (<div className="rr-row"><span className="rr-row__label">{label}</span><span className={`rr-row__value${price ? " rr-row__value--price" : ""}`}>{value || "—"}</span></div>);
const EmptyState = ({ Icon, title, message, tone = "default" }) => (
  <div className={`empty-state empty-state--${tone}`}>
    <div className="empty-state__icon-wrap"><span className="empty-state__pulse" /><span className="empty-state__pulse empty-state__pulse--delay" /><Icon size={40} strokeWidth={1.6} className="empty-state__icon" /></div>
    <p className="empty-state__title">{title}</p>
    {message && <p className="empty-state__message">{message}</p>}
  </div>
);
const ReviewGroup = ({ title, Icon, children }) => (<div className="rr-group"><div className="rr-group__head"><Icon size={13} /><span className="rr-group__title">{title}</span></div>{children}</div>);

export { SqCard, LocCard, Field, RR, EmptyState, ReviewGroup };
