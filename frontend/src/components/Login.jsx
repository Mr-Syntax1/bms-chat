import { useState } from 'react';

export default function Login({ onAuth }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = isRegister ? '/register' : '/login';
      const res = await fetch(`http://localhost:3000/auth${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onAuth(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center text-slate-800">
          {isRegister ? 'ثبت‌نام' : 'ورود'}
        </h1>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="نام کاربری"
          className="w-full px-4 py-3 border rounded-xl mb-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          disabled={loading}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="رمز عبور"
          className="w-full px-4 py-3 border rounded-xl mb-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          disabled={loading}
        />
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'لطفاً صبر کنید...' : (isRegister ? 'ثبت‌نام' : 'ورود')}
        </button>
        <button
          type="button"
          onClick={() => setIsRegister(!isRegister)}
          className="w-full mt-3 text-sm text-indigo-600 hover:underline"
        >
          {isRegister ? 'قبلاً ثبت‌نام کردی؟ ورود' : 'حساب نداری؟ ثبت‌نام'}
        </button>
      </form>
    </div>
  );
}