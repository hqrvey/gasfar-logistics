// Quote every cell so values with commas (e.g. "Today, 7:30 PM") don't break columns.
const escapeCell = (value) => `"${String(value).replaceAll('"', '""')}"`;

export function downloadCSV(filename, headers, rows) {
  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCell).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
}
