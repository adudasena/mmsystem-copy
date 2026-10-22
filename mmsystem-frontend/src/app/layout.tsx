import type { Metadata, Viewport } from 'next';
import { DM_Sans, Fraunces } from 'next/font/google';
import '../index.css';

const fonteCorpo = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const fonteDisplay = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MM System - Maria Morena',
  description: 'Sistema de gestão e vitrine digital',
};

export const viewport: Viewport = {
  themeColor: '#2c3e1c',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${fonteCorpo.variable} ${fonteDisplay.variable}`}>
      <body className="bg-fundo text-brand-950 antialiased min-h-screen font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
