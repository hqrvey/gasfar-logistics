import AppHeader from "../components/common/AppHeader.jsx";
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaTwitter } from "react-icons/fa";
import logo from "../assets/logos/gaspar-logo2.png";

// Footer is only used by the customer layout.
// Reused footer for customer pages; the existing CSS class names are unchanged.
function ClientFooter() {
  return (
      <footer className="client-footer">
        <div className="client-footer__inner">
          <div className="footer-brand">
            <img src={logo} alt="GASFAR" className="footer-brand__logo" />
            <p className="footer-brand__desc">GASFAR is a reliable delivery and logistics system that connects you to trusted drivers to deliver your items safely and on time.</p>
            <div className="footer-brand__contact">
              <p className="footer-section__item">0917 123 4567</p>
              <p className="footer-section__item">support@gasfar.com</p>
              <p className="footer-section__item">Bulacan, Philippines</p>
            </div>
            <div className="footer-socials">
              <a href="#!" className="footer-social-btn"><FaFacebookF size={14} /></a>
              <a href="#!" className="footer-social-btn"><FaInstagram size={14} /></a>
              <a href="#!" className="footer-social-btn"><FaTwitter size={14} /></a>
              <a href="#!" className="footer-social-btn"><FaLinkedinIn size={14} /></a>
            </div>
          </div>
          <div className="footer-section">
            <p className="footer-section__title">COMPANY</p>
            <a href="#!" className="footer-section__link">About GASFAR</a>
            <a href="#!" className="footer-section__link">Careers</a>
            <a href="#!" className="footer-section__link">Press &amp; Media</a>
            <a href="#!" className="footer-section__link">Contact Us</a>
            <a href="#!" className="footer-section__link">Privacy Policy</a>
            <a href="#!" className="footer-section__link">Terms of Service</a>
          </div>
          <div className="footer-section">
            <p className="footer-section__title">FOR USERS</p>
            <a href="#!" className="footer-section__link">How It Works</a>
            <a href="#!" className="footer-section__link">Pricing</a>
            <a href="#!" className="footer-section__link">Safety</a>
            <a href="#!" className="footer-section__link">FAQ</a>
            <a href="#!" className="footer-section__link">User Blog</a>
          </div>
          <div className="footer-section">
            <p className="footer-section__title">FOR DRIVERS</p>
            <a href="#!" className="footer-section__link">Become a Driver</a>
            <a href="#!" className="footer-section__link">Requirements</a>
            <a href="#!" className="footer-section__link">Earnings</a>
            <a href="#!" className="footer-section__link">Driver Support</a>
            <a href="#!" className="footer-section__link">Driver Blog</a>
          </div>
        </div>
        <div className="client-footer__copy">© 2026 GASFAR. All rights reserved.</div>
      </footer>
  );
}

// Wrapper for user pages. The page content comes from the children prop.
export default function UserLayout({ children, hideFooter = false, user, notifications }) {
  return (
    <div className="client-layout">
      <AppHeader role="user" user={user} notifications={notifications} profilePath="/profile" />
      <main className="client-main">{children}</main>
      {!hideFooter && <ClientFooter />}
    </div>
  );
}
