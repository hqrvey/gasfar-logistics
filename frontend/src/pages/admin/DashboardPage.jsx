import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Package, Truck, Users } from "lucide-react";
import { PageHeader, Stat } from "../../components/admin/AdminUI.jsx";
import { extraService } from "../../services/extraService.js";

// Admin dashboard now counts REAL MongoDB documents, not INITIAL_DELIVERIES.
export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  useEffect(() => {
    extraService.stats().then(result => setStats(result.stats)).catch(e => setError(e.message));
    extraService.deliveries().then(result => setRows(result.bookings)).catch(e => setError(e.message));
  }, []);
  const success = stats && stats.total ? Math.round(stats.completed / stats.total * 100) : 0;
  const monthly = Object.entries(stats?.monthly || {}).sort().slice(-6);
  const highest = Math.max(1, ...monthly.map(([month, values]) => values.completed || 0));
  return <section className="content">
    <PageHeader title="GASFAR Dashboard" desc="Live deliveries, customers and driver activity from MongoDB." />
    {error && <p role="alert" className="feature-error">{error}</p>}
    <div className="stats">
      <Stat icon={<Users />} label="Customers" value={stats?.users ?? "…"} />
      <Stat icon={<Truck />} label="Drivers" value={stats?.drivers ?? "…"} />
      <Stat icon={<Package />} label="Bookings" value={stats?.total ?? "…"} />
      <Stat icon={<CheckCircle2 />} label="Completion Rate" value={`${success}%`} />
    </div>
    <div className="grid2">
      <div className="card"><div className="cardHead"><h2>Delivery Status</h2></div><div className="feature-stats">
        <p>Ongoing: <strong>{stats?.ongoing ?? 0}</strong></p><p>Completed: <strong>{stats?.completed ?? 0}</strong></p><p>Cancelled: <strong>{stats?.cancelled ?? 0}</strong></p>
      </div></div>
      <div className="card"><div className="cardHead"><h2>Financial Summary (Recorded)</h2></div><div className="feature-stats">
        <p>Total completed delivery fares: <strong>₱{((stats?.grossCentavos || 0)/100).toFixed(2)}</strong></p>
        <p>Calculated platform commissions: <strong>₱{((stats?.commissionCentavos || 0)/100).toFixed(2)}</strong></p>
        <p className="feature-notice">Calculated amounts, not verified received cash.</p>
      </div></div>
    </div>
    <div className="card feature-panel">
      <h2>Delivered bookings by month</h2>
      {!monthly.length && <p>No delivered bookings yet.</p>}
      <div className="feature-monthly-chart">
        {monthly.map(([month, values]) => <div className="feature-chart-row" key={month}>
          <span>{month}</span><div className="feature-chart-track"><div className="feature-chart-bar" style={{ width: (100 * (values.completed || 0) / highest) + "%" }} /></div>
          <strong>{values.completed || 0}</strong>
        </div>)}
      </div>
    </div>
    <div className="card tableCard"><div className="cardHead"><h2>Latest Deliveries</h2><button className="linkBtn" onClick={() => navigate("/admin/deliveries")}>View all →</button></div>
      <div className="tableScroll"><table><thead><tr><th>Order</th><th>Customer</th><th>Driver</th><th>Status</th><th>Fee</th></tr></thead>
        <tbody>{rows.slice(0, 8).map(b => <tr key={b.id}><td>{b.id}</td><td>{b.customer}</td><td>{b.driver || "Unassigned"}</td><td>{b.status}</td><td>₱{b.price.toFixed(2)}</td></tr>)}</tbody></table></div>
    </div>
  </section>;
}
