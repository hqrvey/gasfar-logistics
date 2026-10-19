import AppRoutes from "./routes/AppRoutes.jsx";
import { useCallback, useState } from "react";
import { MOCK_SAVED_ADDRESSES } from "./data/demo/clientMockData.js";
import { useReviews } from "./hooks/useReviews.js";

// Shared saved-address state used by the user profile and booking pages.
function useSavedAddresses() {
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

// App connects a few shared hooks to the page routes.
// When the backend is ready, these hooks can read from API services.
export default function App() {
  const {
    savedAddresses,
    addSavedAddress,
    updateSavedAddress,
    deleteSavedAddress,
  } = useSavedAddresses();
  const { reviews, setReview } = useReviews();

  function submitReview(orderId, review) {
    setReview(orderId, {
      ...review,
      date: new Date().toLocaleDateString("en-PH", { dateStyle: "medium" }),
    });
  }

  return (
    <AppRoutes
      savedAddresses={savedAddresses}
      onSaveAddress={addSavedAddress}
      onUpdateAddress={updateSavedAddress}
      onDeleteAddress={deleteSavedAddress}
      reviews={reviews}
      onSubmitReview={submitReview}
    />
  );
}
