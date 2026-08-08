import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { CounterProvider } from '@/lib/CounterContext';
import { AuthProvider } from '@/lib/AuthContext';
import { ServiceWorker } from '@/components/ServiceWorker';
import './globals.css';

export const metadata: Metadata = {
  title: 'PassCount',
  description: 'Simple pass tracking for everyday use',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon-512.png',
    apple: '/icons/icon-192.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#000000',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <CounterProvider>
            {children}
            <ServiceWorker />
          </CounterProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
