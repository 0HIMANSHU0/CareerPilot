'use client';

import { useRef } from 'react';
import { Provider } from 'react-redux';
import { Toaster } from 'sonner';
import { makeStore, type AppStore } from '@/store';

export function Providers({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<AppStore>();
  if (!storeRef.current) storeRef.current = makeStore();
  return (
    <Provider store={storeRef.current}>
      {children}
      <Toaster richColors position="top-right" />
    </Provider>
  );
}
