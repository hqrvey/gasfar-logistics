import { useState } from "react";
import {
  Ban,
  CarFront,
  CheckCircle2,
  Eye,
  FileCheck2,
  MoreVertical,
  PauseCircle,
  UserCheck,
  XCircle,
} from "lucide-react";
import { Badge, MiniStat, PageHeader } from "../../components/admin/ui/index.js";
import DriverVerificationModal from "../../components/admin/drivers/DriverVerificationModal.jsx";
import usePersistedState from "../../hooks/usePersistedState.js";
import { INITIAL_DRIVERS } from "../../data/adminMockData.js";
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

export default function DriversPage() {
  const [rows, setRows] = usePersistedState(STORAGE_KEYS.drivers, INITIAL_DRIVERS);
  const [reviewing, setReviewing] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);

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
    </section>
  );
}
