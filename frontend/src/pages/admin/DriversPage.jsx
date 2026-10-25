import Pagination, { usePagination } from "../../components/admin/Pagination.jsx";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader, Badge } from "../../components/admin/AdminUI.jsx";
import { extraService } from "../../services/extraService.js";
import { authService } from "../../services/authService.js";

// Reuses the existing driver profiles; adds renewal approval and expiry warnings.
export default function DriversPage() {
  const [profiles, setProfiles] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [params] = useSearchParams();
  useEffect(() => {
    const focus = params.get("focus");
    if (!focus || profiles.length === 0) return;
    const profile = profiles.find(p => p.userId?._id === focus);
    if (profile) setSelected(profile);
  }, [profiles, params]);
  async function reload() {
    try {
      const result = await extraService.adminDrivers();
      setProfiles(result.profiles); setReviews(result.reviews); setError("");
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { reload(); }, []);
  async function account(id, status) {
    if (!window.confirm(`Set driver account to ${status}?`)) return;
    try { await extraService.updateAccount(id, status); await reload(); } catch (e) { setError(e.message); }
  }
  async function renewal(id, status) {
    try { await extraService.decideRenewal(id, status); await reload(); } catch (e) { setError(e.message); }
  }
  async function approve(id, status) {
    try { await authService.updateDriverApproval(id, status); await reload(); } catch (e) { setError(e.message); }
  }
  const list = usePagination(profiles);
  function expiration(profile) {
    const dates = [profile.licenseExpiresAt, profile.orExpiresAt].filter(Boolean);
    if (!dates.length) return "Not recorded";
    if (dates.some(d => new Date(d).getTime() < Date.now())) return "Expired";
    if (dates.some(d => new Date(d).getTime() < Date.now() + 7 * 86400000)) return "Expires within 7 days";
    return "Up to date";
  }
  return <section className="content"><PageHeader title="Driver Management" desc="Real verification, document renewals, suspensions and customer ratings." />
    {error && <p role="alert" className="feature-error">{error}</p>}
    <div className="card tableCard"><div className="cardHead"><h2>Registered Drivers</h2><span className="count">{profiles.length} drivers</span></div><div className="tableScroll"><table><thead><tr><th>Driver</th><th>Vehicle</th><th>Verification</th><th>Account</th><th>Document expiry</th><th>Renewal</th><th>Actions</th></tr></thead>
    <tbody>{list.pageRows.map(profile => { const user = profile.userId; if (!user) return null; return <tr key={profile._id}>
      <td><b>{user.firstName} {user.lastName}</b><br/>{user.phone}</td><td>{profile.vehicle?.type} / {profile.vehicle?.plateNumber}</td>
      <td><Badge tone={profile.verificationStatus === "approved" ? "green" : "yellow"}>{profile.verificationStatus}</Badge></td>
      <td>{user.accountStatus}</td><td>{expiration(profile)}</td><td>{profile.renewal?.status || "none"}</td>
      <td className="feature-actions">
        <button onClick={() => setSelected(profile)}>Details</button>
        {profile.verificationStatus !== "approved" && <button onClick={() => approve(user._id, "approved")}>Approve</button>}
        {profile.renewal?.status === "pending" && <><button onClick={() => renewal(user._id,"approved")}>Accept update</button><button onClick={() => renewal(user._id,"rejected")}>Reject update</button></>}
        {user.accountStatus === "active" ? <button onClick={() => account(user._id,"suspended")}>Suspend</button> : <button onClick={() => account(user._id,"active")}>Reactivate</button>}
      </td>
    </tr>; })}</tbody></table></div><Pagination page={list.page} setPage={list.setPage} totalPages={list.totalPages} /></div>
    {selected && <div className="card feature-panel"><h3>Driver Detail</h3><p>{selected.userId?.firstName} {selected.userId?.lastName}</p>
      <p>License expiry: {selected.licenseExpiresAt ? new Date(selected.licenseExpiresAt).toLocaleDateString() : "Not recorded"}</p>
      <p>OR expiry: {selected.orExpiresAt ? new Date(selected.orExpiresAt).toLocaleDateString() : "Not recorded"}</p>
      <p>Vehicle CR: Document kept for verification; no CR expiry restriction.</p>
      <p>Requested vehicle: {selected.renewal?.vehicleType || "No change"} {selected.renewal?.plateNumber || ""}</p>
      {selected.renewal?.status === "pending" && <div className="feature-actions">
        {["license", "or", "cr", "backplate"].filter(field => selected.renewal?.documents?.[field]).map(field =>
          <a key={field} target="_blank" rel="noreferrer"
             href={(import.meta.env.VITE_API_URL || "http://localhost:5001/api") + "/extra/admin/drivers/" + selected.userId._id + "/renewal-docs/" + field}>
            Review {field.toUpperCase()} file
          </a>)}
      </div>}
      <h4>Customer Ratings</h4>{reviews.filter(r => r.driverId === String(selected.userId?._id)).map(r => <p key={r.bookingCode}>{r.rating}★ — {r.customerName}: {r.comment}</p>)}
      <button onClick={() => setSelected(null)}>Close</button></div>}
  </section>;
}
