import useDriverWallet from "../../hooks/useDriverWallet.js";
import { useAuth } from "../../context/AuthContext.jsx";
import React, { useEffect, useState } from "react";
import { FiEdit2, FiLock, FiMail, FiPhone, FiTrash2, FiTruck, FiUser, FiX } from "react-icons/fi";
import { BadgeCheck, Bike, Car, CarFront, ShieldCheck, Star, TrendingUp, Truck, Van } from "lucide-react";
import { InputField, PhoneInput, FileUpload, VehicleSelect } from "../../components/common/FormComponents.jsx";
import { ProfileLayout, PhotoUploader, ChangePasswordTab, DeleteAccountTab } from "../../components/common/ProfileComponents.jsx";
import AppHeader from "../../components/common/AppHeader.jsx";
import { useBookings } from "../../hooks/useBookings.js";
import { MOCK_DRIVER, MOCK_NOTIFICATIONS_DRIVER } from "../../data/demo/clientMockData.js";
import { SqCard, Field } from "../../components/common/BookingUI.jsx";
import { peso } from "../../utils/helpers.js";
import { extraService } from "../../services/extraService.js";

const VEHICLES = [
  { id: "motorcycle", label: "Motorcycle", sub: "Up to 20 kg", Icon: Bike },
  { id: "sedan", label: "Sedan", sub: "Up to 200 kg", Icon: Car },
  { id: "suv", label: "SUV", sub: "Up to 600 kg", Icon: CarFront },
  { id: "pickup", label: "Pickup", sub: "Up to 800 kg", Icon: Truck },
  { id: "l300", label: "L300", sub: "Up to 1,000 kg", Icon: Van },
];

/* ═══ Driver Profile ═══ */
const ChangeVehicleModal = ({ current, onClose, onSubmit }) => {
  const [type, setType] = useState(current.type);
  const [plate, setPlate] = useState(current.plate || "");
  const [or, setOr] = useState(null);
  const [cr, setCr] = useState(null);
  const [backplate, setBackplate] = useState(null);
  const valid = plate.trim() && or && cr && backplate;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-card--narrow" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Change Vehicle</h3>
          <button className="modal-close" onClick={onClose}><FiX size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="modal-form">
            <VehicleSelect
              value={type}
              onChange={setType}
              options={VEHICLES.map((v) => ({
                value: v.id,
                label: v.label,
                sub: `Max ${v.sub.replace("Up to ", "")}`,
                Icon: v.Icon,
              }))}
            />
            <InputField
              id="plate"
              label={<>Plate Number <span className="required">*</span></>}
              placeholder="e.g. ABC 1234"
              icon={FiTruck}
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase().slice(0, 12))}
            />
            <FileUpload label="Vehicle OR" required value={or} onChange={setOr} />
            <FileUpload label="Vehicle CR" required value={cr} onChange={setCr} />
            <FileUpload label="Backplate Photo" imageOnly required value={backplate} onChange={setBackplate} />
            <div className="modal-notice">
              <ShieldCheck size={14} />
              <span>Changing vehicle requires admin re-verification. You'll be offline until approved (usually 1–2 days).</span>
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="modal-btn modal-btn--ghost" onClick={onClose}>Cancel</button>
          <button className="modal-btn modal-btn--primary" disabled={!valid}
            onClick={() => onSubmit({
              type,
              plate: plate.trim(),
              capacity: VEHICLES.find(v => v.id === type)?.sub?.replace("Up to ", "") || "—",
              files: { or, cr, backplate },
            })}>
            Submit for Review
          </button>
        </div>
      </div>
    </div>
  );
};

