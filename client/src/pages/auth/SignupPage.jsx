import React, { useState } from "react";
import { FiClock, FiFile, FiLock, FiMail, FiPackage, FiPhone, FiTruck, FiUser, FiChevronDown } from "react-icons/fi";
import { Check } from "lucide-react";
import logo from "../../assets/logos/gaspar-logo2.png";
import { isValidEmail } from "../../utils/helpers.js";
import {
  FileUpload,
  InputField,
  OtpInput,
  PasswordStrength,
  PhoneInput,
  PlainHeader,
  SignupSteps,
  Toast,
  VehicleSelect,
} from "../../components/common/FormComponents.jsx";

/* ═══ Signup ═══ */
const RESEND_LIMIT = 5;
const CODE_EXPIRY_SECS = 300;
const SIGNUP_VEHICLE_TYPES = [
  { value: "motorcycle", label: "Motorcycle (max 20 kg)" },
  { value: "sedan", label: "Sedan (max 200 kg)" },
  { value: "suv", label: "SUV (max 600 kg)" },
  { value: "pickup", label: "Pickup (max 800 kg)" },
  { value: "l300", label: "L300 (max 1,000 kg)" },
];
const RoleStep = ({ onChoose }) => (
  <>
    <div className="login-form-card__header"><h1 className="login-form-card__title">Join GASFAR</h1><p className="login-form-card__subtitle">How would you like to sign up?</p></div>
    <div className="role-select">
      <button type="button" className="role-card" onClick={() => onChoose("user")}><span className="role-card__icon"><FiPackage size={26} /></span><span className="role-card__title">Sign up as User</span><span className="role-card__desc">Book and track deliveries.</span></button>
      <button type="button" className="role-card" onClick={() => onChoose("driver")}><span className="role-card__icon"><FiTruck size={26} /></span><span className="role-card__title">Sign up as Driver</span><span className="role-card__desc">Deliver with GASFAR and earn.</span></button>
    </div>
    <p className="login-form-card__footer">Already have an account? <a href="/login" className="create-link">Login</a></p>
  </>
);
const PersonalInfoStep = ({ data, errors, onChange, role, onNext, onBack }) => (
  <>
    <PlainHeader title="Create Account" subtitle="Tell us a bit about yourself." />
    <div className="signup-form">
      <div className="input-group">
        <label className="input-label">Username <span className="required">*</span></label>
        <div className="input-wrapper">
          <span className="input-icon-left"><FiUser size={17} /></span>
          <input className={`input-field ${errors.username ? "input-error" : ""}`}
            style={{ paddingLeft: "2.5rem" }} type="text" placeholder="8-30 characters"
            value={data.username}
            onChange={(e) => onChange("username", e.target.value.replace(/\s/g, ""))} />
        </div>
      </div>
      <div className="bd-row2">
        <div className="input-group">
          <label className="input-label">First Name <span className="required">*</span></label>
          <div className="input-wrapper">
            <span className="input-icon-left"><FiUser size={17} /></span>
            <input className={`input-field ${errors.firstName ? "input-error" : ""}`}
              style={{ paddingLeft: "2.5rem" }} type="text" placeholder="Juan"
              value={data.firstName} onChange={(e) => onChange("firstName", e.target.value)} />
          </div>
        </div>
        <div className="input-group">
          <label className="input-label">Last Name <span className="required">*</span></label>
          <div className="input-wrapper">
            <span className="input-icon-left"><FiUser size={17} /></span>
            <input className={`input-field ${errors.lastName ? "input-error" : ""}`}
              style={{ paddingLeft: "2.5rem" }} type="text" placeholder="Dela Cruz"
              value={data.lastName} onChange={(e) => onChange("lastName", e.target.value)} />
          </div>
        </div>
      </div>
      <PhoneInput value={data.phone} onChange={(v) => onChange("phone", v)} error={errors.phone} />
      <div className="input-group">
        <label className="input-label">Email <span className="optional">(optional)</span></label>
        <div className="input-wrapper">
          <span className="input-icon-left"><FiMail size={17} /></span>
          <input className={`input-field ${errors.email ? "input-error" : ""}`}
            style={{ paddingLeft: "2.5rem" }} type="email" placeholder="your@email.com"
            value={data.email} onChange={(e) => onChange("email", e.target.value)} />
        </div>
      </div>
      <div className="step-btn-row">
        <button type="button" className="btn-signin" onClick={onNext}>Next</button>
        <button type="button" className="btn-back" onClick={onBack}>Back</button>
      </div>
    </div>
  </>
);

