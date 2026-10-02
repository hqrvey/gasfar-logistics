import { ArrowUpRight } from "lucide-react";

export function Stat({ icon, label, value, change }) {
  return (
    <div className="card stat">
      <div className="statTop">
        <div className="statIcon">{icon}</div>
        <span className="positive">
          <ArrowUpRight size={12} />
          {change}
        </span>
      </div>

      <strong>{value}</strong>
      <p>{label}</p>
    </div>
  );
}

export function StatusItem({ icon, label, value, tone }) {
  return (
    <div className="statusItem">
      <div className={`statusIcon ${tone}`}>{icon}</div>
      <div>
        <b>{value}</b>
        <span>{label}</span>
      </div>
    </div>
  );
}

export function MiniStat({ icon, n, t }) {
  return (
    <div className="card miniStat">
      <div>{icon}</div>
      <b>{n}</b>
      <span>{t}</span>
    </div>
  );
}
