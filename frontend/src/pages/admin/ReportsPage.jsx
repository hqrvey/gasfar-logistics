import { useEffect, useState } from "react";
import { PageHeader } from "../../components/admin/AdminUI.jsx";
import { extraService } from "../../services/extraService.js";

// PDF reports now use MongoDB aggregates from /api/extra/admin/stats.
export default function ReportsPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  useEffect(() => { extraService.stats().then(result => setStats(result.stats)).catch(e => setError(e.message)); }, []);
  const months = Object.entries(stats?.monthly || {}).filter(([key]) => key.startsWith(String(year))).sort();
  // The newer admin frontend removed PDF generation. Keep this simpler
  // data view; CSV downloads remain available on the Deliveries page.
  return <section className="content">
    <PageHeader title="Reports & Analytics" desc="Monthly booking totals from MongoDB, from MongoDB.">
      <select value={year} onChange={e => setYear(Number(e.target.value))}>{Array.from({length: 5}, (_, i) => new Date().getFullYear() - i).map(y => <option key={y}>{y}</option>)}</select>

    </PageHeader>
    {error && <p role="alert" className="feature-error">{error}</p>}
    <div className="stats"><div className="card feature-stat"><p>Total bookings</p><strong>{stats?.total || 0}</strong></div><div className="card feature-stat"><p>Delivered</p><strong>{stats?.completed || 0}</strong></div><div className="card feature-stat"><p>Cancelled</p><strong>{stats?.cancelled || 0}</strong></div></div>
    <div className="card tableCard"><div className="cardHead"><h2>Monthly Delivery Activity: {year}</h2></div>
      <div className="tableScroll"><table><thead><tr><th>Month</th><th>Delivered</th><th>Cancelled</th><th>Other</th></tr></thead><tbody>{months.map(([month, values]) => <tr key={month}><td>{month}</td><td>{values.completed}</td><td>{values.cancelled}</td><td>{values.ongoing}</td></tr>)}</tbody></table></div>
    </div>
  </section>;
}
