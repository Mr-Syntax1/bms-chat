import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/Avatar';

export default function Profile({ onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchProfile = async () => {
    try {
      const res = await fetch('/auth/profile', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setProfile(data.user);
      } else {
        setError(data.error || 'خطا در بارگذاری پروفایل');
      }
    } catch {
      setError('خطای اتصال به سرور');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const loadProfile = async () => {
      try {
        const res = await fetch('/auth/profile', { credentials: 'include' });
        const data = await res.json();
        if (mounted) {
          if (data.success) {
            setProfile(data.user);
          } else {
            setError(data.error || 'خطا در بارگذاری پروفایل');
          }
        }
      } catch {
        if (mounted) {
          setError('خطای اتصال به سرور');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    loadProfile();
    return () => { mounted = false; };
  }, []);

  const formatPersianDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-red-400 font-medium">{error}</p>
        <button 
          onClick={fetchProfile}
          className="mt-4 btn-primary px-6 py-2 rounded-xl"
        >
          تلاش مجدد
        </button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-surface-400">پروفایل یافت نشد</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-surface-950/40 backdrop-blur-sm overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between backdrop-blur-sm sticky top-0 z-10 bg-surface-950/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="font-bold text-surface-50 text-sm">پروفایل کاربری</h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="btn-ghost p-1.5 rounded-lg text-surface-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="بستن"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Profile Content */}
      <div className="flex-1 p-6 space-y-6">
        {/* Avatar & Username */}
        <div className="flex flex-col items-center text-center space-y-4 animate-fade-in">
          <div className="relative">
            <Avatar 
              username={profile.username} 
              size="xl" 
              status="online" 
            />
            <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-4 border-surface-900 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-50">{profile.username}</h1>
            <p className="text-surface-400 text-sm mt-1">عضو از {formatPersianDate(profile.createdAt)}</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 animate-slide-up">
          <StatCard 
            label="پیام‌ها" 
            value={profile.messageCount?.toLocaleString('fa-IR') || '۰'} 
            icon={<MessageIcon />} 
            color="primary"
          />
          <StatCard 
            label="تاریخ عضویت" 
            value={formatPersianDate(profile.createdAt).split(' ').slice(0, 2).join(' ')} 
            icon={<CalendarIcon />} 
            color="accent"
          />
          <StatCard 
            label="شناسه" 
            value={profile.id.slice(-6)} 
            icon={<IdIcon />} 
            color="success"
          />
        </div>

        {/* Info Section */}
        <div className="bg-surface-900/50 rounded-2xl border border-white/10 p-5 animate-slide-up">
          <h3 className="font-semibold text-surface-50 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            اطلاعات حساب
          </h3>
          <div className="space-y-3">
            <InfoRow label="نام کاربری" value={profile.username} copyable />
            <InfoRow label="شناسه کاربری" value={profile.id} copyable />
            <InfoRow label="تاریخ ثبت‌نام" value={formatPersianDate(profile.createdAt)} />
            <InfoRow label="تعداد کل پیام‌ها" value={profile.messageCount?.toLocaleString('fa-IR') || '۰'} />
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2 animate-slide-up">
          <button
            onClick={() => navigate('/chat')}
            className="w-full btn-primary py-3 rounded-xl font-medium flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            بازگشت به چت
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  const colors = {
    primary: 'from-primary-500/20 to-primary-600/20 border-primary-500/30 text-primary-400',
    accent: 'from-accent-500/20 to-pink-500/20 border-accent-500/30 text-accent-400',
    success: 'from-success-500/20 to-cyan-500/20 border-success-500/30 text-success-400',
  };

  return (
    <div className={`rounded-2xl border p-4 text-center transition-all hover:shadow-lg ${colors[color] || colors.primary}`}>
      <div className="flex items-center justify-center mb-2">{icon}</div>
      <p className="text-2xl font-bold text-surface-50">{value}</p>
      <p className="text-xs text-surface-500 mt-1">{label}</p>
    </div>
  );
}

function InfoRow({ label, value, copyable }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <span className="text-sm text-surface-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-mono text-surface-500 truncate max-w-[200px] text-left">{value}</span>
        {copyable && (
          <button
            onClick={() => navigator.clipboard.writeText(value)}
            className="btn-ghost p-1.5 rounded-lg text-surface-500 hover:text-primary-400 hover:bg-primary-500/10 transition-colors"
            aria-label="کپی"
            title="کپی"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

function MessageIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function IdIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}