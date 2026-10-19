import React, { useState } from "react";
import { FiLock, FiMail, FiPhone } from "react-icons/fi";
import { InputField, OtpInput, PasswordStrength, StepIndicator } from "../../components/common/FormComponents.jsx";
import { isValidEmail } from "../../utils/helpers.js";
import logo from "../../assets/logos/gaspar-logo2.png";
import logomark from "../../assets/logos/gaspar-logomark.png";
import { BrandPanel } from "./LoginPage.jsx";

/* ═══ Forgot Password ═══ */
const FORGOT_STEPS = ["Identify Account", "Verification", "Reset Password"];
const ForgotStep1 = ({ method, setMethod, value, onChange, onNext, error }) => (
  <>
    <div className="login-form-card__header"><h1 className="login-form-card__title">Forgot Password</h1><p className="login-form-card__subtitle">Enter your email or phone to recover your account.</p></div>
    <div className="signup-form">
      <div className="method-toggle">
        <button type="button" className={`method-btn ${method === "email" ? "method-btn--active" : ""}`} onClick={() => setMethod("email")}><FiMail size={15} /> Email</button>
        <button type="button" className={`method-btn ${method === "phone" ? "method-btn--active" : ""}`} onClick={() => setMethod("phone")}><FiPhone size={15} /> Phone Number</button>
      </div>
      <div className="input-group">
        <div className="input-wrapper">
          <span className="input-icon-left">{method === "email" ? <FiMail size={17} /> : <FiPhone size={17} />}</span>
          <input className={`input-field ${error ? "input-error" : ""}`} style={{ paddingLeft: "2.5rem" }} type={method === "email" ? "email" : "tel"} placeholder={method === "email" ? "your@email.com" : "+63 9XX XXX XXXX"} value={value} onChange={(e) => onChange(e.target.value)} />
        </div>
        {error && <span className="field-error">{error}</span>}
      </div>
      <button type="button" className="btn-signin" onClick={onNext}>Send Reset Code</button>
    </div>
    <p className="login-form-card__footer">Remember your password? <a href="/login" className="create-link">Login</a></p>
  </>
);
const ForgotStep2 = ({ method, contact, onNext }) => {
  const [code, setCode] = useState("");
  const [resendCount, setResendCount] = useState(0);
  const [countdown, setCountdown] = useState(300);
  const [error, setError] = useState("");
  const startCountdown = (secs) => { setCountdown(secs); const t = setInterval(() => setCountdown((c) => { if (c <= 1) { clearInterval(t); return 0; } return c - 1; }), 1000); };
  const handleResend = () => { setResendCount((c) => c + 1); startCountdown(60); alert("Code resent!"); };
  const handleVerify = () => { if (code.length < 6) { setError("Please enter the 6-digit code."); return; } if (code !== "123456") { setError("Invalid code. Please try again."); return; } setError(""); onNext(); };
  return (
    <>
      <div className="login-form-card__header"><h1 className="login-form-card__title">Verify Your {method === "email" ? "Email" : "Phone"}</h1><p className="login-form-card__subtitle">Enter the 6-digit code sent to <strong>{contact}</strong>.</p></div>
      <div className="signup-form">
        <div className="input-group"><label className="input-label">Verification Code</label><OtpInput length={6} value={code} onChange={setCode} />{error && <span className="field-error" style={{ marginTop: "0.5rem" }}>{error}</span>}<p className="otp-expiry">Code expires in {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}</p></div>
        <div className="resend-row">{countdown > 0 && resendCount > 0 ? <span className="resend-disabled">Resend in {countdown}s</span> : <button type="button" className="resend-link" onClick={handleResend}>Resend code</button>}</div>
        <button type="button" className="btn-signin" onClick={handleVerify}>Verify</button>
      </div>
    </>
  );
};
const ForgotStep3 = () => {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState({});
  const handleReset = () => {
    const e = {};
    if (!pw || pw.length < 3) e.pw = "Password must be at least 3 characters.";
    if (pw !== confirm) e.confirm = "Passwords do not match.";
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    alert("Password reset! Redirecting to login…");
    window.location.href = "/login";
  };
  return (
    <>
      <div className="login-form-card__header"><h1 className="login-form-card__title">Reset Password</h1><p className="login-form-card__subtitle">Enter and confirm your new password.</p></div>
      <div className="signup-form">
        <div className="input-group"><InputField id="new-password" label={<>New Password <span className="required">*</span></>} type="password" placeholder="3–30 characters" icon={FiLock} value={pw} onChange={(e) => setPw(e.target.value)} error={errors.pw} /><PasswordStrength password={pw} /></div>
        <InputField id="confirm-password" label={<>Confirm New Password <span className="required">*</span></>} type="password" placeholder="Re-enter your new password" icon={FiLock} value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} />
        <button type="button" className="btn-signin" onClick={handleReset}>Reset Password</button>
      </div>
    </>
  );
};
const ForgotPasswordPage = () => {
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState("email");
  const [contact, setContact] = useState("");
  const [contactError, setContactError] = useState("");
  const handleStep1Next = () => {
    if (!contact) { setContactError("This field is required."); return; }
    if (method === "email" && !isValidEmail(contact)) { setContactError("Enter a valid email address."); return; }
    setContactError(""); alert(`Reset code sent to ${contact} (mock: use 123456)`); setStep(2);
  };
  return (
    <div className="login-page">
      <section className="login-panel">
        <div className="login-panel__logo"><img src={logo} alt="GASFAR" height={92} /></div>
        <div className="login-form-card">
          <StepIndicator steps={FORGOT_STEPS} current={step} />
          {step === 1 && <ForgotStep1 method={method} setMethod={setMethod} value={contact} onChange={setContact} onNext={handleStep1Next} error={contactError} />}
          {step === 2 && <ForgotStep2 method={method} contact={contact} onNext={() => setStep(3)} />}
          {step === 3 && <ForgotStep3 />}
        </div>
        <footer className="login-panel__footer">© 2026 GASFAR. All rights reserved.</footer>
      </section>
      <BrandPanel logomark={logomark} />
    </div>
  );
};


export default ForgotPasswordPage;
