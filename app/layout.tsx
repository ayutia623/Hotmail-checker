import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Hotmail Inbox Checker - Multi-checking with Keyword Search',
  description:
    'Advanced Hotmail/Outlook inbox checker with multi-threading, keyword search, proxy support, and full inbox capture. Fast and secure checking tool.',
  keywords: [
    'hotmail checker',
    'outlook checker',
    'email checker',
    'inbox checker',
    'multi-checker',
    'keyword search',
    'proxy support',
  ],
  authors: [{ name: 'Ziver' }],
  creator: 'Ziver',
  publisher: 'Ziver',
  robots: 'noindex, nofollow',
  viewport: 'width=device-width, initial-scale=1',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
    { media: '(prefers-color-scheme: light)', color: '#0f172a' },
  ],
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
