import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Download,
  Package,
  Truck,
  Users,
  XCircle,
} from "lucide-react";
import {
  DetailModal,
  PageHeader,
  Stat,
  StatusItem,
  DeliveryTable,
  DeliveryBarChart,
  ChartLegend,
} from "../../components/admin/AdminUI.jsx";
import { INITIAL_DELIVERIES } from "../../data/demo/adminMockData.js";
import { REPORT_YEARS, DEFAULT_REPORT_YEAR } from "../../data/reportData.js";
import { ROUTES } from "../../routes/paths.js";
import { bookingDetailRows } from "../../utils/helpers.js";

// CSV export for this dashboard only.
// Quote every cell so values with commas (e.g. "Today, 7:30 PM") don't break columns.
const escapeCell = (value) => `"${String(value).replaceAll('"', '""')}"`;

function downloadCSV(filename, headers, rows) {
  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCell).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedYear, setSelectedYear] = useState(DEFAULT_REPORT_YEAR);

  const exportCSV = () =>
    downloadCSV(
      "GASFAR_Dashboard_Deliveries.csv",
      ["Booking ID", "User", "Driver", "Route", "Status", "ETA"],
      INITIAL_DELIVERIES
    );

  const goToDeliveries = () => navigate(ROUTES.deliveries);

  return (
    <section className="content">
      <PageHeader
        title="Good evening, Admin 👋"
        desc="Monitor GASFAR's users, drivers, bookings, and delivery operations."
      >
        <button className="secondary" onClick={exportCSV}>
          <Download size={15} />
          Export
        </button>

        <button className="primary" onClick={goToDeliveries}>
          <Package size={15} />
          View Deliveries
        </button>
      </PageHeader>

      <div className="stats">
        <Stat icon={<Users />} label="Total Users" value="2,486" change="+12.8%" />
        <Stat icon={<Truck />} label="Total Drivers" value="186" change="+8.4%" />
        <Stat icon={<Package />} label="Total Bookings" value="1,742" change="+5.1%" />
        <Stat icon={<CheckCircle2 />} label="Success Rate" value="94.6%" change="+2.3%" />
      </div>

      <div className="grid2">
        <div className="card chartCard">
          <div className="cardHead">
            <div>
              <h2>Monthly Delivery Performance</h2>
              <p>Monthly counts by delivery status</p>
            </div>

            <select
              value={selectedYear}
              onChange={(event) => setSelectedYear(Number(event.target.value))}
              aria-label="Select dashboard analytics year"
            >
              {REPORT_YEARS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <DeliveryBarChart year={selectedYear} variant="dashboard" />
          <ChartLegend />
        </div>

        <div className="card">
          <div className="cardHead">
            <div>
              <h2>Delivery Status</h2>
              <p>Current transactions</p>
            </div>

            <button className="linkBtn" onClick={goToDeliveries}>
              View details
            </button>
          </div>

          <div className="statusGrid">
            <StatusItem icon={<Clock3 />} label="Ongoing" value="428" tone="blue" />
            <StatusItem icon={<CheckCircle2 />} label="Completed" value="1,128" tone="green" />
            <StatusItem icon={<XCircle />} label="Cancelled" value="86" tone="red" />
            <StatusItem icon={<AlertTriangle />} label="Needs Attention" value="32" tone="yellow" />
          </div>
        </div>
      </div>

      <div className="card tableCard">
        <div className="cardHead">
          <div>
            <h2>Recent Delivery Bookings</h2>
            <p>Latest delivery transactions</p>
          </div>

          <button className="linkBtn" onClick={goToDeliveries}>
            View all →
          </button>
        </div>

        <DeliveryTable rows={INITIAL_DELIVERIES} onView={setSelectedBooking} />
      </div>

      {selectedBooking && (
        <DetailModal
          title={`Booking ${selectedBooking[0]}`}
          rows={bookingDetailRows(selectedBooking)}
          onClose={() => setSelectedBooking(null)}
        />
      )}
    </section>
  );
}
