import { RotateCcw, ShieldX } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Ended() {
  const navigate = useNavigate();

  return (
    <main className="app-shell ended-shell">
      <section className="ended-panel">
        <div className="ended-icon">
          <ShieldX size={42} />
        </div>
        <h1>This chat has been destroyed.</h1>
        <p>All messages deleted permanently.</p>
        <button className="primary-action compact" type="button" onClick={() => navigate("/")}>
          <RotateCcw size={19} />
          <span>New Room</span>
        </button>
      </section>
    </main>
  );
}
