import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Register({ onAuth }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      return setError('رمز عبور و تکرار آن یکسان نیستند.');
    }
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3000/auth/register', {
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
        <h1 className="text-2xl font-bold mb-6 text-center text-slate-800">ثبت‌نام</h1>
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
          autoComplete="new-password"
          required
          minLength={6}
        />
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="تکرار رمز عبور"
          className="w-full px-4 py-3 border rounded-xl mb-3 focus:ring-2 text-black focus:ring-indigo-500 focus:outline-none"
          disabled={loading}
          autoComplete="new-password"
          required
        />
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'لطفاً صبر کنید...' : 'ثبت‌نام'}
        </button>
        <p className="mt-4 text-center text-sm text-slate-600">
          قبلاً ثبت‌نام کردی؟{' '}
          <Link to="/login" className="text-indigo-600 hover:underline font-medium">
            ورود
          </Link>
        </p>
      </form>
    </div>
  );
}