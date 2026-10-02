export const MOCK_NOTIFICATIONS_USER = [
  { id: "n1", type: "order", message: "Your order #0012 is on the way!", time: "2 mins ago", read: false },
  { id: "n2", type: "order", message: "Driver has picked up your package.", time: "15 mins ago", read: false },
  { id: "n3", type: "order", message: "Order #0011 completed. Rate your driver!", time: "Yesterday", read: true },
  { id: "n4", type: "system", message: "New login detected on Chrome — was this you?", time: "2 days ago", read: false },
  { id: "n5", type: "system", message: "Your account has been verified.", time: "1 week ago", read: true },
];

export const MOCK_NOTIFICATIONS_DRIVER = [
  { id: "n1", type: "job", message: "New booking available near you.", time: "Just now", read: false },
  { id: "n2", type: "earnings", message: "You earned ₱167 from ORD-0011.", time: "2 hours ago", read: true },
  { id: "n3", type: "job", message: "Priority delivery request — Bulacan area.", time: "30 mins ago", read: false },
  { id: "n4", type: "earnings", message: "Commission of ₱18.50 deducted from ORD-0012.", time: "3 hours ago", read: true },
  { id: "n5", type: "account", message: "Your vehicle documents are verified.", time: "2 days ago", read: true },
];

export const MOCK_SAVED_ADDRESSES = [
  { id: "a1", label: "Home", address: "123 Malolos St, Bulacan", lat: 14.8433, lng: 120.8107, icon: "home" },
  { id: "a2", label: "Work", address: "456 Guiguinto, Bulacan", lat: 14.8285, lng: 120.8817, icon: "work" },
];

export const MOCK_DRIVER = {
  name: "Pedro Santos",
  email: "pedro@gasfar.com",
  phone: "0918 000 0000",
  rating: 4.8,
  trips: 127,
  verified: true,
  vehicle: { type: "motorcycle", capacity: "20 kg", plate: "ABC 1234" },
  walletBalance: 340,
  minBalance: 25,
  online: true,
};

export const MOCK_DRIVER_REVIEWS = [
  { rating: 5, comment: "Mabilis at maayos! Salamat.", date: "Sep 20, 2026" },
  { rating: 5, comment: "Very professional. Will book again.", date: "Sep 15, 2026" },
  { rating: 4, comment: "On time, maayos kausap.", date: "Sep 10, 2026" },
  { rating: 5, comment: "Sulit! Salamat sa delivery.", date: "Sep 5, 2026" },
  { rating: 4, comment: "Okay naman, slight delay lang.", date: "Aug 28, 2026" },
];

export const MOCK_WALLET_TX = [
  { id: "t1", type: "commission", amount: -18.5, label: "Commission · ORD-0012", date: "Sep 2, 2026 · 11:02 AM" },
  { id: "t2", type: "topup", amount: 500, label: "Top-up via GCash", date: "Sep 1, 2026 · 8:15 AM" },
  { id: "t3", type: "commission", amount: -32, label: "Commission · ORD-0011", date: "Aug 30, 2026 · 3:47 PM" },
  { id: "t4", type: "refund", amount: 15, label: "Refund · ORD-0010 (cancelled)", date: "Aug 28, 2026 · 8:10 AM" },
  { id: "t5", type: "topup", amount: 200, label: "Top-up via Maya", date: "Aug 27, 2026 · 6:30 PM" },
];

export const DRIVER_WALLET = { balance: 340, minRequired: 25, pending: 0 };
