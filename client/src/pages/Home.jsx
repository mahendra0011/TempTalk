import { ArrowRight, CirclePlus, DoorOpen, Fingerprint, Loader2, Terminal } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createRoom } from "../utils/api.js";

export default function Home() {
  const navigate = useNavigate();
  const [joinId, setJoinId] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    setCreating(true);
    setError("");

    try {
      const room = await createRoom();
      navigate(`/chat/${room.roomId}`, { state: { inviteUrl: room.url } });
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  function handleJoin(event) {
    event.preventDefault();
    const cleanId = joinId.trim();

    if (!cleanId) {
      setError("Room ID required.");
      return;
    }

    navigate(`/chat/${cleanId}`);
  }

  return (
    <main className="app-shell home-shell">
      <section className="home-grid">
        <div className="brand-block">
          <div className="brand-mark">
            <Fingerprint size={34} />
          </div>
          <p className="eyebrow">
            <Terminal size={15} />
            temporary private channel
          </p>
          <h1>GhostChat</h1>
          <p className="lede">Anonymous rooms that vanish when the chat ends.</p>
        </div>

        <div className="action-panel">
          <div className="panel-header">
            <span>Secure Room</span>
            <span className="pulse-label">standby</span>
          </div>

          <button className="primary-action" type="button" onClick={handleCreate} disabled={creating}>
            {creating ? <Loader2 className="spin" size={20} /> : <CirclePlus size={20} />}
            <span>Create Room</span>
          </button>

          <form className="join-form" onSubmit={handleJoin}>
            <label htmlFor="roomId">Room ID</label>
            <div className="join-row">
              <DoorOpen size={19} />
              <input
                id="roomId"
                value={joinId}
                maxLength={24}
                onChange={(event) => setJoinId(event.target.value)}
                placeholder="8sk2jd"
              />
              <button type="submit" aria-label="Join room" title="Join room">
                <ArrowRight size={20} />
              </button>
            </div>
          </form>

          {error ? <p className="error-text">{error}</p> : null}
        </div>
      </section>
    </main>
  );
}
