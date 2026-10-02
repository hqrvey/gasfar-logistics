import { getReportMonths } from "../../data/reportData.js";

// One chart for both the dashboard and the reports page.
// The wrapper classes differ so each page keeps its existing CSS.
export default function DeliveryBarChart({ year, variant = "report" }) {
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
