import { Save } from "lucide-react";
import Modal from "./Modal.jsx";
import Detail from "./Detail.jsx";

// Read-only details with a single Save button (used by users, bookings, deliveries).
export default function DetailModal({ title, rows, onClose }) {
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
