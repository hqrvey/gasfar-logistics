import { useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, UserCircle } from "lucide-react";
import { useAuth } from "../../../context/AuthContext.jsx";
import { ROUTES } from "../../../routes/paths.js";

export default function ProfileMenu({ open, onToggle }) {
  const { name, photo, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate(ROUTES.login, { replace: true });
  };

  return (
    <div className="dropWrap">
      <button className="profile profileButton" onClick={onToggle}>
        {photo ? (
          <img src={photo} alt="Admin" className="adminAvatar adminAvatarPhoto" />
        ) : (
          <div className="adminAvatar">AD</div>
        )}

        <div>
          <b>{name}</b>
          <small>Operations Admin</small>
        </div>

        <ChevronDown size={15} />
      </button>

      {open && (
        <div className="dropdown profileDrop">
          <button onClick={() => navigate(ROUTES.profile)}>
            <UserCircle size={16} />
            Profile
          </button>

          <button className="dangerItem" onClick={handleLogout}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
