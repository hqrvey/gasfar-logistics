import { useEffect, useState } from "react";
import { Save, Upload } from "lucide-react";
import { PageHeader } from "../../components/admin/AdminUI.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { extraService } from "../../services/extraService.js";

// Administrator profile follows the SAME User model and /api/extra/me/profile
// endpoint as customer/driver profiles. Nothing is saved in localStorage.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";
export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [draft, setDraft] = useState({ firstName: "", lastName: "", username: "", email: "" });
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [photoVersion, setPhotoVersion] = useState(0);
  const roleLabels = { super_admin: "Super Admin", fee_moderator: "Fee Review Moderator", driver_moderator: "Driver Verification Moderator", user_moderator: "User Management Moderator" };

  useEffect(() => {
    if (user) setDraft({ firstName: user.firstName || "", lastName: user.lastName || "", username: user.username || "", email: user.email || "" });
  }, [user]);

  async function saveProfile(event) {
    event.preventDefault();
    setMessage("");
    try {
      await extraService.saveProfile(draft);
      await refreshUser();
      setMessage("Profile saved in MongoDB.");
    } catch (error) { setMessage(error.message); }
  }
  async function changePassword(event) {
    event.preventDefault();
    try {
      await extraService.changePassword(oldPassword, newPassword);
      setOldPassword(""); setNewPassword("");
      setMessage("Password changed successfully.");
    } catch (error) { setMessage(error.message); }
  }
  async function uploadPhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await extraService.updateProfilePhoto(file);
      await refreshUser();
      setPhotoVersion(value => value + 1);
      setMessage("Profile image uploaded.");
    } catch (error) { setMessage(error.message); }
  }
  async function removePhoto() {
    try { await extraService.removeProfilePhoto(); await refreshUser(); setMessage("Photo removed."); }
    catch (error) { setMessage(error.message); }
  }
  return <section className="content">
    <PageHeader title="Admin Profile" desc="Edit account details in MongoDB. All administrators use the normal JWT login." />
    {message && <p className="feature-notice" role="status">{message}</p>}
    <div className="card feature-panel">
      <div className="feature-admin-photo">
        {user?.hasProfilePhoto && <img className="largeAvatar profilePhotoImage" src={`${API_URL}/extra/me/photo?v=${photoVersion}`} alt="Admin avatar" />}
        <label className="feature-secondary"><Upload size={14}/> Update photo <input type="file" accept="image/png,image/jpeg" onChange={uploadPhoto} /></label>
        {user?.hasProfilePhoto && <button onClick={removePhoto}>Remove photo</button>}
      </div>
      <p><strong>Role:</strong> {roleLabels[user?.adminRole || "super_admin"]}</p>
      <p><strong>Last successful login:</strong> {user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("en-PH") : "Not recorded"}</p>
      <p className="feature-mini">Linked email is currently optional contact information, not a verified password recovery method.</p>
      <form className="feature-form" onSubmit={saveProfile}>
        {[["firstName","First name"],["lastName","Last name"],["username","Username"],["email","Linked email (unverified)"]].map(([key,label]) =>
          <label key={key}>{label}<input value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })} /></label>
        )}
        <button className="feature-primary" type="submit"><Save size={14}/> Save profile</button>
      </form>
    </div>
    <div className="card feature-panel">
      <h2>Change password</h2>
      <form className="feature-form" onSubmit={changePassword}>
        <label>Current password<input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} required /></label>
        <label>New password<input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={8} required /></label>
        <button className="feature-primary" type="submit">Update password</button>
      </form>
    </div>
  </section>;
}
