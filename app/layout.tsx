import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { TopNav, BottomNav } from "@/components/NavLinks";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Office Bet Friends · Mundial 2026",
  description: "Quiniela del Mundial 2026 entre amigos. Sin fines de lucro, solo para divertirnos.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${geist.className} bg-gray-50 min-h-screen`}>
        {/* Top stripe — host country colors */}
        <div className="h-1 bg-gradient-to-r from-red-600 via-white to-blue-600" />
        <nav className="bg-gradient-to-b from-green-800 to-green-700 text-white shadow-lg">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/quiniela" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
              {/* Mini World Cup 2026 badge */}
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex flex-col items-center justify-center leading-none">
                <span className="text-lg leading-none">⚽</span>
              </div>
              <div className="leading-tight">
                <div className="font-bold text-base sm:text-lg tracking-tight">Office Bet Friends</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-green-300 text-xs">🇲🇽🇺🇸🇨🇦</span>
                  <span className="text-green-300 text-xs font-medium">FIFA World Cup 2026™</span>
                </div>
              </div>
            </Link>
            <TopNav />
          </div>
        </nav>
        <main className="max-w-5xl mx-auto px-4 py-6 pb-24 sm:pb-6">{children}</main>
        <footer className="hidden sm:block border-t border-gray-200 mt-8 py-6 text-center text-xs text-gray-400 space-y-1">
          <p className="font-medium text-gray-500">Office Bet Friends · Quiniela Mundial 2026</p>
          <p>Hecha con ❤️ para amigos. Sin fines de lucro — solo para divertirnos.</p>
          <p>No estamos afiliados a FIFA ni a ninguna organización deportiva oficial.</p>
        </footer>

        <BottomNav />
      </body>
    </html>
  );
}
