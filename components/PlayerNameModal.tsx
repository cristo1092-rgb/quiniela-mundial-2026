"use client";
import { useState } from "react";
import { db } from "@/lib/firebase";
import { ref, get, set } from "firebase/database";
import {
  isFirebaseConfigured,
  getPlayerEntry,
  setPlayerPin,
  verifyPlayer,
  AllowedPlayer,
} from "@/lib/localFallback";

interface Props {
  onSave: (name: string) => void;
}

type Step = "name" | "set-pin" | "enter-pin";

export default function PlayerNameModal({ onSave }: Props) {
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [entry, setEntry] = useState<AllowedPlayer | null>(null);

  // ── Step 1: check name against approved list ──────────────────────────────
  async function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setLoading(true);
    setError("");

    try {
      let found: AllowedPlayer | null = null;

      if (isFirebaseConfigured()) {
        // Check Firebase first
        const snap = await get(ref(db, `allowedPlayers/${trimmed}`));
        if (snap.exists()) {
          const data = snap.val();
          found = { name: trimmed, pin: data.pin ?? null, addedAt: data.addedAt ?? 0 };
        }
      } else {
        found = getPlayerEntry(trimmed);
      }

      if (!found) {
        setError("Tu nombre no está en la lista. Pide al organizador que te agregue.");
        setLoading(false);
        return;
      }

      setEntry(found);
      if (found.pin === null) {
        setStep("set-pin");
      } else {
        setStep("enter-pin");
      }
    } catch {
      setError("Error al verificar. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2a: player sets their PIN for the first time ─────────────────────
  async function handleSetPin(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setError("El PIN debe ser exactamente 4 dígitos");
      return;
    }
    if (pin !== pinConfirm) {
      setError("Los PINs no coinciden");
      return;
    }
    setLoading(true);
    setError("");

    try {
      // Save PIN locally
      setPlayerPin(name.trim(), pin);
      // Sync to Firebase
      if (isFirebaseConfigured()) {
        await set(ref(db, `allowedPlayers/${name.trim()}/pin`), pin);
      }
      finishLogin(name.trim());
    } catch {
      setError("Error al guardar PIN. Intenta de nuevo.");
      setLoading(false);
    }
  }

  // ── Step 2b: player enters existing PIN ───────────────────────────────────
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

      if (!correct) {
        setError("PIN incorrecto");
        setPin("");
        setLoading(false);
        return;
      }
      finishLogin(name.trim());
    } catch {
      setError("Error al verificar. Intenta de nuevo.");
      setLoading(false);
    }
  }

  function finishLogin(playerName: string) {
    localStorage.setItem("quinielaPlayer", playerName);
    localStorage.setItem("quinielaPlayerAuth", "true");
    onSave(playerName);
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header with World Cup visual */}
        <div className="bg-gradient-to-b from-green-800 to-green-700 px-6 pt-6 pb-5 text-white text-center">
          {/* Trophy + ball visual */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-3xl">🏆</span>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-white/10 border-2 border-white/30 flex items-center justify-center mx-auto">
                <span className="text-4xl">⚽</span>
              </div>
            </div>
            <span className="text-3xl">🏆</span>
          </div>
          <h1 className="text-xl font-bold mt-1">Office Bet Friends</h1>
          <p className="text-green-300 text-xs mt-0.5 flex items-center justify-center gap-1">
            <span>🇲🇽🇺🇸🇨🇦</span>
            <span>FIFA World Cup 2026™</span>
          </p>
          {step === "name" && (
            <p className="text-white/70 text-xs mt-2">Ingresa el nombre con el que te registraron</p>
          )}
          {step === "set-pin" && (
            <p className="text-white/80 text-sm mt-2 font-medium">¡Bienvenido, {name.trim()}!</p>
          )}
          {step === "enter-pin" && (
            <p className="text-white/80 text-sm mt-2 font-medium">Hola de nuevo, {name.trim()} 👋</p>
          )}
          {/* Stripe */}
          <div className="h-0.5 bg-gradient-to-r from-red-500 via-white/50 to-blue-500 mt-4 -mx-6" />
        </div>

        <div className="p-6">
        {/* Step indicators */}
        <div className="flex justify-center gap-2 mb-5">
          {(["name", "set-pin", "enter-pin"] as Step[]).map((s) => (
            <div
              key={s}
              className={`h-1 rounded-full transition-all ${
                s === step ? "w-8 bg-green-500" : "w-3 bg-gray-200"
              }`}
            />
          ))}
        </div>

        {/* Step indicators */}
        <div className="flex justify-center gap-2 mb-6">
          {(["name", "set-pin", "enter-pin"] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`w-2 h-2 rounded-full transition-colors ${
                s === step ? "bg-green-500" : step > s ? "bg-green-300" : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        {/* ── STEP 1: Name ── */}
        {step === "name" && (
          <form onSubmit={handleNameSubmit} className="space-y-4">
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              placeholder="Tu nombre (tal como te registraron)..."
              maxLength={40}
              autoFocus
              autoCapitalize="words"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:border-green-500 focus:outline-none transition-colors"
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={!name.trim() || loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl transition-colors"
            >
              {loading ? "Verificando..." : "Continuar →"}
            </button>
          </form>
        )}

        {/* ── STEP 2a: Set PIN (first time) ── */}
        {step === "set-pin" && (
          <form onSubmit={handleSetPin} className="space-y-4">
            <p className="text-sm text-gray-600 bg-green-50 rounded-lg p-3">
              Primera vez que entras. Elige un PIN de <strong>4 dígitos</strong> — lo necesitarás cada vez que entres.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tu PIN (4 dígitos)</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setError(""); }}
                placeholder="••••"
                autoFocus
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-center text-2xl tracking-widest focus:border-green-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pinConfirm}
                onChange={(e) => { setPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 4)); setError(""); }}
                placeholder="••••"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-center text-2xl tracking-widest focus:border-green-500 focus:outline-none"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={pin.length !== 4 || pinConfirm.length !== 4 || loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl transition-colors"
            >
              {loading ? "Guardando..." : "Guardar PIN y entrar"}
            </button>
            <button type="button" onClick={() => { setStep("name"); setPin(""); setPinConfirm(""); setError(""); }}
              className="w-full text-sm text-gray-400 hover:text-gray-600">
              ← Cambiar nombre
            </button>
          </form>
        )}

        {/* ── STEP 2b: Enter PIN (returning) ── */}
        {step === "enter-pin" && (
          <form onSubmit={handleEnterPin} className="space-y-4">
            <label className="block text-sm font-medium text-gray-700 text-center">Ingresa tu PIN</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setError(""); }}
              placeholder="••••"
              autoFocus
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-center text-3xl tracking-widest focus:border-green-500 focus:outline-none"
            />
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button
              type="submit"
              disabled={pin.length !== 4 || loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl transition-colors"
            >
              {loading ? "Verificando..." : "Entrar →"}
            </button>
            <button type="button" onClick={() => { setStep("name"); setPin(""); setError(""); }}
              className="w-full text-sm text-gray-400 hover:text-gray-600">
              ← Cambiar nombre
            </button>
          </form>
        )}

        {/* Not registered yet? */}
        {step === "name" && (
          <div className="mt-4 pt-4 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">¿Aún no estás registrado?</p>
            <a
              href="https://wa.me/5215576697735"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-[#25D366] font-semibold hover:underline"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Contactar al organizador por WhatsApp
            </a>
          </div>
        )}
        </div>{/* end p-6 */}
      </div>

      {/* Admin escape hatch */}
      <a
        href="/admin"
        className="mt-4 text-xs text-white/60 hover:text-white/90 underline"
      >
        Soy el organizador → ir al Admin
      </a>
    </div>
  );
}
