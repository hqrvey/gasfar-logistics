import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { extraService } from "../../services/extraService.js";
import { FiBriefcase, FiEdit2, FiHome, FiLock, FiMail, FiMapPin as FiMapPinOutline, FiPlus, FiTrash2, FiUser } from "react-icons/fi";
import { MOCK_NOTIFICATIONS_USER, MOCK_SAVED_ADDRESSES } from "../../data/demo/clientMockData.js";
import UserLayout from "../../layouts/UserLayout.jsx";
import { Field } from "../../components/common/BookingUI.jsx";
import { InputField, PhoneInput } from "../../components/common/FormComponents.jsx";
import {
  AddressEditorModal,
  ChangePasswordTab,
  DeleteAccountTab,
  PhotoUploader,
  ProfileLayout,
} from "../../components/common/ProfileComponents.jsx";

const UserProfilePage = ({ savedAddresses = [], onSaveAddress, onUpdateAddress, onDeleteAddress }) => {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [info, setInfo] = useState({ username: "", firstName: "", lastName: "", email: "", phone: "", photo: null });
  useEffect(() => {
    if (!user) return;
    const next = { username: user.username || "", firstName: user.firstName || "", lastName: user.lastName || "", email: user.email || "", phone: user.phone || "", photo: user.hasProfilePhoto ?
      (import.meta.env.VITE_API_URL || "http://localhost:5001/api") + "/extra/me/photo?changed=" + Date.now() : null };
    setInfo(next); setDraft(next);
  }, [user]);
  const [draft, setDraft] = useState(info);
  const [editing, setEditing] = useState(false);
  const addresses = savedAddresses;
  const [editAddr, setEditAddr] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteAddrId, setDeleteAddrId] = useState(null);
  const startEdit = () => { setDraft(info); setEditing(true); };
  const cancelEdit = () => { setDraft(info); setEditing(false); };
  const saveEdit = async () => {
    try {
      await extraService.saveProfile({ username: draft.username, firstName: draft.firstName, lastName: draft.lastName, email: draft.email });
      await refreshUser();
      setEditing(false);
      alert("Profile saved in MongoDB.");
    } catch (problem) { alert(problem.message); }
  };
  // Profile images remain a local preview; they are NOT automatically uploaded.
  const updatePhoto = async (file) => {
    try {
      await extraService.updateProfilePhoto(file);
      await refreshUser(); // The image is now stored on the server, not just React.
    } catch (problem) { alert(problem.message); }
  };
  const tabs = [
    { id: "profile", label: "Profile Info", Icon: FiUser },
    { id: "addresses", label: "Saved Addresses", Icon: FiMapPinOutline },
    { id: "password", label: "Change Password", Icon: FiLock },
    { id: "delete", label: "Delete Account", Icon: FiTrash2 },
  ];
  const header = (
    <>
      <div className="profile-avatar profile-avatar--user">{info.photo ? <img src={(typeof info.photo === "string" ? info.photo : URL.createObjectURL(info.photo))} alt={info.firstName} /> : <span>{info.firstName.charAt(0)}{info.lastName.charAt(0)}</span>}</div>
      <div className="profile-header-info">
        <h2 className="profile-header-name">{info.firstName} {info.lastName}</h2>
        <p className="profile-header-meta">@{info.username} · {info.email} · +63 {info.phone}</p>
        <p className="profile-header-sub">Customer account</p>
      </div>
    </>
  );
  const deleteAddress = (id) => { onDeleteAddress(id); setDeleteAddrId(null); };
  return (
    <UserLayout user={{ name: `${info.firstName} ${info.lastName}` }} notifications={MOCK_NOTIFICATIONS_USER}>
      <div className="profile-page-wrap">
        <ProfileLayout header={header} tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}>
          {activeTab === "profile" && (
            <div className="profile-form">
              <div className="profile-photo-row"><PhotoUploader photo={info.photo} fallback={<>{info.firstName.charAt(0)}{info.lastName.charAt(0)}</>} onUpload={updatePhoto} editable={editing} /></div>
              <InputField id="username" label="Username" icon={FiUser} placeholder="your-username" value={draft.username} onChange={(e) => setDraft({ ...draft, username: e.target.value })} disabled={!editing} />
              <div className="bd-row2">
                <Field label="First name"><input className="field__input" value={draft.firstName} disabled={!editing} onChange={(e) => setDraft({ ...draft, firstName: e.target.value })} /></Field>
                <Field label="Last name"><input className="field__input" value={draft.lastName} disabled={!editing} onChange={(e) => setDraft({ ...draft, lastName: e.target.value })} /></Field>
              </div>
              <PhoneInput label="Mobile number" value={draft.phone} onChange={(v) => setDraft({ ...draft, phone: v })} disabled={!editing} />
              <p className="feature-mini">Linked email is optional contact information, not yet verified for account recovery.</p>
              <InputField id="email" label="Linked email (unverified)" type="email" placeholder="your@email.com" icon={FiMail} value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} disabled={!editing} />
              {editing ? (<div className="profile-actions"><button className="btn-profile-ghost" onClick={cancelEdit}>Cancel</button><button className="btn-profile-primary" onClick={saveEdit}>Save Changes</button></div>) : (<button className="btn-profile-primary" onClick={startEdit}><FiEdit2 size={14} /> Edit Profile</button>)}
            </div>
          )}
          {activeTab === "addresses" && (
            <div className="profile-form">
              <div className="addresses-head"><p className="profile-section-title">Your saved addresses</p><button className="btn-profile-secondary" onClick={() => setShowAdd(true)}><FiPlus size={14} /> Add New</button></div>
              {addresses.length === 0 ? (<div className="profile-empty"><p>No saved addresses yet.</p></div>) : (
                <div className="address-list">
                  {addresses.map((a) => (
                    <div key={a.id} className="address-item">
                      <span className="address-item__icon">{a.icon === "work" ? <FiBriefcase size={16} /> : <FiHome size={16} />}</span>
                      <div className="address-item__body"><p className="address-item__label">{a.label}</p><p className="address-item__addr">{a.address}</p></div>
                      <button className="address-item__btn" onClick={() => setEditAddr(a)} title="Edit"><FiEdit2 size={14} /></button>
                      <button className="address-item__btn danger" onClick={() => setDeleteAddrId(a.id)} title="Delete"><FiTrash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {activeTab === "password" && <ChangePasswordTab />}
          {activeTab === "delete" && (
            <DeleteAccountTab
              role="customer"
              onDelete={() => {
                alert("Account deletion is not yet available through the REST API. Please contact support.");
              }}
            />
          )}
        </ProfileLayout>
        {deleteAddrId && (
          <div className="confirm-modal">
            <div className="confirm-modal__overlay" onClick={() => setDeleteAddrId(null)} />
            <div className="confirm-modal__card">
              <div className="confirm-modal__icon confirm-modal__icon--danger">
                <FiTrash2 size={22} />
              </div>
              <h3 className="confirm-modal__title">Delete Address?</h3>
              <p className="confirm-modal__desc">
                "{addresses.find((a) => a.id === deleteAddrId)?.label}" will be permanently removed from your saved addresses.
              </p>
              <div className="confirm-modal__actions">
                <button className="confirm-modal__btn confirm-modal__btn--ghost" onClick={() => setDeleteAddrId(null)}>Cancel</button>
                <button className="confirm-modal__btn confirm-modal__btn--danger" onClick={() => deleteAddress(deleteAddrId)}>Delete</button>
              </div>
            </div>
          </div>
        )}
        {(showAdd || editAddr) && (
          <AddressEditorModal initial={editAddr} onClose={() => { setShowAdd(false); setEditAddr(null); }} onSave={(addr) => {
            if (editAddr) onUpdateAddress(editAddr.id, addr);
            else onSaveAddress(addr);
            setShowAdd(false); setEditAddr(null);
          }} />
        )}
      </div>
    </UserLayout>
  );
};

/* ═══ Driver Profile ═══ */

export default UserProfilePage;
