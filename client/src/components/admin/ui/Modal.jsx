import { X } from "lucide-react";

export default function Modal({ title, onClose, children }) {
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
