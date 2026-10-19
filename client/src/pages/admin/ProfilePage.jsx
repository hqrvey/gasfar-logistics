import { useState } from "react";
import { CheckCircle2, Save, Trash2, Upload } from "lucide-react";
import { PageHeader } from "../../components/admin/AdminUI.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

export default function ProfilePage() {
  const admin = useAuth();

  // Name and email are drafts until "Save Profile"; the photo applies immediately.
  const [name, setName] = useState(admin.name);
  const [email, setEmail] = useState(admin.email);
  const [saved, setSaved] = useState(false);
  const [photoError, setPhotoError] = useState("");

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPhotoError("Please select an image file.");
      return;
    }

    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError("Please choose an image smaller than 2 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      admin.setPhoto(String(reader.result || ""));
      setPhotoError("");
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = () => {
    admin.setName(name);
    admin.setEmail(email);

    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <section className="content">
      <PageHeader
        title="Admin Profile"
        desc="Manage your administrator account information."
      />

      <div className="profilePage card">
        <div className="profilePhotoColumn">
          {admin.photo ? (
            <img src={admin.photo} alt="Admin profile" className="largeAvatar profilePhotoImage" />
          ) : (
            <div className="largeAvatar">AD</div>
          )}

          <label className="photoUploadLabel">
            <Upload size={14} />
            Change Photo
            <input type="file" accept="image/*" onChange={handlePhotoChange} />
          </label>

          {admin.photo && (
            <button className="secondary photoRemoveButton" onClick={() => admin.setPhoto("")}>
              <Trash2 size={13} />
              Remove Photo
            </button>
          )}

          <small className="photoHint">JPG, PNG, or WEBP • Maximum 2 MB</small>

          {photoError && <span className="loginError">{photoError}</span>}
        </div>

        <div className="profileForm">
          <label>
            Full Name
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>

          <label>
            Email Address
            <input value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>

          <label>
            Role
            <input value="Operations Administrator" disabled />
          </label>

          <button className="primary" onClick={saveProfile}>
            <Save size={14} />
            Save Profile
          </button>

          {saved && (
            <span className="savedMessage">
              <CheckCircle2 size={14} />
              Profile saved
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
