import {
  Copy,
  DoorOpen,
  Eye,
  EyeOff,
  FileText,
  Image,
  Loader2,
  LockKeyhole,
  LogOut,
  Mic,
  Paperclip,
  QrCode,
  RadioTower,
  Send,
  ShieldAlert,
  Sparkles,
  UserRound,
  Video,
  X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import ChatBubble from "../components/ChatBubble.jsx";
import IconButton from "../components/IconButton.jsx";
import QrModal from "../components/QrModal.jsx";
import StatusRail from "../components/StatusRail.jsx";
import { useInviteQr } from "../hooks/useInviteQr.js";
import { API_URL, socket } from "../socket/socket.js";
import { getRoom } from "../utils/api.js";
import {
  appendInviteKey,
  decryptText,
  deriveRoomKey,
  encryptText,
  inviteKeyFromHash,
  inviteSecretFromHash
} from "../utils/e2e.js";
import { getIdentity } from "../utils/identity.js";
import { buildRoomInviteUrl } from "../utils/inviteLinks.js";

function secretKey(roomId) {
  return `temptalk:${roomId}:secret`;
}

function encryptionStorageKey(roomId) {
  return `temptalk:${roomId}:e2e-key`;
}

function upsertMessage(list, message) {
  if (list.some((existing) => existing.messageId === message.messageId)) {
    return list.map((existing) => (existing.messageId === message.messageId ? message : existing));
  }

  return [...list, message];
}

function replySnapshot(message) {
  return {
    messageId: message.messageId,
    sender: message.sender,
    text: message.deletedAt ? "Message deleted" : message.text || message.attachment?.name || "Attachment"
  };
}

async function decryptMessage(message, key) {
  if (!message) {
    return message;
  }

  const decrypted = {
    ...message,
    text: message.deletedAt ? "" : await decryptText(message.text, key)
  };

  if (message.replyTo?.text) {
    decrypted.replyTo = {
      ...message.replyTo,
      text: await decryptText(message.replyTo.text, key)
    };
  }

  return decrypted;
}

async function decryptMessages(messages, key) {
  return Promise.all((messages || []).map((message) => decryptMessage(message, key)));
}

export default function Chat() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const initialSecret = location.state?.secret || inviteSecretFromHash(location.hash) || sessionStorage.getItem(secretKey(roomId)) || "";
  const initialEncryptionKey =
    location.state?.encryptionKey ||
    inviteKeyFromHash(location.hash) ||
    sessionStorage.getItem(encryptionStorageKey(roomId)) ||
    "";
  const initialIdentity = getIdentity(roomId);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [username, setUsername] = useState("");
  const [aliasInput, setAliasInput] = useState(initialIdentity.username);
  const [users, setUsers] = useState([]);
  const [connected, setConnected] = useState(false);
  const [joining, setJoining] = useState(true);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [typingUser, setTypingUser] = useState("");
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [roomMeta, setRoomMeta] = useState({ mode: "private", maxPeers: 2, requiresSecret: false });
  const [needSecret, setNeedSecret] = useState(false);
  const [secretInput, setSecretInput] = useState(initialSecret);
  const [roomSecret, setRoomSecret] = useState(initialSecret);
  const [roomKey, setRoomKey] = useState(initialEncryptionKey);
  const [joinAttempt, setJoinAttempt] = useState(0);
  const [entered, setEntered] = useState(Boolean(location.state?.autoEnter));
  const [replyTarget, setReplyTarget] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [sendingFile, setSendingFile] = useState(false);
  const [privacyBlurred, setPrivacyBlurred] = useState(false);
  const [privacyNotice, setPrivacyNotice] = useState("");
  const [visibleSecrets, setVisibleSecrets] = useState({ room: false });
  const typingTimerRef = useRef(null);
  const messageEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const inviteUrl = useMemo(() => {
    return appendInviteKey(buildRoomInviteUrl(roomId), roomKey, roomSecret, API_URL);
  }, [roomId, roomKey, roomSecret]);
  const qr = useInviteQr(inviteUrl);
  const ownName = username || aliasInput || initialIdentity.username;
  const maxFileMb = Number(import.meta.env.VITE_MAX_ATTACHMENT_MB || 50);
  const maxFileBytes = maxFileMb * 1024 * 1024;

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

  useEffect(() => {
    function showPrivacyNotice(message) {
      setPrivacyNotice(message);
      window.setTimeout(() => setPrivacyNotice(""), 1800);
    }

    function blockDefault(event) {
      event.preventDefault();
      showPrivacyNotice("Screenshot and copy actions are blocked.");
    }

    function handleKeyDown(event) {
      const key = event.key.toLowerCase();
      const blockedCombo =
        key === "printscreen" ||
        ((event.ctrlKey || event.metaKey) && ["p", "s", "u", "c", "x"].includes(key));

      if (blockedCombo) {
        blockDefault(event);
      }
    }

    function lockView() {
      setPrivacyBlurred(true);
    }

    function unlockView() {
      setPrivacyBlurred(false);
    }

    function handleVisibility() {
      setPrivacyBlurred(document.hidden);
    }

    document.addEventListener("contextmenu", blockDefault);
    document.addEventListener("copy", blockDefault);
    document.addEventListener("cut", blockDefault);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", lockView);
    window.addEventListener("focus", unlockView);

    return () => {
      document.removeEventListener("contextmenu", blockDefault);
      document.removeEventListener("copy", blockDefault);
      document.removeEventListener("cut", blockDefault);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", lockView);
      window.removeEventListener("focus", unlockView);
    };
  }, []);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, typingUser]);

  useEffect(() => {
    let active = true;
    const knownSecret = location.state?.secret || inviteSecretFromHash(location.hash) || sessionStorage.getItem(secretKey(roomId)) || "";
    setRoomSecret(knownSecret);
    setSecretInput(knownSecret);

    async function syncRoomKey() {
      const knownKey =
        location.state?.encryptionKey ||
        inviteKeyFromHash(location.hash) ||
        (await deriveRoomKey(roomId, knownSecret)) ||
        sessionStorage.getItem(encryptionStorageKey(roomId)) ||
        "";

      if (!active) {
        return;
      }

      setRoomKey(knownKey);

      if (knownKey) {
        sessionStorage.setItem(encryptionStorageKey(roomId), knownKey);
      }
    }

    syncRoomKey();

    return () => {
      active = false;
    };
  }, [location.hash, location.state, roomId]);

  useEffect(() => {
    let active = true;
    const identity = getIdentity(roomId);

    async function joinRoom() {
      setJoining(true);
      setError("");

      try {
        const room = await getRoom(roomId);
        if (!active) {
          return;
        }

        setExpiresAt(room.expiresAt);
        setRoomMeta({
          mode: room.mode || "private",
          maxPeers: room.maxPeers || 2,
          requiresSecret: Boolean(room.requiresSecret)
        });

        if (!entered) {
          setNeedSecret(false);
          setJoining(false);
          return;
        }

        if (room.requiresSecret && !roomSecret) {
          setNeedSecret(true);
          setJoining(false);
          return;
        }

        if (!socket.connected) {
          socket.connect();
        }

        socket.emit(
          "join-room",
          { roomId, username: aliasInput.trim() || identity.username, secret: roomSecret },
          async (response) => {
            if (!active) {
              return;
            }

            if (!response?.ok) {
              setError(response?.message || "Room unavailable.");
              setJoining(false);

              if (response?.reason === "secret-required" || response?.reason === "invalid-secret") {
                setNeedSecret(true);
                setEntered(false);

                if (response?.reason === "invalid-secret") {
                  setRoomSecret("");
                  setSecretInput("");
                  setRoomKey(inviteKeyFromHash(location.hash) || "");
                  sessionStorage.removeItem(secretKey(roomId));
                  sessionStorage.removeItem(encryptionStorageKey(roomId));
                }

                return;
              }

              if (response?.reason === "missing-room") {
                navigate("/ended", { replace: true, state: { roomId } });
              }
              return;
            }

            if (roomSecret) {
              sessionStorage.setItem(secretKey(roomId), roomSecret);
            }

            setNeedSecret(false);
            setUsername(response.username);
            setUsers(response.users || []);
            setMessages(await decryptMessages(response.messages || [], roomKey));
            setExpiresAt(response.room?.expiresAt || room.expiresAt);
            setRoomMeta({
              mode: response.room?.mode || room.mode || "private",
              maxPeers: response.room?.maxPeers || room.maxPeers || 2,
              requiresSecret: Boolean(response.room?.requiresSecret || room.requiresSecret)
            });
            setConnected(true);
            setJoining(false);
          }
        );
      } catch (err) {
        if (active) {
          setJoining(false);

          if (err.status === 404) {
            navigate("/ended", { replace: true, state: { roomId } });
            return;
          }

          setError("Backend unavailable. Check the API URL/deployment and try again.");
        }
      }
    }

    async function handleReceive(message) {
      const decrypted = await decryptMessage(message, roomKey);

      if (active) {
        setMessages((current) => upsertMessage(current, decrypted));
      }
    }

    async function handleMessageUpdated(message) {
      const decrypted = await decryptMessage(message, roomKey);

      if (active) {
        setMessages((current) => upsertMessage(current, decrypted));
      }
    }

    async function handleMessagesSeen(payload) {
      const decrypted = await decryptMessages(payload?.messages || [], roomKey);

      if (active) {
        setMessages((current) =>
          decrypted.reduce((next, message) => upsertMessage(next, message), current)
        );
      }
    }

    function handleStatus(status) {
      setUsers(status.users || []);
      setRoomMeta((current) => ({
        ...current,
        maxPeers: status.maxPeers || current.maxPeers,
        mode: status.mode || current.mode
      }));
      setConnected(true);
    }

    function handleTyping(payload) {
      if (!payload?.isTyping) {
        setTypingUser("");
        return;
      }

      setTypingUser(payload.username || "Someone");
      window.clearTimeout(typingTimerRef.current);
      typingTimerRef.current = window.setTimeout(() => setTypingUser(""), 1200);
    }

    function handleEnded() {
      navigate("/ended", { replace: true, state: { roomId } });
    }

    function handleDisconnect() {
      setConnected(false);
    }

    socket.on("receive-message", handleReceive);
    socket.on("message-updated", handleMessageUpdated);
    socket.on("messages-seen", handleMessagesSeen);
    socket.on("room-status", handleStatus);
    socket.on("show-typing", handleTyping);
    socket.on("chat-ended", handleEnded);
    socket.on("room-full", () => setError("Room is already full."));
    socket.on("disconnect", handleDisconnect);

    joinRoom();

    return () => {
      active = false;
      window.clearTimeout(typingTimerRef.current);
      socket.emit("typing", { roomId, isTyping: false });
      socket.off("receive-message", handleReceive);
      socket.off("message-updated", handleMessageUpdated);
      socket.off("messages-seen", handleMessagesSeen);
      socket.off("room-status", handleStatus);
      socket.off("show-typing", handleTyping);
      socket.off("chat-ended", handleEnded);
      socket.off("room-full");
      socket.off("disconnect", handleDisconnect);
    };
  }, [entered, joinAttempt, navigate, roomId, roomKey, roomSecret]);

  useEffect(() => {
    if (!entered || !username || joining || needSecret) {
      return;
    }

    const unseen = messages
      .filter(
        (message) =>
          !message.deletedAt &&
          message.sender !== ownName &&
          !(message.readBy || []).some((receipt) => receipt.username === ownName)
      )
      .map((message) => message.messageId);

    if (unseen.length > 0) {
      socket.emit("message-seen", { roomId, messageIds: unseen });
    }
  }, [entered, joining, messages, needSecret, ownName, roomId, username]);

  function emitTyping(value) {
    setText(value);
    socket.emit("typing", { roomId, isTyping: Boolean(value.trim()) });

    window.clearTimeout(typingTimerRef.current);
    typingTimerRef.current = window.setTimeout(() => {
      socket.emit("typing", { roomId, isTyping: false });
    }, 900);
  }

  async function sendMessage(event) {
    event.preventDefault();
    const clean = text.trim();

    if ((!clean && !selectedFile) || ending || sendingFile) {
      return;
    }

    const activeKey = roomKey || (await deriveRoomKey(roomId, roomSecret));

    if (!activeKey) {
      setError("Secret key missing. Enter the room again.");
      return;
    }

    if (!roomKey) {
      setRoomKey(activeKey);
      sessionStorage.setItem(encryptionStorageKey(roomId), activeKey);
    }

    if (editingMessage) {
      let encryptedText = "";

      try {
        encryptedText = await encryptText(clean, activeKey);
      } catch {
        setError("Could not encrypt message.");
        return;
      }

      socket.emit(
        "edit-message",
        {
          roomId,
          messageId: editingMessage.messageId,
          text: encryptedText
        },
        (response) => {
          if (!response?.ok) {
            setError(response?.message || "Edit failed.");
            return;
          }

          setEditingMessage(null);
          setText("");
        }
      );
      return;
    }

    let encryptedText = "";

    try {
      encryptedText = clean ? await encryptText(clean, activeKey) : "";
    } catch {
      setError("Could not encrypt message.");
      return;
    }

    setSendingFile(Boolean(selectedFile));
    socket.emit("typing", { roomId, isTyping: false });

    Promise.resolve(selectedFile ? selectedFile.arrayBuffer() : null)
      .then((buffer) => {
        socket.emit(
          "send-message",
          {
            roomId,
            text: encryptedText,
            replyToId: replyTarget?.messageId,
            attachment: selectedFile
              ? {
                  name: selectedFile.name,
                  type: selectedFile.type,
                  size: selectedFile.size,
                  data: buffer
                }
              : null
          },
          (response) => {
            setSendingFile(false);

            if (!response?.ok) {
              setError(response?.message || "Message failed.");
              return;
            }

            setText("");
            setSelectedFile(null);
            setReplyTarget(null);

            if (fileInputRef.current) {
              fileInputRef.current.value = "";
            }
          }
        );
      })
      .catch(() => {
        setSendingFile(false);
        setError("Could not read attachment.");
      });
  }

  async function copyInvite() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  function endChat() {
    setEnding(true);
    socket.emit("end-chat", { roomId }, (response) => {
      if (!response?.ok) {
        setEnding(false);
        setError(response?.message || "Could not end chat.");
      }
    });
  }

  async function enterRoom(event) {
    event.preventDefault();
    const cleanAlias = aliasInput.trim();
    const clean = secretInput.trim();

    if (!cleanAlias) {
      setError("Alias required.");
      return;
    }

    if (roomMeta.requiresSecret && !clean) {
      setError("Secret key required.");
      return;
    }

    const cleanKey = (await deriveRoomKey(roomId, clean)) || roomKey;

    sessionStorage.setItem(`temptalk:${roomId}:identity`, JSON.stringify({ username: cleanAlias }));
    if (cleanKey) {
      sessionStorage.setItem(encryptionStorageKey(roomId), cleanKey);
    }

    if (clean) {
      sessionStorage.setItem(secretKey(roomId), clean);
    }

    setError("");
    setAliasInput(cleanAlias);
    setRoomSecret(clean);
    setRoomKey(cleanKey);
    setEntered(true);
    setNeedSecret(false);
    setJoinAttempt((current) => current + 1);
  }

  function startReply(message) {
    setEditingMessage(null);
    setReplyTarget(replySnapshot(message));
  }

  function startEdit(message) {
    if (message.deletedAt) {
      return;
    }

    setReplyTarget(null);
    setSelectedFile(null);
    setEditingMessage(message);
    setText(message.text);
  }

  function deleteSingleMessage(message) {
    if (!window.confirm("Delete this message?")) {
      return;
    }

    socket.emit("delete-message", { roomId, messageId: message.messageId }, (response) => {
      if (!response?.ok) {
        setError(response?.message || "Delete failed.");
      }
    });
  }

  function reactToSingleMessage(message, emoji) {
    socket.emit("react-message", { roomId, messageId: message.messageId, emoji }, (response) => {
      if (!response?.ok) {
        setError(response?.message || "Reaction failed.");
      }
    });
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowed =
      file.type.startsWith("image/") ||
      file.type.startsWith("video/") ||
      file.type.startsWith("audio/") ||
      file.type === "application/pdf";

    if (!allowed) {
      setError("Only photo, video, audio, and PDF files are allowed.");
      event.target.value = "";
      return;
    }

    if (file.size > maxFileBytes) {
      setError(`File must be ${maxFileMb}MB or smaller.`);
      event.target.value = "";
      return;
    }

    setEditingMessage(null);
    setSelectedFile(file);
  }

  function fileIcon(file) {
    if (file?.type.startsWith("image/")) {
      return <Image size={17} />;
    }

    if (file?.type.startsWith("video/")) {
      return <Video size={17} />;
    }

    if (file?.type.startsWith("audio/")) {
      return <Mic size={17} />;
    }

    return <FileText size={17} />;
  }

  function getReadStatus(message) {
    const seenCount = (message.readBy || []).filter((receipt) => receipt.username !== ownName).length;

    if (seenCount === 0) {
      return "Sent";
    }

    return seenCount === 1 ? "Seen" : `Seen by ${seenCount}`;
  }

  const composerContext = editingMessage || replyTarget;
  const showEntryGate = !entered || needSecret;
  const showSecretInput = !roomSecret && (roomMeta.requiresSecret || joining || needSecret);

  return (
    <main className="app-shell chat-shell">
      <section className="chat-frame">
        <header className="chat-topbar">
          <div className="room-title">
            <span className="room-icon">
              <RadioTower size={22} />
            </span>
            <div>
              <p>{roomMeta.mode === "group" ? "Group Room" : "Room"}</p>
              <h1>{roomId}</h1>
            </div>
          </div>

          <StatusRail
            onlineCount={users.length}
            expiresAt={expiresAt}
            connected={connected}
            maxPeers={roomMeta.maxPeers}
            mode={roomMeta.mode}
            encrypted={Boolean(roomKey)}
          />

          <div className="top-actions">
            <IconButton label={copied ? "Copied" : "Copy invite"} onClick={copyInvite}>
              <Copy size={18} />
            </IconButton>
            <IconButton label="Show QR" onClick={() => setShowQr(true)}>
              <QrCode size={18} />
            </IconButton>
            <button className="danger-action" type="button" onClick={endChat} disabled={!entered || ending || joining || needSecret}>
              {ending ? <Loader2 className="spin" size={18} /> : <LogOut size={18} />}
              <span>End Chat</span>
            </button>
          </div>
        </header>

        <div className="chat-body">
          <aside className="side-panel">
            <div className="identity-card">
              <span>
                <Sparkles size={17} />
                Alias
              </span>
              <strong>{ownName}</strong>
            </div>
            {roomMeta.requiresSecret ? (
              <div className="identity-card secret-card">
                <span>
                  <LockKeyhole size={17} />
                  Secret Gate
                </span>
                <strong>Key protected</strong>
              </div>
            ) : null}
            <div className="peer-list">
              {users.map((user) => (
                <div className="peer-row" key={user.id}>
                  <span />
                  <p>{user.username}</p>
                </div>
              ))}
            </div>
          </aside>

          <section className={`message-panel ${privacyBlurred ? "message-panel-protected" : ""}`}>
            {showEntryGate ? (
              <form className="center-state entry-gate" onSubmit={enterRoom}>
                <div className="entry-icon">
                  <DoorOpen size={30} />
                </div>
                <span className="entry-kicker">{roomMeta.mode === "group" ? "Secret group invite" : "Private invite"}</span>
                <h2>Enter Room</h2>
                <p>{showSecretInput ? "Choose your anonymous name and enter the room secret key." : "Enter your anonymous name to join this invite."}</p>
                <div className="entry-room-id">
                  <span>Room ID</span>
                  <strong>{roomId}</strong>
                </div>
                <label>
                  <UserRound size={17} />
                  <input
                    value={aliasInput}
                    maxLength={24}
                    onChange={(event) => setAliasInput(event.target.value)}
                    placeholder="Anonymous alias"
                  />
                </label>
                {showSecretInput ? (
                  <label className="secret-label">
                    <LockKeyhole size={17} />
                    <input
                      value={secretInput}
                      maxLength={64}
                      onChange={(event) => setSecretInput(event.target.value)}
                      placeholder="Room secret key"
                      type={visibleSecrets.room ? "text" : "password"}
                    />
                    {secretToggle("room", "room secret key")}
                  </label>
                ) : null}
                <button type="submit">
                  <DoorOpen size={18} />
                  <span>Enter Room</span>
                </button>
              </form>
            ) : joining ? (
              <div className="center-state">
                <Loader2 className="spin" size={28} />
                <p>Opening channel</p>
              </div>
            ) : messages.length ? (
              <div className="message-list">
                {messages.map((message) => (
                  <ChatBubble
                    key={message.messageId}
                    message={message}
                    own={message.sender === ownName}
                    onDelete={deleteSingleMessage}
                    onEdit={startEdit}
                    onReact={reactToSingleMessage}
                    onReply={startReply}
                    readStatus={message.sender === ownName ? getReadStatus(message) : ""}
                  />
                ))}
                {typingUser ? <div className="typing-line">{typingUser} is typing...</div> : null}
                <div ref={messageEndRef} />
              </div>
            ) : (
              <div className="center-state">
                <ShieldAlert size={32} />
                <p>Channel ready</p>
              </div>
            )}
          </section>
        </div>

        <form className="composer" onSubmit={sendMessage}>
          {composerContext ? (
            <div className="composer-context">
              <div>
                <strong>{editingMessage ? "Editing message" : `Replying to ${replyTarget.sender}`}</strong>
                <span>{editingMessage ? editingMessage.text : replyTarget.text}</span>
              </div>
              <button
                type="button"
                aria-label="Cancel context"
                title="Cancel"
                onClick={() => {
                  setEditingMessage(null);
                  setReplyTarget(null);
                  setText("");
                }}
              >
                <X size={16} />
              </button>
            </div>
          ) : null}
          {selectedFile ? (
            <div className="file-chip">
              <span>
                {fileIcon(selectedFile)}
                <strong>{selectedFile.name}</strong>
              </span>
              <button
                type="button"
                aria-label="Remove attachment"
                title="Remove attachment"
                onClick={() => {
                  setSelectedFile(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
              >
                <X size={16} />
              </button>
            </div>
          ) : null}
          <div className="composer-row">
            <input
              ref={fileInputRef}
              className="file-input"
              type="file"
              accept="image/*,video/*,audio/*,application/pdf"
              onChange={handleFileChange}
            />
            <button
              className="attach-button"
              type="button"
              aria-label="Attach media"
              title="Attach media"
              onClick={() => fileInputRef.current?.click()}
              disabled={showEntryGate || joining || ending || editingMessage}
            >
              <Paperclip size={19} />
            </button>
            <input
              value={text}
              maxLength={1000}
              onChange={(event) => emitTyping(event.target.value)}
              placeholder={editingMessage ? "Edit your message" : "Type a private message"}
              disabled={showEntryGate || joining || ending || sendingFile}
            />
            <button
              type="submit"
              disabled={showEntryGate || (!text.trim() && !selectedFile) || joining || ending || sendingFile}
              aria-label="Send message"
            >
              {sendingFile ? <Loader2 className="spin" size={19} /> : <Send size={19} />}
            </button>
          </div>
        </form>

        {error ? <p className="toast-error">{error}</p> : null}
        {privacyNotice ? <p className="toast-error privacy-toast">{privacyNotice}</p> : null}
        {privacyBlurred ? <div className="privacy-overlay">Protected view</div> : null}
      </section>

      {showQr ? <QrModal qr={qr} onClose={() => setShowQr(false)} /> : null}
    </main>
  );
}
