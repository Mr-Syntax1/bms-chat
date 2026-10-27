import { useState } from 'react';

export default function RoomList({ rooms, currentRoom, onSwitch, onCreate }) {
  const [newRoom, setNewRoom] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newRoom.trim()) return;
    setCreating(true);
    setError('');
    const res = await onCreate(newRoom.trim());
    if (res.error) setError(res.error);
    else setNewRoom('');
    setCreating(false);
  };

  return (
    <div className="w-56 bg-slate-900 text-white flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <h2 className="font-bold text-sm">اتاق‌ها</h2>
      </div>
      <ul className="flex-1 overflow-y-auto p-2 space-y-1">
        {rooms.map((r) => (
          <li key={r.id}>
            <button
              onClick={() => onSwitch(r.name)}
              className={`w-full text-right px-3 py-2 rounded-lg text-sm transition ${
                r.name === currentRoom
                  ? 'bg-indigo-600'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              # {r.name}
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={handleCreate} className="p-2 border-t border-slate-700">
        <input
          value={newRoom}
          onChange={(e) => setNewRoom(e.target.value)}
          placeholder="اتاق جدید..."
          className="w-full px-3 py-2 rounded-lg bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          disabled={creating}
        />
        {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
      </form>
    </div>
  );
}