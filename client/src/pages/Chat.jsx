import {
  Copy,
  Loader2,
  LogOut,
  QrCode,
  RadioTower,
  Send,
  ShieldAlert,
  Sparkles
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import ChatBubble from "../components/ChatBubble.jsx";
import IconButton from "../components/IconButton.jsx";
import QrModal from "../components/QrModal.jsx";
import StatusRail from "../components/StatusRail.jsx";
import { useInviteQr } from "../hooks/useInviteQr.js";
import { socket } from "../socket/socket.js";
import { getRoom } from "../utils/api.js";
import { getIdentity } from "../utils/identity.js";

export default function Chat() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [username, setUsername] = useState("");
  const [users, setUsers] = useState([]);
  const [connected, setConnected] = useState(false);
  const [joining, setJoining] = useState(true);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [typingUser, setTypingUser] = useState("");
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const typingTimerRef = useRef(null);
  const messageEndRef = useRef(null);

  const inviteUrl = useMemo(() => {
    if (location.state?.inviteUrl) {
      return location.state.inviteUrl;
    }

    return `${window.location.origin}/chat/${roomId}`;
  }, [location.state, roomId]);
  const qr = useInviteQr(inviteUrl);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, typingUser]);

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

        if (!socket.connected) {
          socket.connect();
        }

        socket.emit("join-room", { roomId, username: identity.username }, (response) => {
          if (!active) {
            return;
          }

          if (!response?.ok) {
            setError(response?.message || "Room unavailable.");
            setJoining(false);

            if (response?.reason === "missing-room") {
              navigate("/ended", { replace: true, state: { roomId } });
            }
            return;
          }

          setUsername(response.username);
          setUsers(response.users || []);
          setMessages(response.messages || []);
          setExpiresAt(response.room?.expiresAt || room.expiresAt);
          setConnected(true);
          setJoining(false);
        });
      } catch (err) {
        if (active) {
          navigate("/ended", { replace: true, state: { roomId } });
        }
      }
    }

    function handleReceive(message) {
      setMessages((current) => {
        if (current.some((existing) => existing.messageId === message.messageId)) {
          return current;
        }

        return [...current, message];
      });
    }

    function handleStatus(status) {
      setUsers(status.users || []);
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
      socket.off("room-status", handleStatus);
      socket.off("show-typing", handleTyping);
      socket.off("chat-ended", handleEnded);
      socket.off("room-full");
      socket.off("disconnect", handleDisconnect);
    };
  }, [navigate, roomId]);

  function emitTyping(value) {
    setText(value);
    socket.emit("typing", { roomId, isTyping: Boolean(value.trim()) });

    window.clearTimeout(typingTimerRef.current);
    typingTimerRef.current = window.setTimeout(() => {
      socket.emit("typing", { roomId, isTyping: false });
    }, 900);
  }

  function sendMessage(event) {
    event.preventDefault();
    const clean = text.trim();

    if (!clean || ending) {
      return;
    }

    setText("");
    socket.emit("typing", { roomId, isTyping: false });
    socket.emit("send-message", { roomId, text: clean }, (response) => {
      if (!response?.ok) {
        setError(response?.message || "Message failed.");
      }
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

  const ownName = username || getIdentity(roomId).username;

  return (
    <main className="app-shell chat-shell">
      <section className="chat-frame">
        <header className="chat-topbar">
          <div className="room-title">
            <span className="room-icon">
              <RadioTower size={22} />
            </span>
            <div>
              <p>Room</p>
              <h1>{roomId}</h1>
            </div>
          </div>

          <StatusRail onlineCount={users.length} expiresAt={expiresAt} connected={connected} />

          <div className="top-actions">
            <IconButton label={copied ? "Copied" : "Copy invite"} onClick={copyInvite}>
              <Copy size={18} />
            </IconButton>
            <IconButton label="Show QR" onClick={() => setShowQr(true)}>
              <QrCode size={18} />
            </IconButton>
            <button className="danger-action" type="button" onClick={endChat} disabled={ending || joining}>
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
            <div className="peer-list">
              {users.map((user) => (
                <div className="peer-row" key={user.id}>
                  <span />
                  <p>{user.username}</p>
                </div>
              ))}
            </div>
          </aside>

          <section className="message-panel">
            {joining ? (
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
          <input
            value={text}
            maxLength={1000}
            onChange={(event) => emitTyping(event.target.value)}
            placeholder="Type a private message"
            disabled={joining || ending}
          />
          <button type="submit" disabled={!text.trim() || joining || ending} aria-label="Send message">
            <Send size={19} />
          </button>
        </form>

        {error ? <p className="toast-error">{error}</p> : null}
      </section>

      {showQr ? <QrModal qr={qr} onClose={() => setShowQr(false)} /> : null}
    </main>
  );
}