// Driver document renewal stays in this file because it is part of the profile page.
function DriverDocumentRenewal({ profile, onSaved }) {
  const [files, setFiles] = useState({});
  const [dates, setDates] = useState({});
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  async function submit() {
    if (!Object.keys(files).length && !reason.trim()) return setMessage("Choose at least one document.");
    const form = new FormData();
    for (const field of Object.keys(files)) { if (files[field]) form.append(field, files[field]); }
    for (const field of Object.keys(dates)) { if (dates[field]) form.append(field, dates[field]); }
    form.append("reason", reason);
    setWorking(true);
    try { await extraService.submitRenewal(form); setMessage("Request sent to admin for review."); onSaved(); }
    catch (e) { setMessage(e.message); }
    finally { setWorking(false); }
  }
  const expiry = (value) => {
    if (!value) return "Expiry not provided";
    const days = Math.ceil((new Date(value).getTime() - Date.now()) / 86400000);
    if (days < 0) return "Expired";
    if (days <= 7) return `Expires in ${days} days`;
    return new Date(value).toLocaleDateString("en-PH");
  };
  return <div className="feature-panel">
    <h3>Document Renewals</h3>
    <p className="feature-mini">Your existing approved documents remain active until the administrator accepts a replacement.</p>
    <p>Review status: <strong>{profile?.renewal?.status || "none"}</strong></p>
    {[{key: "license", label: "Driver's License", date: "licenseExpiresAt"}, {key: "or", label: "Vehicle OR", date: "orExpiresAt"}, {key: "cr", label: "Vehicle CR"}, {key: "backplate", label: "Vehicle Backplate"}].map(item => <div key={item.key} className="feature-file-row">
      <label><strong>{item.label}</strong> {item.date && <small>{expiry(profile?.[item.date])}</small>}
        <input type="file" accept="image/jpeg,image/png,application/pdf" onChange={e => setFiles(current => ({ ...current, [item.key]: e.target.files[0] }))}/>
      </label>
      {item.date && <label>New expiry <input type="date" onChange={e => setDates(current => ({ ...current, [item.date]: e.target.value }))}/></label>}
    </div>)}
    <textarea className="field__textarea" value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for replacement (optional)" />
    {message && <p role="status">{message}</p>}
    <button type="button" className="feature-primary" disabled={working || profile?.renewal?.status === "pending"} onClick={submit}>{working ? "Submitting…" : "Submit documents for approval"}</button>
  </div>;
}

const DriverStatsTab = ({ myReviews, avgRating }) => {
  const totalReviews = myReviews.length;
  const allReviews = myReviews; // These now come from MongoDB, not demo data.

  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: allReviews.filter((r) => r.rating === star).length,
  }));
  const maxCount = Math.max(...dist.map((d) => d.count), 1);

  const recent = allReviews.slice(-4).reverse();

  return (
    <div className="driver-stats">

      {/* Hero — big rating + distribution */}
      <div className="driver-stats__hero">
        <div className="driver-stats__big">
          <span className="driver-stats__big-num">{avgRating.toFixed(1)}</span>
          <div className="driver-stats__big-stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} size={18}
                fill={n <= Math.round(avgRating) ? "#F47B20" : "none"}
                color={n <= Math.round(avgRating) ? "#F47B20" : "rgba(255,255,255,0.25)"} />
            ))}
          </div>
          <span className="driver-stats__big-count">
            {totalReviews} review{totalReviews !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="driver-stats__dist">
          {dist.map(({ star, count }) => (
            <div key={star} className="driver-stats__bar-row">
              <span className="driver-stats__bar-label">{star}★</span>
              <div className="driver-stats__bar-track">
                <div className="driver-stats__bar-fill"
                  style={{ width: `${(count / maxCount) * 100}%` }} />
              </div>
              <span className="driver-stats__bar-count">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent reviews */}
      {recent.length > 0 ? (
        <div className="driver-stats__reviews">
          <p className="driver-stats__reviews-title">Recent reviews</p>
          {recent.map((r, i) => (
            <div key={i} className="driver-stats__review">
              <p className="driver-stats__review-name">
                {r.name || r.customerName || "Customer"}
              </p>
              <div className="driver-stats__review-stars">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} size={12}
                    fill={n <= r.rating ? "#F47B20" : "none"}
                    color={n <= r.rating ? "#F47B20" : "#cbd5e1"} />
                ))}
                <span className="driver-stats__review-date">{r.date}</span>
              </div>
              {r.comment && <p className="driver-stats__review-comment">{r.comment}</p>}
            </div>
          ))}
        </div>
      ) : (
        <div className="driver-stats__empty">
          <Star size={32} color="#cbd5e1" />
          <p>No reviews yet</p>
          <span>Complete deliveries to start building your reputation.</span>
        </div>
      )}
    </div>
  );
};

