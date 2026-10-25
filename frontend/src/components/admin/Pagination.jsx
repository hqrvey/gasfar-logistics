// One tiny reusable paginator for admin tables.
// The current page contains at most FIVE rows as in your groupmate's update.
import { useEffect, useState } from "react";
export function usePagination(rows, size = 5) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / size));
  const safePage = Math.min(page, totalPages);
  const first = (safePage - 1) * size;
  const pageRows = rows.slice(first, first + size);
  return { page: safePage, setPage, totalPages, pageRows };
}
export default function Pagination({ page, setPage, totalPages }) {
  if (totalPages <= 1) return null;
  return <nav className="feature-pagination" aria-label="Table pages">
    <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
    <span>Page {page} of {totalPages}</span>
    <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
  </nav>;
}
