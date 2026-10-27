const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (value) => EMAIL_RE.test(value);

export const peso = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return "₱—";
  const hasCentavos = Math.round(number * 100) % 100 !== 0;
  return `₱${number.toLocaleString("en-PH", { minimumFractionDigits: hasCentavos ? 2 : 0, maximumFractionDigits: 2 })}`;
};

export const STATUS = {
  pending: { label: "Waiting for driver", group: "ongoing", cls: "badge-pending" },
  accepted: { label: "On the way to pickup", group: "ongoing", cls: "badge-ongoing" },
  at_pickup: { label: "At pickup", group: "ongoing", cls: "badge-ongoing" },
  picked_up: { label: "In Transit", group: "ongoing", cls: "badge-ongoing" },
  in_transit: { label: "In Transit", group: "ongoing", cls: "badge-ongoing" },
  arrived: { label: "Arrived", group: "ongoing", cls: "badge-ongoing" },
  delivered: { label: "Completed", group: "completed", cls: "badge-completed" },
  completed: { label: "Completed", group: "completed", cls: "badge-completed" },
  cancelled: { label: "Cancelled", group: "cancelled", cls: "badge-cancelled" },
};

export const statusOf = (status) => STATUS[status] || STATUS.pending;
export const groupOf = (status) => statusOf(status).group;

// The five visible tracking stages. Pending and cancelled are separate states.
export const DRIVER_FLOW = ["accepted", "at_pickup", "picked_up", "arrived", "delivered"];

export const ACTIVE_DELIVERY_STATUSES = ["accepted", "at_pickup", "picked_up", "arrived"];

export const DELIVERY_STATUS_LABELS = {
  accepted: "Driver is on the way to pickup",
  at_pickup: "Driver has arrived at pickup",
  picked_up: "Package picked up — in transit",
  arrived: "Driver has arrived at drop-off",
  delivered: "Delivered",
};

export const DRIVER_ACTION = {
  pending: "Accept Booking",
  accepted: "I Have Arrived at Pickup",
  at_pickup: "Confirm Package Pickup",
  picked_up: "I Have Arrived at Drop-off",
  arrived: "Confirm Delivery (Enter PIN)",
};

// Used by the admin dashboard and deliveries page.
export const bookingDetailRows = ([id, user, driver, route, status, eta]) => [
  ["Booking ID", id],
  ["User", user],
  ["Driver", driver],
  ["Route", route],
  ["Status", status],
  ["ETA", eta],
];
