import { Radio, ShieldCheck, TimerReset, UsersRound } from "lucide-react";

export default function StatusRail({ onlineCount, expiresAt, connected }) {
  const expiry = expiresAt
    ? new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date(expiresAt))
    : "--:--";

  return (
    <div className="status-rail">
      <div className="status-chip">
        <Radio size={15} />
        <span>{connected ? "Live" : "Linking"}</span>
      </div>
      <div className="status-chip">
        <UsersRound size={15} />
        <span>{onlineCount}/2</span>
      </div>
      <div className="status-chip">
        <TimerReset size={15} />
        <span>{expiry}</span>
      </div>
      <div className="status-chip status-chip-guard">
        <ShieldCheck size={15} />
        <span>Ephemeral</span>
      </div>
    </div>
  );
}
