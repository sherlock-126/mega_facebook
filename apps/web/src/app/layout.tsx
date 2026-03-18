import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../lib/auth-context';
import { SocketProvider } from '../lib/socket-context';
import { PresenceProvider } from '../lib/presence-context';
import { AppNavbar } from '../components/layout/AppNavbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Mega Facebook',
  description: 'Social networking platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <SocketProvider>
            <PresenceProvider>
              <AppNavbar />
              {children}
            </PresenceProvider>
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
