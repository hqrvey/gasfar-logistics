import { useSearchParams } from "react-router-dom";
import { BarChart3, CheckCircle2, Clock3, Download, Package, XCircle } from "lucide-react";
import { PageHeader, Stat } from "../../components/admin/ui/index.js";
import DeliveryBarChart, { ChartLegend } from "../../components/admin/DeliveryBarChart.jsx";
import { DEFAULT_REPORT_YEAR, REPORT_YEARS } from "../../data/reportData.js";
import { generateReportPdf } from "../../utils/reportPdf.js";

const AVAILABLE_REPORTS = [
  "Monthly Delivery Summary",
  "Driver Performance Report",
  "User Booking Report",
  "Complaint & Incident Report",
];

export default function ReportsPage() {
  // The selected year lives in the URL: /reports?year=2025
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = Number(searchParams.get("year"));
  const year = REPORT_YEARS.includes(requested) ? requested : DEFAULT_REPORT_YEAR;

  const changeYear = (value) =>
    setSearchParams(value === DEFAULT_REPORT_YEAR ? {} : { year: value });

  return (
    <section className="content">
      <PageHeader
        title="Reports & Analytics"
        desc="Generate an actual PDF report for printing, submission, or records."
      >
        <select
          className="yearSelectHeader"
          value={year}
          onChange={(event) => changeYear(Number(event.target.value))}
          aria-label="Select analytics year"
        >
          {REPORT_YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        <button
          className="primary"
          onClick={() => generateReportPdf("Monthly Delivery Report", year)}
        >
          <Download size={15} />
          Generate PDF
        </button>
      </PageHeader>

      <div className="stats">
        <Stat icon={<Package />} label="Monthly Deliveries" value="1,742" change="+9.2%" />
        <Stat icon={<CheckCircle2 />} label="Completed" value="1,128" change="+6.4%" />
        <Stat icon={<XCircle />} label="Cancelled" value="86" change="-2.1%" />
        <Stat icon={<Clock3 />} label="Avg. Delivery Time" value="2h 18m" change="-8.6%" />
      </div>

      <div className="grid2 reportAnalyticsGrid">
        <div className="card reportChartCard">
          <div className="cardHead">
            <div>
              <h2>Monthly Delivery Performance</h2>
              <p>
                {year === 2026
                  ? "Recorded transactions through August 2026"
                  : "Complete transaction history for 2025"}
              </p>
            </div>
          </div>

          <DeliveryBarChart year={year} />
          <ChartLegend className="reportLegend" />
        </div>

        <div className="card reportList reportPageList">
          <div className="cardHead">
            <div>
              <h2>Available Reports</h2>
              <p>Each button creates and downloads a PDF.</p>
            </div>
          </div>

          {AVAILABLE_REPORTS.map((report) => (
            <div className="reportRow" key={report}>
              <div className="reportIcon">
                <BarChart3 size={17} />
              </div>

              <div>
                <b>{report}</b>
                <small>PDF • {year}</small>
              </div>

              <button className="downloadBtn" onClick={() => generateReportPdf(report, year)}>
                <Download size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
