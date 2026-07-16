import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const sans = localFont({
  src: [
    { path: '../../public/fonts/thmanyah-sans/thmanyahsans-Light.woff2', weight: '300', style: 'normal' },
    { path: '../../public/fonts/thmanyah-sans/thmanyahsans-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../../public/fonts/thmanyah-sans/thmanyahsans-Medium.woff2', weight: '500', style: 'normal' },
    { path: '../../public/fonts/thmanyah-sans/thmanyahsans-Bold.woff2', weight: '700', style: 'normal' },
    { path: '../../public/fonts/thmanyah-sans/thmanyahsans-Black.woff2', weight: '900', style: 'normal' },
  ],
  variable: '--font-sans',
  display: 'swap',
});

const serifDisplay = localFont({
  src: [
    { path: '../../public/fonts/thmanyah-serif-display/thmanyahserifdisplay-Bold.woff2', weight: '700', style: 'normal' },
    { path: '../../public/fonts/thmanyah-serif-display/thmanyahserifdisplay-Black.woff2', weight: '900', style: 'normal' },
  ],
  variable: '--font-serif-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'متجر نقاط - جامع قباء',
  description: 'متجر مكافآت طلاب معهد تحفيظ القرآن',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${sans.variable} ${serifDisplay.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
