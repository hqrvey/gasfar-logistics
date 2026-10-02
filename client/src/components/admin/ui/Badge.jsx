export default function Badge({ children, tone }) {
  const badgeTone = tone || String(children).toLowerCase().replaceAll(" ", "-");

  return <span className={`badge ${badgeTone}`}>{children}</span>;
}
