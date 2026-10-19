import { useState } from "react";
import {
  Ban,
  CarFront,
  CheckCircle2,
  Eye,
  FileCheck2,
  MoreVertical,
  PauseCircle,
  Star,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";
import { Badge, MiniStat, PageHeader } from "../../components/admin/AdminUI.jsx";
import DriverVerificationModal from "../../components/admin/DriverVerificationModal.jsx";
import usePersistedState from "../../hooks/usePersistedState.js";
import { useBookings } from "../../hooks/useBookings.js";
import { useReviews } from "../../hooks/useReviews.js";
import { INITIAL_DRIVERS } from "../../data/demo/adminMockData.js";
import { MOCK_DRIVER, MOCK_DRIVER_REVIEWS } from "../../data/demo/clientMockData.js";
import { STORAGE_KEYS } from "../../utils/storage.js";

// [verification status, account status] for each admin action
const DRIVER_STATES = {
  approve: ["Verified", "Active"],
  hold: ["Pending", "On Hold"],
  reject: ["Rejected", "Suspended"],
};

const MENU_ACTIONS = [
  { action: "hold", label: "Hold Account", icon: PauseCircle, color: "#d97706" },
  { action: "approve", label: "Activate", icon: CheckCircle2, color: "#059669" },
  { action: "reject", label: "Suspend", icon: XCircle, color: "#dc2626", danger: true },
];

const verificationTone = (status) =>
  ({ Verified: "green", Pending: "yellow" })[status] ?? "red";

const accountTone = (status) => ({ Active: "green", "On Hold": "gray" })[status] ?? "red";

/* ═══ Reviews helpers ═══ */

/* Random reviewer names (used when a review has no name) */
const RANDOM_NAMES = [
  "Maria Reyes", "Juan Dela Cruz", "Angela Santos", "Mark Villanueva",
  "Katrina Bautista", "Joseph Mendoza", "Patricia Garcia", "Daniel Ramos",
  "Jasmine Cruz", "Miguel Torres", "Bianca Aquino", "Carlo Navarro",
  "Rhea Castillo", "Paolo Fernandez", "Liza Domingo", "Kevin Soriano",
];

/* Stable "random" pick — same seed always gives the same name */
const pickName = (seed = "") => {
  let hash = 0;
  const str = String(seed);
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return RANDOM_NAMES[Math.abs(hash) % RANDOM_NAMES.length];
};

const norm = (s) => String(s || "").trim().toLowerCase();

/* Collect every review that belongs to one driver (matched by ID or name) */
const getDriverReviews = (driverId, driverName, bookings, reviews) => {
  const real = Object.entries(reviews || {})
    .map(([orderId, r]) => {
      const b = (bookings || []).find((x) => x.id === orderId);
      const d = b?.driver;
      if (!d) return null;

      const sameId = d.id && d.id === driverId;
      const sameName = norm(d.name) && norm(d.name) === norm(driverName);
      if (!sameId && !sameName) return null;

      return {
        ...r,
        name:
          r.name ||
          b?.customer?.name ||
          b?.customerName ||
          b?.user?.name ||
          pickName(orderId),
      };
    })
    .filter(Boolean);

  /* Seed reviews belong to the mock driver only */
  const isMockDriver =
    norm(driverName) === norm(MOCK_DRIVER.name) ||
    (MOCK_DRIVER.id && MOCK_DRIVER.id === driverId);

  const seed = isMockDriver
    ? MOCK_DRIVER_REVIEWS.map((r) => ({
        ...r,
        name:
          r.name ||
          r.reviewer ||
          r.userName ||
          r.customerName ||
          pickName(`${r.date}${r.comment}${r.rating}`),
      }))
    : [];

  return [...seed, ...real].reverse();
};

const renderStars = (rating, size = 14) =>
  [1, 2, 3, 4, 5].map((n) => (
    <Star
      key={n}
      size={size}
      fill={n <= Math.round(rating) ? "#F47B20" : "none"}
      color={n <= Math.round(rating) ? "#F47B20" : "#cbd5e1"}
    />
  ));

/* ═══ Reviews modal ═══ */
function DriverReviewsModal({ driver, reviews, onClose }) {
  const [id, name] = driver;
  const count = reviews.length;
  const avg = count ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / count : 0;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 16,
          width: "100%",
          maxWidth: 520,
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 50px rgba(15, 23, 42, 0.25)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            padding: "18px 20px 12px",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 18, color: "#0f1c3f" }}>Driver Reviews</h3>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
              {name} · {id}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              padding: 4,
              color: "#64748b",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Summary */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "14px 20px",
            background: "#f8fafc",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <span style={{ fontSize: 32, fontWeight: 700, color: "#0f1c3f" }}>
            {avg.toFixed(1)}
          </span>
          <div>
            <div style={{ display: "flex", gap: 2 }}>{renderStars(avg, 16)}</div>
            <span style={{ fontSize: 12, color: "#64748b" }}>
              {count} review{count !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* List */}
        <div style={{ padding: 16, overflowY: "auto", display: "grid", gap: 10 }}>
          {count === 0 ? (
            <div style={{ textAlign: "center", padding: "28px 12px", color: "#94a3b8" }}>
              <Star size={32} color="#cbd5e1" />
              <p style={{ margin: "8px 0 2px", fontWeight: 600, color: "#64748b" }}>
                No reviews yet
              </p>
              <span style={{ fontSize: 13 }}>
                This driver hasn't received any ratings from customers.
              </span>
            </div>
          ) : (
            reviews.map((r, i) => (
              <div
                key={i}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: "12px 14px",
                  background: "#fff",
                }}
              >
                <p
                  style={{
                    margin: "0 0 4px",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#0f1c3f",
                  }}
                >
                  {r.name}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                  {renderStars(r.rating, 12)}
                  <span style={{ marginLeft: "auto", fontSize: 12, color: "#94a3b8" }}>
                    {r.date}
                  </span>
                </div>
                {r.comment && (
                  <p style={{ margin: "6px 0 0", fontSize: 13, color: "#334155" }}>
                    {r.comment}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function DriversPage() {
  const [rows, setRows] = usePersistedState(STORAGE_KEYS.drivers, INITIAL_DRIVERS);
  const [reviewing, setReviewing] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [viewingReviews, setViewingReviews] = useState(null);

  const { bookings } = useBookings();
  const { reviews } = useReviews();

  const applyAction = (driverId, action) => {
    const [verification, account] = DRIVER_STATES[action];

    setRows((current) =>
      current.map((driver) =>
        driver[0] === driverId
          ? [driver[0], driver[1], driver[2], driver[3], verification, account]
          : driver
      )
    );
  };

  const resolveReview = (action) => {
    applyAction(reviewing[0], action);
    setReviewing(null);
  };

  return (
    <section className="content">
      <PageHeader
        title="Driver Management"
        desc="Review applications, verify documents, and manage driver accounts."
      />

      <div className="driverCards">
        <MiniStat
          icon={<FileCheck2 />}
          n={rows.filter((driver) => driver[4] === "Pending").length}
          t="Pending Verification"
        />
        <MiniStat
          icon={<UserCheck />}
          n={rows.filter((driver) => driver[4] === "Verified").length}
          t="Verified Drivers"
        />
        <MiniStat
          icon={<Ban />}
          n={rows.filter((driver) => driver[5] === "Suspended").length}
          t="Suspended"
        />
        <MiniStat icon={<CarFront />} n="179" t="Registered Vehicles" />
      </div>

      <div className="card tableCard">
        <div className="cardHead">
          <div>
            <h2>Driver Applications &amp; Accounts</h2>
            <p>
              Click View under Actions to verify submitted documents and update
              driver application status.
            </p>
          </div>
        </div>

        <div className="tableScroll">
          <table className="driverTable">
            <thead>
              <tr>
                <th>Driver ID</th>
                <th>Driver Name</th>
                <th>Documents</th>
                <th>Vehicle</th>
                <th>Verification</th>
                <th>Account Status</th>
                <th style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((driver) => {
                const [id, name, documents, vehicle, verification, account] = driver;

                return (
                  <tr key={id}>
                    <td className="id">{id}</td>
                    <td>
                      <b>{name}</b>
                    </td>
                    <td>{documents}</td>
                    <td>{vehicle}</td>
                    <td>
                      <Badge tone={verificationTone(verification)}>{verification}</Badge>
                    </td>
                    <td>
                      <Badge tone={accountTone(account)}>{account}</Badge>
                    </td>

                    <td style={{ textAlign: "center", position: "relative" }}>
                      <button
                        className="menuDotsBtn"
                        onClick={() => setOpenMenuId(openMenuId === id ? null : id)}
                      >
                        <MoreVertical size={16} />
                      </button>

                      {openMenuId === id && (
                        <div className="actionDropdown">
                          <button
                            onClick={() => {
                              setReviewing(driver);
                              setOpenMenuId(null);
                            }}
                          >
                            <Eye size={14} color="#3b82f6" />
                            View Details
                          </button>

                          <button
                            onClick={() => {
                              setViewingReviews(driver);
                              setOpenMenuId(null);
                            }}
                          >
                            <Star size={14} color="#F47B20" />
                            Reviews
                          </button>

                          {MENU_ACTIONS.map(({ action, label, icon: Icon, color, danger }) => (
                            <button
                              key={action}
                              className={danger ? "dangerOption" : undefined}
                              onClick={() => {
                                applyAction(id, action);
                                setOpenMenuId(null);
                              }}
                            >
                              <Icon size={14} color={color} />
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {reviewing && (
        <DriverVerificationModal
          driver={reviewing}
          onClose={() => setReviewing(null)}
          onApprove={() => resolveReview("approve")}
          onHold={() => resolveReview("hold")}
          onReject={() => resolveReview("reject")}
        />
      )}

      {viewingReviews && (
        <DriverReviewsModal
          driver={viewingReviews}
          reviews={getDriverReviews(
            viewingReviews[0],
            viewingReviews[1],
            bookings,
            reviews
          )}
          onClose={() => setViewingReviews(null)}
        />
      )}
    </section>
  );
}