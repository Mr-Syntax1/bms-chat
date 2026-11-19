import Avatar from './Avatar';
import { useNavigate } from 'react-router-dom';
import InstallButton from './InstallButton';

export default function WelcomeScreen({ user, rooms, onSelectRoom, onCreateRoom }) {
  const navigate = useNavigate();

  // پیدا کردن اتاق‌های پیشنهادی
  const bmsRooms = rooms.filter(r => !r.isPrivate && r.name.toLowerCase().includes('bms'));
  const otherPublicRooms = rooms.filter(r => !r.isPrivate && !r.name.toLowerCase().includes('bms'));

  let suggestedRooms = [...bmsRooms, ...otherPublicRooms].slice(0, 3);

  // اگر هیچ اتاق bms وجود نداشت، یک اتاق مجازی بساز
  const hasBmsRoom = bmsRooms.length > 0;
  if (!hasBmsRoom) {
    suggestedRooms = [
      { id: 'virtual-bms', name: 'bms', isVirtual: true },
      ...suggestedRooms
    ].slice(0, 3);
  }

  const handleRoomClick = async (room) => {
    if (room.isVirtual) {
      const res = await onCreateRoom(room.name);
      if (res.success || res.error) { // در هر دو حالت وارد اتاق می‌شویم
        onSelectRoom(room.name);
      }
    } else {
      onSelectRoom(room.name);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 text-center relative overflow-hidden">
      {/* دکوراسیون پس‌زمینه */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl animate-blob" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent-500/10 rounded-full blur-3xl animate-blob animation-delay-2000" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        
        {/* دکمه نصب در گوشه‌ی بالا */}
        <div className="absolute -top-16 right-0 sm:right-0">
          <InstallButton />
        </div>

        {/* لوگوی درخشان */}
        <div className="mb-8 flex justify-center animate-float">
          <div className="group relative p-3 rounded-2xl bg-surface-900/80 backdrop-blur-sm ring-2 ring-primary-500/50 shadow-[0_0_30px_-5px] shadow-primary-500/40 hover:ring-primary-400 hover:shadow-primary-400/60 transition-all duration-300 cursor-default">
            <img
              className="w-16 h-16 rounded-xl object-contain drop-shadow-lg"
              src="/pwa-192x192.png"
              alt="لوگو"
            />
            <span className="pointer-events-none absolute inset-0 rounded-2xl bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        </div>

        {/* خوش‌آمدگویی و آواتار */}
        <div className="flex flex-col items-center gap-4 mb-3">
          <h1 className="text-3xl sm:text-4xl font-bold text-surface-50 tracking-tight">
            خوش آمدی، <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-accent-400">{user?.username}</span>
          </h1>

          <div
            className="relative group cursor-pointer"
            onClick={() => navigate('/profile')}
            title="مشاهده پروفایل"
          >
            <div className="transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
              <Avatar username={user?.username} avatarIndex={user?.avatarIndex} size="md" status="online" />
            </div>
            <span className="absolute -top-2 -right-2 text-2xl opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 origin-bottom-left z-20 pointer-events-none drop-shadow-md">
              👋
            </span>
          </div>
        </div>

        <p className="text-surface-400 mb-8 leading-relaxed max-w-sm mx-auto">
          به چت مدرن BMS خوش آمدی. برای شروع، یک اتاق از لیست زیر انتخاب کن یا اتاق جدیدی بساز.
        </p>

        {/* پیشنهاد اتاق‌ها (طراحی کارت‌محور مدرن) */}
        <div className="bg-surface-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-1 mb-6 shadow-2xl">
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-surface-300 flex items-center gap-2">
              <svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              اتاق‌های پیشنهادی
            </h3>
            <span className="text-xs text-surface-500 font-mono">{suggestedRooms.length} مورد</span>
          </div>
          
          <div className="p-2 flex flex-col gap-1">
            {suggestedRooms.map(room => (
              <button
                key={room.id}
                onClick={() => handleRoomClick(room)}
                className="flex items-center gap-3 p-3 rounded-xl bg-transparent hover:bg-white/5 border border-transparent hover:border-white/10 transition-all duration-200 text-right group cursor-pointer"
              >
                <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center text-primary-400 group-hover:from-primary-500 group-hover:to-accent-500 group-hover:text-white transition-all duration-300 shadow-sm">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                  </svg>
                </div>
                
                <div className="flex-1 min-w-0 text-right">
                  <span className="block font-medium text-surface-200 group-hover:text-white transition-colors truncate">
                    {room.name}
                  </span>
                  <span className="block text-xs text-surface-500 mt-0.5 truncate">
                    {room.isVirtual ? 'برای ساخت این اتاق کلیک کنید' : 'عضو شوید و گفتگو را شروع کنید'}
                  </span>
                </div>

                {room.name.toLowerCase().includes('bms') && (
                  <span className="shrink-0 px-2 py-1 text-[10px] font-bold bg-primary-500/10 text-primary-400 border border-primary-500/20 rounded-lg">
                    BMS
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-surface-500 flex items-center justify-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          با کلیک روی هر اتاق، به صورت خودکار به آن وارد می‌شوی.
        </p>
      </div>
    </div>
  );
}