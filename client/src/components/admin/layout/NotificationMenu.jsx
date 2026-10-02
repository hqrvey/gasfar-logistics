import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { ROUTES } from "../../../routes/paths.js";

const NOTIFICATIONS = [
  {
    tone: "red",
    title: "New complaint received",
    text: "Customer reported a driver incident.",
    to: ROUTES.complaints,
  },
  {
    tone: "orange",
    title: "Driver verification pending",
    text: "A new application needs review.",
    to: ROUTES.drivers,
  },
  {
    tone: "blue",
    title: "Delivery update",
    text: "A booking status changed.",
    to: ROUTES.deliveries,
  },
];

export default function NotificationMenu({ open, onToggle }) {
  const navigate = useNavigate();

  return (
    <div className="dropWrap">
      <button className="iconButton notification" onClick={onToggle} title="Notifications">
        <Bell size={18} />
        <i />
      </button>

      {open && (
        <div className="dropdown notificationDrop">
          <div className="dropTitle">
            Notifications <span>{NOTIFICATIONS.length} new</span>
          </div>

          {NOTIFICATIONS.map(({ tone, title, text, to }) => (
            <button key={title} onClick={() => navigate(to)}>
              <span className={`notifDot ${tone}`} />
              <span>
                <b>{title}</b>
                <small>{text}</small>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
