"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/entrar", label: "Entrar", highlight: true },
  { href: "/quiniela", label: "Partidos" },
  { href: "/predicciones", label: "Predicciones" },
  { href: "/ranking", label: "Ranking" },
  { href: "/perfil", label: "Mi perfil" },
  { href: "/reglas", label: "Reglas" },
  { href: "/admin", label: "Admin", muted: true },
];

export function TopNav() {
  const path = usePathname();
  return (
    <div className="hidden sm:flex items-center gap-1 sm:gap-2 text-sm">
      {links.map(({ href, label, highlight, muted }) => {
        const active = path === href || (href === "/quiniela" && path.startsWith("/quiniela"));
        return (
          <Link
            key={href}
            href={href}
            className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
              active
                ? "bg-white/25 text-white font-bold underline underline-offset-4"
                : highlight
                ? "bg-white/15 hover:bg-white/25 text-white font-bold"
                : muted
                ? "text-white/50 hover:text-white/90 text-xs"
                : "hover:bg-white/10 text-white"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}

const bottomLinks = [
  { href: "/", label: "Inicio", icon: "🏠" },
  { href: "/quiniela", label: "Mi quiniela", icon: "📝" },
  { href: "/predicciones", label: "Ver todos", icon: "👁" },
  { href: "/ranking", label: "Ranking", icon: "🏆" },
  { href: "/perfil", label: "Mi perfil", icon: "👤" },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 sm:hidden bg-white border-t border-gray-200 shadow-lg z-50"
      style={{ paddingBottom: "env(safe-area-inset-bottom)", transform: "translateZ(0)" }}
    >
      <div className="grid grid-cols-5 h-16">
        {bottomLinks.map(({ href, label, icon }) => {
          const active = path === href || (href !== "/" && path.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center justify-center gap-0.5 transition-colors ${
                active ? "text-green-700" : "text-gray-400 hover:text-green-700"
              }`}
            >
              <span className="text-xl">{icon}</span>
              <span className={`text-[10px] ${active ? "font-bold" : "font-medium"}`}>{label}</span>
              {active && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-green-600 rounded-full" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
