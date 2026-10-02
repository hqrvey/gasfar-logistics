import React, { useEffect, useRef, useState } from "react";
import { FiEye, FiEyeOff, FiFile, FiLock, FiUpload, FiX, FiUser } from "react-icons/fi";
import { Check } from "lucide-react";

/* ═══ InputField ═══ */
const InputField = ({ label, type = "text", placeholder = "", icon: Icon, id, value, onChange, error = "", disabled = false }) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;
  return (
    <div className="input-group">
      {label && <label htmlFor={id} className="input-label">{label}</label>}
      <div className="input-wrapper">
        {Icon && <span className="input-icon-left"><Icon size={17} /></span>}
        <input id={id} type={inputType} placeholder={placeholder} disabled={disabled} className={`input-field ${error ? "input-error" : ""}`} style={{ paddingLeft: Icon ? "2.5rem" : "1rem" }} value={value} onChange={onChange} />
        {isPassword && (<button type="button" className="input-icon-right" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <FiEyeOff size={17} /> : <FiEye size={17} />}</button>)}
      </div>
    </div>
  );
};

/* ═══ PhoneInput — locked to +63 (Philippines) ═══ */
const PH_DIAL = "+63";
const PhoneInput = ({ value, onChange, error = "", label = "Phone Number", disabled = false }) => {
  const handleInput = (raw) => {
    let digits = raw.replace(/\D/g, "");
    if (digits.startsWith("0")) digits = digits.slice(1);
    if (digits.startsWith("63")) digits = digits.slice(2);
    digits = digits.slice(0, 10);
    onChange(digits);
  };

  return (
    <div className="input-group">
      <label className="input-label">{label} <span className="required">*</span></label>
      <div className="phone-input-wrapper">
        {/* Plain text "PH" — no emoji, no misalignment */}
        <span className="phone-prefix">
          <span className="phone-prefix__country">PH</span>
          <span className="phone-prefix__dial">{PH_DIAL}</span>
        </span>
        <input
          type="tel"
          disabled={disabled}
          className={`input-field phone-number-field ${error ? "input-error" : ""}`}
          placeholder="917 123 4567"
          value={value}
          onChange={(e) => handleInput(e.target.value)}
          style={{ paddingLeft: "0.75rem" }}
        />
      </div>
    </div>
  );
};

/* ═══ PasswordStrength ═══ */
const getStrength = (pw) => {
  if (!pw) return { level: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 6) score++; if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++; if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 1, label: "Weak", color: "#ef4444" };
  if (score <= 2) return { level: 2, label: "Fair", color: "#f97316" };
  if (score <= 3) return { level: 3, label: "Good", color: "#eab308" };
  if (score <= 4) return { level: 4, label: "Strong", color: "#22c55e" };
  return { level: 5, label: "Very Strong", color: "#16a34a" };
};
const PasswordStrength = ({ password }) => {
  const { level, label, color } = getStrength(password);
  if (!password) return null;
  return (
    <div className="pw-strength">
      <div className="pw-strength__bars">{[1, 2, 3, 4, 5].map((i) => (<div key={i} className="pw-strength__bar" style={{ background: i <= level ? color : "#e2e6f0" }} />))}</div>
      <span className="pw-strength__label" style={{ color }}>{label}</span>
    </div>
  );
};

/* ═══ OtpInput ═══ */
const OtpInput = ({ length = 6, value, onChange }) => {
  const refs = useRef([]);
  const digits = value.split("").concat(Array(length).fill("")).slice(0, length);
  const handleChange = (i, char) => { const clean = char.replace(/\D/g, "").slice(-1); const next = [...digits]; next[i] = clean; onChange(next.join("")); if (clean && i < length - 1) refs.current[i + 1]?.focus(); };
  const handleKeyDown = (i, e) => { if (e.key === "Backspace" && !digits[i] && i > 0) { const next = [...digits]; next[i - 1] = ""; onChange(next.join("")); refs.current[i - 1]?.focus(); } if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus(); if (e.key === "ArrowRight" && i < length - 1) refs.current[i + 1]?.focus(); };
  const handlePaste = (e) => { const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length); onChange(pasted.padEnd(length, "").slice(0, length)); refs.current[Math.min(pasted.length, length - 1)]?.focus(); e.preventDefault(); };
  return (
    <div className="otp-inputs">
      {digits.map((d, i) => (<input key={i} ref={(el) => (refs.current[i] = el)} className="otp-input" type="text" inputMode="numeric" maxLength={1} value={d} onChange={(e) => handleChange(i, e.target.value)} onKeyDown={(e) => handleKeyDown(i, e)} onPaste={handlePaste} />))}
    </div>
  );
};

