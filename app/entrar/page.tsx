"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { ref, get, set } from "firebase/database";
import {
  isFirebaseConfigured,
  getPlayerEntry,
  setPlayerPin,
  verifyPlayer,
  AllowedPlayer,
} from "@/lib/localFallback";

type Step = "name" | "set-pin" | "enter-pin";

export default function EntrarPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setLoading(true);
    setError("");
    try {
      let found: AllowedPlayer | null = null;
      if (isFirebaseConfigured()) {
        const snap = await get(ref(db, `allowedPlayers/${trimmed}`));
        if (snap.exists()) {
          const data = snap.val();
          found = { name: trimmed, pin: data.pin ?? null, addedAt: data.addedAt ?? 0 };
        }
      } else {
        found = getPlayerEntry(trimmed);
      }
      if (!found) {
        setError("Nombre no encontrado. Verifica que hayas pagado y que el organizador te haya registrado.");
        setLoading(false);
        return;
      }
      if (found.pin === null) setStep("set-pin");
      else setStep("enter-pin");
    } catch {
      setError("Error al verificar. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSetPin(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) { setError("El PIN debe ser 4 dígitos"); return; }
    if (pin !== pinConfirm) { setError("Los PINs no coinciden"); return; }
    setLoading(true);
    setError("");
    try {
      setPlayerPin(name.trim(), pin);
      if (isFirebaseConfigured()) await set(ref(db, `allowedPlayers/${name.trim()}/pin`), pin);
      finishLogin(name.trim());
    } catch {
      setError("Error al guardar PIN. Intenta de nuevo.");
      setLoading(false);
    }
  }

  async function handleEnterPin(e: React.FormEvent) {
    e.preventDefault();
    if (!pin) return;
    setLoading(true);
    setError("");
    try {
      let correct = false;
      if (isFirebaseConfigured()) {
        const snap = await get(ref(db, `allowedPlayers/${name.trim()}/pin`));
        correct = snap.exists() && snap.val() === pin;
      } else {
        correct = verifyPlayer(name.trim(), pin);
      }
      if (!correct) { setError("PIN incorrecto"); setPin(""); setLoading(false); return; }
      finishLogin(name.trim());
    } catch {
      setError("Error al verificar. Intenta de nuevo.");
      setLoading(false);
    }
  }

  function finishLogin(playerName: string) {
    localStorage.setItem("quinielaPlayer", playerName);
    localStorage.setItem("quinielaPlayerAuth", "true");
    router.push("/quiniela");
  }

  const stepTitles: Record<Step, string> = {
    "name": "¿Cómo te llamas?",
    "set-pin": "Elige tu PIN",
    "enter-pin": "Ingresa tu PIN",
  };
  const stepDescriptions: Record<Step, string> = {
    "name": "Ingresa el nombre con el que te registró el organizador",
    "set-pin": `Primera vez que entras. Elige un PIN de 4 dígitos para proteger tu quiniela.`,
    "enter-pin": `Hola de nuevo, ${name.trim()} 👋`,
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center">
      <div className="w-full max-w-sm">

        {/* Journey — solo visible en step nombre */}
        {step === "name" && (
          <div className="mb-5 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-green-600 px-4 py-3">
              <p className="text-white text-xs font-bold uppercase tracking-wider">¿Cómo participar?</p>
            </div>
            <div className="divide-y divide-gray-100">
              {[
                { n: 1, title: "Realiza tu depósito", sub: "$500 MXN · BBVA 5576697735" },
                { n: 2, title: "Pide tu usuario al organizador", sub: "Mándale un WhatsApp para que te registre" },
                { n: 3, title: "Ingresa aquí y predice", sub: "Escribe el nombre que te asignó el organizador", active: true },
              ].map(({ n, title, sub, active }) => (
                <div key={n} className="flex items-center gap-3 px-4 py-3">
                  <span className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-black ${active ? "bg-green-600 text-white" : "bg-green-100 text-green-700"}`}>{n}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{title}</p>
                    <p className="text-xs text-gray-400">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
            {/* Premio pool */}
            <div className="px-4 py-3 bg-gray-50 flex items-center gap-2">
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wide mr-1">Premio</span>
              {[
                { place: "🥇", pct: "70%", label: "1er lugar" },
                { place: "🥈", pct: "20%", label: "2do lugar" },
                { place: "🥉", pct: "10%", label: "3er lugar" },
              ].map(({ place, pct, label }) => (
                <div key={place} className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2 py-1">
                  <span className="text-sm">{place}</span>
                  <span className="text-xs font-black text-gray-800">{pct}</span>
                </div>
              ))}
              <Link href="/reglas" className="ml-auto text-xs text-green-700 font-semibold hover:underline whitespace-nowrap">Ver reglas →</Link>
            </div>
          </div>
        )}

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {(["name", "set-pin", "enter-pin"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                s === step ? "bg-green-600 text-white" :
                (step === "set-pin" && i === 0) || (step === "enter-pin" && i <= 1)
                  ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
              }`}>{i + 1}</div>
              {i < 2 && <div className={`w-8 h-0.5 rounded-full ${
                (step === "set-pin" && i === 0) || step === "enter-pin" ? "bg-green-300" : "bg-gray-200"
              }`} />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-green-700 to-green-900 px-6 py-5 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/15 border border-white/25 flex items-center justify-center text-xl">⚽</div>
              <div>
                <p className="font-bold text-base leading-tight">Office Bet Friends</p>
                <p className="text-green-300 text-xs">🇲🇽🇺🇸🇨🇦 FIFA World Cup 2026™</p>
              </div>
            </div>
            <div className="mt-4">
              <h2 className="text-lg font-bold">{stepTitles[step]}</h2>
              <p className="text-green-200 text-sm mt-0.5">{stepDescriptions[step]}</p>
            </div>
          </div>

          {/* Form */}
          <div className="p-6 space-y-4">

            {/* STEP 1 — Name */}
            {step === "name" && (
              <form onSubmit={handleNameSubmit} className="space-y-3">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(""); }}
                  placeholder="Tu nombre..."
                  maxLength={40}
                  autoFocus
                  autoCapitalize="words"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none transition-colors"
                />
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button type="submit" disabled={!name.trim() || loading}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3 rounded-xl transition-colors">
                  {loading ? "Verificando..." : "Continuar →"}
                </button>
              </form>
            )}

            {/* STEP 2a — Set PIN */}
            {step === "set-pin" && (
              <form onSubmit={handleSetPin} className="space-y-3">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                  Recuerda tu PIN — lo necesitarás cada vez que entres.
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">PIN (4 dígitos)</label>
                  <input
                    type="password" inputMode="numeric" maxLength={4}
                    value={pin}
                    onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setError(""); }}
                    placeholder="••••" autoFocus
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-center text-2xl text-gray-900 tracking-widest focus:border-green-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirmar PIN</label>
                  <input
                    type="password" inputMode="numeric" maxLength={4}
                    value={pinConfirm}
                    onChange={(e) => { setPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 4)); setError(""); }}
                    placeholder="••••"
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-center text-2xl text-gray-900 tracking-widest focus:border-green-500 focus:outline-none"
                  />
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button type="submit" disabled={pin.length !== 4 || pinConfirm.length !== 4 || loading}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3 rounded-xl transition-colors">
                  {loading ? "Guardando..." : "Guardar PIN y entrar →"}
                </button>
                <button type="button" onClick={() => { setStep("name"); setPin(""); setPinConfirm(""); setError(""); }}
                  className="w-full text-sm text-gray-400 hover:text-gray-600 py-1">
                  ← Cambiar nombre
                </button>
              </form>
            )}

            {/* STEP 2b — Enter PIN */}
            {step === "enter-pin" && (
              <form onSubmit={handleEnterPin} className="space-y-3">
                <label className="block text-sm font-semibold text-gray-700 text-center">Ingresa tu PIN de 4 dígitos</label>
                <input
                  type="password" inputMode="numeric" maxLength={4}
                  value={pin}
                  onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setError(""); }}
                  placeholder="••••" autoFocus
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-center text-3xl text-gray-900 tracking-widest focus:border-green-500 focus:outline-none"
                />
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                <button type="submit" disabled={pin.length !== 4 || loading}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3 rounded-xl transition-colors">
                  {loading ? "Verificando..." : "Entrar →"}
                </button>
                <button type="button" onClick={() => { setStep("name"); setPin(""); setError(""); }}
                  className="w-full text-sm text-gray-400 hover:text-gray-600 py-1">
                  ← Cambiar nombre
                </button>
              </form>
            )}

          </div>
        </div>

        {/* Footer links */}
        <div className="mt-5 text-center space-y-2">
          <p className="text-xs text-gray-400">¿Aún no estás registrado?</p>
          <a href="https://wa.me/5215576697735" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-[#25D366] font-semibold hover:underline">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Contactar al organizador por WhatsApp
          </a>
          <div className="pt-1">
            <Link href="/reglas" className="text-xs text-gray-400 hover:text-gray-600 underline">Ver reglas de la quiniela</Link>
            <span className="text-gray-300 mx-2">·</span>
            <Link href="/admin" className="text-xs text-gray-300 hover:text-gray-500 underline">Admin</Link>
          </div>
        </div>

      </div>
    </div>
  );
}
