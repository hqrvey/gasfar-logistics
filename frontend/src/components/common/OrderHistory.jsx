import { useEffect, useState } from "react";
import { bookingService } from "../../services/bookingService.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { ArrowLeft, Check, Star } from "lucide-react";
import { FiPhone } from "react-icons/fi";
import { groupOf, statusOf } from "../../utils/helpers.js";
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
  const [submitError, setSubmitError] = useState("");

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

  async function handleSubmit() {
    // This is a real REST API request, not a simulated timer or localStorage.
    if (!rating || submitting) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      // onSubmit is passed down from OrderHistory, which calls bookingService.
      await onSubmit({ rating: rating, comment: comment.trim() });
    } catch (error) {
      // Show backend errors (e.g. network problem or already reviewed).
      setSubmitError(error.message);
    } finally {
      setSubmitting(false);
    }
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
      {submitError && <p role="alert" className="user-review-card__hint">{submitError}</p>}
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
    : order.driver?.name || order.driverName || "No driver assigned";
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
      {/* The customer should see the DRIVER'S phone; the driver sees the CUSTOMER'S. */}
      {(role === "driver" ? order.contactNumber : order.driver?.phone) && (
        <div className="order-card__row">
          <FiPhone size={12} />
          <span>{role === "driver" ? order.contactNumber : order.driver.phone}</span>
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
    : order.driver?.name || order.driverName || "No driver assigned";
  const driverName = order.driver?.name || order.driverName || "No driver assigned";

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
          <span className="detail-value">
            {role === "driver" ? (order.contactNumber || "—") : (order.driver?.phone || "—")}
          </span>
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
        {order.status === "cancelled" && (
          <div className="detail-row">
            <span className="detail-label">Cancelled by</span>
            <span className="detail-value">{order.cancelledBy || "—"}</span>
          </div>
        )}
        {order.status === "cancelled" && (
          <div className="detail-row">
            <span className="detail-label">Reason</span>
            <span className="detail-value">{order.cancelReason || "No reason recorded"}</span>
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

// One shared component is used by BOTH customer and driver history pages.
export default function OrderHistory({ role }) {
  const isDriver = role === "driver";
  const { user } = useAuth(); // The logged-in account, supplied by AuthContext.

  // React state: changing any of these values causes React to rerender the UI.
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("Completed");
  const [expanded, setExpanded] = useState(null);
  const [reloadNumber, setReloadNumber] = useState(0);

  // useEffect runs after the page appears (and again when reloadNumber changes).
  // React -> bookingService.history() -> GET /api/bookings/history -> MongoDB.
  useEffect(() => {
    let stillHere = true;
    async function loadHistory() {
      setLoading(true);
      setError("");
      try {
        const history = await bookingService.history();
        if (stillHere) setBookings(history);
      } catch (problem) {
        if (stillHere) setError(problem.message);
      } finally {
        if (stillHere) setLoading(false);
      }
    }
    if (user) {
      loadHistory();
    } else {
      setBookings([]);
      setLoading(false);
    }
    // Cleanup: ignore a request's response if the user leaves this page.
    return () => { stillHere = false; };
  }, [user?.id, reloadNumber]);

  // Only delivered/cancelled bookings come from this endpoint.
  // Choose the matching tab using the same groupOf() helper as before.
  const visibleBookings = bookings.filter(
    (booking) => groupOf(booking.status) === activeTab.toLowerCase()
  );

  // Customer submits stars -> Express saves review inside the Booking document.
  // The driver will receive the same saved review when opening their history.
  async function submitReview(bookingCode, payload) {
    const result = await bookingService.review(bookingCode, payload.rating, payload.comment);
    // Update the matching booking in React without refreshing the whole page.
    setBookings((previous) => previous.map((booking) => {
      if (booking.id === bookingCode) return result.booking;
      return booking;
    }));
    setExpanded(result.booking);
  }

  if (expanded) {
    return (
      <div className="history-split">
        <aside className="history-split__panel">
          <HistoryDetailsPanel
            order={expanded}
            role={role}
            onBack={() => setExpanded(null)}
            review={expanded.review}
            onSubmitReview={isDriver ? undefined : (payload) => submitReview(expanded.id, payload)}
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
                {bookings.filter(
                  (booking) => groupOf(booking.status) === tab.toLowerCase()
                ).length}
              </span>
            </button>
          ))}
        </div>
        <div className="order-list">
          {loading ? (
            <div className="order-empty"><p>Loading your history…</p></div>
          ) : error ? (
            <div className="order-empty" role="alert">
              <p>Unable to load history: {error}</p>
              <button type="button" className="active-back-link" onClick={() => setReloadNumber(reloadNumber + 1)}>
                Try again
              </button>
            </div>
          ) : visibleBookings.length === 0 ? (
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
