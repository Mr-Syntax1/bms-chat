import Avatar from './Avatar';

export default function WelcomeScreen({ user, rooms, onSelectRoom }) {
  // پیدا کردن اتاق‌های عمومی برای پیشنهاد
  const publicRooms = rooms.filter(r => !r.isPrivate).slice(0, 3);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
      
      {/* دکوراسیون پس‌زمینه */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl animate-blob" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent-500/10 rounded-full blur-3xl animate-blob animation-delay-2000" />
      </div>

      <div className="relative z-10 max-w-md">
        {/* آواتار و خوش‌آمدگویی */}
        <div className="mb-6 flex justify-center animate-float">
          <Avatar username={user?.username} size="xl" status="online" />
        </div>
        
        <h1 className="text-3xl font-bold text-surface-50 mb-3">
          خوش آمدی، {user?.username}! 👋
        </h1>
        <p className="text-surface-400 mb-8 leading-relaxed">
          به چت مدرن BMS خوش آمدی. برای شروع، یک اتاق از منوی سمت راست انتخاب کن یا یک اتاق جدید بساز.
        </p>

        {/* پیشنهاد اتاق‌ها */}
        {publicRooms.length > 0 && (
          <div className="bg-surface-900/50 border border-white/10 rounded-2xl p-4 mb-6">
            <h3 className="text-sm font-semibold text-surface-300 mb-3">اتاق‌های پیشنهادی</h3>
            <div className="flex flex-col gap-2">
              {publicRooms.map(room => (
                <button
                  key={room.id}
                  onClick={() => onSelectRoom(room.name)}
                  className="flex items-center gap-3 p-3 rounded-xl bg-surface-800/50 hover:bg-primary-600/20 hover:border-primary-500/30 border border-transparent transition-all text-right group"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center text-primary-400 group-hover:bg-primary-500 group-hover:text-white transition-colors">
                    #
                  </div>
                  <span className="font-medium text-surface-200 group-hover:text-white transition-colors">
                    {room.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-surface-500">
          با کلیک روی هر اتاق، به آن اتاق وارد می‌شوی.
        </p>
      </div>
    </div>
  );
}