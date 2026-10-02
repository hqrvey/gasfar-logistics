import { Eye, MapPin } from "lucide-react";
import { Badge } from "./ui/index.js";
import { statusTone } from "../../utils/status.js";

export default function DeliveryTable({ rows, onView, onEdit }) {
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
