import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Treta Railway Mapping | Dynamic ETA Forecasting System (SIH 26028)',
  description: 'Next.js + Leaflet database-driven railway route visualization and dynamic ETA delay propagation engine.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Treta Railway',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0284c7',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-slate-50 w-full h-full m-0 p-0 text-slate-800">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
        <link
          href="https://unpkg.com/maplibre-gl@5/dist/maplibre-gl.css"
          rel="stylesheet"
        />
      </head>
      <body className="bg-slate-50 text-slate-800 min-h-screen w-full h-full antialiased selection:bg-sky-500/20 selection:text-sky-900 m-0 p-0 overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
