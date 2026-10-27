import { useEffect, useState, useRef } from 'react';
import { socket } from './socket';

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [username, setUsername] = useState(''); // نام کاربری
  const [isJoined, setIsJoined] = useState(false); // آیا وارد چت شده؟
  
  const bottomRef = useRef(null); // برای اسکرول خودکار

  // --- Effect 1: مدیریت اتصال و listenerها ---
  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
    }
    function onDisconnect() {
      setIsConnected(false);
    }

    function onChatMessage(data) {
      // data = { id, text, sender, time }
      setMessages((prev) => [...prev, data]);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('chat message', onChatMessage);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('chat message', onChatMessage);
    };
  }, []); 

  // --- Effect 2: اسکرول خودکار به آخرین پیام ---
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- ورود به چت ---
  const handleJoin = (e) => {
    e.preventDefault();
    if (!username.trim()) return;

    socket.connect(); // حالا وصل شو
    setIsJoined(true);
  };

  // --- ارسال پیام ---
  const sendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    socket.emit('chat message', {
      text: inputValue,
      sender: username,
    });

    setInputValue('');
  };

  // --- صفحه ورود ---
  if (!isJoined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <form
          onSubmit={handleJoin}
          className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm"
        >
          <h1 className="text-2xl font-bold mb-6 text-center text-slate-800">
            ورود به چت
          </h1>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="نام خود را وارد کنید..."
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            autoFocus
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition"
          >
            ورود
          </button>
        </form>
      </div>
    );
  }

  // --- صفحه چت ---
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center p-4">
      <div className="w-full max-w-2xl h-[90vh] bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden">
        
        {/* هدر */}
        <header className="bg-slate-800 text-white px-5 py-4 flex items-center justify-between">
          <h1 className="font-bold text-lg">اتاق چت 🗨️</h1>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-300">{username}</span>
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected ? 'bg-green-400' : 'bg-red-400'
              }`}
            />
          </div>
        </header>

        {/* لیست پیام‌ها */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-center text-slate-400 text-sm mt-10">
              هنوز پیامی وجود ندارد. اولین پیام را بفرستید! ✨
            </p>
          )}

          {messages.map((msg) => {
            const isMine = msg.sender === username;
            return (
              <div
                key={msg.id}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
                    isMine
                      ? 'bg-blue-600 text-white rounded-br-md'
                      : 'bg-slate-200 text-slate-800 rounded-bl-md'
                  }`}
                >
                  {!isMine && (
                    <p className="text-xs font-bold mb-1 opacity-70">
                      {msg.sender}
                    </p>
                  )}
                  <p>{msg.text}</p>
                  <p
                    className={`text-[10px] mt-1 ${
                      isMine ? 'text-blue-200' : 'text-slate-500'
                    }`}
                  >
                    {msg.time}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* فرم ارسال */}
        <form
          onSubmit={sendMessage}
          className="p-3 border-t border-slate-200 flex gap-2 bg-white"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="پیام خود را بنویسید..."
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-5 rounded-xl font-semibold hover:bg-blue-700 transition"
          >
            ارسال
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;