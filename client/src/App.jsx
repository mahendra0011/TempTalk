import { useEffect } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import Chat from "./pages/Chat.jsx";
import Ended from "./pages/Ended.jsx";
import Home from "./pages/Home.jsx";
import Privacy from "./pages/Privacy.jsx";
import { maybeOpenInstalledAndroidApp, registerNativeDeepLinks } from "./utils/deepLinks.js";

function DeepLinkBridge() {
  const navigate = useNavigate();

  useEffect(() => registerNativeDeepLinks(navigate), [navigate]);

  useEffect(() => {
    maybeOpenInstalledAndroidApp();
  }, []);

  return null;
}

export default function App() {
  return (
    <>
      <DeepLinkBridge />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/chat/:roomId" element={<Chat />} />
        <Route path="/ended" element={<Ended />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