const DriverProfilePage = () => {
  const walletBalance = useDriverWallet();
  const [driverProfile, setDriverProfile] = useState(null);
  async function loadDriverProfile() {
    try { setDriverProfile((await extraService.driverProfile()).profile); }
    catch (problem) { console.warn("Driver profile unavailable:", problem.message); }
  }
  useEffect(() => { loadDriverProfile(); }, []);
  const [activeTab, setActiveTab] = useState("profile");
  const [info, setInfo] = useState({ username: "", firstName: "", lastName: "", email: "", phone: "", photo: null });
  const [draft, setDraft] = useState(info);
  const [editing, setEditing] = useState(false);
  const [vehicle, setVehicle] = useState(MOCK_DRIVER.vehicle);
  const [showVehicleChange, setShowVehicleChange] = useState(false);

  const { bookings } = useBookings();
  const { user, refreshUser } = useAuth();
  useEffect(() => {
    if (!user) return;
    const next = { username: user.username || "", firstName: user.firstName || "", lastName: user.lastName || "", email: user.email || "", phone: user.phone || "", photo: user.hasProfilePhoto ?
      (import.meta.env.VITE_API_URL || "http://localhost:5001/api") + "/extra/me/photo?changed=" + Date.now() : null };
    setInfo(next); setDraft(next);
  }, [user]);
  useEffect(() => {
    if (!driverProfile) return;
    setVehicle({ ...driverProfile.vehicle, plate: driverProfile.vehicle?.plateNumber || "" });
  }, [driverProfile]);
  // The customer's review is now stored in booking.review inside MongoDB.
  // GET /api/bookings returns the driver's own completed bookings and reviews.
  // This also works across different browsers and different devices.
  const myReviews = [];
  for (const booking of bookings) {
    if (booking.driverId === user?.id && booking.review) {
      myReviews.push({ ...booking.review, name: booking.customerName });
    }
  }

  const completedTrips = bookings.filter(
    (b) => b.driverId === user?.id && ["delivered", "completed"].includes(b.status)
  ).length;

  // Ratings should reflect real customer feedback, never demo ratings.
  const allMyReviews = myReviews;
  const avgRating = allMyReviews.length > 0
    ? +(allMyReviews.reduce((s, r) => s + r.rating, 0) / allMyReviews.length).toFixed(1)
    : 0;

  const startEdit = () => { setDraft(info); setEditing(true); };
  const cancelEdit = () => { setDraft(info); setEditing(false); };
  const saveEdit = async () => {
    try {
      await extraService.saveProfile({ username: draft.username, firstName: draft.firstName, lastName: draft.lastName, email: draft.email });
      await refreshUser(); setEditing(false);
      alert("Profile saved in MongoDB.");
    } catch (problem) { alert(problem.message); }
  };
  const updatePhoto = async (file) => {
    try {
      await extraService.updateProfilePhoto(file);
      await refreshUser(); // The image is now stored on the server, not just React.
    } catch (problem) { alert(problem.message); }
  };
  const tabs = [
    { id: "profile", label: "Profile Info", Icon: FiUser },
    { id: "stats", label: "Reviews", Icon: TrendingUp },
    { id: "vehicle", label: "Vehicle", Icon: FiTruck },
    { id: "password", label: "Change Password", Icon: FiLock },
    { id: "delete", label: "Delete Account", Icon: FiTrash2 },
  ];
  const header = (
    <>
      <div className="profile-avatar profile-avatar--driver">{info.photo ? <img src={(typeof info.photo === "string" ? info.photo : URL.createObjectURL(info.photo))} alt={info.firstName} /> : <span>{info.firstName.charAt(0)}{info.lastName.charAt(0)}</span>}</div>
      <div className="profile-header-info">
        <h2 className="profile-header-name">{info.firstName} {info.lastName}{driverProfile?.verificationStatus === "approved" && <span className="profile-verified" title="Verified"><BadgeCheck size={16} /></span>}</h2>
        <p className="profile-header-meta">@{info.username} · {VEHICLES.find(v => v.id === vehicle.type)?.label || "Motorcycle"}</p>
        <div className="profile-rating">
          <Star size={14} fill="#F47B20" color="#F47B20" />
          <span className="profile-rating__val">{avgRating.toFixed(1)}</span>
          <span className="profile-rating__sub">· {completedTrips} trips</span>
        </div>
      </div>
    </>
  );
  return (
    <div className="driver-shell">
      <AppHeader role="driver" user={{ name: `${info.firstName} ${info.lastName}` }} notifications={MOCK_NOTIFICATIONS_DRIVER} online={MOCK_DRIVER.online} onToggleOnline={() => alert("Toggle online/offline (mock)")} walletBalance={walletBalance} minBalance={25} profilePath="/driver/profile" showOnlineToggle={false} />
      <div className="driver-body">
        <div className="profile-page-wrap">
          <ProfileLayout header={header} tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}>
            {activeTab === "profile" && (
              <div className="profile-form">
                <div className="profile-photo-row"><PhotoUploader photo={info.photo} fallback={<>{info.firstName.charAt(0)}{info.lastName.charAt(0)}</>} onUpload={updatePhoto} editable={editing} /></div>
                <InputField id="username" label="Username" icon={FiUser} placeholder="your-username" value={draft.username} onChange={(e) => setDraft({ ...draft, username: e.target.value })} disabled={!editing} />
                <div className="bd-row2">
                  <Field label="First name"><input className="field__input" value={draft.firstName} disabled={!editing} onChange={(e) => setDraft({ ...draft, firstName: e.target.value })} /></Field>
                  <Field label="Last name"><input className="field__input" value={draft.lastName} disabled={!editing} onChange={(e) => setDraft({ ...draft, lastName: e.target.value })} /></Field>
                </div>
                <PhoneInput label="Mobile number" value={draft.phone} onChange={(v) => setDraft({ ...draft, phone: v })} disabled />
                <p className="feature-mini">Optional linked email is not verified for password recovery.</p>
                <InputField id="email" label="Linked email (unverified)" type="email" icon={FiMail} value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} disabled={!editing} />

                {editing ? (<div className="profile-actions"><button className="btn-profile-ghost" onClick={cancelEdit}>Cancel</button><button className="btn-profile-primary" onClick={saveEdit}>Save Changes</button></div>) : (<button className="btn-profile-primary" onClick={startEdit}><FiEdit2 size={14} /> Edit Profile</button>)}
              </div>
            )}
            {activeTab === "stats" && (
              <DriverStatsTab
                myReviews={myReviews}
                avgRating={avgRating}
              />
            )}
            {activeTab === "vehicle" && (
              <div className="profile-form">
                <div className="vehicle-card">
                  <div className="vehicle-card__icon">{React.createElement(VEHICLES.find(v => v.id === vehicle.type)?.Icon || Bike, { size: 26 })}</div>
                  <div className="vehicle-card__body">
                    <p className="vehicle-card__type">{VEHICLES.find(v => v.id === vehicle.type)?.label || "Motorcycle"}</p>
                    <p className="vehicle-card__cap">Max capacity: {vehicle.capacity}</p>
                  </div>
                  <span className="vehicle-card__status vehicle-card__status--active">Active</span>
                </div>
                <button className="btn-profile-secondary" onClick={() => setShowVehicleChange(true)}><FiEdit2 size={14} /> Request Vehicle Change</button>
                <DriverDocumentRenewal profile={driverProfile} onSaved={loadDriverProfile} />
              </div>
            )}
            {activeTab === "password" && <ChangePasswordTab />}
            {activeTab === "delete" && (
              <DeleteAccountTab
                role="driver"
                onDelete={() => {
                  window.location.href = "/login";
                }}
              />
            )}
          </ProfileLayout>
        </div>
      </div>
      {showVehicleChange && (<ChangeVehicleModal current={vehicle} onClose={() => setShowVehicleChange(false)} onSubmit={async (v) => {
        const form = new FormData();
        form.append("vehicleType", v.type); form.append("plateNumber", v.plate);
        for (const field of ["or", "cr", "backplate"]) {
          if (v.files[field]) form.append(field, v.files[field]);
        }
        try { await extraService.submitRenewal(form); setShowVehicleChange(false); await loadDriverProfile(); alert("Vehicle change submitted for admin approval."); }
        catch (error) { alert(error.message); }
      }} />)}
    </div>
  );
};

/* ═══ Driver Home ═══ */

export default DriverProfilePage;