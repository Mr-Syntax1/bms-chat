import Avatar from './Avatar';
import { useNavigate } from 'react-router-dom';
import InstallButton from './InstallButton';

export default function WelcomeScreen({ user, rooms, onSelectRoom, onCreateRoom }) {
  const navigate = useNavigate()

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
      if (res.success) {
        onSelectRoom(room.name);
      } else {
        onSelectRoom(room.name);
      }
    } else {
      onSelectRoom(room.name);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">

      {/* دکوراسیون پس‌زمینه */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl animate-blob" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent-500/10 rounded-full blur-3xl animate-blob animation-delay-2000" />
      </div>

      <div className="relative z-10 max-w-md">

        {/* لوگوی درخشان */}
        <div className="mb-6 flex justify-center animate-float">
          <div
            className="group relative p-3 rounded-2xl bg-surface-900 ring-2 ring-primary-500/50 shadow-[0_0_20px_-4px] shadow-primary-500/60 hover:ring-primary-600 hover:shadow-primary-400/80 transition-all duration-200 cursor-default"
          >
            <img
              className="w-16 h-16 rounded-xl object-contain drop-shadow"
              src="/pwa-192x192.png"
              alt="لوگو"
            />
            <span className="pointer-events-none absolute inset-0 rounded-2xl bg-white/5 opacity-0 group-hover:opacity-80 transition-opacity duration-200" />
          </div>
        </div>

        {/*  خوش آمدگویی و آواتار با انیمیشن */}
        <div className="flex items-center justify-center flex-col md:flex-row gap-3 mb-2">
          <h1 className="text-3xl font-bold text-surface-50">
            خوش آمدی، {user?.username}
          </h1>

          {/* گروه هاور برای آواتار و ایموجی */}
          <div
            className="relative group cursor-pointer"
            onClick={() => navigate('/profile')}
            title="مشاهده پروفایل"
          >
            {/* آواتار با انیمیشن بزرگ شدن و رینگ */}
            <div className="transition-all duration-300 group-hover:scale-110">
              <Avatar username={user?.username} avatarIndex={user?.avatarIndex} size="sm" status="online" />
            </div>

            {/*  ایموجی که با هاور از بالا-راست ظاهر می‌شود */}
            <span className="absolute -top-4 -right-4 text-2xl opacity-0 scale-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 origin-bottom-left z-20 pointer-events-none">
              👋
            </span>
          </div>
        </div>

        <p className="text-surface-400 mb-8 leading-relaxed">
          به چت مدرن BMS خوش آمدی. برای شروع، یک اتاق از منوی سمت راست انتخاب کن یا یک اتاق جدید بساز.
        </p>

        {/* پیشنهاد اتاق‌ها */}
        <div className="bg-surface-900/50 border border-white/10 rounded-2xl p-4 mb-6">
          <h3 className="text-sm font-semibold text-surface-300 mb-3">اتاق‌های پیشنهادی BMS</h3>
          <div className="flex flex-col gap-2">
            {suggestedRooms.map(room => (
              <button
                key={room.id}
                onClick={() => handleRoomClick(room)}
                className="flex items-center gap-3 p-3 rounded-xl bg-surface-800/50 hover:bg-primary-600/20 hover:border-primary-500/30 border border-transparent transition-all text-right group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center text-primary-400 group-hover:bg-primary-500 group-hover:text-white transition-colors">
                  #
                </div>
                <span className="font-medium text-surface-200 group-hover:text-white transition-colors">
                  {room.name}
                </span>
                {room.name.toLowerCase().includes('bms') && (
                  <span className="ml-auto px-2 py-0.5 text-xs bg-primary-500/20 text-primary-400 rounded-full">
                    BMS
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4 flex justify-center">
          <InstallButton />
        </div>

        <p className="text-xs text-surface-500">
          با کلیک روی هر اتاق، به آن اتاق وارد می‌شوی.
        </p>
      </div>
    </div>
  );
}