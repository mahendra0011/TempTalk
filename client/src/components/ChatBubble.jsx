export default function ChatBubble({ message, own }) {
  const time = message.createdAt
    ? new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date(message.createdAt))
    : "";

  return (
    <div className={`message-row ${own ? "message-row-own" : ""}`}>
      <div className={`message-bubble ${own ? "message-bubble-own" : ""}`}>
        <div className="message-meta">
          <span>{own ? "You" : message.sender}</span>
          <span>{time}</span>
        </div>
        <p>{message.text}</p>
      </div>
    </div>
  );
}
