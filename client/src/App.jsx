import React from 'react';
import { AppRoutes } from './app/AppRoutes.jsx';
import { Toaster } from 'sonner';

export default function App() {
  return (
    <>
      <AppRoutes />
      <Toaster position="top-right" richColors closeButton />
    </>
  );
}
