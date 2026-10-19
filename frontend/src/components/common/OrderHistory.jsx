import { useState } from "react";
import { ArrowLeft, Check, Star } from "lucide-react";
import { FiPhone } from "react-icons/fi";
import { useBookings } from "../../hooks/useBookings.js";
import { groupOf, statusOf } from "../../utils/helpers.js";
import { MOCK_DRIVER } from "../../data/demo/clientMockData.js";
import { MapPicker } from "./MapComponents.jsx";
import { RouteStrip } from "./BookingUI.jsx";

const STATUS_TABS = ["Completed", "Cancelled"];

// Review UI is only used in order history, so it stays in this file.
function StatusBadge({ status }) {
  const { cls, label } = statusOf(status);
  return <span className={`status-badge ${cls}`}>{label}</span>;
}

function DriverAvatar({ name, photo = null }) {
  return (
    <div className="driver-avatar">
      {photo ? (
        <img src={photo} alt={name} />
      ) : (
        <span>{name && name !== "—" ? name.charAt(0) : "?"}</span>
      )}
    </div>
  );
}

function StarRatingInput({ value, onChange, size = 30 }) {
  return (
    <div className="star-rating-input">
      {[1, 2, 3, 4, 5].map((number) => (
        <button
          key={number}
          type="button"
          className={`star-rating-input__star${number <= value ? " filled" : ""}`}
          onClick={() => onChange(number)}
          aria-label={`${number} star${number > 1 ? "s" : ""}`}
        >
          <Star
            size={size}
            fill={number <= value ? "#F47B20" : "none"}
            color={number <= value ? "#F47B20" : "#d1d5db"}
          />
        </button>
      ))}
    </div>
  );
}

