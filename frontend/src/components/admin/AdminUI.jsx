// Small UI components reused by the administrator pages.
// Keeping them together makes it easier to find them.
import { Fragment } from "react";
import { ArrowUpRight, Eye, MapPin, Save, X } from "lucide-react";
import { getReportMonths } from "../../data/reportData.js";

// Badge
export function Badge({ children, tone }) {
  const badgeTone = tone || String(children).toLowerCase().replaceAll(" ", "-");

  return <span className={`badge ${badgeTone}`}>{children}</span>;
}

// Detail
export function Detail({ rows }) {
  return (
    <div className="detailGrid">
      {rows.map(([label, value]) => (
        <Fragment key={label}>
          <b>{label}</b>
          <span>{value}</span>
        </Fragment>
      ))}
    </div>
  );
}

// Modal
export function Modal({ title, onClose, children }) {
  return (
    <div
      className="modalOverlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <div className="modalHead">
          <h2>{title}</h2>
          <button className="iconButton" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        <div className="modalBody">{children}</div>
      </div>
    </div>
  );
}

// DetailModal
// Read-only details with a single Save button (used by users, bookings, deliveries).
export function DetailModal({ title, rows, onClose }) {
  return (
    <Modal title={title} onClose={onClose}>
      <Detail rows={rows} />
      <div className="modalActions">
        <button className="primary" onClick={onClose}>
          <Save size={14} />
          Save
        </button>
      </div>
    </Modal>
  );
}

// PageHeader
export function PageHeader({ title, desc, children }) {
  return (
    <div className="pageHeader">
      <div>
        <h1>{title}</h1>
        <p>{desc}</p>
      </div>

      <div className="headerActions">{children}</div>
    </div>
  );
}

// StatCards
export function Stat({ icon, label, value, change }) {
  return (
    <div className="card stat">
      <div className="statTop">
        <div className="statIcon">{icon}</div>
        <span className="positive">
          <ArrowUpRight size={12} />
          {change}
        </span>
      </div>

      <strong>{value}</strong>
      <p>{label}</p>
    </div>
  );
}

export function StatusItem({ icon, label, value, tone }) {
  return (
    <div className="statusItem">
      <div className={`statusIcon ${tone}`}>{icon}</div>
      <div>
        <b>{value}</b>
        <span>{label}</span>
      </div>
    </div>
  );
}

export function MiniStat({ icon, n, t }) {
  return (
    <div className="card miniStat">
      <div>{icon}</div>
      <b>{n}</b>
      <span>{t}</span>
    </div>
  );
}

// Delivery table shared by the dashboard and deliveries page.
// Color classes for delivery statuses in the table.
function statusTone(status) {
  return (
    {
      "In Transit": "blue",
      Ongoing: "blue",
      Completed: "green",
      Cancelled: "red",
      Pending: "yellow",
    }[status] || "gray"
  );
}

export function DeliveryTable({ rows, onView, onEdit }) {
  return (
    <div className="tableScroll">
      <table>
        <thead>
          <tr>
            <th>Booking ID</th>
            <th>User</th>
            <th>Driver</th>
            <th>Route</th>
            <th>Status</th>
            <th>ETA</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => {
            const [id, user, driver, route, status, eta] = row;

            return (
              <tr key={id}>
                <td className="id">{id}</td>
                <td>{user}</td>
                <td>{driver}</td>
                <td>
                  <MapPin size={13} />
                  {route}
                </td>
                <td>
                  <div className="statusActionCell">
                    <Badge tone={statusTone(status)}>{status}</Badge>

                    {onEdit && (
                      <button className="inlineEditBtn" onClick={() => onEdit(row)}>
                        Edit
                      </button>
                    )}
                  </div>
                </td>
                <td>{eta}</td>
                <td className="actions">
                  <button className="actionBtn" onClick={() => onView?.(row)}>
                    <Eye size={14} />
                    View
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Delivery chart shared by the dashboard and reports page.
// One chart for both the dashboard and the reports page.
// The wrapper classes differ so each page keeps its existing CSS.
export function DeliveryBarChart({ year, variant = "report" }) {
  const isDashboard = variant === "dashboard";

  const chart = (
    <div className={isDashboard ? "reportBars dashboardReportBars" : "reportBars"}>
      <div className="reportBarsGrid">
        {getReportMonths(year).map(({ month, completed, ongoing, cancelled }) => {
          const hasTransactions = completed > 0 || ongoing > 0 || cancelled > 0;

          return (
            <div className="reportMonth" key={month}>
              <div className="reportBarGroup">
                {hasTransactions && (
                  <>
                    <div
                      className="reportBar completedBar"
                      style={{ height: `${completed}%` }}
                      title={`${month} ${year} • Completed: ${completed}`}
                    />
                    <div
                      className="reportBar ongoingBar"
                      style={{ height: `${ongoing}%` }}
                      title={`${month} ${year} • Ongoing: ${ongoing}`}
                    />
                    <div
                      className="reportBar cancelledBar"
                      style={{ height: `${cancelled}%` }}
                      title={`${month} ${year} • Cancelled: ${cancelled}`}
                    />
                  </>
                )}
              </div>

              <small>{month}</small>
            </div>
          );
        })}
      </div>
    </div>
  );

  return isDashboard ? <div className="dashboardReportChart">{chart}</div> : chart;
}

export function ChartLegend({ className = "" }) {
  return (
    <div className={`legend ${className}`.trim()}>
      <span>
        <i /> Completed
      </span>
      <span>
        <i className="orange" /> Ongoing
      </span>
      <span>
        <i className="gray" /> Cancelled
      </span>
    </div>
  );
}
