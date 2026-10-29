import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { setSocketToken } from './socket';
import Login from './components/Login';
import Register from './components/Register';
import Chat from './components/Chat';
import { useChat } from './hooks/useChat';

function App() {
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const chat = useChat();

  // بررسی احراز هویت هنگام بارگذاری صفحه
  useEffect(() => {
    fetch('/auth/me', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setAuthUser(data.user);
          if (data.token) setSocketToken(data.token);
        }
        setAuthLoading(false);
      })
      .catch(() => setAuthLoading(false));
  }, []);

  const handleAuth = (userData, token) => {
    setAuthUser(userData);
    if (token) setSocketToken(token);
  };

  const handleLogout = async () => {
    await fetch('/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    setAuthUser(null);
    chat.logout();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-aurora text-white relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-gradient-to-br from-primary-500/20 to-accent-500/20 blur-3xl animate-blob" />
          <div className="absolute bottom-1/4 right-1/4 w-60 h-60 rounded-full bg-gradient-to-br from-cyan-500/15 to-primary-500/15 blur-3xl animate-blob animation-delay-2000" />
        </div>
        <div className="flex flex-col items-center gap-4 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center animate-pulse-soft shadow-glow-primary">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-surface-400">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            authUser ? <Navigate to="/chat" replace /> : <Login onAuth={handleAuth} />
          }
        />
        <Route
          path="/register"
          element={
            authUser ? <Navigate to="/chat" replace /> : <Register onAuth={handleAuth} />
          }
        />
        <Route
          path="/chat"
          element={
            authUser ? (
              <Chat chat={chat} user={authUser} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/"
          element={<Navigate to={authUser ? '/chat' : '/login'} replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;