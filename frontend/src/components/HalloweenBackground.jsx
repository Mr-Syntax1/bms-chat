export default function HalloweenBackground() {
  const icons =''

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
      
      {/* لایه دوم: آیکون‌های هالووین توخالی */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `url('data:image/svg+xml;base64,${icons}')`,
          backgroundSize: '100px 100px',
          backgroundRepeat: 'repeat',
          opacity: 0.16
        }}
      />
    </div>
  );
}