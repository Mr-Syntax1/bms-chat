export default function TypingIndicator({ users }) {
  if (users.length === 0) return null;
  const text = users.length === 1
    ? `${users[0]} در حال تایپ است...`
    : `${users.length} نفر در حال تایپ...`;

  return (
    <div className="px-4 py-1 text-xs text-slate-500 flex items-center gap-2">
      <span className="flex gap-0.5">
        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
      </span>
      {text}
    </div>
  );
}