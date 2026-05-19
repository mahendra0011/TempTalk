import { ArrowLeft, LockKeyhole, ShieldCheck, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function Privacy() {
  return (
    <main className="app-shell privacy-shell">
      <section className="privacy-panel">
        <Link className="back-link" to="/">
          <ArrowLeft size={17} />
          <span>Back to TempTalk</span>
        </Link>

        <div className="privacy-hero">
          <span className="privacy-icon">
            <ShieldCheck size={32} />
          </span>
          <p className="eyebrow">privacy policy</p>
          <h1>Private by design</h1>
          <p>
            TempTalk is built for short-lived anonymous rooms. Message text is encrypted in the
            browser, and room data is removed when the chat ends or expires.
          </p>
        </div>

        <div className="privacy-grid">
          <article>
            <LockKeyhole size={22} />
            <h2>End-to-end encrypted text</h2>
            <p>
              New rooms generate a browser-only encryption key. The key is shared in the invite link
              after the <strong>#key</strong> fragment, which is not sent to the API during normal
              HTTP requests. The server stores encrypted message text and cannot read it without that
              key.
            </p>
          </article>

          <article>
            <Trash2 size={22} />
            <h2>Complete server-side deletion</h2>
            <p>
              Pressing End Chat deletes the room, message records, reactions, receipts, and uploaded
              files from TempTalk server storage. Expired rooms and messages are also cleaned up by
              automatic TTL deletion.
            </p>
          </article>

          <article>
            <ShieldCheck size={22} />
            <h2>Important limits</h2>
            <p>
              Browser screenshot blocking is best effort. TempTalk cannot remove content that another
              participant already copied, downloaded, recorded, or saved outside the app. Uploaded
              media files are temporary and deleted with the room, but only message text is encrypted
              end to end in this version.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
