import Pagination, { usePagination } from "../../components/admin/Pagination.jsx";
import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { Badge, DetailModal, PageHeader } from "../../components/admin/AdminUI.jsx";
import { extraService } from "../../services/extraService.js";

// REAL users from MongoDB. No browser-stored demo users or fake deactivation.
export default function UsersPage() {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  async function load() {
    try { const result = await extraService.adminUsers(); setRows(result.users); setError(""); }
    catch (problem) { setError(problem.message); }
  }
  useEffect(() => { load(); }, []);
  async function change(user) {
    const status = user.accountStatus === "active" ? "disabled" : "active";
    if (!window.confirm(`${status === "disabled" ? "Deactivate" : "Reactivate"} ${user.firstName}?`)) return;
    try { await extraService.updateAccount(user.id, status); await load(); }
    catch (problem) { setError(problem.message); }
  }
  const list = usePagination(rows);
  return <section className="content">
    <PageHeader title="User Management" desc="Customer accounts from MongoDB; changes apply to real logins." />
    {error && <p role="alert" className="feature-error">{error}</p>}
    <div className="card tableCard"><div className="cardHead"><h2>All Customers</h2><span className="count">{rows.length} users</span></div>
      <div className="tableScroll"><table><thead><tr><th>Name</th><th>Username/ID</th><th>Email</th><th>Phone</th><th>Account</th><th>Actions</th></tr></thead>
        <tbody>{list.pageRows.map(user => <tr key={user.id}>
          <td><b>{user.firstName} {user.lastName}</b></td><td className="id">{user.id.slice(-8)}</td><td>{user.email || "—"}</td><td>{user.phone}</td>
          <td><Badge tone={user.accountStatus === "active" ? "green" : "red"}>{user.accountStatus}</Badge></td>
          <td className="actions"><button className="actionBtn" onClick={() => setSelected(user)}><Eye size={14}/> View</button><button className="inlineEditBtn" onClick={() => change(user)}>{user.accountStatus === "active" ? "Deactivate" : "Activate"}</button></td>
        </tr>)}</tbody>
      </table></div><Pagination page={list.page} setPage={list.setPage} totalPages={list.totalPages} />
    </div>
    {selected && <DetailModal title="Customer Account" onClose={() => setSelected(null)} rows={[["Name", selected.firstName + " " + selected.lastName], ["Phone", selected.phone], ["Email", selected.email || "—"], ["Status", selected.accountStatus], ["Promotional Credit", "₱" + ((selected.creditCentavos || 0) / 100).toFixed(2)]]} />}
  </section>;
}
