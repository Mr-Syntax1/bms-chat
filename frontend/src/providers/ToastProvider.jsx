import { Toaster } from 'sileo';

export default function ToastProvider({ children }) {
  return (
    <>
      {children}
      <Toaster
        position="top-center"
        theme="dark"
        options={{ // به جای toastOptions از options استفاده کن
          duration: 5000,
          fill: '#171717', // این خط پس‌زمینه را تیره می‌کند
          styles: { //  برای اینکه متن‌ها روی پس‌زمینه تیره خوانا باشند
            title: 'text-white! text-center!',
            description: 'text-white/75! text-center!', 
          },
        }}
      />
    </>
  );
}