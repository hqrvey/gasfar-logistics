// Shared addresses stay inside this file: no additional context is required.
import AppRoutes from "./routes/AppRoutes.jsx";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./context/AuthContext.jsx";
import { extraService } from "./services/extraService.js";

function useSavedAddresses() {
  const { user } = useAuth();
  const [savedAddresses, setSavedAddresses] = useState([]);
  useEffect(() => {
    if (user?.role !== "customer") { setSavedAddresses([]); return; }
    extraService.addresses()
      .then(result => setSavedAddresses(result.addresses || []))
      .catch(error => console.warn("Could not load saved addresses:", error.message));
  }, [user?.id, user?.role]);

  const addSavedAddress = useCallback(async (address) => {
    try {
      const result = await extraService.addAddress(address);
      setSavedAddresses(list => [...list, result.address]);
    } catch (error) { alert(error.message); }
  }, []);
  const updateSavedAddress = useCallback(async (id, address) => {
    try {
      const result = await extraService.editAddress(id, address);
      setSavedAddresses(list => list.map(item => item.id === id ? result.address : item));
    } catch (error) { alert(error.message); }
  }, []);
  const deleteSavedAddress = useCallback(async (id) => {
    try {
      await extraService.removeAddress(id);
      setSavedAddresses(list => list.filter(item => item.id !== id));
    } catch (error) { alert(error.message); }
  }, []);
  return { savedAddresses, addSavedAddress, updateSavedAddress, deleteSavedAddress };
}

export default function App() {
  const { savedAddresses, addSavedAddress, updateSavedAddress, deleteSavedAddress } = useSavedAddresses();
  return <AppRoutes savedAddresses={savedAddresses} onSaveAddress={addSavedAddress}
    onUpdateAddress={updateSavedAddress} onDeleteAddress={deleteSavedAddress} />;
}
