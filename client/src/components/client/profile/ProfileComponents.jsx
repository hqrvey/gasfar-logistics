import React, { useRef, useState } from "react";
import { FiArrowRight, FiBriefcase, FiCamera, FiChevronDown, FiEye, FiEyeOff, FiHome, FiLock, FiMail, FiMapPin as FiMapPinOutline, FiPhone, FiTrash2, FiUpload, FiUser, FiX } from "react-icons/fi";
import { Check, MapPin, ShieldCheck, TriangleAlert } from "lucide-react";
import { InputField, FileUpload, PasswordStrength, PhoneInput } from "../common/FormComponents.jsx";
import { MapPicker, MapSearchBar } from "../map/MapComponents.jsx";
import { SqCard, Field } from "../booking/BookingUI.jsx";

/* ═══ Profile shell ═══ */
const ProfileLayout = ({ header, tabs, activeTab, onTabChange, children }) => (
  <div className="profile-page">
    <div className="profile-header-card">{header}</div>
    <div className="profile-body">
      <aside className="profile-sidebar">
        {tabs.map((t) => (<button key={t.id} className={`profile-tab ${activeTab === t.id ? "active" : ""}`} onClick={() => onTabChange(t.id)}><t.Icon size={16} /><span>{t.label}</span></button>))}
      </aside>
      <section className="profile-content">{children}</section>
    </div>
  </div>
);
const PhotoUploader = ({ photo, fallback, onUpload, editable = false }) => {
  const inputRef = useRef();
  const handleFile = (file) => { if (!file) return; const allowed = ["image/jpeg", "image/png"]; if (!allowed.includes(file.type)) { alert("Only JPG or PNG allowed."); return; } if (file.size / 1024 / 1024 > 5) { alert("Max file size is 5MB."); return; } onUpload(file); };
  return (
    <div className="photo-uploader">
      <button type="button" className={`photo-uploader__avatar ${editable ? "photo-uploader__avatar--editable" : ""}`} onClick={() => editable && inputRef.current?.click()} disabled={!editable} aria-label={editable ? "Change profile photo" : undefined} title={editable ? "Change profile photo" : undefined}>
        {photo ? <img src={URL.createObjectURL(photo)} alt="Profile" /> : <span className="photo-uploader__fallback">{fallback}</span>}
        {editable && (<span className="photo-uploader__camera"><FiCamera size={14} /></span>)}
      </button>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png" hidden onChange={(e) => { handleFile(e.target.files[0]); e.target.value = ""; }} />
    </div>
  );
};
const ChangePasswordTab = () => {
  const [cur, setCur] = useState("");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(false);
  const submit = () => {
    const e = {};
    if (!cur) e.cur = "Current password is required.";
    if (!pw || pw.length < 3) e.pw = "New password must be at least 3 characters.";
    if (pw !== confirm) e.confirm = "Passwords do not match.";
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setDone(true);
    setTimeout(() => { window.location.href = "/login"; }, 1200);
  };
  if (done) return <div className="profile-inline-success"><Check size={16} /> Password updated. Redirecting to login…</div>;
  return (
    <div className="profile-form">
      <InputField id="cur-pw" label={<>Current Password <span className="required">*</span></>} type="password" placeholder="Enter current password" icon={FiLock} value={cur} onChange={(e) => setCur(e.target.value)} error={errors.cur} />
      <div className="input-group"><InputField id="new-pw" label={<>New Password <span className="required">*</span></>} type="password" placeholder="3–30 characters" icon={FiLock} value={pw} onChange={(e) => setPw(e.target.value)} error={errors.pw} /><PasswordStrength password={pw} /></div>
      <InputField id="confirm-pw" label={<>Confirm New Password <span className="required">*</span></>} type="password" placeholder="Re-enter new password" icon={FiLock} value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} />
      <button className="btn-profile-primary" onClick={submit}>Update Password</button>
    </div>
  );
};

