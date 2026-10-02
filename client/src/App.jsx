import React, { useCallback, useState } from "react";
import AppRoutes from "./routes/AppRoutes";
import { useReviews } from "./hooks/useReviews.js";
import { MOCK_SAVED_ADDRESSES } from "./data/clientMockData.js";

function App() {
  const [savedAddresses, setSavedAddresses] = useState(MOCK_SAVED_ADDRESSES);
  const { reviews, setReview } = useReviews();

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

  const submitReview = useCallback(
    (orderId, payload) => {
      setReview(orderId, {
        ...payload,
        date: new Date().toLocaleDateString("en-PH", { dateStyle: "medium" }),
      });
    },
    [setReview]
  );

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

export default App;
