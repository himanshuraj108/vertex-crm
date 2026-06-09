import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vertex CRM — Intelligent Campaigns for BrewCo',
  description: 'AI-native CRM platform for personalized customer engagement across WhatsApp, SMS, Email and RCS.',
  keywords: 'CRM, campaign management, AI, customer segmentation, BrewCo',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased font-sans">{children}</body>
    </html>
  );
}
