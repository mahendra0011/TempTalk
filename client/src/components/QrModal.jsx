import { X } from "lucide-react";
import IconButton from "./IconButton.jsx";

export default function QrModal({ qr, onClose }) {
  if (!qr) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="qr-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <span>Invite QR</span>
          <IconButton label="Close QR" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>
        <img src={qr} alt="Room invite QR code" />
      </div>
    </div>
  );
}
