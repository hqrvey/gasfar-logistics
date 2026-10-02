import { Fragment } from "react";

export default function Detail({ rows }) {
  return (
    <div className="detailGrid">
      {rows.map(([label, value]) => (
        <Fragment key={label}>
          <b>{label}</b>
          <span>{value}</span>
        </Fragment>
      ))}
    </div>
  );
}
