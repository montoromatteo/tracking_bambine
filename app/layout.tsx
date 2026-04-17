import type { Metadata, Viewport } from 'next';
import './globals.css';
import BottomNav from '@/components/BottomNav';

export const metadata: Metadata = {
  title: 'Tracking Bambine',
  description: 'Tracciamento poppate per Amelia e Adele',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body className="bg-gray-50 min-h-screen">
        <main className="max-w-md mx-auto px-4 pt-4 pb-safe">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
