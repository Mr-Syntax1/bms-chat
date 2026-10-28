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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
        در حال بارگذاری...
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