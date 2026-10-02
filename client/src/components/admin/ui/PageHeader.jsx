export default function PageHeader({ title, desc, children }) {
  return (
    <div className="pageHeader">
      <div>
        <h1>{title}</h1>
        <p>{desc}</p>
      </div>

      <div className="headerActions">{children}</div>
    </div>
  );
}
