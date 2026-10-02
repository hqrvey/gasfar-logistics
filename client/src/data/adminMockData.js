export const INITIAL_DELIVERIES = [
  ["#GF-10482", "Juan Dela Cruz", "Maria Santos", "Malolos → Manila", "In Transit", "Today, 7:30 PM"],
  ["#GF-10481", "Ana Reyes", "Pedro Cruz", "Bulacan → Quezon City", "Completed", "Today, 5:15 PM"],
  ["#GF-10480", "Mark Villanueva", "Rico Garcia", "Baliwag → Malolos", "Ongoing", "Today, 8:45 PM"],
  ["#GF-10479", "Sofia Ramos", "James Mendoza", "Meycauayan → Manila", "Cancelled", "Yesterday, 4:20 PM"],
  ["#GF-10478", "Kevin Flores", "Daniel Santos", "Hagonoy → Calumpit", "Completed", "Yesterday, 2:10 PM"],
];

export const INITIAL_USERS = [
  ["USR-1001", "Juan Dela Cruz", "juan@email.com", "0917 123 4567", "Active", "24 bookings"],
  ["USR-1002", "Ana Reyes", "ana@email.com", "0918 234 5678", "Active", "18 bookings"],
  ["USR-1003", "Mark Villanueva", "mark@email.com", "0919 345 6789", "Inactive", "7 bookings"],
  ["USR-1004", "Sofia Ramos", "sofia@email.com", "0920 456 7890", "Active", "31 bookings"],
];

export const INITIAL_DRIVERS = [
  ["DRV-2001", "Maria Santos", "Professional License", "Toyota Vios • ABC 1234", "Verified", "Active"],
  ["DRV-2002", "Pedro Cruz", "Professional License", "Suzuki Ertiga • XYZ 5678", "Pending", "For Review"],
  ["DRV-2003", "Rico Garcia", "Professional License", "Mitsubishi L300 • DEF 9012", "Verified", "Active"],
  ["DRV-2004", "James Mendoza", "Professional License", "Toyota Innova • GHI 3456", "Rejected", "Suspended"],
];

export const INITIAL_COMPLAINTS = [
  [
    "CMP-3001",
    "Juan Dela Cruz",
    "Maria Santos",
    "Late delivery / misconduct",
    "Under Investigation",
    "Aug 30, 2026",
    "Driver arrived late and allegedly behaved unprofessionally.",
  ],
  [
    "CMP-3002",
    "Ana Reyes",
    "Pedro Cruz",
    "Unprofessional behavior",
    "Pending Review",
    "Aug 29, 2026",
    "User reported inappropriate communication.",
  ],
  [
    "CMP-3003",
    "Sofia Ramos",
    "User: Mark V.",
    "Booking dispute",
    "Resolved",
    "Aug 27, 2026",
    "Dispute was reviewed and resolved by admin.",
  ],
];

export const DRIVER_DOCS = {
  profilePhoto: {
    title: "Profile Photo",
    file: "profile_photo.jpg",
    size: "2.4 MB",
    type: "JPG",
    date: "Aug 12, 2025 • 10:24 AM",
    imgUrl: "https://rahahome.com/en/services/personal-driver/",
  },
  license: {
    title: "Professional Driver's License",
    file: "drivers_license.jpg",
    size: "3.1 MB",
    type: "JPG",
    date: "Aug 12, 2025 • 10:25 AM",
    number: "D123456789012",
    restrictions: "B / B1 / B2",
    expDate: "Dec 12, 2028",
    imgUrl:
      "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=60",
  },
  orCr: {
    title: "Vehicle OR/CR",
    file: "or_cr_document.pdf",
    size: "1.8 MB",
    type: "PDF",
    date: "Aug 12, 2025 • 10:26 AM",
    imgUrl:
      "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=600&auto=format&fit=crop&q=60",
  },
  vehiclePhoto: {
    title: "Vehicle Photo",
    file: "vehicle_front.jpg",
    size: "4.2 MB",
    type: "JPG",
    date: "Aug 12, 2025 • 10:27 AM",
    imgUrl:
      "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&auto=format&fit=crop&q=60",
  },
};
