import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { TopNav, BottomNav } from "@/components/NavLinks";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Office Bet Friends · Mundial 2026",
  description: "Quiniela del Mundial 2026 entre amigos. Sin fines de lucro, solo para divertirnos.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "OBF Quiniela",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta name="theme-color" content="#111827" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${geist.className} bg-gray-50 min-h-screen`}>
        {/* Raya FIFA World Cup 2026 — paleta oficial */}
        <div className="h-1.5 flex">
          <div className="flex-1 bg-[#e91e8c]" />
          <div className="flex-1 bg-[#f97316]" />
          <div className="flex-1 bg-[#facc15]" />
          <div className="flex-1 bg-[#84cc16]" />
          <div className="flex-1 bg-[#06b6d4]" />
          <div className="flex-1 bg-[#3b82f6]" />
        </div>
        <nav className="bg-gradient-to-b from-gray-900 to-gray-800 text-white shadow-lg">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/quiniela" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
              {/* FIFA 2026 "26" badge */}
              <div className="flex-shrink-0 flex items-center justify-center leading-none">
                <span className="text-3xl font-black text-white leading-none tracking-tighter">26</span>
                <span className="text-xl ml-0.5">🏆</span>
              </div>
              <div className="leading-tight border-l border-white/20 pl-3">
                <div className="font-black text-base sm:text-lg tracking-tight text-white">Office Bet Friends</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-gray-400 text-xs font-medium tracking-widest uppercase">FIFA World Cup™</span>
                </div>
              </div>
            </Link>
            <TopNav />
          </div>
        </nav>
        <main className="max-w-5xl mx-auto px-4 py-6 pb-24 sm:pb-6">{children}</main>
        <footer className="hidden sm:block border-t border-gray-200 mt-8 py-6 text-center text-xs text-gray-400 space-y-1">
          <p className="font-medium text-gray-500">Office Bet Friends · Quiniela Mundial 2026</p>
          <p>Plataforma de entretenimiento privada para uso exclusivo entre amigos y familiares del organizador.</p>
          <p>Esta aplicación no constituye una actividad comercial, casa de apuestas ni servicio regulado.</p>
          <p>No afiliados a FIFA, la Federación Mexicana de Fútbol ni a ninguna organización deportiva oficial.</p>
        </footer>

        <BottomNav />
      </body>
    </html>
  );
}
