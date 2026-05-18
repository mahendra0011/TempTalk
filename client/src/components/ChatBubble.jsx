import { CheckCheck, Download, FileText, Music, Pencil, Reply, Trash2, Video } from "lucide-react";
import { API_URL } from "../socket/socket.js";

const reactionChoices = ["\u{1F44D}", "\u{2764}\u{FE0F}", "\u{1F525}", "\u{1F602}", "\u{1F440}"];

function formatSize(size = 0) {
  if (size < 1024 * 1024) {
    return `${Math.max(Math.round(size / 1024), 1)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function mediaUrl(attachment) {
  if (!attachment?.url) {
    return "";
  }

  if (attachment.url.startsWith("http")) {
    return attachment.url;
  }

  return `${API_URL}${attachment.url}`;
}

function AttachmentPreview({ attachment }) {
  if (!attachment) {
    return null;
  }

  const url = mediaUrl(attachment);

  if (attachment.kind === "image") {
    return (
      <a className="attachment-preview image-attachment" href={url} target="_blank" rel="noreferrer">
        <img src={url} alt={attachment.name} draggable="false" />
      </a>
    );
  }

  if (attachment.kind === "video") {
    return (
      <div className="attachment-preview">
        <div className="attachment-head">
          <Video size={16} />
          <span>{attachment.name}</span>
        </div>
        <video src={url} controls controlsList="nodownload noplaybackrate" disablePictureInPicture />
      </div>
    );
  }

  if (attachment.kind === "audio") {
    return (
      <div className="attachment-preview">
        <div className="attachment-head">
          <Music size={16} />
          <span>{attachment.name}</span>
        </div>
        <audio src={url} controls controlsList="nodownload noplaybackrate" />
      </div>
    );
  }

  return (
    <a className="attachment-preview file-attachment" href={url} target="_blank" rel="noreferrer">
      <FileText size={22} />
      <span>
        <strong>{attachment.name}</strong>
        <small>{formatSize(attachment.size)}</small>
      </span>
      <Download size={17} />
    </a>
  );
}

export default function ChatBubble({
  message,
  own,
  onDelete,
  onEdit,
  onReact,
  onReply,
  readStatus
}) {
  const time = message.createdAt
    ? new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date(message.createdAt))
    : "";
  const deleted = Boolean(message.deletedAt);

  return (
    <div className={`message-row ${own ? "message-row-own" : ""}`}>
      <div className={`message-bubble ${own ? "message-bubble-own" : ""} ${deleted ? "message-deleted" : ""}`}>
        <div className="message-meta">
          <span>{own ? "You" : message.sender}</span>
          <span>{message.editedAt && !deleted ? "edited " : ""}{time}</span>
        </div>

        {message.replyTo ? (
          <button className="reply-preview" type="button" onClick={() => onReply(message.replyTo)}>
            <strong>{message.replyTo.sender}</strong>
            <span>{message.replyTo.text || "Message deleted"}</span>
          </button>
        ) : null}

        <AttachmentPreview attachment={deleted ? null : message.attachment} />

        {deleted || message.text ? (
          <p className="message-text">{deleted ? "Message deleted" : message.text}</p>
        ) : null}

        {!deleted ? (
          <div className="message-tools" aria-label="Message actions">
            <button type="button" aria-label="Reply" title="Reply" onClick={() => onReply(message)}>
              <Reply size={14} />
            </button>
            {own ? (
              <>
                <button type="button" aria-label="Edit" title="Edit" onClick={() => onEdit(message)}>
                  <Pencil size={14} />
                </button>
                <button type="button" aria-label="Delete" title="Delete" onClick={() => onDelete(message)}>
                  <Trash2 size={14} />
                </button>
              </>
            ) : null}
          </div>
        ) : null}

        {!deleted ? (
          <div className="reaction-strip" aria-label="Reactions">
            {reactionChoices.map((emoji) => {
              const reaction = message.reactions?.find((item) => item.emoji === emoji);
              const count = reaction?.users?.length || 0;

              return (
                <button
                  className={count ? "has-reaction" : ""}
                  key={emoji}
                  type="button"
                  aria-label={`React ${emoji}`}
                  title={`React ${emoji}`}
                  onClick={() => onReact(message, emoji)}
                >
                  <span>{emoji}</span>
                  {count ? <strong>{count}</strong> : null}
                </button>
              );
            })}
          </div>
        ) : null}

        {own && readStatus ? (
          <div className="read-status">
            <CheckCheck size={13} />
            <span>{readStatus}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
