import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Link from "next/link";

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
            <div className="flex items-center gap-1 sm:gap-2 text-sm">
              <Link href="/entrar" className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition-colors font-bold text-white">
                Entrar
              </Link>
              <Link href="/quiniela" className="px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors font-medium">
                Partidos
              </Link>
              <Link href="/predicciones" className="px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors font-medium">
                Predicciones
              </Link>
              <Link href="/ranking" className="px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors font-medium">
                Ranking
              </Link>
              <Link href="/reglas" className="px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors font-medium">
                Reglas
              </Link>
              <Link href="/admin" className="px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white/90 text-xs">
                Admin
              </Link>
            </div>
          </div>
        </nav>
        <main className="max-w-5xl mx-auto px-4 py-6 pb-24 sm:pb-6">{children}</main>
        <footer className="hidden sm:block border-t border-gray-200 mt-8 py-6 text-center text-xs text-gray-400 space-y-1">
          <p className="font-medium text-gray-500">Office Bet Friends · Quiniela Mundial 2026</p>
          <p>Hecha con ❤️ para amigos. Sin fines de lucro — solo para divertirnos.</p>
          <p>No estamos afiliados a FIFA ni a ninguna organización deportiva oficial.</p>
        </footer>

        {/* Bottom nav — mobile only */}
        <nav className="fixed bottom-0 left-0 right-0 sm:hidden bg-white border-t border-gray-200 shadow-lg z-50" style={{paddingBottom: "env(safe-area-inset-bottom)"}}>
          <div className="grid grid-cols-5 h-16">
            <Link href="/" className="flex flex-col items-center justify-center gap-0.5 text-gray-500 hover:text-green-700 transition-colors">
              <span className="text-xl">🏠</span>
              <span className="text-[10px] font-medium">Inicio</span>
            </Link>
            <Link href="/entrar" className="flex flex-col items-center justify-center gap-0.5 text-green-700 transition-colors">
              <span className="text-xl">🔑</span>
              <span className="text-[10px] font-bold">Entrar</span>
            </Link>
            <Link href="/quiniela" className="flex flex-col items-center justify-center gap-0.5 text-gray-500 hover:text-green-700 transition-colors">
              <span className="text-xl">⚽</span>
              <span className="text-[10px] font-medium">Partidos</span>
            </Link>
            <Link href="/ranking" className="flex flex-col items-center justify-center gap-0.5 text-gray-500 hover:text-green-700 transition-colors">
              <span className="text-xl">🏆</span>
              <span className="text-[10px] font-medium">Ranking</span>
            </Link>
            <Link href="/reglas" className="flex flex-col items-center justify-center gap-0.5 text-gray-500 hover:text-green-700 transition-colors">
              <span className="text-xl">📋</span>
              <span className="text-[10px] font-medium">Reglas</span>
            </Link>
          </div>
        </nav>
      </body>
    </html>
  );
}