/* ═══ Saved addresses ═══ */
const LocationChooserModal = ({ mode, addresses, onPickSaved, onPinOnMap, onClose }) => (
  <div className="modal-backdrop" onClick={onClose}>
    <div className="modal-card modal-card--narrow" onClick={(e) => e.stopPropagation()}>
      <div className="modal-head"><h3>Choose {mode === "pickup" ? "Pickup" : "Drop-off"} Location</h3><button className="modal-close" onClick={onClose} aria-label="Close"><FiX size={18} /></button></div>
      <div className="modal-body">
        <button type="button" className="loc-pick-map" onClick={onPinOnMap}>
          <span className={`loc-pick-map__icon loc-pick-map__icon--${mode}`}><FiMapPinOutline size={18} /></span>
          <div className="loc-pick-map__body"><p className="loc-pick-map__title">Pin on map</p><p className="loc-pick-map__sub">Search an address or tap on the map</p></div>
          <FiArrowRight size={16} className="loc-pick-map__arrow" />
        </button>
        {addresses.length > 0 && (
          <>
            <p className="loc-pick-heading">Saved addresses</p>
            <div className="address-list">
              {addresses.map((a) => (<button key={a.id} type="button" className="address-item address-item--button" onClick={() => onPickSaved(a)}><span className="address-item__icon">{a.icon === "work" ? <FiBriefcase size={16} /> : <FiHome size={16} />}</span><div className="address-item__body"><p className="address-item__label">{a.label}</p><p className="address-item__addr">{a.address}</p></div></button>))}
            </div>
          </>
        )}
      </div>
    </div>
  </div>
);
const AddressEditorModal = ({ initial, onClose, onSave }) => {
  const [label, setLabel] = useState(initial?.label || "");
  const [icon, setIcon] = useState(initial?.icon || "home");
  const [pin, setPin] = useState(initial ? { lat: initial.lat, lng: initial.lng, address: initial.address } : null);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-card--address" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>{initial ? "Edit address" : "Add new address"}</h3><button className="modal-close" onClick={onClose} aria-label="Close"><FiX size={18} /></button></div>
        <div className="modal-body modal-body--address-lg">
          <aside className="address-editor__form">
            <Field label="Label"><input className="field__input" placeholder="e.g. Home, Work, Mom's house" value={label} onChange={(e) => setLabel(e.target.value)} /></Field>
            <div className="input-group"><label className="input-label">Type</label><div className="bd-grid-2"><SqCard compact selected={icon === "home"} onClick={() => setIcon("home")} Icon={FiHome} label="Home" /><SqCard compact selected={icon === "work"} onClick={() => setIcon("work")} Icon={FiBriefcase} label="Work" /></div></div>
            <div className="input-group"><label className="input-label">Pinned location</label>{pin ? (<div className="address-editor__pin"><FiMapPinOutline size={14} /><span>{pin.address}</span></div>) : (<p className="modal-hint">Search an address or tap the map to set the exact location.</p>)}</div>
          </aside>
          <section className="address-editor__map-wrap">
            <MapPicker singlePoint pinLabel="YOUR ADDRESS" pickupCoords={pin} onPickupChange={(p) => setPin(p)} />
            <MapSearchBar mode="location" onSearch={(p) => setPin(p)} />
          </section>
        </div>
        <div className="modal-foot"><button className="modal-btn modal-btn--ghost" onClick={onClose}>Cancel</button><button className="modal-btn modal-btn--primary" onClick={() => label && pin && onSave({ label, icon, lat: pin.lat, lng: pin.lng, address: pin.address })} disabled={!label || !pin}>Save Address</button></div>
      </div>
    </div>
  );
};

/* ═══ Delete Account Tab ═══ */
const DeleteAccountTab = ({ role, onDelete }) => {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const CORRECT_PASSWORD = role === "driver" ? "driver123" : "user123";

  const handleDelete = () => {
    if (!password) { setError("Please enter your password to confirm."); return; }
    if (password !== CORRECT_PASSWORD) { setError("Incorrect password. Please try again."); return; }
    setError("");
    setSubmitting(true);
    setTimeout(() => onDelete(), 600);
  };

  return (
    <div className="profile-form">
      <div className="delete-warning">
        <span className="delete-warning__icon"><TriangleAlert size={20} /></span>
        <div>
          <p className="delete-warning__title">Delete your {role === "driver" ? "driver " : ""}account</p>
          <p className="delete-warning__desc">
            This will permanently erase your profile, booking history, saved addresses, wallet balance,
            and reviews. This action <strong>cannot be undone</strong>.
          </p>
        </div>
      </div>

      <div className="input-group">
        <label className="input-label">
          Confirm your password <span className="required">*</span>
        </label>
        <div className="input-wrapper">
          <span className="input-icon-left"><FiLock size={17} /></span>
          <input
            type={showPassword ? "text" : "password"}
            className={`input-field ${error ? "input-error" : ""}`}
            style={{ paddingLeft: "2.5rem" }}
            placeholder="Enter your password to confirm"
            value={password}
            onChange={(e) => { setPassword(e.target.value); if (error) setError(""); }}
            autoComplete="current-password"
          />
          <button
            type="button"
            className="input-icon-right"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <FiEyeOff size={17} /> : <FiEye size={17} />}
          </button>
        </div>
        {error && <span className="field-error">{error}</span>}
      </div>

      <Field label="Reason (optional)">
        <textarea
          className="field__textarea"
          placeholder="Help us understand why you're leaving…"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </Field>

      <button
        type="button"
        className="btn-profile-danger"
        disabled={!password || submitting}
        onClick={handleDelete}
      >
        <FiTrash2 size={14} /> {submitting ? "Deleting account…" : "Delete My Account"}
      </button>
    </div>
  );
};

/* ═══ User Profile ═══ */

export {
  ProfileLayout,
  PhotoUploader,
  ChangePasswordTab,
  LocationChooserModal,
  AddressEditorModal,
  DeleteAccountTab,
};
