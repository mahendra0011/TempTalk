import { Loader2, RotateCw, ServerCog } from "lucide-react";
import { useState } from "react";
import { API_URL, configureApiUrl } from "../socket/socket.js";

function normalizeApiUrl(value) {
  try {
    const url = new URL(String(value || "").trim());

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return "";
    }

    return url.origin;
  } catch {
    return "";
  }
}

export default function ApiUrlForm({ onSaved, label = "Save API URL" }) {
  const [value, setValue] = useState(API_URL);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    const nextUrl = normalizeApiUrl(value);

    if (!nextUrl) {
      setStatus("Enter a valid backend URL.");
      return;
    }

    setChecking(true);
    setStatus("");

    try {
      const response = await fetch(`${nextUrl}/api/health`, { cache: "no-store" });

      if (!response.ok) {
        setStatus(`Backend responded with ${response.status}. Check Render deploy/rootDir.`);
        return;
      }

      configureApiUrl(nextUrl);
      setValue(nextUrl);
      setStatus("Backend connected. Retrying now.");
      onSaved?.(nextUrl);
    } catch {
      setStatus("Could not reach this backend URL.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <form className="api-url-card" onSubmit={handleSubmit}>
      <div className="api-url-heading">
        <span>
          <ServerCog size={17} />
          API Deployment
        </span>
        <small>Current: {API_URL}</small>
      </div>
      <label className="api-url-input">
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="https://your-api.onrender.com"
          type="url"
        />
      </label>
      <button className="secondary-action" type="submit" disabled={checking}>
        {checking ? <Loader2 className="spin" size={17} /> : <RotateCw size={17} />}
        <span>{label}</span>
      </button>
      {status ? <p className="api-url-status">{status}</p> : null}
    </form>
  );
}
