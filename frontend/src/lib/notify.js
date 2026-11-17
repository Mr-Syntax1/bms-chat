// src/lib/notify.js
import { loadUiPrefs } from './uiPrefs';

let audioCtx;

function beep() {
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.value = 880; // فرکانس بوق ملایم
    
    // Fade in/out برای جلوگیری از صدای "تق" ناگهانی
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.15, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.26);
  } catch {
    // اگر مرورگر اجازه نداد (مثلاً به دلیل سیاست‌های Autoplay)، سکوت می‌کنیم
  }
}

export function notifyIncomingMessage({ sender, text }) {
  const prefs = loadUiPrefs();

  // ۱. پخش صدا (اگر فعال باشد)
  if (prefs.sound) {
    beep();
  }

  // ۲. اعلان دسکتاپ (فقط اگر تب مخفی باشد و اجازه داده شده باشد)
  if (
    document.hidden &&
    prefs.notifications &&
    typeof Notification !== 'undefined' &&
    Notification.permission === 'granted'
  ) {
    const n = new Notification(sender, {
      body: prefs.preview ? text : 'پیام جدید',
      tag: `msg-${sender}`, // جلوگیری از انباشت اعلان‌های پشت‌سرهم از یک نفر
      icon: '/pwa-192x192.png', // یا '/favicon.ico'
    });
    
    n.onclick = () => {
      window.focus();
      n.close();
    };
  }
}