/* ═══ FileUpload ═══ */
const MAX_MB = 25;
const FileUpload = ({ label, imageOnly = false, required = false, value, onChange, error = "" }) => {
  const inputRef = useRef();
  const acceptAttr = imageOnly ? "image/jpeg,image/png" : "image/jpeg,image/png,application/pdf";
  const handleFile = (file) => {
    if (!file) return;
    if (file.size / 1024 / 1024 > MAX_MB) { alert(`File too large. Max size is ${MAX_MB}MB.`); return; }
    const allowed = imageOnly ? ["image/jpeg", "image/png"] : ["image/jpeg", "image/png", "application/pdf"];
    if (!allowed.includes(file.type)) { alert(`Invalid file type.`); return; }
    onChange(file);
  };
  const handleDrop = (e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); };
  return (
    <div className="input-group">
      <label className="input-label">{label} {required && <span className="required">*</span>}<span className="file-hint"> ({imageOnly ? "JPG, PNG" : "JPG, PNG, PDF"} · max {MAX_MB}MB)</span></label>
      {value ? (
        <div className="file-preview">
          {value.type.startsWith("image/") ? <img src={URL.createObjectURL(value)} alt="preview" className="file-preview__img" /> : <span className="file-preview__icon"><FiFile size={20} /></span>}
          <span className="file-preview__name">{value.name}</span>
          <button type="button" className="file-preview__remove" onClick={() => onChange(null)}><FiX size={16} /></button>
        </div>
      ) : (
        <div className={`file-dropzone ${error ? "file-dropzone--error" : ""}`} onClick={() => inputRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
          <FiUpload size={20} className="file-dropzone__icon" />
          <p className="file-dropzone__text">Click or drag file here</p>
        </div>
      )}
      <input ref={inputRef} type="file" accept={acceptAttr} style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />
    </div>
  );
};

/* ═══ Step indicators ═══ */
const VerticalStepIndicator = ({ steps, current }) => (
  <div className="vstep">
    {steps.map((label, i) => {
      const idx = i + 1, done = idx < current, active = idx === current;
      return (
        <div key={i} className={`vstep__item${done ? " done" : ""}${active ? " active" : ""}`}>
          <div className="vstep__marker">
            <div className={`vstep__circle${done ? " done" : ""}${active ? " active" : ""}`}>{done ? <Check size={13} strokeWidth={3} /> : idx}</div>
            {i < steps.length - 1 && <div className={`vstep__line${done ? " done" : ""}`} />}
          </div>
          <span className={`vstep__label${active ? " active" : ""}`}>{label}</span>
        </div>
      );
    })}
  </div>
);

/* ═══ Signup steps — text rows, no circles ═══ */
const SignupSteps = ({ steps, current }) => (
  <div className="signup-steps">
    {steps.map((step, i) => {
      const idx = i + 1;
      const done = idx < current;
      const active = idx === current;
      return (
        <div
          key={i}
          className={`signup-step${done ? " signup-step--done" : ""}${active ? " signup-step--active" : ""}`}
        >
          <span className="signup-step__num">Step {idx}</span>
          <h3 className="signup-step__title">{step.title}</h3>
          <p className="signup-step__desc">{step.desc}</p>
        </div>
      );
    })}
  </div>
);

const StepIndicator = ({ steps, current }) => (
  <div className="step-indicator">
    {steps.map((label, i) => {
      const idx = i + 1, done = idx < current, active = idx === current;
      return (
        <div key={i} className="step-indicator__item">
          <div className={`step-indicator__circle ${done ? "done" : ""} ${active ? "active" : ""}`}>
            {done ? (<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7l3 3 6-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>) : idx}
          </div>
          <span className={`step-indicator__label ${active ? "active" : ""}`}>{label}</span>
          {i < steps.length - 1 && <div className={`step-indicator__line ${done ? "done" : ""}`} />}
        </div>
      );
    })}
  </div>
);

/* Toast */
const Toast = ({ message, onClose, duration = 5000 }) => {
  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    <div className="app-toast" role="alert">
      <span className="app-toast__text">{message}</span>
      <button type="button" className="app-toast__close" onClick={onClose} aria-label="Dismiss">×</button>
    </div>
  );
};

const PlainHeader = ({ title, subtitle }) => (
  <div className="login-form-card__header">
    <h1 className="login-form-card__title">{title}</h1>
    <p className="login-form-card__subtitle">{subtitle}</p>
  </div>
);

export {
  InputField,
  PhoneInput,
  PasswordStrength,
  OtpInput,
  FileUpload,
  VerticalStepIndicator,
  SignupSteps,
  StepIndicator,
  Toast,
  PlainHeader,
};
