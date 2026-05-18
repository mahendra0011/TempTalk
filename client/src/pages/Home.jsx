import {
  ArrowRight,
  CirclePlus,
  DoorOpen,
  Fingerprint,
  Loader2,
  LockKeyhole,
  Terminal,
  UsersRound
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createRoom } from "../utils/api.js";

export default function Home() {
  const navigate = useNavigate();
  const [joinId, setJoinId] = useState("");
  const [joinSecret, setJoinSecret] = useState("");
  const [mode, setMode] = useState("private");
  const [secret, setSecret] = useState("");
  const [maxPeers, setMaxPeers] = useState(8);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    const cleanSecret = secret.trim();

    if (mode === "group" && !cleanSecret) {
      setError("Group secret key required.");
      return;
    }

    setCreating(true);
    setError("");

    try {
      const room = await createRoom({
        mode,
        secret: cleanSecret,
        maxPeers
      });

      if (cleanSecret) {
        sessionStorage.setItem(`temptalk:${room.roomId}:secret`, cleanSecret);
      }

      navigate(`/chat/${room.roomId}`, {
        state: {
          inviteUrl: room.url,
          secret: cleanSecret,
          autoEnter: true
        }
      });
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

    if (joinSecret.trim()) {
      sessionStorage.setItem(`temptalk:${cleanId}:secret`, joinSecret.trim());
    }

    navigate(`/chat/${cleanId}`, {
      state: {
        secret: joinSecret.trim(),
        autoEnter: true
      }
    });
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
          <h1>TempTalk</h1>
          <p className="lede">Anonymous rooms that vanish when the chat ends.</p>
        </div>

        <div className="action-panel">
          <div className="panel-header">
            <span>Secure Room</span>
            <span className="pulse-label">standby</span>
          </div>

          <div className="mode-switch" role="group" aria-label="Room type">
            <button
              className={mode === "private" ? "active" : ""}
              type="button"
              onClick={() => setMode("private")}
            >
              <Fingerprint size={17} />
              <span>Private</span>
            </button>
            <button
              className={mode === "group" ? "active" : ""}
              type="button"
              onClick={() => setMode("group")}
            >
              <UsersRound size={17} />
              <span>Group</span>
            </button>
          </div>

          {mode === "group" ? (
            <div className="secret-stack">
              <div className="join-row">
                <LockKeyhole size={19} />
                <input
                  value={secret}
                  maxLength={64}
                  onChange={(event) => setSecret(event.target.value)}
                  placeholder="Group secret key"
                  type="password"
                />
              </div>
              <label className="range-row">
                <span>Members</span>
                <input
                  min="3"
                  max="25"
                  value={maxPeers}
                  onChange={(event) => setMaxPeers(Number(event.target.value))}
                  type="range"
                />
                <strong>{maxPeers}</strong>
              </label>
            </div>
          ) : null}

          <button className="primary-action" type="button" onClick={handleCreate} disabled={creating}>
            {creating ? <Loader2 className="spin" size={20} /> : <CirclePlus size={20} />}
            <span>{mode === "group" ? "Create Secret Group" : "Create Room"}</span>
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
            <div className="join-row">
              <LockKeyhole size={19} />
              <input
                value={joinSecret}
                maxLength={64}
                onChange={(event) => setJoinSecret(event.target.value)}
                placeholder="Secret key if required"
                type="password"
              />
              <span className="join-spacer" />
            </div>
          </form>

          {error ? <p className="error-text">{error}</p> : null}
        </div>
      </section>
    </main>
  );
}
