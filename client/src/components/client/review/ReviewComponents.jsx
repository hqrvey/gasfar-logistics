import React, { useState } from "react";
import { FiPhone } from "react-icons/fi";
import { Star, Check } from "lucide-react";
import { statusOf } from "../../../utils/helpers.js";

/* ═══ History shared ═══ */
const STATUS_TABS = ["Completed", "Cancelled"];
const StatusBadge = ({ status }) => { const s = statusOf(status); return <span className={`status-badge ${s.cls}`}>{s.label}</span>; };
const DriverAvatar = ({ name, photo = null }) => (<div className="driver-avatar">{photo ? <img src={photo} alt={name} /> : <span>{name && name !== "—" ? name.charAt(0) : "?"}</span>}</div>);
const StarRatingInput = ({ value, onChange, size = 30 }) => (
  <div className="star-rating-input">
    {[1, 2, 3, 4, 5].map((n) => (<button key={n} type="button" className={`star-rating-input__star${n <= value ? " filled" : ""}`} onClick={() => onChange(n)} aria-label={`${n} star${n > 1 ? "s" : ""}`}><Star size={size} fill={n <= value ? "#F47B20" : "none"} color={n <= value ? "#F47B20" : "#d1d5db"} /></button>))}
  </div>
);
const UserReviewCard = ({ order, existingReview, onSubmit, readOnly = false }) => {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [comment, setComment] = useState(existingReview?.comment || "");
  const [submitting, setSubmitting] = useState(false);
  if (readOnly && !existingReview) {
    return (<div className="user-review-card user-review-card--awaiting"><div className="user-review-card__head"><span className="user-review-card__icon user-review-card__icon--muted"><Star size={16} /></span><div><p className="user-review-card__title">Awaiting customer review</p><p className="user-review-card__sub">{order.customerName || "The customer"} hasn't reviewed this delivery yet.</p></div></div></div>);
  }
  if (readOnly || existingReview) {
    const isDriverView = readOnly;
    return (
      <div className="user-review-card user-review-card--submitted">
        <div className="user-review-card__head"><span className="user-review-card__icon"><Star size={16} fill="#F47B20" color="#F47B20" /></span><div><p className="user-review-card__title">{isDriverView ? "Customer review" : "Your review"}</p><p className="user-review-card__sub">{isDriverView ? `${order.customerName} rated you · ${existingReview.date}` : `Thanks for rating ${order.driverName} · ${existingReview.date}`}</p></div></div>
        <div className="user-review-card__stars">{[1, 2, 3, 4, 5].map((n) => (<Star key={n} size={18} fill={n <= existingReview.rating ? "#F47B20" : "none"} color={n <= existingReview.rating ? "#F47B20" : "#d1d5db"} />))}<span className="user-review-card__rating-num">{existingReview.rating}.0</span></div>
        {existingReview.comment && (<p className="user-review-card__comment">{existingReview.comment}</p>)}
      </div>
    );
  }
  const handleSubmit = () => { if (!rating || submitting) return; setSubmitting(true); setTimeout(() => { onSubmit({ rating, comment: comment.trim() }); setSubmitting(false); }, 400); };
  return (
    <div className="user-review-card">
      <div className="user-review-card__head"><span className="user-review-card__icon"><Star size={16} fill="#F47B20" color="#F47B20" /></span><div><p className="user-review-card__title">Rate your driver</p><p className="user-review-card__sub">How was your delivery with {order.driverName}?</p></div></div>
      <StarRatingInput value={rating} onChange={setRating} />
      <textarea className="field__textarea user-review-card__textarea" placeholder="Share your experience (optional)…" value={comment} maxLength={300} onChange={(e) => setComment(e.target.value)} />
      <div className="user-review-card__foot"><span className="user-review-card__hint">{comment.length}/300</span><button type="button" className="btn-submit-review" disabled={!rating || submitting} onClick={handleSubmit}><Check size={14} /> {submitting ? "Submitting…" : "Submit Review"}</button></div>
    </div>
  );
};

const RouteStrip = ({ pickup, dropoff, labels = true }) => (
  <div className="route-strip">
    <div className="route-item"><span className="route-dot pickup" /><div>{labels && <p className="route-label">Pickup</p>}<p className="route-address">{pickup.address}</p></div></div>
    <div className="route-line-small" />
    <div className="route-item"><span className="route-dot dropoff" /><div>{labels && <p className="route-label">Drop-off</p>}<p className="route-address">{dropoff.address}</p></div></div>
  </div>
);
export { StatusBadge, DriverAvatar, StarRatingInput, UserReviewCard, RouteStrip };