const VerificationStep = ({ phone, onVerified, onBack, showToast }) => {
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [resendCount, setResendCount] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [captchaDone, setCaptchaDone] = useState(false);
  const startCountdown = (secs) => { setCountdown(secs); const t = setInterval(() => setCountdown((c) => { if (c <= 1) { clearInterval(t); return 0; } return c - 1; }), 1000); };
  const handleSend = () => { if (!captchaDone) { const ok = window.confirm("[CAPTCHA SIMULATION]\nClick OK to confirm you're not a robot."); if (!ok) return; setCaptchaDone(true); } setSent(true); startCountdown(CODE_EXPIRY_SECS); alert(`Verification code sent to ${phone} (mock: use 123456)`); };
  const handleResend = () => { if (resendCount >= RESEND_LIMIT) return; setResendCount((c) => c + 1); startCountdown(60); };
  const handleVerify = () => { if (code.length < 6) { showToast("Please enter the 6-digit code."); return; } if (code !== "123456") { showToast("Invalid code. Please try again."); return; } onVerified(); };
  return (
    <>
      <PlainHeader title="Verify Your Account" subtitle={<>We'll send a 6-digit code to <strong>{phone || "your phone"}</strong>.</>} />
      <div className="signup-form">
        {!sent ? (
          <><button type="button" className="btn-signin" onClick={handleSend}>Send Verification Code</button><div className="step-btn-row"><button type="button" className="btn-back" onClick={onBack}>Back</button></div></>
        ) : (
          <>
            <div className="input-group"><label className="input-label" style={{ textAlign: "center", display: "block" }}>Enter 6-digit code</label><OtpInput length={6} value={code} onChange={setCode} /><p className="otp-expiry">Code expires in {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}</p></div>
            <div className="resend-row">{resendCount < RESEND_LIMIT ? (countdown > 0 && resendCount > 0 ? <span className="resend-disabled">Resend in {countdown}s</span> : <button type="button" className="resend-link" onClick={handleResend}>Resend code {resendCount > 0 ? `(${resendCount}/${RESEND_LIMIT})` : ""}</button>) : <span className="resend-disabled">Max resend attempts reached</span>}</div>
            <div className="step-btn-row"><button type="button" className="btn-signin" onClick={handleVerify}>Verify</button><button type="button" className="btn-back" onClick={onBack}>Back</button></div>
          </>
        )}
      </div>
    </>
  );
};
const PasswordStep = ({ data, errors, onChange, onSubmit, onBack, buttonLabel }) => (
  <>
    <PlainHeader title="Set Your Password" subtitle="Choose a password to secure your account." />
    <div className="signup-form">
      <div className="input-group">
        <InputField id="password" label={<>Password <span className="required">*</span></>} type="password" placeholder="3-30 characters" icon={FiLock} value={data.password} onChange={(e) => onChange("password", e.target.value)} error={errors.password} />
        <PasswordStrength password={data.password} />
      </div>
      <InputField id="confirm-password" label={<>Confirm Password <span className="required">*</span></>} type="password" placeholder="Re-enter your password" icon={FiLock} value={data.confirmPassword} onChange={(e) => onChange("confirmPassword", e.target.value)} error={errors.confirmPassword} />
      <label className={`terms-label ${errors.terms ? "terms-label--error" : ""}`}><input type="checkbox" className="remember-checkbox" checked={data.terms} onChange={(e) => onChange("terms", e.target.checked)} /><span>I agree to the <a href="/terms" className="create-link" target="_blank" rel="noreferrer">Terms and Conditions</a></span></label>
      <div className="step-btn-row"><button type="button" className="btn-signin" onClick={onSubmit}>{buttonLabel}</button><button type="button" className="btn-back" onClick={onBack}>Back</button></div>
    </div>
  </>
);

const DOC_PAGES = [
  { key: "vehicle", title: "Vehicle Info", subtitle: "Tell us what you'll be driving." },
  { key: "identity", title: "Identity & Registration", subtitle: "Upload your profile photo and driver's license." },
  { key: "vehicleDocs", title: "Vehicle Documents", subtitle: "Two more and you're done." },
];

const DocumentsStep = ({ docs, onChange, onSubmit, onBack, showToast }) => {
  const [page, setPage] = useState(0);
  const [localErrors, setLocalErrors] = useState({});
   const validatePage = () => {
  const e = {};
  if (page === 0) {
    if (!docs.vehicleType) e.vehicleType = "Please select a vehicle type.";
    if (!docs.plateNumber || !docs.plateNumber.trim())
      e.plateNumber = "Plate number is required.";
  } else if (page === 1) {
    if (!docs.profilePhoto) e.profilePhoto = "Profile photo is required.";
    if (!docs.license) e.license = "Driver's license is required.";
  } else if (page === 2) {
    if (!docs.crOr) e.crOr = "Vehicle CR/OR is required.";
    if (!docs.backplate) e.backplate = "Backplate photo is required.";
  }
  return e;
};
  const handleNext = () => { const e = validatePage(); setLocalErrors(e); const first = Object.values(e)[0]; if (first) { showToast(first); return; } if (page < DOC_PAGES.length - 1) setPage((p) => p + 1); else onSubmit(); };
  const handleBack = () => { if (page > 0) setPage((p) => p - 1); else onBack(); };
  const { title, subtitle } = DOC_PAGES[page];
  return (
    <>
      <PlainHeader title={title} subtitle={subtitle} />
      <div className="doc-page-dots">{DOC_PAGES.map((p, i) => (<span key={p.key} className={`doc-page-dot ${i === page ? "active" : ""} ${i < page ? "done" : ""}`} />))}</div>
      <div className="signup-form">
{page === 0 && (
  <>
    <VehicleSelect
      value={docs.vehicleType}
      onChange={(v) => onChange("vehicleType", v)}
      error={localErrors.vehicleType}
    />

    <InputField
      id="plateNumber"
      label={<>Plate Number <span className="required">*</span></>}
      placeholder="e.g. ABC 1234"
      icon={FiTruck}
      value={docs.plateNumber || ""}
      onChange={(e) =>
        onChange("plateNumber", e.target.value.toUpperCase().slice(0, 12))
      }
      error={localErrors.plateNumber}
    />
  </>
)}
      {page === 1 && (
  <>
    <FileUpload label="Profile Photo" imageOnly required value={docs.profilePhoto} onChange={(f) => onChange("profilePhoto", f)} error={localErrors.profilePhoto} />
    <FileUpload label="Driver's License" required value={docs.license} onChange={(f) => onChange("license", f)} error={localErrors.license} />
  </>
)}
{page === 2 && (
  <>
    <FileUpload label="Vehicle CR/OR" required value={docs.crOr} onChange={(f) => onChange("crOr", f)} error={localErrors.crOr} />
    <FileUpload label="Vehicle Backplate Photo" imageOnly required value={docs.backplate} onChange={(f) => onChange("backplate", f)} error={localErrors.backplate} />
  </>
)}
        <div className="step-btn-row">
          <button type="button" className="btn-signin" onClick={handleNext}>{page < DOC_PAGES.length - 1 ? "Next" : "Submit Application"}</button>
          <button type="button" className="btn-back" onClick={handleBack}>Back</button>
        </div>
      </div>
    </>
  );
};

const SignupPage = () => {
  const [role, setRole] = useState(null);
  const [step, setStep] = useState(0);
  const [data, setData] = useState({ firstName: "", lastName: "", username: "", phone: "", email: "", password: "", confirmPassword: "", terms: false });
  const [docs, setDocs] = useState({ vehicleType: "", plateNumber: "", profilePhoto: null, license: null, crOr: null, backplate: null });
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ message: "", id: 0 });
  const update = (key, val) => setData((d) => ({ ...d, [key]: val }));
  const updateDoc = (key, val) => setDocs((d) => ({ ...d, [key]: val }));
  const showToast = (message) => setToast((t) => ({ message, id: t.id + 1 }));
  const dismissToast = () => setToast((t) => ({ ...t, message: "" }));
  const SIGNUP_STEPS = {
  user: [
    { title: "Account Type",  desc: "Choose how you'll use GASFAR." },
    { title: "Personal Info", desc: "Tell us a bit about yourself." },
    { title: "Verification",  desc: "Confirm your phone number." },
    { title: "Set Password",  desc: "Secure your account." },
  ],
  driver: [
    { title: "Account Type",  desc: "Choose how you'll use GASFAR." },
    { title: "Personal Info", desc: "Tell us a bit about yourself." },
    { title: "Verification",  desc: "Confirm your phone number." },
    { title: "Set Password",  desc: "Secure your account." },
    { title: "Documents",     desc: "Upload your requirements." },
  ],
};
const STEPS = SIGNUP_STEPS[role] || SIGNUP_STEPS.user;
 const handleChooseRole = (r) => { setRole(r); setStep(1); };
  const validatePersonalInfo = () => {
    const e = {};
    if (!data.username || data.username.length < 8 || data.username.length > 30) e.username = "Username must be 8-30 characters.";
    if (/\s/.test(data.username)) e.username = "Username cannot contain spaces.";
    if (!data.firstName.trim()) e.firstName = "First name is required.";
    if (!data.lastName.trim()) e.lastName = "Last name is required.";
    if (!data.phone) e.phone = "Phone number is required.";
    if (data.email && !isValidEmail(data.email)) e.email = "Enter a valid email address.";
    setErrors(e); const first = Object.values(e)[0]; if (first) showToast(first); return Object.keys(e).length === 0;
  };
  const validatePassword = () => {
    const e = {};
    if (!data.password || data.password.length < 3 || data.password.length > 30) e.password = "Password must be 3-30 characters.";
    if (data.password !== data.confirmPassword) e.confirmPassword = "Passwords do not match.";
    if (!data.terms) e.terms = "You must agree to the Terms and Conditions.";
    setErrors(e); const first = Object.values(e)[0]; if (first) showToast(first); return Object.keys(e).length === 0;
  };
  const handlePersonalNext = () => { if (validatePersonalInfo()) setStep(2); };
  const handleVerified = () => setStep(3);
  const handlePasswordSubmit = () => { if (!validatePassword()) return; if (role === "driver") setStep(4); else { alert("Account created! Redirecting to login…"); window.location.href = "/login"; } };
  const handleDocumentsSubmit = () => { alert("Application submitted! You'll be redirected to a pending page."); window.location.href = "/application-pending"; };
  const handleBackToRoleSelect = () => { setStep(0); setRole(null); };
 return (
  <div className="signup-page">
    <div className="signup-page__inner">

      {/* LEFT — steps + logo + tagline */}
      <aside className={`signup-page__left${step === 0 ? " signup-page__left--welcome" : ""}`}>
        <div className="signup-page__logo">
          <img src={logo} alt="GASFAR" />
        </div>

        <SignupSteps steps={STEPS} current={step + 1} />

        {step > 0 && (
          <div className="signup-page__tagline">
            <strong>Delivering possibilities.</strong>
            <p>Join thousands of users and drivers on the GASFAR platform.</p>
          </div>
        )}
      </aside>

      {/* RIGHT — form card */}
      <section className="signup-page__right">
        <div className="signup-page__card">
          <Toast message={toast.message} onClose={dismissToast} />
          {step === 0 && <RoleStep onChoose={handleChooseRole} />}
          {step === 1 && <PersonalInfoStep data={data} errors={errors} onChange={update} role={role} onNext={handlePersonalNext} onBack={handleBackToRoleSelect} />}
          {step === 2 && <VerificationStep phone={data.phone} onVerified={handleVerified} onBack={() => setStep(1)} showToast={showToast} />}
          {step === 3 && <PasswordStep data={data} errors={errors} onChange={update} onSubmit={handlePasswordSubmit} onBack={() => setStep(2)} buttonLabel={role === "driver" ? "Next" : "Sign Up"} />}
          {step === 4 && role === "driver" && <DocumentsStep docs={docs} onChange={updateDoc} onSubmit={handleDocumentsSubmit} onBack={() => setStep(3)} showToast={showToast} />}
        </div>
        <footer className="login-panel__footer">© 2026 GASFAR. All rights reserved.</footer>
      </section>

    </div>
  </div>
);
};
const ApplicationPendingPage = () => (
  <div className="signup-page">
    <div className="signup-page__inner">

      {/* LEFT — logo + status steps + tagline */}
      <aside className="signup-page__left signup-page__left--welcome">
        <div className="signup-page__logo">
          <img src={logo} alt="GASFAR" />
        </div>

<SignupSteps
  steps={[
    { title: "Account Type",  desc: "Choose how you'll use GASFAR." },
    { title: "Personal Info", desc: "Tell us a bit about yourself." },
    { title: "Verification",  desc: "Confirm your phone number." },
    { title: "Set Password",  desc: "Secure your account." },
    { title: "Documents",     desc: "Upload your requirements." },
  ]}
  current={6}
/>

        <div className="signup-page__tagline">
          <strong>Delivering possibilities.</strong>
          <p>Join thousands of users and drivers on the GASFAR platform.</p>
        </div>
      </aside>

      {/* RIGHT — pending card */}
      <section className="signup-page__right">
        <div className="signup-page__card pending-card">
          <div className="pending-icon"><FiClock size={40} /></div>
          <div className="login-form-card__header">
            <h1 className="login-form-card__title">Application Submitted</h1>
            <p className="login-form-card__subtitle">
              Thanks for signing up as a driver! We're reviewing your documents.
              You'll get a notification once your account is approved — this usually
              takes 1–2 business days.
            </p>
          </div>

          <div className="pending-checklist">
            <div className="pending-checklist__item pending-checklist__item--done">
              <span className="pending-checklist__dot"><Check size={12} /></span>
              <span>Account created</span>
            </div>
            <div className="pending-checklist__item pending-checklist__item--done">
              <span className="pending-checklist__dot"><Check size={12} /></span>
              <span>Documents submitted</span>
            </div>
            <div className="pending-checklist__item pending-checklist__item--active">
              <span className="pending-checklist__dot pending-checklist__dot--pulse" />
              <span>Admin verification in progress</span>
            </div>
            <div className="pending-checklist__item">
              <span className="pending-checklist__dot" />
              <span>Account approval</span>
            </div>
          </div>

          <a href="/login" className="btn-signin pending-btn">Back to Login</a>
        </div>
        <footer className="login-panel__footer">© 2026 GASFAR. All rights reserved.</footer>
      </section>

    </div>
  </div>
);


export { SignupPage, ApplicationPendingPage };
