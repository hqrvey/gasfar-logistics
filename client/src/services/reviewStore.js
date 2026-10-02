const REVIEW_KEY = "gasfar_reviews_v1";
const listeners = new Set();

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(REVIEW_KEY)) || {};
  } catch {
    return {};
  }
};

const write = (data) => {
  localStorage.setItem(REVIEW_KEY, JSON.stringify(data));
  listeners.forEach((listener) => listener(data));
};

export const reviewStore = {
  getAll: read,
  set: (orderId, payload) => write({ ...read(), [orderId]: payload }),
  reset: () => write({}),
  subscribe: (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === REVIEW_KEY) {
      listeners.forEach((listener) => listener(read()));
    }
  });

  window.reviewStore = reviewStore;
}
