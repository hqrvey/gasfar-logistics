const STORE_KEY = "gasfar_bookings_v1";
const listeners = new Set();

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || [];
  } catch {
    return [];
  }
};

const write = (data) => {
  localStorage.setItem(STORE_KEY, JSON.stringify(data));
  listeners.forEach((listener) => listener(data));
};

export const bookingStore = {
  getAll: read,
  get: (id) => read().find((booking) => booking.id === id),
  create: (booking) => {
    const now = Date.now();
    const fullBooking = { ...booking, createdAt: now, updatedAt: now };
    write([fullBooking, ...read()]);
    return fullBooking;
  },
  update: (id, patch) => {
    write(
      read().map((booking) =>
        booking.id === id
          ? { ...booking, ...patch, updatedAt: Date.now() }
          : booking
      )
    );
  },
  remove: (id) => write(read().filter((booking) => booking.id !== id)),
  reset: () => write([]),
  subscribe: (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === STORE_KEY) {
      listeners.forEach((listener) => listener(read()));
    }
  });

  window.bookingStore = bookingStore;
}
