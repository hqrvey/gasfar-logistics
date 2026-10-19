const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (value) => EMAIL_RE.test(value);

export const peso = (value) => `₱${Number(value).toLocaleString()}`;

export const STATUS = {
  pending: { label: "Waiting for driver", group: "ongoing", cls: "badge-pending" },
  accepted: { label: "Driver OTW", group: "ongoing", cls: "badge-ongoing" },
  picked_up: { label: "In Transit", group: "ongoing", cls: "badge-ongoing" },
  in_transit: { label: "In Transit", group: "ongoing", cls: "badge-ongoing" },
  arrived: { label: "Arrived", group: "ongoing", cls: "badge-ongoing" },
  delivered: { label: "Completed", group: "completed", cls: "badge-completed" },
  completed: { label: "Completed", group: "completed", cls: "badge-completed" },
  cancelled: { label: "Cancelled", group: "cancelled", cls: "badge-cancelled" },
};

export const statusOf = (status) => STATUS[status] || STATUS.pending;
export const groupOf = (status) => statusOf(status).group;

export const DRIVER_FLOW = ["accepted", "picked_up", "arrived", "delivered"];

export const DRIVER_ACTION = {
  pending: "Accept Booking",
  accepted: "Heading to Pickup — Start Trip",
  picked_up: "Mark as Arrived",
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
