import React, { useState } from "react";
import { FiEdit2, FiLock, FiMail, FiPhone, FiTrash2, FiTruck, FiUser, FiX } from "react-icons/fi";
import { BadgeCheck, Bike, Car, CarFront, ShieldCheck, Star, TrendingUp, Truck, Van } from "lucide-react";
import { InputField, PhoneInput, FileUpload } from "../../components/client/common/FormComponents.jsx";
import VehicleSelect from "../../components/client/common/VehicleSelect.jsx";
import { ProfileLayout, PhotoUploader, ChangePasswordTab, DeleteAccountTab } from "../../components/client/profile/ProfileComponents.jsx";
import { AppHeader } from "../../layouts/ClientLayout.jsx";
import { useBookings } from "../../hooks/useBookings.js";
import { useReviews } from "../../hooks/useReviews.js";
import { MOCK_DRIVER, MOCK_DRIVER_REVIEWS, MOCK_NOTIFICATIONS_DRIVER } from "../../data/clientMockData.js";
import { SqCard, Field } from "../../components/client/booking/BookingUI.jsx";
import { peso } from "../../utils/helpers.js";

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
  const [platePhoto, setPlatePhoto] = useState(null);
  const [crOr, setCrOr] = useState(null);
  const [backplate, setBackplate] = useState(null);
  const valid = plate.trim() && platePhoto && crOr && backplate;

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
            <FileUpload label="Plate Number Photo" imageOnly required value={platePhoto} onChange={setPlatePhoto} />
            <FileUpload label="Vehicle CR/OR" required value={crOr} onChange={setCrOr} />
            <FileUpload label="Vehicle Backplate Photo" imageOnly required value={backplate} onChange={setBackplate} />
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
            })}>
            Submit for Review
          </button>
        </div>
      </div>
    </div>
  );
};

