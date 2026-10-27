import { useEffect, useState } from 'react';
import { socket } from './socket';
import './App.css'; // استایل را خودتان اضافه کنید

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    // 1. تعریف توابع شنونده
    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onChatMessage(msg) {
      // به‌روزرسانی state با آرایه جدید (بدون تغییر مستقیم)
      setMessages((prev) => [...prev, msg]);
    }

    // 2. ثبت شنونده‌ها
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('chat message', onChatMessage); // نام رویداد باید با بک‌اند مطابقت داشته باشد

    // 3. اتصال
    socket.connect();

    // 4. تابع پاکسازی (بسیار مهم!)
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('chat message', onChatMessage);
      socket.disconnect(); // هنگام حذف کامپوننت اتصال را قطع کنید
    };
  }, []); // آرایه وابستگی خالی، فقط یک بار هنگام mount اجرا می‌شود

  const sendMessage = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      socket.emit('chat message', inputValue); // ارسال پیام
      setInputValue('');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1 className=''>چت React</h1>
      <p>وضعیت اتصال: {isConnected ? '✅ متصل' : '❌ قطع'}</p>
      
      <div style={{ border: '1px solid #ccc', height: '300px', overflowY: 'auto', marginBottom: '10px', padding: '10px' }}>
        {messages.map((msg, index) => (
          <div key={index}>{msg}</div>
        ))}
      </div>

      <form onSubmit={sendMessage}>
        <input 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="پیام خود را بنویسید..."
        />
        <button type="submit">ارسال</button>
      </form>
    </div>
  );
}

export default App;