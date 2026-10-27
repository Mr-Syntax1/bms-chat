import Avatar from './Avatar';

export default function MessageBubble({ msg, isMine, showHeader }) {
  if (msg.type === 'system') {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs bg-slate-200 text-slate-600 px-3 py-1 rounded-full">
          {msg.text}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
      {!isMine && (
        <div className="w-10">
          {showHeader && <Avatar username={msg.sender} color={msg.avatarColor} />}
        </div>
      )}
      <div className={`max-w-[75%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
        {showHeader && !isMine && (
          <span className="text-xs font-bold text-slate-600 mb-1">{msg.sender}</span>
        )}
        <div className={`px-4 py-2 rounded-2xl text-sm ${
          isMine ? 'bg-indigo-600 text-white rounded-br-md' : 'bg-white text-slate-800 rounded-bl-md shadow'
        }`}>
          <p className="whitespace-pre-wrap break-words">{msg.text}</p>
          <p className={`text-[10px] mt-1 ${isMine ? 'text-indigo-200' : 'text-slate-400'}`}>
            {msg.time}
          </p>
        </div>
      </div>
    </div>
  );
}