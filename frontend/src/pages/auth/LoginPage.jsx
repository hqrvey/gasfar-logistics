import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { HOME_BY_ROLE } from "../../routes/paths.js";
import { FiClock, FiLock, FiMail, FiPackage, FiPhone, FiTruck, FiUser } from "react-icons/fi";
import { MdOutlineVerifiedUser } from "react-icons/md";
import { LuPackageSearch } from "react-icons/lu";
import { InputField, Toast } from "../../components/common/FormComponents.jsx";
import logo from "../../assets/logos/gaspar-logo2.png";
import logomark from "../../assets/logos/gaspar-logomark.png";

/* ═══ Auth ═══ */
const TABS = [{ id: "username", label: "Username", Icon: FiUser }, { id: "phone", label: "Phone Number", Icon: FiPhone }, { id: "email", label: "Email", Icon: FiMail }];
const LoginTabs = ({ active, onChange }) => (
  <div className="login-tabs" role="tablist">
    {TABS.map(({ id, label, Icon }) => (<button key={id} role="tab" aria-selected={active === id} className={`tab-btn ${active === id ? "tab-btn--active" : ""}`} onClick={() => onChange(id)} type="button"><Icon size={18} /><span>{label}</span></button>))}
  </div>
);
const TAB_CONFIG = {
  username: { id: "username", label: "Username", placeholder: "Enter your username", icon: FiUser, type: "text" },
  phone: { id: "phone", label: "Phone Number", placeholder: "Enter your phone number", icon: FiPhone, type: "tel" },
  email: { id: "email", label: "Email", placeholder: "Enter your email", icon: FiMail, type: "email" },
};

const LoginForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [activeTab, setActiveTab] = useState("username");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ message: "", id: 0 });
  const field = TAB_CONFIG[activeTab];
  const showToast = (message) => setToast((t) => ({ message, id: t.id + 1 }));
  const dismissToast = () => setToast((t) => ({ ...t, message: "" }));
  // LOGIN FLOW: Form -> useAuth().login -> authService -> POST /api/auth/login.
  // Express checks the password against MongoDB and sets an HttpOnly cookie.
  // The returned user.role determines which dashboard React navigates to.
  async function handleSubmit(e) {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      showToast("Please fill in all fields.");
      return;
    }
    setSubmitting(true);
    try {
      // "account" is safe user data returned by the Express controller.
      const account = await login(identifier, password, remember);
      const requestedPage = location.state?.from?.pathname;
      const belongsToRole =
        (account.role === "admin" && requestedPage?.startsWith("/admin")) ||
        (account.role === "driver" && requestedPage?.startsWith("/driver")) ||
        (account.role === "customer" && requestedPage && !requestedPage.startsWith("/admin") && !requestedPage.startsWith("/driver"));
      navigate(belongsToRole ? requestedPage : HOME_BY_ROLE[account.role], { replace: true });
    } catch (error) {
      if (error.code === "DRIVER_PENDING") {
        navigate("/application-pending");
      } else {
        showToast(error.message);
      }
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <div className="login-form-card">
      <Toast message={toast.message} onClose={dismissToast} />
      <div className="login-form-card__header"><h1 className="login-form-card__title">Welcome back!</h1><p className="login-form-card__subtitle">Sign in to continue to your account.</p></div>
      <LoginTabs active={activeTab} onChange={(tab) => { setActiveTab(tab); setIdentifier(""); dismissToast(); }} />
      <form onSubmit={handleSubmit} className="login-form" noValidate>
        <InputField id={field.id} label={field.label} placeholder={field.placeholder} icon={field.icon} type={field.type} value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
        <InputField id="password" label="Password" placeholder="Enter your password" icon={FiLock} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <div className="login-form__options">
          <label className="remember-label"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="remember-checkbox" /><span>Remember me</span></label>
          <a href="/forgot-password" className="forgot-link">Forgot password?</a>
        </div>
        <button type="submit" className="btn-signin" disabled={submitting}>{submitting ? "Signing in…" : "Sign In"}</button>
      </form>
      <p className="login-form-card__footer">Don't have an account? <a href="/signup" className="create-link">Create account</a></p>
    </div>
  );
};
const FEATURES = [
  { Icon: LuPackageSearch, title: "Real-time Tracking", desc: "Track every delivery in real time." },
  { Icon: MdOutlineVerifiedUser, title: "Secure & Reliable", desc: "Your data and shipments are always protected." },
  { Icon: FiClock, title: "On-time Delivery", desc: "We ensure your deliveries arrive on schedule." },
];
const BrandPanel = ({ logomark }) => (
  <aside className="brand-panel">
    <img src={logomark} alt="" aria-hidden="true" className="brand-panel__logomark" />
    <div className="brand-panel__content">
      <div className="brand-panel__headline"><h2>Delivering possibilities.</h2><h2 className="brand-panel__accent">Connecting people.</h2></div>
      <p className="brand-panel__body">GASFAR is your all-in-one delivery and logistics solution, moving your business forward, every step of the way.</p>
      <div className="brand-panel__bar" aria-hidden="true" />
    </div>
    <div className="brand-panel__features">
      {FEATURES.map(({ Icon, title, desc }, i) => (<div key={i} className="feature-badge"><span className="feature-badge__icon"><Icon size={20} /></span><div><p className="feature-badge__title">{title}</p><p className="feature-badge__desc">{desc}</p></div></div>))}
    </div>
  </aside>
);
const LoginPage = () => (
  <div className="login-page">
    <section className="login-panel"><div className="login-panel__logo"><img src={logo} alt="GASFAR" className="login-panel__logo-img" /></div><LoginForm /></section>
    <BrandPanel logomark={logomark} />
  </div>
);


export { LoginPage, BrandPanel };
export default LoginPage;