const DriverStatsTab = ({ myReviews, avgRating, completedTrips, baseTrips }) => {
  const totalReviews = myReviews.length;
  const allReviews = [...MOCK_DRIVER_REVIEWS, ...myReviews];

  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: allReviews.filter((r) => r.rating === star).length,
  }));
  const maxCount = Math.max(...dist.map((d) => d.count), 1);

  const totalTrips = completedTrips + (baseTrips || 0);
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

      {/* Quick metrics */}
      <div className="driver-stats__grid">
        <div className="driver-stats__metric">
          <div className="driver-stats__metric-icon"><Truck size={18} /></div>
          <div>
            <p className="driver-stats__metric-val">{totalTrips}</p>
            <p className="driver-stats__metric-label">Completed trips</p>
          </div>
        </div>
        <div className="driver-stats__metric">
          <div className="driver-stats__metric-icon"><BadgeCheck size={18} /></div>
          <div>
            <p className="driver-stats__metric-val">98%</p>
            <p className="driver-stats__metric-label">On-time rate</p>
          </div>
        </div>
        <div className="driver-stats__metric">
          <div className="driver-stats__metric-icon"><TrendingUp size={18} /></div>
          <div>
            <p className="driver-stats__metric-val">95%</p>
            <p className="driver-stats__metric-label">Acceptance rate</p>
          </div>
        </div>
      </div>

      {/* Recent reviews */}
      {recent.length > 0 ? (
        <div className="driver-stats__reviews">
          <p className="driver-stats__reviews-title">Recent reviews</p>
          {recent.map((r, i) => (
            <div key={i} className="driver-stats__review">
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
  const [activeTab, setActiveTab] = useState("profile");
  const [info, setInfo] = useState({ username: "pedros", firstName: "Pedro", lastName: "Santos", email: MOCK_DRIVER.email, phone: MOCK_DRIVER.phone, photo: null });
  const [draft, setDraft] = useState(info);
  const [editing, setEditing] = useState(false);
  const [vehicle, setVehicle] = useState(MOCK_DRIVER.vehicle);
  const [showVehicleChange, setShowVehicleChange] = useState(false);

    const { bookings } = useBookings();
  const { reviews } = useReviews();

  /* Real reviews mula sa users (localStorage) */
  const myReviews = Object.entries(reviews)
    .filter(([orderId]) => {
      const b = bookings.find((x) => x.id === orderId);
      return b?.driver?.name === MOCK_DRIVER.name;
    })
    .map(([, r]) => r);

  const completedTrips = bookings.filter(
    (b) => b.driver?.name === MOCK_DRIVER.name && ["delivered", "completed"].includes(b.status)
  ).length;

  /* Combined avg — seed + real */
  const allMyReviews = [...MOCK_DRIVER_REVIEWS, ...myReviews];
  const avgRating = allMyReviews.length > 0
    ? +(allMyReviews.reduce((s, r) => s + r.rating, 0) / allMyReviews.length).toFixed(1)
    : 0;

  const startEdit = () => { setDraft(info); setEditing(true); };
  const cancelEdit = () => { setDraft(info); setEditing(false); };
  const saveEdit = () => { setInfo(draft); setEditing(false); alert("Profile updated! (mock)"); };
  const updatePhoto = (file) => setInfo((s) => ({ ...s, photo: file }));
const tabs = [
  { id: "profile", label: "Profile Info", Icon: FiUser },
  { id: "stats", label: "Stats", Icon: TrendingUp },
  { id: "vehicle", label: "Vehicle", Icon: FiTruck },
  { id: "password", label: "Change Password", Icon: FiLock },
  { id: "delete", label: "Delete Account", Icon: FiTrash2 },
];
  const header = (
    <>
      <div className="profile-avatar profile-avatar--driver">{info.photo ? <img src={URL.createObjectURL(info.photo)} alt={info.firstName} /> : <span>{info.firstName.charAt(0)}{info.lastName.charAt(0)}</span>}</div>
      <div className="profile-header-info">
        <h2 className="profile-header-name">{info.firstName} {info.lastName}{MOCK_DRIVER.verified && <span className="profile-verified" title="Verified"><BadgeCheck size={16} /></span>}</h2>
        <p className="profile-header-meta">@{info.username} · {VEHICLES.find(v => v.id === vehicle.type)?.label || "Motorcycle"}</p>
        <div className="profile-rating">
  <Star size={14} fill="#F47B20" color="#F47B20" />
  <span className="profile-rating__val">{avgRating.toFixed(1)}</span>
  <span className="profile-rating__sub">· {MOCK_DRIVER.trips + completedTrips} trips</span>
</div>
      </div>
    </>
  );
  return (
    <div className="driver-shell">
      <AppHeader role="driver" user={{ name: `${info.firstName} ${info.lastName}` }} notifications={MOCK_NOTIFICATIONS_DRIVER} online={MOCK_DRIVER.online} onToggleOnline={() => alert("Toggle online/offline (mock)")} walletBalance={MOCK_DRIVER.walletBalance} minBalance={MOCK_DRIVER.minBalance} profilePath="/driver/profile" showOnlineToggle={false} />
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
                <InputField id="email" label="Email" type="email" icon={FiMail} value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} disabled={!editing} />

                {editing ? (<div className="profile-actions"><button className="btn-profile-ghost" onClick={cancelEdit}>Cancel</button><button className="btn-profile-primary" onClick={saveEdit}>Save Changes</button></div>) : (<button className="btn-profile-primary" onClick={startEdit}><FiEdit2 size={14} /> Edit Profile</button>)}
              </div>
            )}
            {activeTab === "stats" && (
  <DriverStatsTab
    myReviews={myReviews}
    avgRating={avgRating}
    completedTrips={completedTrips}
    baseTrips={MOCK_DRIVER.trips}
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
                <button className="btn-profile-secondary" onClick={() => setShowVehicleChange(true)}><FiEdit2 size={14} /> Change Vehicle</button>
              </div>
            )}
            {activeTab === "password" && <ChangePasswordTab />}
            {activeTab === "delete" && (
              <DeleteAccountTab
                role="driver"
                onDelete={() => {
                  localStorage.removeItem("gasfar_bookings_v1");
                  localStorage.removeItem("gasfar_reviews_v1");
                  alert("Your driver account has been deleted. Redirecting to login…");
                  window.location.href = "/login";
                }}
              />
            )}
          </ProfileLayout>
        </div>
      </div>
      {showVehicleChange && (<ChangeVehicleModal current={vehicle} onClose={() => setShowVehicleChange(false)} onSubmit={(v) => { setVehicle((prev) => ({ ...prev, ...v })); setShowVehicleChange(false); alert("Vehicle change submitted for review (mock). You'll be offline until approved."); }} />)}
    </div>
  );
};

/* ═══ Driver Home ═══ */

export default DriverProfilePage;
