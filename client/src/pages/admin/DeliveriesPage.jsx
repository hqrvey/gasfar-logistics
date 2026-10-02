import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarDays, Save } from "lucide-react";
import { DetailModal, Modal, PageHeader } from "../../components/admin/ui/index.js";
import DeliveryTable from "../../components/admin/DeliveryTable.jsx";
import usePersistedState from "../../hooks/usePersistedState.js";
import { INITIAL_DELIVERIES } from "../../data/adminMockData.js";
import { bookingDetailRows } from "../../utils/bookings.js";
import { STORAGE_KEYS } from "../../utils/storage.js";

const FILTERS = ["All", "Ongoing", "In Transit", "Completed", "Cancelled"];
const STATUS_OPTIONS = ["Pending", "Ongoing", "In Transit", "Completed", "Cancelled"];

export default function DeliveriesPage() {
  const [rows, setRows] = usePersistedState(STORAGE_KEYS.deliveries, INITIAL_DELIVERIES);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [pendingStatus, setPendingStatus] = useState("Pending");

  // The status filter lives in the URL: /deliveries?status=Completed
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("status");
  const filter = FILTERS.includes(requested) ? requested : "All";

  const changeFilter = (status) => setSearchParams(status === "All" ? {} : { status });

  const visibleRows = rows.filter((row) => filter === "All" || row[4] === filter);

  const openEdit = (row) => {
    setEditing(row);
    setPendingStatus(row[4]);
  };

  const saveEdit = () => {
    setRows((current) =>
      current.map((row) =>
        row[0] === editing[0] ? [...row.slice(0, 4), pendingStatus, row[5]] : row
      )
    );
    setEditing(null);
  };

  return (
    <section className="content">
      <PageHeader
        title="Delivery Management"
        desc="Monitor and manage all delivery requests and transactions."
      >
        <button className="secondary">
          <CalendarDays size={15} />
          Date Range
        </button>
      </PageHeader>

      <div className="card tableCard">
        <div className="cardHead">
          <div>
            <h2>All Delivery Requests</h2>
            <p>Click Edit beside the status to change a delivery status.</p>
          </div>

          <div className="filterPills">
            {FILTERS.map((status) => (
              <button
                key={status}
                className={filter === status ? "selectedPill" : ""}
                onClick={() => changeFilter(status)}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <DeliveryTable rows={visibleRows} onView={setSelected} onEdit={openEdit} />
      </div>

      {selected && (
        <DetailModal
          title={`Delivery ${selected[0]}`}
          rows={bookingDetailRows(selected)}
          onClose={() => setSelected(null)}
        />
      )}

      {editing && (
        <Modal title={`Edit ${editing[0]}`} onClose={() => setEditing(null)}>
          <label className="modalLabel">
            Delivery Status
            <select
              className="fullSelect"
              value={pendingStatus}
              onChange={(event) => setPendingStatus(event.target.value)}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>

          <div className="modalActions">
            <button className="secondary" onClick={() => setEditing(null)}>
              Cancel
            </button>

            <button className="primary" onClick={saveEdit}>
              <Save size={14} />
              Save
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
