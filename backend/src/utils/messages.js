export function getPersianTime() {
  return new Date().toLocaleTimeString('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}