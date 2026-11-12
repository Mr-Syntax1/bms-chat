export default function HalloweenBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* لایه اول: گرادیانت‌های رنگی روشن */}
      <div 
        className="absolute inset-0 opacity-40"
        style={{
          background: `
            radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.25) 0%, transparent 45%),
            radial-gradient(circle at 80% 10%, rgba(217, 70, 239, 0.20) 0%, transparent 45%),
            radial-gradient(circle at 50% 90%, rgba(6, 182, 212, 0.18) 0%, transparent 50%)
          `
        }}
      />
      
      {/* لایه دوم: آیکون‌های هالووین (توخالی) */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nMjAwJyBoZWlnaHQ9JzIwMCcgdmlld0JveD0nMCAwIDIwMCAyMDAnIHhtbG5zPSdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Zyc+PGcgZmlsbD0nbm9uZScgc3Ryb2tlPScjZmZmZmZmJyBzdHJva2Utd2lkdGg9JzIuNScgc3Ryb2tlLWxpbmVjYXA9J3JvdW5kJyBzdHJva2UtbGluZWpvaW49J3JvdW5kJz48cGF0aCBkPSdNNTAgNjBjLTEyIDAtMjIgMTAtMjIgMjJzMTAgMjIgMjIgMjJjMyAwIDYtMSA4LTMgMyAyIDYgMyA5IDNzNi0xIDktM2MyIDIgNSAzIDggMyAxMiAwIDIyLTEwIDIyLTIycy0xMC0yMi0yMi0yMmMtMyAwLTYgMS04IDMtMy0yLTYtMy05LTNzLTYgMS05IDNjLTItMi01LTMtOC0zeicvPjxwYXRoIGQ9J001OCA1OGwtMy04TTY2IDU4bDMtOE03MiA1OGwtMy04Jy8+PHBhdGggZD0nTTU0IDc1bC01IDVNNjYgNzVsNSA1Jy8+PHBhdGggZD0nTTYwIDg1YzMgMyA5IDMgMTIgMCcvPjxwYXRoIGQ9J00xNTAgNDBjLTMtNC04LTQtMTEgMC0zLTMtNy0zLTEwIDAgMCAzIDMgNyA4IDktNSAyLTggNi04IDkgMyAzIDcgMyAxMCAwIDMgNCA4IDQgMTEgMCAzIDMgNyAzIDEwIDAgMC0zLTMtNy04LTkgNS0yIDgtNiA4LTktMy0zLTctMy0xMCAwemcvPjxwYXRoIGQ9J00xNDAgMTYwbDE1LTQwIDUgNDB6Jy8+PHBhdGggZD0nTTEyNSAxNjBoNTAnLz48cGF0aCBkPSdNMTU1IDEyMGwtNSAxMCcvPjxwYXRoIGQ9J00zMCAxNTBsNCAxMCAxMCA0LTEwIDQtNCAxMC00LTEwLTEwLTQgMTAtNHonLz48Y2lyY2xlIGN4PScxNzAnIGN5PSc5MCcgcj0nOCcvPjxwYXRoIGQ9J00xNzAgOTh2MTInLz48L2c+PC9zdmc+')`,
          backgroundSize: '250px 250px',
          backgroundRepeat: 'repeat',
          opacity: 0.15, // شفافیت آیکون‌ها
        }}
      />
    </div>
  );
}