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
import { Link, useNavigate } from "react-router-dom";
import { createRoom } from "../utils/api.js";
import { appendInviteKey, generateRoomKey, parseRoomInvite } from "../utils/e2e.js";

export default function Home() {
  const navigate = useNavigate();
  const [joinId, setJoinId] = useState("");
  const [joinSecret, setJoinSecret] = useState("");
  const [joinKey, setJoinKey] = useState("");
  const [activeAction, setActiveAction] = useState("create-room");
  const [secret, setSecret] = useState("");
  const [maxPeers, setMaxPeers] = useState(8);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const mode = activeAction === "create-group" ? "group" : "private";

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
      const encryptionKey = generateRoomKey();
      const inviteUrl = appendInviteKey(room.url, encryptionKey);

      if (cleanSecret) {
        sessionStorage.setItem(`temptalk:${room.roomId}:secret`, cleanSecret);
      }
      sessionStorage.setItem(`temptalk:${room.roomId}:e2e-key`, encryptionKey);

      navigate(`/chat/${room.roomId}#key=${encodeURIComponent(encryptionKey)}`, {
        state: {
          inviteUrl,
          secret: cleanSecret,
          encryptionKey,
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
    const invite = parseRoomInvite(joinId);
    const cleanId = invite.roomId.trim();
    const savedKey = cleanId ? sessionStorage.getItem(`temptalk:${cleanId}:e2e-key`) || "" : "";
    const encryptionKey = invite.key || joinKey.trim() || savedKey;

    if (!cleanId) {
      setError("Room ID required.");
      return;
    }

    if (joinSecret.trim()) {
      sessionStorage.setItem(`temptalk:${cleanId}:secret`, joinSecret.trim());
    }

    if (encryptionKey) {
      sessionStorage.setItem(`temptalk:${cleanId}:e2e-key`, encryptionKey);
    }

    const chatPath = `/chat/${cleanId}${encryptionKey ? `#key=${encodeURIComponent(encryptionKey)}` : ""}`;

    navigate(chatPath, {
      state: {
        secret: joinSecret.trim(),
        encryptionKey,
        autoEnter: Boolean(encryptionKey)
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

          <div className="option-switch" role="tablist" aria-label="TempTalk actions">
            <button
              className={activeAction === "create-room" ? "active" : ""}
              type="button"
              onClick={() => setActiveAction("create-room")}
            >
              <Fingerprint size={17} />
              <span>Create Room</span>
            </button>
            <button
              className={activeAction === "create-group" ? "active" : ""}
              type="button"
              onClick={() => setActiveAction("create-group")}
            >
              <UsersRound size={17} />
              <span>Create Group</span>
            </button>
            <button
              className={activeAction === "enter-room" ? "active" : ""}
              type="button"
              onClick={() => setActiveAction("enter-room")}
            >
              <DoorOpen size={17} />
              <span>Enter Room</span>
            </button>
          </div>

          {activeAction === "create-room" ? (
            <section className="option-card">
              <div className="join-heading">
                <span>
                  <Fingerprint size={18} />
                  Create Room
                </span>
                <small>Start a one-to-one encrypted private room and share the invite link.</small>
              </div>
              <button className="primary-action" type="button" onClick={handleCreate} disabled={creating}>
                {creating ? <Loader2 className="spin" size={20} /> : <CirclePlus size={20} />}
                <span>Create Room</span>
              </button>
            </section>
          ) : null}

          {activeAction === "create-group" ? (
            <section className="option-card">
              <div className="join-heading">
                <span>
                  <UsersRound size={18} />
                  Create Group
                </span>
                <small>Create a secret encrypted room for multiple members.</small>
              </div>
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
              <button className="primary-action" type="button" onClick={handleCreate} disabled={creating}>
                {creating ? <Loader2 className="spin" size={20} /> : <CirclePlus size={20} />}
                <span>Create Group</span>
              </button>
            </section>
          ) : null}

          {activeAction === "enter-room" ? (
            <form className="join-form option-card join-room-card" onSubmit={handleJoin}>
              <div className="join-heading">
                <span>
                  <DoorOpen size={18} />
                  Enter Room
                </span>
                <small>Paste the full invite link for encrypted access, or enter the room ID and key.</small>
              </div>
              <div className="join-row">
                <DoorOpen size={19} />
                <input
                  id="roomId"
                  aria-label="Room ID"
                  value={joinId}
                  maxLength={180}
                  onChange={(event) => setJoinId(event.target.value)}
                  placeholder="Room ID or invite link"
                />
                <button className="join-submit" type="submit" aria-label="Enter room" title="Enter room">
                  <span>Enter</span>
                  <ArrowRight size={20} />
                </button>
              </div>
              <div className="join-row">
                <LockKeyhole size={19} />
                <input
                  aria-label="Room secret key"
                  value={joinSecret}
                  maxLength={64}
                  onChange={(event) => setJoinSecret(event.target.value)}
                  placeholder="Room secret if required"
                  type="password"
                />
                <span className="join-spacer" />
              </div>
              <div className="join-row">
                <LockKeyhole size={19} />
                <input
                  aria-label="Encryption key"
                  value={joinKey}
                  maxLength={128}
                  onChange={(event) => setJoinKey(event.target.value)}
                  placeholder="Encryption key if link is missing it"
                  type="password"
                />
                <span className="join-spacer" />
              </div>
            </form>
          ) : null}

          <Link className="privacy-link" to="/privacy">
            Privacy Policy
          </Link>

          {error ? <p className="error-text">{error}</p> : null}
        </div>
      </section>
    </main>
  );
}
