import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Search } from "lucide-react";
import { ROUTES } from "../../../routes/paths.js";
import {
  INITIAL_DELIVERIES,
  INITIAL_DRIVERS,
  INITIAL_USERS,
} from "../../../data/adminMockData.js";

const SOURCES = [
  { type: "User", rows: INITIAL_USERS, to: ROUTES.users, label: (row) => row[1] },
  { type: "Driver", rows: INITIAL_DRIVERS, to: ROUTES.drivers, label: (row) => row[1] },
  { type: "Booking", rows: INITIAL_DELIVERIES, to: ROUTES.deliveries, label: (row) => row[0] },
];

function searchAll(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return SOURCES.flatMap(({ type, rows, to, label }) =>
    rows
      .filter((row) => row.join(" ").toLowerCase().includes(q))
      .map((row) => ({ type, id: row[0], name: label(row), to }))
  ).slice(0, 6);
}

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const results = useMemo(() => searchAll(query), [query]);

  const open = (result) => {
    navigate(result.to);
    setQuery("");
  };

  return (
    <div className="searchWrap">
      <div className="searchBox">
        <Search size={17} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search users, drivers, bookings..."
        />
      </div>

      {query && (
        <div className="searchResults">
          {results.length ? (
            results.map((result) => (
              <button key={`${result.type}-${result.id}`} onClick={() => open(result)}>
                <span>
                  <b>{result.name}</b>
                  <small>
                    {result.type} • {result.id}
                  </small>
                </span>
                <ChevronDown size={13} />
              </button>
            ))
          ) : (
            <div className="noResults">No matching users, drivers, or bookings.</div>
          )}
        </div>
      )}
    </div>
  );
}
