import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/admin/AdminUI.jsx";
import { extraService } from "../../services/extraService.js";

// Every row corresponds to CURRENT MongoDB records needing attention.
// Read flags live on the logged-in User, but the work remains until resolved.
export default function AdminNotificationsPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  async function reload() {
    try { const data = await extraService.adminAttention(); setItems(data.items); setError(""); }
    catch (problem) { setError(problem.message); }
  }
  useEffect(() => { reload(); }, []);
  async function openItem(item) {
    try { await extraService.markAttentionRead(item.id); }
    catch (error) { console.warn(error.message); }
    navigate(item.to);
  }
  return <section className="content">
    <PageHeader title="Administrator Notifications" desc="Live applications, document expiry warnings, wallet requests and fee reviews." >
      <button onClick={reload}>Refresh</button>
    </PageHeader>
    {error && <p role="alert" className="feature-error">{error}</p>}
    <div className="card feature-panel">
      {!items.length && <p>No outstanding work for your moderator role.</p>}
      {items.map(item => <button key={item.id} type="button" className={"feature-attention-row" + (item.read ? " is-read" : "")} onClick={() => openItem(item)}>
        <span><strong>{item.title}</strong><small>{item.detail}</small></span>
        <span>{item.read ? "Read" : "New"} →</span>
      </button>)}
    </div>
  </section>;
}
