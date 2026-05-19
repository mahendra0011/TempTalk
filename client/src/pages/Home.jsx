import {
  ArrowRight,
  CirclePlus,
  Download,
  DoorOpen,
  Eye,
  EyeOff,
  Fingerprint,
  Loader2,
  LockKeyhole,
  Sparkles,
  Terminal,
  UsersRound
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ApiUrlForm from "../components/ApiUrlForm.jsx";
import { API_URL, configureApiUrl } from "../socket/socket.js";
import { createRoom } from "../utils/api.js";
import { appendInviteKey, deriveRoomKey, parseRoomInvite } from "../utils/e2e.js";
import { buildRoomInviteUrl } from "../utils/inviteLinks.js";

const ROOM_ID_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";
const SECRET_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const APK_URL =
  import.meta.env.VITE_APK_URL || "https://github.com/mahendra0011/TempTalk/releases/download/apk-latest/TempTalk.apk";

function randomString(chars, length) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => chars[byte % chars.length]).join("");
}

function randomRoomId(prefix) {
  return `${prefix}-${randomString(ROOM_ID_CHARS, 6)}`;
}

function randomSecret() {
  return `${randomString(SECRET_CHARS, 4)}-${randomString(SECRET_CHARS, 4)}-${randomString(SECRET_CHARS, 4)}`;
}

