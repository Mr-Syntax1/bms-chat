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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center animate-pulse-soft">
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