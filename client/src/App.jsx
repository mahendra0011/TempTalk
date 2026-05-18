import { Navigate, Route, Routes } from "react-router-dom";
import Chat from "./pages/Chat.jsx";
import Ended from "./pages/Ended.jsx";
import Home from "./pages/Home.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/chat/:roomId" element={<Chat />} />
      <Route path="/ended" element={<Ended />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
