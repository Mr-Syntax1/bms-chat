import { Toaster } from 'sileo';

export default function ToastProvider({ children }) {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          dismissible: true,
          showIcon: true,
        }}
      />
    </>
  );
}