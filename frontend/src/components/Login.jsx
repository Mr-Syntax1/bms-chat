import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Login({ onAuth }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onAuth(data.user, data.token);
      navigate('/chat');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center text-slate-800">ورود</h1>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="نام کاربری"
          className="w-full px-4 py-3 border rounded-xl mb-3 focus:ring-2 text-black focus:ring-indigo-500 focus:outline-none"
          disabled={loading}
          autoComplete="username"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="رمز عبور"
          className="w-full px-4 py-3 border rounded-xl mb-3 focus:ring-2 text-black focus:ring-indigo-500 focus:outline-none"
          disabled={loading}
          autoComplete="current-password"
          required
        />
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'لطفاً صبر کنید...' : 'ورود'}
        </button>
        <p className="mt-4 text-center text-sm text-slate-600">
          حساب نداری؟{' '}
          <Link to="/register" className="text-indigo-600 hover:underline font-medium">
            ثبت‌نام
          </Link>
        </p>
      </form>
    </div>
  );
}