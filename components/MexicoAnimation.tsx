"use client";
import { useEffect, useState } from "react";

const STORAGE_KEY = "quinielaYSiSi_20260630";
const TARGET_DATE = "2026-06-30";

export default function MexicoAnimation() {
  const [phase, setPhase] = useState<"hidden" | "in" | "show" | "out">("hidden");

  useEffect(() => {
    const today = new Date().toLocaleDateString("sv-SE");
    if (today !== TARGET_DATE) return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    localStorage.setItem(STORAGE_KEY, "1");

    // pequeño delay para que cargue la página primero
    const t1 = setTimeout(() => setPhase("in"), 400);
    const t2 = setTimeout(() => setPhase("show"), 900);
    const t3 = setTimeout(() => setPhase("out"), 4000);
    const t4 = setTimeout(() => setPhase("hidden"), 4700);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  function dismiss() {
    if (phase === "hidden") return;
    setPhase("out");
    setTimeout(() => setPhase("hidden"), 700);
  }

  if (phase === "hidden") return null;

  return (
    <>
      <style>{`
        @keyframes mexFlag {
          0%   { transform: translateY(-120px) scale(0.5); opacity: 0; }
          60%  { transform: translateY(12px) scale(1.15); opacity: 1; }
          80%  { transform: translateY(-6px) scale(0.97); }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes mexText {
          0%   { transform: translateY(60px) scale(0.8); opacity: 0; }
          60%  { transform: translateY(-8px) scale(1.08); opacity: 1; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes mexFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .mex-overlay   { animation: mexFadeIn 0.4s ease forwards; }
        .mex-flag      { animation: mexFlag 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.1s both; }
        .mex-text      { animation: mexText 0.55s cubic-bezier(0.34,1.56,0.64,1) 0.35s both; }
        .mex-sub       { animation: mexFadeIn 0.4s ease 0.7s both; }
      `}</style>

      <div
        onClick={dismiss}
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center cursor-pointer select-none"
        style={{
          background: "rgba(0,0,0,0.88)",
          opacity: phase === "out" ? 0 : 1,
          transition: phase === "out" ? "opacity 0.7s ease" : undefined,
        }}
      >
        <div className="text-center px-6">
          <div className="mex-flag text-[110px] leading-none mb-5">🇲🇽</div>
          <p className="mex-text text-5xl sm:text-6xl font-black text-white tracking-tight">
            ¿y si sí?
          </p>
          <p className="mex-sub text-white/40 text-sm mt-8">toca para cerrar</p>
        </div>
      </div>
    </>
  );
}
