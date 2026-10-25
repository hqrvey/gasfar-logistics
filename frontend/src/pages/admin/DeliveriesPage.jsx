import Pagination, { usePagination } from "../../components/admin/Pagination.jsx";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "../../components/admin/AdminUI.jsx";
import { extraService } from "../../services/extraService.js";

// Each row is one REAL MongoDB booking. Admin may confirm external online payment,
// but may NOT arbitrarily mark a parcel delivered and bypass the recipient's PIN.
const FILTERS = ["All", "pending", "accepted", "at_pickup", "picked_up", "arrived", "delivered", "cancelled"];
export default function DeliveriesPage() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [params, setParams] = useSearchParams();
  const filter = FILTERS.includes(params.get("status")) ? params.get("status") : "All";
  async function reload() { try { setRows((await extraService.deliveries()).bookings); setError(""); } catch (e) { setError(e.message); } }
  useEffect(() => { reload(); }, []);
  const visible = rows.filter(row => (filter === "All" || row.status === filter) && (!from || row.createdAt.slice(0,10) >= from) && (!to || row.createdAt.slice(0,10) <= to));
  const list = usePagination(visible);
  function exportCsv() {
    const columns = ["Order", "Customer", "Driver", "Status", "Vehicle", "Fee", "Method", "Payment", "Created"];
    const lines = [columns, ...visible.map(b => [b.id,b.customer,b.driver || "",b.status,b.vehicle,b.price,b.paymentMethod,b.paymentStatus,b.createdAt])];
    const text = lines.map(line => line.map(value => '"' + String(value ?? "").replaceAll('"', '""') + '"').join(",")).join("\n");
    const href = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
    const link = document.createElement("a"); link.href = href; link.download = "gasfar-deliveries.csv"; link.click(); URL.revokeObjectURL(href);
  }
  async function confirmPayment(id) {
    if (!window.confirm("Have you independently verified this GCash/Maya payment? This action does not collect money.")) return;
    try { await extraService.confirmPayment(id); await reload(); } catch (e) { setError(e.message); }
  }
  return <section className="content">
    <PageHeader title="Delivery Management" desc="Live MongoDB deliveries and payment records. Delivery completion requires recipient PIN." />
    {error && <p role="alert" className="feature-error">{error}</p>}
    <div className="card tableCard"><div className="cardHead"><h2>All Delivery Requests</h2><button className="secondary" onClick={exportCsv}>Export CSV</button></div>
      <div className="feature-filters"><select value={filter} onChange={e => setParams(e.target.value === "All" ? {} : { status: e.target.value })}>{FILTERS.map(f => <option key={f}>{f}</option>)}</select><label>From <input type="date" value={from} onChange={e => setFrom(e.target.value)}/></label><label>To <input type="date" value={to} onChange={e => setTo(e.target.value)}/></label></div>
      <div className="tableScroll"><table><thead><tr><th>Order</th><th>Customer</th><th>Driver</th><th>Status</th><th>Amount</th><th>Payment</th><th>Date</th><th>Action</th></tr></thead>
      <tbody>{list.pageRows.map(b => <tr key={b.id}><td className="id">{b.id}</td><td>{b.customer}</td><td>{b.driver || "Unassigned"}</td><td>{b.status}</td><td>₱{b.price.toFixed(2)}</td><td>{b.paymentMethod} / {b.paymentStatus}</td><td>{new Date(b.createdAt).toLocaleDateString()}</td><td>{b.status === "delivered" && b.paymentMethod !== "cash" && b.paymentStatus !== "paid" ? <button className="actionBtn" onClick={() => confirmPayment(b.id)}>Confirm external payment</button> : "—"}</td></tr>)}</tbody>
      </table></div><Pagination page={list.page} setPage={list.setPage} totalPages={list.totalPages} />
    </div>
  </section>;
}