export default function Home() {
  const navigate = useNavigate();
  const [joinId, setJoinId] = useState("");
  const [joinSecret, setJoinSecret] = useState("");
  const [activeAction, setActiveAction] = useState("create-room");
  const [roomId, setRoomId] = useState("");
  const [roomSecret, setRoomSecret] = useState("");
  const [groupRoomId, setGroupRoomId] = useState("");
  const [groupSecret, setGroupSecret] = useState("");
  const [maxPeers, setMaxPeers] = useState(8);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [apkStatus, setApkStatus] = useState("");
  const [visibleSecrets, setVisibleSecrets] = useState({
    room: false,
    group: false,
    joinSecret: false
  });
  const mode = activeAction === "create-group" ? "group" : "private";

  function toggleSecretVisibility(key) {
    setVisibleSecrets((current) => ({
      ...current,
      [key]: !current[key]
    }));
  }

  function secretToggle(key, label) {
    const visible = visibleSecrets[key];

    return (
      <button
        className="secret-toggle"
        type="button"
        aria-label={visible ? `Hide ${label}` : `Show ${label}`}
        title={visible ? `Hide ${label}` : `Show ${label}`}
        onClick={() => toggleSecretVisibility(key)}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    );
  }

  function generateCredentials(kind) {
    if (kind === "group") {
      setGroupRoomId(randomRoomId("group"));
      setGroupSecret(randomSecret());
      setActiveAction("create-group");
    } else {
      setRoomId(randomRoomId("room"));
      setRoomSecret(randomSecret());
      setActiveAction("create-room");
    }

    setError("");
  }

  async function handleCreate() {
    const cleanRoomId = (mode === "group" ? groupRoomId : roomId).trim();
    const cleanSecret = (mode === "group" ? groupSecret : roomSecret).trim();

    if (!cleanRoomId) {
      setError("Room ID required.");
      return;
    }

    if (!cleanSecret) {
      setError("Secret key required.");
      return;
    }

    setCreating(true);
    setError("");

    try {
      const room = await createRoom({
        roomId: cleanRoomId,
        mode,
        secret: cleanSecret,
        maxPeers
      });
      const encryptionKey = await deriveRoomKey(room.roomId, cleanSecret);
      const inviteUrl = appendInviteKey(buildRoomInviteUrl(room.roomId), encryptionKey, cleanSecret, API_URL);
      const inviteTarget = new URL(inviteUrl, window.location.origin);

      if (cleanSecret) {
        sessionStorage.setItem(`temptalk:${room.roomId}:secret`, cleanSecret);
      }
      sessionStorage.setItem(`temptalk:${room.roomId}:e2e-key`, encryptionKey);

      navigate(`${inviteTarget.pathname}${inviteTarget.hash}`, {
        state: {
          inviteUrl,
          secret: cleanSecret,
          encryptionKey,
          autoEnter: true
        }
      });
    } catch (err) {
      const failedApi = err.status || /failed to fetch|request failed/i.test(err.message || "");
      setError(failedApi ? `Backend unavailable at ${API_URL}. Set the correct Render API URL below and try again.` : err.message);
    } finally {
      setCreating(false);
    }
  }

  function handleApkDownload() {
    setApkStatus("APK download started.");
  }

  async function handleJoin(event) {
    event.preventDefault();
    const invite = parseRoomInvite(joinId);
    const cleanId = invite.roomId.trim();
    const savedKey = cleanId ? sessionStorage.getItem(`temptalk:${cleanId}:e2e-key`) || "" : "";
    const cleanSecret = (invite.secret || joinSecret).trim();

    if (!cleanId) {
      setError("Room ID required.");
      return;
    }

    if (!cleanSecret) {
      setError("Secret key required.");
      return;
    }

    const encryptionKey = invite.key || (await deriveRoomKey(cleanId, cleanSecret)) || savedKey;
    configureApiUrl(invite.apiUrl);

    sessionStorage.setItem(`temptalk:${cleanId}:secret`, cleanSecret);

    if (encryptionKey) {
      sessionStorage.setItem(`temptalk:${cleanId}:e2e-key`, encryptionKey);
    }

    const hasInviteAccess = Boolean(invite.key || invite.secret);
    const invitePath = hasInviteAccess ? appendInviteKey(buildRoomInviteUrl(cleanId), encryptionKey, cleanSecret, invite.apiUrl || API_URL) : "";
    const inviteTarget = hasInviteAccess ? new URL(invitePath) : null;
    const chatPath = `/chat/${cleanId}${inviteTarget?.hash || ""}`;

    navigate(chatPath, {
      state: {
        secret: cleanSecret,
        encryptionKey,
        autoEnter: !hasInviteAccess
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

          <div className="app-download-row">
            <a
              className="secondary-action apk-download"
              href={APK_URL}
              download="TempTalk.apk"
              target="_blank"
              rel="noreferrer"
              onClick={handleApkDownload}
            >
              <Download size={17} />
              <span>Download APK</span>
            </a>
            <small>Android app file</small>
          </div>

          <ApiUrlForm onSaved={() => setError("")} />

          {activeAction === "create-room" ? (
            <section className="option-card">
              <div className="join-heading">
                <span>
                  <Fingerprint size={18} />
                  Create Room
                </span>
                <small>Set a room ID and secret key, then share the encrypted invite link.</small>
              </div>
              <div className="generator-row">
                <button className="secondary-action" type="button" onClick={() => generateCredentials("room")}>
                  <Sparkles size={17} />
                  <span>Generate</span>
                </button>
                <small>Random Room ID + Secret Key</small>
              </div>
              <div className="secret-stack">
                <div className="join-row">
                  <DoorOpen size={19} />
                  <input
                    aria-label="Create room ID"
                    value={roomId}
                    maxLength={24}
                    onChange={(event) => setRoomId(event.target.value)}
                    placeholder="Room ID e.g. night-42"
                  />
                </div>
                <div className="join-row">
                  <LockKeyhole size={19} />
                  <input
                    aria-label="Create room secret key"
                    value={roomSecret}
                    maxLength={64}
                    onChange={(event) => setRoomSecret(event.target.value)}
                    placeholder="Secret key"
                    type={visibleSecrets.room ? "text" : "password"}
                  />
                  {secretToggle("room", "room secret key")}
                </div>
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
                <small>Set a group room ID and secret key for multiple members.</small>
              </div>
              <div className="generator-row">
                <button className="secondary-action" type="button" onClick={() => generateCredentials("group")}>
                  <Sparkles size={17} />
                  <span>Generate</span>
                </button>
                <small>Random Group ID + Secret Key</small>
              </div>
              <div className="secret-stack">
                <div className="join-row">
                  <DoorOpen size={19} />
                  <input
                    aria-label="Create group room ID"
                    value={groupRoomId}
                    maxLength={24}
                    onChange={(event) => setGroupRoomId(event.target.value)}
                    placeholder="Group room ID e.g. squad-7"
                  />
                </div>
                <div className="join-row">
                  <LockKeyhole size={19} />
                  <input
                    aria-label="Create group secret key"
                    value={groupSecret}
                    maxLength={64}
                    onChange={(event) => setGroupSecret(event.target.value)}
                    placeholder="Secret key"
                    type={visibleSecrets.group ? "text" : "password"}
                  />
                  {secretToggle("group", "group secret key")}
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
                <small>Paste an invite link, or enter the room ID and secret key.</small>
              </div>
              <div className="join-row">
                <DoorOpen size={19} />
                <input
                  id="roomId"
                  aria-label="Room ID"
                  value={joinId}
                  maxLength={180}
                  onChange={(event) => setJoinId(event.target.value)}
                  placeholder="Room ID"
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
                  placeholder="Secret key"
                  type={visibleSecrets.joinSecret ? "text" : "password"}
                />
                {secretToggle("joinSecret", "room secret key")}
              </div>
            </form>
          ) : null}

          <Link className="privacy-link" to="/privacy">
            Privacy Policy
          </Link>

          {apkStatus ? <p className="status-text">{apkStatus}</p> : null}
          {error ? <p className="error-text">{error}</p> : null}
        </div>
      </section>
    </main>
  );
}
