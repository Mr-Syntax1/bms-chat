export default function TypingIndicator({ users }) {
  if (users.length === 0) return null;

  const text = users.length === 1
    ? `${users[0]} در حال تایپ است...`
    : users.length === 2
      ? `${users[0]} و ${users[1]} در حال تایپ هستند...`
      : `${users.length} نفر در حال تایپ...`;

  return (
    <div className="px-4 py-2 animate-slide-up">
      <div className="flex items-center gap-2 text-xs text-surface-500 dark:text-surface-400">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} aria-hidden="true" />
          <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} aria-hidden="true" />
          <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} aria-hidden="true" />
        </div>
        <span className="font-medium">{text}</span>
      </div>
    </div>
  );
}