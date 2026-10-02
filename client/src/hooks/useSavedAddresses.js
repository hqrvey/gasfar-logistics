import { useCallback, useState } from "react";
import { MOCK_SAVED_ADDRESSES } from "../data/clientMockData";

// Shared saved-address state used by the user profile and booking pages.
export default function useSavedAddresses() {
  const [savedAddresses, setSavedAddresses] = useState(MOCK_SAVED_ADDRESSES);

  const addSavedAddress = useCallback((address) => {
    setSavedAddresses((list) => [
      ...list,
      { id: `a${Date.now()}`, icon: "home", ...address },
    ]);
  }, []);

  const updateSavedAddress = useCallback((id, address) => {
    setSavedAddresses((list) =>
      list.map((item) => (item.id === id ? { ...item, ...address } : item))
    );
  }, []);

  const deleteSavedAddress = useCallback((id) => {
    setSavedAddresses((list) => list.filter((item) => item.id !== id));
  }, []);

  return {
    savedAddresses,
    addSavedAddress,
    updateSavedAddress,
    deleteSavedAddress,
  };
}
