import { useEffect, useState } from "react";
import { reviewStore } from "../services/reviewStore.js";

export const useReviews = () => {
  const [reviews, setReviews] = useState(() => reviewStore.getAll());

  useEffect(() => reviewStore.subscribe(setReviews), []);

  return {
    reviews,
    setReview: reviewStore.set,
  };
};
