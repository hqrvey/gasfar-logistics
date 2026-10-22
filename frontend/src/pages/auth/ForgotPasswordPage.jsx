import React from "react";
import logo from "../../assets/logos/gaspar-logo2.png";
import logomark from "../../assets/logos/gaspar-logomark.png";
import { BrandPanel } from "./LoginPage.jsx";

// Password recovery needs its own server-side verification flow.
// Do not keep the previous mock OTP/reset: it never changed the database.
export default function ForgotPasswordPage() {
  return (
    <div className="login-page">
      <section className="login-panel">
        <div className="login-panel__logo"><img src={logo} alt="GASFAR" height={92} /></div>
        <div className="login-form-card">
          <h1 className="login-form-card__title">Password recovery</h1>
          <p className="login-form-card__subtitle">Online password reset is not available yet. Please contact the GASFAR administrators for assistance.</p>
          <p className="login-form-card__footer"><a href="/login" className="create-link">Back to login</a></p>
        </div>
      </section>
      <BrandPanel logomark={logomark} />
    </div>
  );
}
