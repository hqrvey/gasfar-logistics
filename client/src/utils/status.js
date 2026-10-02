export function statusTone(status) {
  return (
    {
      "In Transit": "blue",
      Ongoing: "blue",
      Completed: "green",
      Cancelled: "red",
      Pending: "yellow",
    }[status] || "gray"
  );
}
