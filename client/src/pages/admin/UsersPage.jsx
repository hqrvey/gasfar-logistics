import { useState } from "react";
import { Eye } from "lucide-react";
import { Badge, DetailModal, PageHeader } from "../../components/admin/ui/index.js";
import usePersistedState from "../../hooks/usePersistedState.js";
import { INITIAL_USERS } from "../../data/adminMockData.js";
import { STORAGE_KEYS } from "../../utils/storage.js";

export default function UsersPage() {
  const [rows, setRows] = usePersistedState(STORAGE_KEYS.users, INITIAL_USERS);
  const [selected, setSelected] = useState(null);

  const toggleStatus = (userId) =>
    setRows((current) =>
      current.map((user) =>
        user[0] === userId
          ? [...user.slice(0, 4), user[4] === "Active" ? "Inactive" : "Active", user[5]]
          : user
      )
    );

  return (
    <section className="content">
      <PageHeader
        title="User Management"
        desc="Manage user accounts, profiles, and booking history."
      />

      <div className="card tableCard">
        <div className="cardHead">
          <div>
            <h2>All Users</h2>
            <p>Manage user status and view booking history.</p>
          </div>

          <span className="count">{rows.length} users</span>
        </div>

        <div className="tableScroll">
          <table>
            <thead>
              <tr>
                <th>User ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Booking History</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((user) => {
                const [id, name, email, phone, status, bookings] = user;

                return (
                  <tr key={id}>
                    <td className="id">{id}</td>
                    <td>
                      <b>{name}</b>
                    </td>
                    <td>{email}</td>
                    <td>{phone}</td>
                    <td>
                      <div className="statusActionCell">
                        <Badge tone={status === "Active" ? "green" : "red"}>{status}</Badge>

                        <button className="inlineEditBtn" onClick={() => toggleStatus(id)}>
                          {status === "Active" ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                    <td>{bookings}</td>
                    <td className="actions">
                      <button className="actionBtn" onClick={() => setSelected(user)}>
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
      </div>

      {selected && (
        <DetailModal
          title="User Profile"
          rows={[
            ["User ID", selected[0]],
            ["Name", selected[1]],
            ["Email", selected[2]],
            ["Phone", selected[3]],
            ["Status", selected[4]],
            ["Booking History", selected[5]],
          ]}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}
