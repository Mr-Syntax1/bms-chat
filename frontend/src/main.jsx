import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// پرامپت نصب ممکن است قبل از mount شدن ری‌اکت شلیک شود؛ پس همین‌جا و در اولین فرصت می‌گیریمش.
if (typeof window !== 'undefined') {
  window.__deferredInstallPrompt = window.__deferredInstallPrompt || null;

  window.addEventListener('beforeinstallprompt', (e) => {
    // جلوگیری از پرامپت خودکار مرورگر تا خودمان با کلیک کاربر نشانش دهیم.
    e.preventDefault();
    window.__deferredInstallPrompt = e;
    window.dispatchEvent(new Event('pwa:beforeinstallprompt'));
  });

  window.addEventListener('appinstalled', () => {
    window.__deferredInstallPrompt = null;
  });
}

createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>
)
