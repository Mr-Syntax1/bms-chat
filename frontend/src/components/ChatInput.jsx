import { useState, useRef } from 'react';

export default function ChatInput({ onSend, onTyping }) {
  const [value, setValue] = useState('');
  const typingTimer = useRef(null);

  const handleChange = (e) => {
    setValue(e.target.value);
    onTyping(true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => onTyping(false), 2000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!value.trim()) return;
    onSend(value.trim());
    setValue('');
    onTyping(false);
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 border-t bg-white flex gap-2">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder="پیام خود را بنویسید..."
        className="flex-1 px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
      />
      <button type="submit" className="bg-indigo-600 text-white px-5 rounded-xl font-semibold hover:bg-indigo-700">
        ارسال
      </button>
    </form>
  );
}