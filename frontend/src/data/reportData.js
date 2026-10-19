export const REPORT_YEARS = [2026, 2025];
export const DEFAULT_REPORT_YEAR = 2026;

export const REPORT_DATA = {
  2025: [
    { month: "Jan", completed: 58, ongoing: 28, cancelled: 12 },
    { month: "Feb", completed: 72, ongoing: 34, cancelled: 10 },
    { month: "Mar", completed: 64, ongoing: 32, cancelled: 14 },
    { month: "Apr", completed: 82, ongoing: 39, cancelled: 11 },
    { month: "May", completed: 76, ongoing: 37, cancelled: 13 },
    { month: "Jun", completed: 91, ongoing: 43, cancelled: 9 },
    { month: "Jul", completed: 85, ongoing: 40, cancelled: 12 },
    { month: "Aug", completed: 104, ongoing: 46, cancelled: 8 },
    { month: "Sep", completed: 98, ongoing: 44, cancelled: 10 },
    { month: "Oct", completed: 116, ongoing: 51, cancelled: 7 },
    { month: "Nov", completed: 108, ongoing: 48, cancelled: 9 },
    { month: "Dec", completed: 119, ongoing: 54, cancelled: 6 },
  ],
  2026: [
    { month: "Jan", completed: 35, ongoing: 17, cancelled: 5 },
    { month: "Feb", completed: 46, ongoing: 21, cancelled: 7 },
    { month: "Mar", completed: 41, ongoing: 20, cancelled: 6 },
    { month: "Apr", completed: 55, ongoing: 25, cancelled: 7 },
    { month: "May", completed: 50, ongoing: 23, cancelled: 5 },
    { month: "Jun", completed: 63, ongoing: 29, cancelled: 8 },
    { month: "Jul", completed: 59, ongoing: 27, cancelled: 6 },
    { month: "Aug", completed: 71, ongoing: 33, cancelled: 5 },
    // No 2026 transaction data yet for September to December.
    { month: "Sep", completed: 0, ongoing: 0, cancelled: 0 },
    { month: "Oct", completed: 0, ongoing: 0, cancelled: 0 },
    { month: "Nov", completed: 0, ongoing: 0, cancelled: 0 },
    { month: "Dec", completed: 0, ongoing: 0, cancelled: 0 },
  ],
};

export function getReportMonths(year) {
  return REPORT_DATA[year] || REPORT_DATA[DEFAULT_REPORT_YEAR];
}
