import { Save } from "lucide-react";
import { PageHeader } from "../../components/admin/ui/index.js";
import usePersistedState from "../../hooks/usePersistedState.js";
import { STORAGE_KEYS } from "../../utils/storage.js";

const PREFERENCES = [
  "Email notifications",
  "Driver verification alerts",
  "Complaint notifications",
];

export default function SettingsPage() {
  const [prefs, setPrefs] = usePersistedState(STORAGE_KEYS.prefs, [true, true, true]);

  const toggle = (index) =>
    setPrefs((current) => current.map((value, i) => (i === index ? !value : value)));

  return (
    <section className="content">
      <PageHeader
        title="Settings"
        desc="Configure system preferences. Admin profile is managed separately."
      />

      <div className="settingsGrid">
        <div className="card settingCard">
          <h2>Notifications</h2>
          <p>Choose which alerts appear in the admin portal.</p>

          {PREFERENCES.map((label, index) => (
            <div className="toggleRow" key={label}>
              <span>
                {label}
                <small>Receive admin updates</small>
              </span>

              <input
                type="checkbox"
                checked={prefs[index]}
                onChange={() => toggle(index)}
              />
            </div>
          ))}
        </div>

        <div className="card settingCard">
          <h2>Data &amp; Reports</h2>
          <p>Quick actions for the admin system.</p>

          <button
            className="secondary"
            onClick={() => alert("Settings are saved automatically.")}
          >
            <Save size={14} />
            Check Save Status
          </button>

          <p className="smallNote">
            User, driver, delivery, complaint, and profile changes are stored in
            this browser using localStorage.
          </p>
        </div>
      </div>
    </section>
  );
}
