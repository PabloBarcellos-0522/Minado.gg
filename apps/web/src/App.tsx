import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ThemeProvider } from "./components/ThemeProvider";
import { Styleguide } from "./pages/Styleguide";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { LobbyPage } from "./pages/LobbyPage";
import { CreateRoomPage } from "./pages/CreateRoomPage";
import { RoomPage } from "./pages/RoomPage";
import { MatchPage } from "./pages/MatchPage";
import { ResultPage } from "./pages/ResultPage";
import { RankingPage } from "./pages/RankingPage";
import { ProfilePage } from "./pages/ProfilePage";
import { EditProfilePage } from "./pages/EditProfilePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { useAuthStore } from "./store/authStore";
import { useGameStore } from "./store/gameStore";
import { connectSocket, disconnectSocket } from "./lib/socket";

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
    } else {
      const id = hash.replace("#", "");
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [pathname, hash]);
  return null;
}

function SocketManager() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const initSocketListeners = useGameStore((s) => s.initSocketListeners)

  useEffect(() => {
    if (isAuthenticated) {
      connectSocket()
      const cleanup = initSocketListeners()
      return () => {
        cleanup()
        disconnectSocket()
      }
    }
  }, [isAuthenticated, initSocketListeners])

  return null
}

function App() {
  return (
    <ThemeProvider>
      <SocketManager />
      <div className="min-h-dvh flex flex-col">
        <ScrollToTop />
        <Routes>
          <Route path="/styleguide" element={<Styleguide />} />
          <Route
            path="*"
            element={
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/lobby" element={<LobbyPage />} />
                <Route path="/lobby/criar-sala" element={<CreateRoomPage />} />
                <Route path="/sala/:id" element={<RoomPage />} />
                <Route path="/partida/:id" element={<MatchPage />} />
                <Route path="/partida/:id/resultado" element={<ResultPage />} />
                <Route path="/ranking" element={<RankingPage />} />
                <Route path="/perfil/:username" element={<ProfilePage />} />
                <Route path="/perfil/editar" element={<EditProfilePage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            }
          />
        </Routes>
      </div>
    </ThemeProvider>
  );
}

export default App;
