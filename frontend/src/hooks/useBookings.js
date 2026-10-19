import { useEffect, useState } from "react";
import { bookingStore } from "../services/bookingStore.js";

export const useBookings = (filterFn) => {
  const [all, setAll] = useState(() => bookingStore.getAll());

  useEffect(() => bookingStore.subscribe(setAll), []);

  return {
    all,
    bookings: filterFn ? all.filter(filterFn) : all,
    create: bookingStore.create,
    update: bookingStore.update,
    remove: bookingStore.remove,
  };
};
