import type { Metadata } from 'next';
import './globals.css';
import { CookieConsentBanner } from '../components/CookieConsentBanner';
import { SITE } from '@dental/config/site';

export const metadata: Metadata = {
  title: `${SITE.productName} | ${SITE.brandName}`,
  description:
    'Rețeaua stomatologică — descoperă clinici și laboratoare de tehnică dentară verificate.',
  metadataBase: new URL(SITE.url),
  manifest: '/site.webmanifest',
  themeColor: '#04231d',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicons/favicon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/favicons/apple-touch-icon.png',
  },
  openGraph: {
    title: `${SITE.brandName} — The Dental Network`,
    description:
      'Rețeaua stomatologică — descoperă clinici și laboratoare de tehnică dentară verificate.',
    url: SITE.url,
    siteName: SITE.brandName,
    images: [
      {
        url: '/png/og-image-1200x630.png',
        width: 1200,
        height: 630,
        alt: SITE.brandName,
      },
    ],
    locale: 'ro_RO',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/png/og-image-1200x630.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <body className="bg-background text-text-primary font-body">
        {children}
        <CookieConsentBanner />
      </body>
    </html>
  );
}
