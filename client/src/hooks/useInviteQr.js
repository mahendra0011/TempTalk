import QRCode from "qrcode";
import { useEffect, useState } from "react";

export function useInviteQr(inviteUrl) {
  const [qr, setQr] = useState("");

  useEffect(() => {
    let active = true;

    if (!inviteUrl) {
      setQr("");
      return undefined;
    }

    QRCode.toDataURL(inviteUrl, {
      margin: 1,
      width: 220,
      color: {
        dark: "#04110b",
        light: "#f8fff9"
      }
    }).then((url) => {
      if (active) {
        setQr(url);
      }
    });

    return () => {
      active = false;
    };
  }, [inviteUrl]);

  return qr;
}
