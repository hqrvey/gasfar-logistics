import { useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Eye, ShieldAlert } from "lucide-react";
import { Badge, Detail, MiniStat, Modal, PageHeader } from "../../components/admin/ui/index.js";
import usePersistedState from "../../hooks/usePersistedState.js";
import { INITIAL_COMPLAINTS } from "../../data/adminMockData.js";
import { STORAGE_KEYS, getSaved } from "../../utils/storage.js";

const statusTone = (status) =>
  ({ Resolved: "green", "Pending Review": "yellow" })[status] ?? "blue";

export default function ComplaintsPage() {
  const [rows, setRows] = usePersistedState(STORAGE_KEYS.complaints, INITIAL_COMPLAINTS);
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState("");

  const investigate = (complaint) => {
    setSelected(complaint);
    setNotes(complaint[6] || "");
  };

  const saveInvestigation = (status) => {
    setRows((current) =>
      current.map((row) =>
        row[0] === selected[0] ? [...row.slice(0, 4), status, row[5], notes] : row
      )
    );
    setSelected(null);
  };

  const openCount = rows.filter((row) => row[4] !== "Resolved").length;
  const warningCount = getSaved(STORAGE_KEYS.warningCount, 5);

  return (
    <section className="content">
      <PageHeader
        title="Report & Complaint"
        desc="Review complaints, investigate incidents, and issue warnings or restrictions."
      />

      <div className="complaintCards">
        <MiniStat icon={<ShieldAlert />} n={openCount} t="Complaints Received" />
        <MiniStat
          icon={<Clock3 />}
          n={rows.filter((row) => row[4] === "Under Investigation").length}
          t="Under Investigation"
        />
        <MiniStat
          icon={<CheckCircle2 />}
          n={rows.filter((row) => row[4] === "Resolved").length}
          t="Resolved"
        />
        <MiniStat icon={<AlertTriangle />} n={warningCount} t="Warnings Received" />
      </div>

      <div className="card tableCard">
        <div className="cardHead">
          <div>
            <h2>Reported Incidents</h2>
            <p>Investigate, save findings, and resolve complaints.</p>
          </div>
        </div>

        <div className="tableScroll">
          <table>
            <thead>
              <tr>
                <th>Complaint</th>
                <th>Reported By</th>
                <th>Against</th>
                <th>Issue</th>
                <th>Status</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((complaint) => {
                const [id, reportedBy, against, issue, status, date] = complaint;

                return (
                  <tr key={id}>
                    <td className="id">{id}</td>
                    <td>{reportedBy}</td>
                    <td>{against}</td>
                    <td>{issue}</td>
                    <td>
                      <Badge tone={statusTone(status)}>{status}</Badge>
                    </td>
                    <td>{date}</td>
                    <td>
                      <button className="actionBtn" onClick={() => investigate(complaint)}>
                        <Eye size={14} />
                        Investigate
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <Modal title={`Investigate ${selected[0]}`} onClose={() => setSelected(null)}>
          <Detail
            rows={[
              ["Reported By", selected[1]],
              ["Against", selected[2]],
              ["Issue", selected[3]],
              ["Date", selected[5]],
            ]}
          />

          <label className="modalLabel">
            Investigation Notes
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows="5"
            />
          </label>

          <div className="modalActions">
            <button
              className="secondary"
              onClick={() => saveInvestigation("Under Investigation")}
            >
              Save Investigation
            </button>

            <button className="primary" onClick={() => saveInvestigation("Resolved")}>
              Save &amp; Resolve
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
