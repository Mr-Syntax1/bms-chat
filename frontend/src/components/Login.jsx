import { useState } from 'react';

export default function Login({ onJoin, error }) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    setLoading(true);
    await onJoin(username.trim());
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center text-slate-800">ورود به چت</h1>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="نام خود را وارد کنید..."
          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none mb-3"
          autoFocus
          disabled={loading}
        />
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {loading ? 'در حال ورود...' : 'ورود'}
        </button>
      </form>
    </div>
  );
}