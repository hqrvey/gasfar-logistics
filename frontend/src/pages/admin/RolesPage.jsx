import { useEffect, useState } from "react";
import { PageHeader } from "../../components/admin/AdminUI.jsx";
import { extraService } from "../../services/extraService.js";

// Super Admin creates accounts in MongoDB's existing users collection.
// These are REAL admin accounts; NO plaintext passwords in localStorage.
const EMPTY_FORM = { firstName: "", lastName: "", username: "", phone: "", password: "", adminRole: "fee_moderator" };

export default function RolesPage() {
  const [moderators, setModerators] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const result = await extraService.moderators();
      setModerators(result.moderators);
    } catch (error) { setMessage(error.message); }
  }
  useEffect(() => { load(); }, []);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await extraService.createModerator(form);
      setForm(EMPTY_FORM);
      setMessage("Moderator created. They can sign in using their username and password.");
      await load();
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  async function toggle(account) {
    const next = account.accountStatus === "active" ? "disabled" : "active";
    if (!window.confirm("Set this moderator to " + next + "?")) return;
    try { await extraService.setModeratorStatus(account.id, next); await load(); }
    catch (error) { setMessage(error.message); }
  }

  const labels = { super_admin: "Super Admin", fee_moderator: "Fee Review Moderator", driver_moderator: "Driver Verification Moderator", user_moderator: "User Management Moderator" };
  return <section className="content">
    <PageHeader title="Roles & Moderators" desc="All accounts use the same MongoDB users collection and JWT login." />
    {message && <p className="feature-notice" role="status">{message}</p>}
    <div className="card feature-panel">
      <h2>Create moderator</h2>
      <form className="feature-form" onSubmit={submit}>
        {[["firstName","First name"],["lastName","Last name"],["username","Username (8–30 characters)"],["phone","Phone (+639XXXXXXXXX)"],["password","Password (8+ characters)"]].map(([key,label]) =>
          <label key={key}>{label}<input required type={key === "password" ? "password" : "text"} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} /></label>
        )}
        <label>Permission group
          <select value={form.adminRole} onChange={e => setForm({ ...form, adminRole: e.target.value })}>
            <option value="fee_moderator">Fee & Wallet Review</option>
            <option value="driver_moderator">Driver Verification</option>
            <option value="user_moderator">User Management</option>
          </select>
        </label>
        <button type="submit" className="feature-primary" disabled={busy}>{busy ? "Creating…" : "Create moderator"}</button>
      </form>
    </div>
    <div className="card tableCard"><div className="cardHead"><h2>Administrator accounts</h2></div>
      <div className="tableScroll"><table><thead><tr><th>Username</th><th>Name</th><th>Role</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>{moderators.map(account => <tr key={account.id}>
          <td>{account.username}</td><td>{account.firstName} {account.lastName}</td>
          <td>{labels[account.adminRole] || account.adminRole}</td><td>{account.accountStatus}</td>
          <td>{account.adminRole !== "super_admin" ? <button onClick={() => toggle(account)}>{account.accountStatus === "active" ? "Disable" : "Reactivate"}</button> : "Owner"}</td>
        </tr>)}</tbody>
      </table></div>
    </div>
  </section>;
}
