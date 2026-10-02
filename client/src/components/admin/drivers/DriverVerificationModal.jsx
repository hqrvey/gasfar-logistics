import { useState } from "react";
import {
  AlertCircle,
  CarFront,
  CheckCircle2,
  FileText,
  PauseCircle,
  ShieldCheck,
  User,
  X,
  XCircle,
} from "lucide-react";
import { DRIVER_DOCS } from "../../../data/adminMockData.js";

const DOC_GROUPS = [
  {
    title: "Driver",
    tabs: [
      { id: "profilePhoto", label: "Profile Photo", icon: User },
      { id: "license", label: "Driver's License", icon: FileText },
    ],
  },
  {
    title: "Vehicle",
    tabs: [
      { id: "orCr", label: "Vehicle OR/CR", icon: FileText },
      { id: "vehiclePhoto", label: "Vehicle Photo", icon: CarFront },
    ],
  },
];

const labelStyle = { color: "#94a3b8", display: "block" };
const valueStyle = { fontWeight: 500, color: "#1e293b" };

function LicenseDetails({ driverName }) {
  const { number, restrictions, expDate } = DRIVER_DOCS.license;

  return (
    <div className="detailsCard">
      <span className="metaTitle">Document Details</span>
      <div className="detailsGrid">
        <div>
          <span style={labelStyle}>Name</span>
          <span style={valueStyle}>{driverName}</span>
        </div>
        <div>
          <span style={labelStyle}>License Number</span>
          <span style={{ ...valueStyle, fontFamily: "monospace" }}>{number}</span>
        </div>
        <div>
          <span style={labelStyle}>Restrictions</span>
          <span style={valueStyle}>{restrictions}</span>
        </div>
        <div>
          <span style={labelStyle}>Expiration Date</span>
          <span style={valueStyle}>{expDate}</span>
        </div>
      </div>
    </div>
  );
}

export default function DriverVerificationModal({
  driver,
  onClose,
  onApprove,
  onHold,
  onReject,
}) {
  const [activeTab, setActiveTab] = useState("profilePhoto");
  const [id, name, , , verification] = driver;
  const activeDoc = DRIVER_DOCS[activeTab];
  const docs = Object.values(DRIVER_DOCS);

  return (
    <div className="modalOverlay">
      <div className="verificationModal">
        {/* Header */}
        <div className="modalHeader">
          <div className="driverHeaderInfo">
            <div className="driverAvatar">
              <img src={DRIVER_DOCS.profilePhoto.imgUrl} alt="Driver Profile" />
            </div>

            <div className="modalTitleGroup">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h2>Driver Verification</h2>
                <span className="statusBadgePending">
                  <AlertCircle size={12} />
                  {verification}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                {name} &bull; {id}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="closeModalBtn">
            <X size={20} />
          </button>
        </div>

        <div className="modalGridBody">
          {/* Left: document tabs */}
          <div className="modalSidebar">
            {DOC_GROUPS.map(({ title, tabs }, groupIndex) => (
              <div key={title} style={groupIndex ? { marginTop: "1rem" } : undefined}>
                <span className="sidebarSectionTitle">{title}</span>
                {tabs.map(({ id: tabId, label, icon: Icon }) => (
                  <button
                    key={tabId}
                    onClick={() => setActiveTab(tabId)}
                    className={`tabItem ${activeTab === tabId ? "active" : ""}`}
                  >
                    <Icon size={15} />
                    {label}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Middle: document viewer */}
          <div className="documentViewer">
            <div>
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#1e293b" }}>
                {activeDoc?.title || "Document Details"}
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#94a3b8" }}>
                Clear and recent submission of the applicant.
              </p>
            </div>

            <div className="previewGrid">
              <div className="imagePreviewFrame">
                <img src={activeDoc?.imgUrl} alt={activeDoc?.title || "Document Preview"} />
              </div>
            </div>

            {activeTab === "license" && <LicenseDetails driverName={name} />}
          </div>

          {/* Right: summary */}
          <div className="summaryPanel">
            <div className="summaryBox">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderBottom: "1px solid #f1f5f9",
                  paddingBottom: "8px",
                  marginBottom: "8px",
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: "700",
                    color: "#334155",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <ShieldCheck size={14} color="#059669" />
                  Verification Summary
                </span>
                <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                  {docs.length}/{docs.length} submitted
                </span>
              </div>

              <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "12px" }}>
                {docs.map(({ title }) => (
                  <li
                    key={title}
                    style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}
                  >
                    <span style={{ color: "#475569", display: "flex", alignItems: "center", gap: "6px" }}>
                      <CheckCircle2 size={13} color="#10b981" />
                      {title}
                    </span>
                    <span
                      style={{
                        fontSize: "10px",
                        backgroundColor: "#ecfdf5",
                        color: "#047857",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        border: "1px solid #a7f3d0",
                      }}
                    >
                      Submitted
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="statusInfoBox">
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: "700",
                  color: "#78350f",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <AlertCircle size={14} color="#d97706" />
                Application Status
              </span>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: "700",
                  color: "#92400e",
                  display: "block",
                  marginTop: "4px",
                }}
              >
                {verification} Verification
              </span>
              <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "#b45309", lineHeight: "1.3" }}>
                You can review the documents and approve or reject the application.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modalFooter">
          <span className="footerNote">
            * Rejecting will notify the applicant to resubmit requirements.
          </span>

          <div className="modalFooterActions">
            <button className="rejectBtn" onClick={onReject}>
              <XCircle size={15} />
              Reject Application
            </button>

            <button className="holdBtn" onClick={onHold}>
              <PauseCircle size={15} />
              Hold Application
            </button>

            <button className="approveBtn" onClick={onApprove}>
              <CheckCircle2 size={15} />
              Approve Application
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
