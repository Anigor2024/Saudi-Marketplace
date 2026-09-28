import type {Metadata} from 'next';
import { Cairo, Plus_Jakarta_Sans, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-cairo',
  display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jakarta',
  display: 'swap',
});

const ibmMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'أثيل | Atheel — السوق السعودي الفاخر متعدد التجار',
  description:
    'منصة أثيل للتجارة الإلكترونية الفاخرة متعددة البائعين في المملكة العربية السعودية. تسوق أرقى الساعات والعطور والإلكترونيات والأزياء من نخبة التجار المعتمدين.',
  openGraph: {
    title: 'أثيل | Atheel — السوق السعودي الفاخر متعدد التجار',
    description:
      'منصة أثيل للتجارة الإلكترونية الفاخرة متعددة البائعين في المملكة العربية السعودية. تسوق أرقى الساعات والعطور والإلكترونيات والأزياء من نخبة التجار المعتمدين.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'أثيل | Atheel — السوق السعودي الفاخر متعدد التجار',
    description:
      'منصة أثيل للتجارة الإلكترونية الفاخرة متعددة البائعين في المملكة العربية السعودية. تسوق أرقى الساعات والعطور والإلكترونيات والأزياء من نخبة التجار المعتمدين.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} ${jakarta.variable} ${ibmMono.variable}`}
      suppressHydrationWarning
    >
      <body
        className="min-h-screen bg-[#FAF8F5] text-[#141413] antialiased selection:bg-[#0B4F3F] selection:text-[#F5E6C8]"
        style={{ fontFamily: 'var(--font-cairo), var(--font-jakarta), sans-serif' }}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
