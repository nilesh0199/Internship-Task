import React from 'react';
import { AppRoutes } from './app/AppRoutes.jsx';
import { Toaster } from 'sonner';

export default function App() {
  return (
    <>
      <AppRoutes />
      <Toaster
        position="bottom-right"
        richColors
        closeButton
        visibleToasts={3}
        duration={3500}
      />
    </>
  );
}