function UserReviewCard({ order, existingReview, onSubmit, readOnly = false }) {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [comment, setComment] = useState(existingReview?.comment || "");
  const [submitting, setSubmitting] = useState(false);

  if (readOnly && !existingReview) {
    return (
      <div className="user-review-card user-review-card--awaiting">
        <div className="user-review-card__head">
          <span className="user-review-card__icon user-review-card__icon--muted">
            <Star size={16} />
          </span>
          <div>
            <p className="user-review-card__title">Awaiting customer review</p>
            <p className="user-review-card__sub">
              {order.customerName || "The customer"} hasn't reviewed this delivery yet.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (readOnly || existingReview) {
    const isDriverView = readOnly;
    const details = isDriverView
      ? `${order.customerName} rated you · ${existingReview.date}`
      : `Thanks for rating ${order.driverName} · ${existingReview.date}`;

    return (
      <div className="user-review-card user-review-card--submitted">
        <div className="user-review-card__head">
          <span className="user-review-card__icon">
            <Star size={16} fill="#F47B20" color="#F47B20" />
          </span>
          <div>
            <p className="user-review-card__title">
              {isDriverView ? "Customer review" : "Your review"}
            </p>
            <p className="user-review-card__sub">{details}</p>
          </div>
        </div>
        <div className="user-review-card__stars">
          {[1, 2, 3, 4, 5].map((number) => (
            <Star
              key={number}
              size={18}
              fill={number <= existingReview.rating ? "#F47B20" : "none"}
              color={number <= existingReview.rating ? "#F47B20" : "#d1d5db"}
            />
          ))}
          <span className="user-review-card__rating-num">{existingReview.rating}.0</span>
        </div>
        {existingReview.comment && (
          <p className="user-review-card__comment">{existingReview.comment}</p>
        )}
      </div>
    );
  }

  function handleSubmit() {
    if (!rating || submitting) return;
    setSubmitting(true);

    // Keep the prototype's short submission delay until the backend is ready.
    setTimeout(() => {
      onSubmit({ rating, comment: comment.trim() });
      setSubmitting(false);
    }, 400);
  }

  return (
    <div className="user-review-card">
      <div className="user-review-card__head">
        <span className="user-review-card__icon">
          <Star size={16} fill="#F47B20" color="#F47B20" />
        </span>
        <div>
          <p className="user-review-card__title">Rate your driver</p>
          <p className="user-review-card__sub">How was your delivery with {order.driverName}?</p>
        </div>
      </div>
      <StarRatingInput value={rating} onChange={setRating} />
      <textarea
        className="field__textarea user-review-card__textarea"
        placeholder="Share your experience (optional)…"
        value={comment}
        maxLength={300}
        onChange={(event) => setComment(event.target.value)}
      />
      <div className="user-review-card__foot">
        <span className="user-review-card__hint">{comment.length}/300</span>
        <button
          type="button"
          className="btn-submit-review"
          disabled={!rating || submitting}
          onClick={handleSubmit}
        >
          <Check size={14} /> {submitting ? "Submitting…" : "Submit Review"}
        </button>
      </div>
    </div>
  );
}

// These two components are only needed by OrderHistory.
function HistoryCard({ order, role, onExpand }) {
  const personName = role === "driver"
    ? order.customerName
    : order.driver?.name || order.driverName || "—";
  const personDetails = `${order.vehicleType} · ${order.bookedAt || order.timeDate}`;

  return (
    <button type="button" className="order-card" onClick={() => onExpand(order)}>
      <div className="order-card__top">
        <StatusBadge status={order.status} />
        <span className="order-card__id">{order.id}</span>
      </div>
      <div className="order-card__driver">
        <DriverAvatar name={personName} />
        <div>
          <p className="order-card__driver-name">{personName}</p>
          <p className="order-card__meta">{personDetails}</p>
        </div>
      </div>
      <RouteStrip pickup={order.pickup} dropoff={order.dropoff} labels={false} />
      {order.contactNumber && (
        <div className="order-card__row">
          <FiPhone size={12} />
          <span>{order.contactNumber}</span>
        </div>
      )}
      <div className="order-card__footer">
        <span className="order-card__items">{order.itemDetails}</span>
        <span className="order-card__price">{order.price}</span>
      </div>
      {order.completedAt && (
        <div className="order-card__timeline-row">
          <span>Completed</span><span>{order.completedAt}</span>
        </div>
      )}
      {order.cancelledAt && (
        <div className="order-card__timeline-row">
          <span>Cancelled</span><span>{order.cancelledAt}</span>
        </div>
      )}
    </button>
  );
}

function HistoryDetailsPanel({ order, role, onBack, review, onSubmitReview }) {
  const personName = role === "driver"
    ? order.customerName
    : order.driver?.name || order.driverName;
  const driverName = order.driver?.name || order.driverName;

  return (
    <div className="history-detail-panel">
      <button type="button" className="active-back-link" onClick={onBack}>
        <ArrowLeft size={14} /> Back to history
      </button>
      <div className="history-detail-panel__head">
        <StatusBadge status={order.status} />
        <span className="history-detail-panel__id">{order.id}</span>
      </div>
      <div className="history-detail-panel__person">
        <DriverAvatar name={personName} />
        <div className="history-detail-panel__person-body">
          <p className="history-detail-panel__name">{personName}</p>
          <p className="history-detail-panel__meta">
            {order.vehicleType} · {order.bookedAt || order.timeDate}
          </p>
        </div>
      </div>
      <RouteStrip pickup={order.pickup} dropoff={order.dropoff} />
      <div className="order-expand__details">
        <div className="detail-row">
          <span className="detail-label">Items</span>
          <span className="detail-value">{order.itemDetails}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">
            {role === "driver" ? "Customer Phone" : "Driver Phone"}
          </span>
          <span className="detail-value">{order.contactNumber || "—"}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Price</span>
          <span className="detail-value detail-value--price">{order.price}</span>
        </div>
        {order.completedAt && (
          <div className="detail-row">
            <span className="detail-label">Completed</span>
            <span className="detail-value">{order.completedAt}</span>
          </div>
        )}
        {order.cancelledAt && (
          <div className="detail-row">
            <span className="detail-label">Cancelled</span>
            <span className="detail-value">{order.cancelledAt}</span>
          </div>
        )}
      </div>
      {groupOf(order.status) === "completed" && (
        <UserReviewCard
          order={{ ...order, driverName }}
          existingReview={review}
          onSubmit={onSubmitReview}
          readOnly={role === "driver"}
        />
      )}
    </div>
  );
}

// Shared by the user history page and the driver history page.
export default function OrderHistory({ role, reviews = {}, onSubmitReview = () => {} }) {
  const isDriver = role === "driver";
  const { bookings } = useBookings();
  const [activeTab, setActiveTab] = useState("Completed");
  const [expanded, setExpanded] = useState(null);

  // The existing demo filtering stays the same until real user accounts are connected.
  const completedBookings = bookings.filter((booking) => {
    const isMine = isDriver
      ? booking.driver?.name === MOCK_DRIVER.name
      : booking.customerName === "Juan Dela Cruz";
    const isFinished = ["delivered", "completed", "cancelled"].includes(booking.status);
    return isMine && isFinished;
  });
  const visibleBookings = completedBookings.filter(
    (booking) => groupOf(booking.status) === activeTab.toLowerCase()
  );

  if (expanded) {
    return (
      <div className="history-split">
        <aside className="history-split__panel">
          <HistoryDetailsPanel
            order={expanded}
            role={role}
            onBack={() => setExpanded(null)}
            review={reviews[expanded.id]}
            onSubmitReview={isDriver ? undefined : (payload) => onSubmitReview(expanded.id, payload)}
          />
        </aside>
        <section className="history-split__map">
          <MapPicker
            key={expanded.id}
            viewOnly
            pickupCoords={expanded.pickup}
            dropoffCoords={expanded.dropoff}
          />
        </section>
      </div>
    );
  }

  return (
    <div className="history-page-wrap">
      <div className="history-body">
        <h1 className="order-history__title">
          {isDriver ? "Booking History" : "Order History"}
        </h1>
        <div className="order-history__tabs">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              className={`history-tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => {
                setActiveTab(tab);
                setExpanded(null);
              }}
            >
              {tab}
              <span className="history-tab__count">
                {completedBookings.filter(
                  (booking) => groupOf(booking.status) === tab.toLowerCase()
                ).length}
              </span>
            </button>
          ))}
        </div>
        <div className="order-list">
          {visibleBookings.length === 0 ? (
            <div className="order-empty">
              <p>No {activeTab.toLowerCase()} {isDriver ? "bookings" : "orders"}.</p>
            </div>
          ) : (
            visibleBookings.map((booking) => (
              <HistoryCard
                key={booking.id}
                order={booking}
                role={role}
                onExpand={setExpanded}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
