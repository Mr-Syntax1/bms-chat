import { setAblyAuthToken } from './lib/ably';
import { setApiToken } from './hooks/useChat';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import Chat from './components/Chat';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import { useChat } from './hooks/useChat';
import ToastProvider from './providers/ToastProvider';
import HalloweenBackground from './components/HalloweenBackground';
import LoadingSpinner from './components/LoadingSpinner';
import { loadUiPrefs, applyUiPrefs, subscribeUiPrefs } from './lib/uiPrefs';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function App() {
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const chat = useChat();
  const [uiPrefs, setUiPrefs] = useState(loadUiPrefs);

  useEffect(() => {
    applyUiPrefs(uiPrefs);
    return subscribeUiPrefs(setUiPrefs);
  }, []);

  // بررسی احراز هویت هنگام بارگذاری صفحه
  useEffect(() => {
    fetch(`${API_URL}/auth/me`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setAuthUser(data.user);
          if (data.token) {
            setAblyAuthToken(data.token);
            setApiToken(data.token);
          }
        }
        setAuthLoading(false);
      })
      .catch(() => setAuthLoading(false));
  }, []);

  const handleUserUpdate = (user, token) => {
    setAuthUser(user);
    if (token) {
      setAblyAuthToken(token);
      setApiToken(token);
    }
  };

  const handleAuth = (userData, token) => {
    setAuthUser(userData);
    if (token) {
      setAblyAuthToken(token);
      setApiToken(token);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.warn('[Auth] Logout request failed:', err);
    }

    setAuthUser(null);

    try {
      await chat.logout();
    } catch (err) {
      console.warn('[Auth] Chat cleanup failed:', err);
    }

    setApiToken(null);
    setAblyAuthToken(null);
  };

  if (authLoading) {
    return (
      <ToastProvider>
        <div className="h-[100dvh] w-full flex items-center justify-center text-white relative overflow-hidden bg-transparent">
          {uiPrefs.animatedBackground && <HalloweenBackground />}
          {/* کامپوننت لودینگ شما اینجا قرار می‌گیرد و به صورت خودکار وسط‌چین می‌شود */}
          <LoadingSpinner text="در حال بارگذاری..." />
        </div>
      </ToastProvider>
    );
  }

  return (
    <div className="h-[100dvh] w-full overflow-hidden relative text-surface-50 bg-transparent">
      {uiPrefs.animatedBackground && (
        <div className="fixed inset-0 -z-10 pointer-events-none">
          <HalloweenBackground />
        </div>
      )}

      <ToastProvider>
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
              path="/profile"
              element={
                authUser ? (
                  <Profile currentUser={authUser} />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/profile/:username"
              element={
                authUser ? (
                  <Profile currentUser={authUser} />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/settings"
              element={
                authUser ? (
                  <Settings currentUser={authUser} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />
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
      </ToastProvider>
    </div>
  );
}

export default App;