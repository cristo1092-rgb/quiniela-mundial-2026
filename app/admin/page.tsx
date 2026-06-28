"use client";
import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import { ref, set, onValue, remove } from "firebase/database";
import { MATCHES, Match, GROUP_STAGES, STAGE_LABELS } from "@/lib/matches";
import { Result, KnockoutDecision } from "@/lib/scoring";
import { calcAllStandings, calcAdvancing, groupMatchesPlayed, getR32Assignments, isGroupComplete, computeAutoKnockoutTeams } from "@/lib/standings";
import {
  isFirebaseConfigured,
  getLocalResults,
  saveLocalResult,
  deleteLocalResult,
  saveLocalKnockoutTeam,
  saveLocalKnockoutWinner,
  saveLocalKnockoutDecision,
  getLocalKnockoutDecisions,
  getAllowedPlayers,
  addAllowedPlayer,
  removeAllowedPlayer,
  AllowedPlayer,
} from "@/lib/localFallback";

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? "mundial2026admin";

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);

  const [results, setResults] = useState<Record<string, Result>>({});
  const [knockoutTeams, setKnockoutTeams] = useState<Record<string, string>>({});

  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [g1, setG1] = useState("");
  const [g2, setG2] = useState("");
  // Extra-time / penalty decision state
  const [decisionMethod, setDecisionMethod] = useState<"et" | "pen" | "">("");
  const [etG1, setEtG1] = useState("");
  const [etG2, setEtG2] = useState("");
  const [penHome, setPenHome] = useState("");
  const [penAway, setPenAway] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  // Players management
  const [players, setPlayers] = useState<AllowedPlayer[]>([]);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [playerMsg, setPlayerMsg] = useState("");

  // Payments
  const [payments, setPayments] = useState<Record<string, { paid: boolean; paidAt?: number }>>({});

  // Knockout team editor
  const [koMatchId, setKoMatchId] = useState("");
  const [koHome, setKoHome] = useState("");
  const [koAway, setKoAway] = useState("");
  const [koHomeFlag, setKoHomeFlag] = useState("");
  const [koAwayFlag, setKoAwayFlag] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("quinielaAdminAuthed");
    if (stored === "true") setAuthed(true);
  }, []);

  useEffect(() => {
    if (!authed) return;
    // Load from localStorage immediately (always available)
    setResults(getLocalResults());
    if (!isFirebaseConfigured()) return;
    // If Firebase configured, override with Firebase data
    const unsub = onValue(ref(db, "results"), (snap) => {
      const fbResults = snap.val() ?? {};
      // Merge: localStorage is the source of truth when Firebase is empty
      setResults({ ...getLocalResults(), ...fbResults });
    });
    return unsub;
  }, [authed]);

  useEffect(() => {
    if (!authed) return;
    if (!isFirebaseConfigured()) return;
    const unsub = onValue(ref(db, "knockoutTeams"), (snap) => setKnockoutTeams(snap.val() ?? {}));
    return unsub;
  }, [authed]);

  // Listen for localStorage changes from other tabs
  useEffect(() => {
    if (!authed) return;
    const handler = () => setResults(getLocalResults());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [authed]);

  // Load payments
  useEffect(() => {
    if (!authed || !isFirebaseConfigured()) return;
    const unsub = onValue(ref(db, "payments"), (snap) => {
      setPayments(snap.val() ?? {});
    });
    return unsub;
  }, [authed]);

  // Load players list
  useEffect(() => {
    if (!authed) return;
    const loadPlayers = async () => {
      if (isFirebaseConfigured()) {
        const { get, ref: fbRef } = await import("firebase/database");
        const snap = await get(fbRef(db, "allowedPlayers")).catch(() => null);
        if (snap && snap.exists()) {
          const data = snap.val() as Record<string, { pin: string | null; addedAt: number }>;
          setPlayers(
            Object.entries(data).map(([name, v]) => ({ name, pin: v.pin ?? null, addedAt: v.addedAt ?? 0 }))
          );
          return;
        }
      }
      setPlayers(getAllowedPlayers());
    };
    loadPlayers();
  }, [authed]);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      localStorage.setItem("quinielaAdminAuthed", "true");
      setAuthed(true);
    } else {
      setPasswordError(true);
    }
  }

  async function handleSaveResult(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMatchId || g1 === "" || g2 === "") return;
    const isKnockout = !MATCHES.find((m) => m.id === selectedMatchId)?.stage.startsWith("group");
    const isDraw = parseInt(g1) === parseInt(g2);

    // Derive who advanced and how from the decision UI
    let decidedWinner: "home" | "away" | null = null;
    let knockoutDecision: KnockoutDecision | null = null;
    if (isKnockout && isDraw) {
      if (decisionMethod === "et" && etG1 !== "" && etG2 !== "") {
        const h = parseInt(etG1), a = parseInt(etG2);
        if (h === a) return; // ET can't be a draw
        decidedWinner = h > a ? "home" : "away";
        knockoutDecision = { method: "et", etG1: h, etG2: a };
      } else if (decisionMethod === "pen" && penHome !== "" && penAway !== "") {
        const h = parseInt(penHome), a = parseInt(penAway);
        if (h === a) return; // Penalties can't be a draw
        decidedWinner = h > a ? "home" : "away";
        knockoutDecision = { method: "pen", penHome: h, penAway: a };
      } else {
        return; // incomplete decision
      }
    }

    setSaving(true);
    const result = { g1: parseInt(g1), g2: parseInt(g2) };
    saveLocalResult(selectedMatchId, result);
    setResults((prev) => ({ ...prev, [selectedMatchId]: result }));
    if (decidedWinner) {
      saveLocalKnockoutWinner(selectedMatchId, decidedWinner);
      if (knockoutDecision) saveLocalKnockoutDecision(selectedMatchId, knockoutDecision);
    }
    if (isFirebaseConfigured()) {
      try {
        await set(ref(db, `results/${selectedMatchId}`), result);
        if (decidedWinner) {
          await set(ref(db, `knockoutWinners/${selectedMatchId}`), decidedWinner);
          if (knockoutDecision) await set(ref(db, `knockoutDecision/${selectedMatchId}`), knockoutDecision);
        }
      } catch { /* localStorage already saved */ }
    }
    const advancesLabel = decidedWinner
      ? ` (avanza ${knockoutDecision?.method === "et" ? "T.E." : "pen."}: ${decidedWinner === "home" ? displayHome : displayAway})`
      : "";
    setSavedMsg(`✓ Resultado guardado: ${selectedMatchId} ${g1}–${g2}${advancesLabel}`);
    setG1(""); setG2(""); setSelectedMatchId("");
    setDecisionMethod(""); setEtG1(""); setEtG2(""); setPenHome(""); setPenAway("");
    setSaving(false);
    setTimeout(() => setSavedMsg(""), 4000);
  }

  async function handleDeleteResult(matchId: string) {
    deleteLocalResult(matchId);
    setResults((prev) => { const n = { ...prev }; delete n[matchId]; return n; });
    if (isFirebaseConfigured()) {
      try { await remove(ref(db, `results/${matchId}`)); } catch { /* ok */ }
    }
  }

  async function handleSaveKnockout(e: React.FormEvent) {
    e.preventDefault();
    if (!koMatchId || !koHome || !koAway) return;
    setSaving(true);
    // localStorage
    saveLocalKnockoutTeam(`${koMatchId}_home`, koHome);
    saveLocalKnockoutTeam(`${koMatchId}_away`, koAway);
    if (koHomeFlag) saveLocalKnockoutTeam(`${koMatchId}_homeFlag`, koHomeFlag);
    if (koAwayFlag) saveLocalKnockoutTeam(`${koMatchId}_awayFlag`, koAwayFlag);
    // Firebase
    if (isFirebaseConfigured()) {
      try {
        await set(ref(db, `knockoutTeams/${koMatchId}_home`), koHome);
        await set(ref(db, `knockoutTeams/${koMatchId}_away`), koAway);
        if (koHomeFlag) await set(ref(db, `knockoutTeams/${koMatchId}_homeFlag`), koHomeFlag);
        if (koAwayFlag) await set(ref(db, `knockoutTeams/${koMatchId}_awayFlag`), koAwayFlag);
      } catch { /* ok */ }
    }
    setSavedMsg(`✓ Equipos actualizados para ${koMatchId}`);
    setKoHome(""); setKoAway(""); setKoHomeFlag(""); setKoAwayFlag("");
    setSaving(false);
    setTimeout(() => setSavedMsg(""), 4000);
  }

  async function handleAddPlayer(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newPlayerName.trim();
    if (!trimmed) return;
    if (players.find((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      setPlayerMsg("⚠️ Ese jugador ya está en la lista");
      return;
    }
    const newEntry: AllowedPlayer = { name: trimmed, pin: null, addedAt: Date.now() };
    addAllowedPlayer(trimmed);
    if (isFirebaseConfigured()) {
      try {
        await set(ref(db, `allowedPlayers/${trimmed}`), { pin: null, addedAt: newEntry.addedAt });
      } catch { /* local already saved */ }
    }
    setPlayers((prev) => [...prev, newEntry]);
    setNewPlayerName("");
    setPlayerMsg(`✓ ${trimmed} agregado`);
    setTimeout(() => setPlayerMsg(""), 3000);
  }

  async function handleRemovePlayer(name: string) {
    removeAllowedPlayer(name);
    if (isFirebaseConfigured()) {
      try { await remove(ref(db, `allowedPlayers/${name}`)); } catch { /* ok */ }
    }
    setPlayers((prev) => prev.filter((p) => p.name !== name));
  }

  async function handleTogglePayment(name: string) {
    const current = payments[name];
    const nowPaid = !current?.paid;
    const entry = nowPaid ? { paid: true, paidAt: Date.now() } : { paid: false };
    setPayments((prev) => ({ ...prev, [name]: entry }));
    if (isFirebaseConfigured()) {
      try { await set(ref(db, `payments/${name}`), entry); } catch { /* ok */ }
    }
  }

  async function handleResetPin(name: string) {
    // Clear the PIN so the player can choose a new one next login
    const { setPlayerPin } = await import("@/lib/localFallback");
    setPlayerPin(name, "");
    // Actually set pin to null
    const list = getAllowedPlayers();
    const idx = list.findIndex((p) => p.name === name);
    if (idx !== -1) { list[idx].pin = null; localStorage.setItem("quiniela_allowed_players", JSON.stringify(list)); }
    if (isFirebaseConfigured()) {
      try { await set(ref(db, `allowedPlayers/${name}/pin`), null); } catch { /* ok */ }
    }
    setPlayers((prev) => prev.map((p) => p.name === name ? { ...p, pin: null } : p));
    setPlayerMsg(`✓ PIN de ${name} reiniciado — podrá elegir uno nuevo`);
    setTimeout(() => setPlayerMsg(""), 4000);
  }

  async function handleAutoFillR32() {
    const allStandings = calcAllStandings(results);
    const slots = getR32Assignments(allStandings, results).filter((s) => s.ready);
    if (slots.length === 0) return;
    setSaving(true);
    for (const slot of slots) {
      saveLocalKnockoutTeam(`${slot.matchId}_home`, slot.home);
      saveLocalKnockoutTeam(`${slot.matchId}_away`, slot.away);
      saveLocalKnockoutTeam(`${slot.matchId}_homeFlag`, slot.homeFlag);
      saveLocalKnockoutTeam(`${slot.matchId}_awayFlag`, slot.awayFlag);
      if (isFirebaseConfigured()) {
        try {
          await set(ref(db, `knockoutTeams/${slot.matchId}_home`), slot.home);
          await set(ref(db, `knockoutTeams/${slot.matchId}_away`), slot.away);
          await set(ref(db, `knockoutTeams/${slot.matchId}_homeFlag`), slot.homeFlag);
          await set(ref(db, `knockoutTeams/${slot.matchId}_awayFlag`), slot.awayFlag);
        } catch { /* local already saved */ }
      }
    }
    setSaving(false);
    setSavedMsg(`✓ ${slots.length} partidos de R32 actualizados automáticamente`);
    setTimeout(() => setSavedMsg(""), 5000);
  }

  // Auto-computed + manual merged knockout teams (same priority as quiniela page)
  const { teams: autoKnockoutTeams } = useMemo(() => computeAutoKnockoutTeams(results), [results]);
  const mergedKnockoutTeams = useMemo(
    () => ({ ...autoKnockoutTeams, ...knockoutTeams }),
    [autoKnockoutTeams, knockoutTeams]
  );

  function resolvedKOName(matchId: string, side: "home" | "away"): string {
    const name = mergedKnockoutTeams[`${matchId}_${side}`];
    if (name) return name;
    const m = MATCHES.find((x) => x.id === matchId);
    return (side === "home" ? m?.homeLabel : m?.awayLabel) ?? "TBD";
  }

  const selectedMatch: Match | undefined = MATCHES.find((m) => m.id === selectedMatchId);
  const isSelectedKnockout = !!selectedMatch && !selectedMatch.stage.startsWith("group");
  const displayHome = selectedMatch
    ? (isSelectedKnockout ? resolvedKOName(selectedMatch.id, "home") : selectedMatch.homeTeam)
    : "Equipo 1";
  const displayAway = selectedMatch
    ? (isSelectedKnockout ? resolvedKOName(selectedMatch.id, "away") : selectedMatch.awayTeam)
    : "Equipo 2";
  const groupMatches = MATCHES.filter((m) => m.stage.startsWith("group"));
  const knockoutMatches = MATCHES.filter((m) => !m.stage.startsWith("group"));
  const savedResults = Object.entries(results);

  if (!authed) {
    return (
      <div className="max-w-sm mx-auto mt-20">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🔐</div>
            <h2 className="text-xl font-bold text-gray-900">Panel de Administrador</h2>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(false); }}
              placeholder="Contraseña..."
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-green-500 focus:outline-none"
              autoFocus
            />
            {passwordError && <p className="text-red-500 text-sm">Contraseña incorrecta</p>}
            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-colors"
            >
              Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Panel de Administrador</h2>
        <button
          onClick={() => { localStorage.removeItem("quinielaAdminAuthed"); setAuthed(false); }}
          className="text-sm text-gray-400 hover:text-gray-600 underline"
        >
          Cerrar sesión
        </button>
      </div>

      {savedMsg && (
        <div className="bg-green-50 border border-green-300 text-green-700 rounded-xl px-4 py-3 text-sm font-medium">
          ✓ {savedMsg}
        </div>
      )}

      {/* Result entry form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-bold text-gray-800 mb-4">Cargar resultado de partido</h3>
        <form onSubmit={handleSaveResult} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Partido</label>
            <select
              value={selectedMatchId}
              onChange={(e) => setSelectedMatchId(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-green-500 focus:outline-none bg-white"
            >
              <option value="">Selecciona un partido...</option>
              <optgroup label="Fase de grupos">
                {groupMatches.map((m) => (
                  <option key={m.id} value={m.id}>
                    [{m.id}] {m.homeTeam} vs {m.awayTeam}
                    {results[m.id] ? ` ✓ (${results[m.id].g1}-${results[m.id].g2})` : ""}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Eliminatorias">
                {knockoutMatches.map((m) => (
                  <option key={m.id} value={m.id}>
                    [{m.id}] {resolvedKOName(m.id, "home")} vs {resolvedKOName(m.id, "away")}
                    {results[m.id] ? ` ✓ (${results[m.id].g1}-${results[m.id].g2})` : ""}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {selectedMatch && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
              {selectedMatch.homeFlag} <strong>{displayHome}</strong>
              {" vs "}
              <strong>{displayAway}</strong> {selectedMatch.awayFlag}
              <span className="ml-2 text-gray-400">· {selectedMatch.date}</span>
            </div>
          )}

          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Goles {displayHome}
              </label>
              <input
                type="number"
                min="0"
                max="20"
                value={g1}
                onChange={(e) => setG1(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-center text-xl font-bold focus:border-green-500 focus:outline-none"
                placeholder="0"
              />
            </div>
            <div className="text-2xl font-bold text-gray-400 pb-2">–</div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Goles {displayAway}
              </label>
              <input
                type="number"
                min="0"
                max="20"
                value={g2}
                onChange={(e) => setG2(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-center text-xl font-bold focus:border-green-500 focus:outline-none"
                placeholder="0"
              />
            </div>
          </div>

          {/* Knockout: cómo se definió — only shown when scores are a draw */}
          {selectedMatch && !selectedMatch.stage.startsWith("group") && g1 !== "" && g2 !== "" && (() => {
            const gHome = parseInt(g1);
            const gAway = parseInt(g2);
            const isDraw = gHome === gAway;
            const homeName = resolvedKOName(selectedMatch.id, "home");
            const awayName = resolvedKOName(selectedMatch.id, "away");

            if (!isDraw) {
              const autoWinner = gHome > gAway ? homeName : awayName;
              return (
                <div className="border rounded-xl p-4 bg-gray-50 border-gray-200">
                  <p className="text-sm font-bold text-gray-700">✓ Ganador automático: {autoWinner}</p>
                </div>
              );
            }

            const etValid = etG1 !== "" && etG2 !== "" && parseInt(etG1) !== parseInt(etG2);
            const penValid = penHome !== "" && penAway !== "" && parseInt(penHome) !== parseInt(penAway);

            return (
              <div className="border rounded-xl p-4 bg-amber-50 border-amber-200 space-y-4">
                <p className="text-sm font-bold text-gray-700">⚽ Empate — ¿Cómo se decidió?</p>

                {/* Method selector */}
                <div className="flex gap-3">
                  {(["et", "pen"] as const).map((method) => (
                    <label key={method} className={`flex-1 flex items-center gap-2 border-2 rounded-xl p-3 cursor-pointer transition-colors ${decisionMethod === method ? "border-amber-500 bg-amber-100" : "border-gray-200 bg-white"}`}>
                      <input type="radio" name="decisionMethod" value={method} checked={decisionMethod === method}
                        onChange={() => { setDecisionMethod(method); setEtG1(""); setEtG2(""); setPenHome(""); setPenAway(""); }}
                        className="accent-amber-600" />
                      <span className="font-semibold text-sm">{method === "et" ? "⚡ Tiempo Extra" : "🥅 Penales"}</span>
                    </label>
                  ))}
                </div>

                {/* ET score */}
                {decisionMethod === "et" && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-500">Marcador final en tiempo extra:</p>
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-400 mb-1">{homeName}</label>
                        <input type="number" min="0" value={etG1} onChange={(e) => setEtG1(e.target.value)}
                          className="w-full border-2 rounded-xl px-3 py-2 text-center text-lg font-bold focus:border-amber-500 focus:outline-none" placeholder="0" />
                      </div>
                      <span className="text-gray-400 font-bold text-xl pb-2">–</span>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-400 mb-1">{awayName}</label>
                        <input type="number" min="0" value={etG2} onChange={(e) => setEtG2(e.target.value)}
                          className="w-full border-2 rounded-xl px-3 py-2 text-center text-lg font-bold focus:border-amber-500 focus:outline-none" placeholder="0" />
                      </div>
                    </div>
                    {etG1 !== "" && etG2 !== "" && parseInt(etG1) === parseInt(etG2) && (
                      <p className="text-xs text-red-500">El marcador en tiempo extra no puede ser empate.</p>
                    )}
                    {etValid && (
                      <p className="text-xs text-green-600 font-medium">✓ Avanza: {parseInt(etG1) > parseInt(etG2) ? homeName : awayName}</p>
                    )}
                  </div>
                )}

                {/* Penalty: first ask ET score (informational), then penalty score */}
                {decisionMethod === "pen" && (
                  <div className="space-y-4">
                    {/* ET score — informational */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-500">⚡ Marcador al final del T. Extra (empate):</p>
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-400 mb-1">{homeName}</label>
                          <input type="number" min="0" value={etG1} onChange={(e) => setEtG1(e.target.value)}
                            className="w-full border-2 rounded-xl px-3 py-2 text-center text-lg font-bold focus:border-amber-500 focus:outline-none" placeholder="0" />
                        </div>
                        <span className="text-gray-400 font-bold text-xl pb-2">–</span>
                        <div className="flex-1">
                          <label className="block text-xs text-gray-400 mb-1">{awayName}</label>
                          <input type="number" min="0" value={etG2} onChange={(e) => setEtG2(e.target.value)}
                            className="w-full border-2 rounded-xl px-3 py-2 text-center text-lg font-bold focus:border-amber-500 focus:outline-none" placeholder="0" />
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 italic">Opcional — solo informativo, puede quedar en blanco.</p>
                    </div>

                    {/* Penalty score — required */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-500">🥅 Resultado en la tanda de penales:</p>
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-400 mb-1">{homeName}</label>
                          <input type="number" min="0" value={penHome} onChange={(e) => setPenHome(e.target.value)}
                            className="w-full border-2 rounded-xl px-3 py-2 text-center text-lg font-bold focus:border-amber-500 focus:outline-none" placeholder="0" />
                        </div>
                        <span className="text-gray-400 font-bold text-xl pb-2">–</span>
                        <div className="flex-1">
                          <label className="block text-xs text-gray-400 mb-1">{awayName}</label>
                          <input type="number" min="0" value={penAway} onChange={(e) => setPenAway(e.target.value)}
                            className="w-full border-2 rounded-xl px-3 py-2 text-center text-lg font-bold focus:border-amber-500 focus:outline-none" placeholder="0" />
                        </div>
                      </div>
                      {penHome !== "" && penAway !== "" && parseInt(penHome) === parseInt(penAway) && (
                        <p className="text-xs text-red-500">Los penales no pueden terminar en empate.</p>
                      )}
                      {penHome !== "" && penAway !== "" && parseInt(penHome) !== parseInt(penAway) && (
                        <p className="text-xs text-green-600 font-medium">✓ Avanza: {parseInt(penHome) > parseInt(penAway) ? homeName : awayName}</p>
                      )}
                    </div>
                  </div>
                )}

                {!decisionMethod && (
                  <p className="text-xs text-amber-600">Selecciona cómo se definió el partido para continuar.</p>
                )}
              </div>
            );
          })()}

          <button
            type="submit"
            disabled={
              !selectedMatchId || g1 === "" || g2 === "" || saving ||
              (!selectedMatch?.stage.startsWith("group") && parseInt(g1) === parseInt(g2) && (() => {
                if (decisionMethod === "et") return etG1 === "" || etG2 === "" || parseInt(etG1) === parseInt(etG2);
                if (decisionMethod === "pen") return penHome === "" || penAway === "" || parseInt(penHome) === parseInt(penAway);
                return true; // no method selected
              })())
            }
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl transition-colors"
          >
            {saving ? "Guardando..." : "Guardar resultado"}
          </button>
        </form>
      </div>

      {/* Knockout team assignment */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-bold text-gray-800 mb-1">Asignar equipos a eliminatorias</h3>
        <p className="text-sm text-gray-500 mb-4">Cuando sepas quién avanzó, asigna los equipos a los partidos de eliminación.</p>
        <form onSubmit={handleSaveKnockout} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Partido eliminatorio</label>
            <select
              value={koMatchId}
              onChange={(e) => setKoMatchId(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-green-500 focus:outline-none bg-white"
            >
              <option value="">Selecciona un partido...</option>
              {knockoutMatches.map((m) => (
                <option key={m.id} value={m.id}>
                  [{m.id}] {resolvedKOName(m.id, "home")} vs {resolvedKOName(m.id, "away")}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Equipo local</label>
              <input
                type="text"
                value={koHome}
                onChange={(e) => setKoHome(e.target.value)}
                placeholder="ej. Argentina"
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 focus:border-green-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Equipo visitante</label>
              <input
                type="text"
                value={koAway}
                onChange={(e) => setKoAway(e.target.value)}
                placeholder="ej. Francia"
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 focus:border-green-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bandera local (emoji)</label>
              <input
                type="text"
                value={koHomeFlag}
                onChange={(e) => setKoHomeFlag(e.target.value)}
                placeholder="🇦🇷"
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 focus:border-green-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bandera visitante (emoji)</label>
              <input
                type="text"
                value={koAwayFlag}
                onChange={(e) => setKoAwayFlag(e.target.value)}
                placeholder="🇫🇷"
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 focus:border-green-500 focus:outline-none"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={!koMatchId || !koHome || !koAway || saving}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl transition-colors"
          >
            {saving ? "Guardando..." : "Asignar equipos"}
          </button>
        </form>
      </div>

      {/* Results list */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-bold text-gray-800 mb-4">
          Resultados cargados ({savedResults.length})
        </h3>
        {savedResults.length === 0 ? (
          <p className="text-gray-400 text-sm">No hay resultados cargados aún.</p>
        ) : (
          <div className="space-y-2">
            {savedResults.map(([matchId, result]) => {
              const match = MATCHES.find((m) => m.id === matchId);
              if (!match) return null;
              return (
                <div key={matchId} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5">
                  <div className="text-sm">
                    <span className="font-mono text-gray-400 text-xs mr-2">{matchId}</span>
                    <span className="font-semibold">{match.homeTeam}</span>
                    <span className="mx-2 font-bold font-mono bg-gray-800 text-white rounded px-2 py-0.5 text-xs">
                      {result.g1} – {result.g2}
                    </span>
                    <span className="font-semibold">{match.awayTeam}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteResult(matchId)}
                    className="text-red-400 hover:text-red-600 text-xs ml-4"
                  >
                    Eliminar
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* ── Group standings summary ─────────────────────────────────────── */}
      {(() => {
        const allStandings = calcAllStandings(results);
        const { advancing, bestThird } = calcAdvancing(allStandings);
        const bestThirdNames = new Set(bestThird.map((t) => t.team));
        const r32Slots = getR32Assignments(allStandings, results);
        const readySlots = r32Slots.filter((s) => s.ready && s.home !== "TBD");
        const allGroupsComplete = GROUP_STAGES.every((s) => isGroupComplete(s, results));
        const totalResults = Object.keys(results).length;
        if (totalResults === 0) return null;
        return (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-bold text-gray-800 mb-1">Clasificación fase de grupos</h3>
            <p className="text-xs text-gray-500 mb-4">
              Calculado con reglas FIFA: puntos → diferencia de goles → goles a favor → enfrentamiento directo
            </p>
            <div className="space-y-4">
              {GROUP_STAGES.map((stage) => {
                const standings = allStandings[stage];
                const played = groupMatchesPlayed(stage, results);
                if (played === 0) return null;
                return (
                  <div key={stage}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm text-gray-700">{STAGE_LABELS[stage]}</span>
                      <span className="text-xs text-gray-400">{played}/6 partidos</span>
                      {played === 6 && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Completo</span>}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                      {standings.map((team, idx) => {
                        const pos = idx + 1;
                        const advances = pos <= 2 || bestThirdNames.has(team.team);
                        return (
                          <div key={team.team} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                            pos === 1 ? "bg-green-100" :
                            pos === 2 ? "bg-green-50" :
                            advances   ? "bg-blue-50" :
                                        "bg-gray-50"
                          }`}>
                            <span className="font-bold text-gray-500 w-4">{pos}</span>
                            <span>{team.flag}</span>
                            <span className="font-medium text-gray-800 truncate flex-1">{team.team}</span>
                            <span className="font-bold text-gray-700">{team.pts}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {advancing.length > 0 && (
              <div className="mt-5 pt-4 border-t border-gray-100">
                <p className="font-semibold text-sm text-gray-700 mb-3">
                  Clasificados confirmados ({advancing.length}/32)
                  {!allGroupsComplete && <span className="ml-2 text-xs font-normal text-gray-400">— Los 3° lugar se confirman cuando terminen todos los grupos</span>}
                </p>
                <div className="flex flex-wrap gap-2">
                  {advancing.map((t) => (
                    <div key={t.team} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                      t.advances === "1st"      ? "bg-green-100 text-green-800" :
                      t.advances === "2nd"      ? "bg-green-50 text-green-700 border border-green-200" :
                                                  "bg-blue-50 text-blue-700 border border-blue-200"
                    }`}>
                      <span>{t.flag}</span>
                      <span>{t.team}</span>
                      <span className="text-xs opacity-60">
                        {t.advances === "1st" ? "1°" : t.advances === "2nd" ? "2°" : "3°M"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Auto-fill R32 */}
            {readySlots.length > 0 && (
              <div className="mt-5 pt-4 border-t border-gray-100">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-sm text-gray-700">
                      Auto-completar Dieciseisavos (R32)
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {readySlots.length} de 16 partidos listos para asignar automáticamente.
                      {!allGroupsComplete && ` Los partidos R32_13–R32_16 (3° lugar) se asignarán cuando terminen todos los grupos.`}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {readySlots.map((s) => (
                        <span key={s.matchId} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {s.matchId}: {s.homeFlag}{s.home} vs {s.awayFlag}{s.away}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={handleAutoFillR32}
                    disabled={saving}
                    className="flex-shrink-0 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors"
                  >
                    {saving ? "..." : "⚡ Aplicar"}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Payment checklist ──────────────────────────────────────────── */}
      {players.length > 0 && (() => {
        const ENTRY_FEE = 500;
        const paidPlayers = players.filter((p) => payments[p.name]?.paid);
        const unpaidPlayers = players.filter((p) => !payments[p.name]?.paid);
        const total = paidPlayers.length * ENTRY_FEE;
        const prize1 = Math.round(total * 0.70);
        const prize2 = Math.round(total * 0.20);
        const prize3 = Math.round(total * 0.10);

        return (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h3 className="font-bold text-gray-800">Control de pagos</h3>
                <p className="text-sm text-gray-500 mt-0.5">Marca a cada jugador cuando confirmes su transferencia.</p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-2xl font-black text-green-700">${total.toLocaleString("es-MX")}</div>
                <div className="text-xs text-gray-400">{paidPlayers.length}/{players.length} pagaron</div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-100 rounded-full h-2 mb-5">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: players.length > 0 ? `${(paidPlayers.length / players.length) * 100}%` : "0%" }}
              />
            </div>

            {/* Prize breakdown */}
            {paidPlayers.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-5 text-center">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                  <div className="text-lg">🥇</div>
                  <div className="font-bold text-yellow-700 text-sm">${prize1.toLocaleString("es-MX")}</div>
                  <div className="text-xs text-gray-400">70%</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  <div className="text-lg">🥈</div>
                  <div className="font-bold text-gray-600 text-sm">${prize2.toLocaleString("es-MX")}</div>
                  <div className="text-xs text-gray-400">20%</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <div className="text-lg">🥉</div>
                  <div className="font-bold text-amber-600 text-sm">${prize3.toLocaleString("es-MX")}</div>
                  <div className="text-xs text-gray-400">10%</div>
                </div>
              </div>
            )}

            {/* Player list */}
            <div className="space-y-2">
              {unpaidPlayers.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-1">
                    ⚠️ Pendientes ({unpaidPlayers.length})
                  </p>
                  {unpaidPlayers
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((player) => (
                      <div key={player.name} className="flex items-center justify-between bg-red-50 border border-red-100 rounded-lg px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-300 flex-shrink-0" />
                          <span className="font-medium text-gray-800">{player.name}</span>
                          <span className="text-xs text-red-400">Sin pago</span>
                        </div>
                        <button
                          onClick={() => handleTogglePayment(player.name)}
                          className="text-xs font-bold bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                        >
                          ✓ Marcar pagado
                        </button>
                      </div>
                    ))}
                </>
              )}

              {paidPlayers.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mt-3 mb-1">
                    ✓ Pagados ({paidPlayers.length})
                  </p>
                  {paidPlayers
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((player) => {
                      const paidAt = payments[player.name]?.paidAt;
                      return (
                        <div key={player.name} className="flex items-center justify-between bg-green-50 border border-green-100 rounded-lg px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
                            <span className="font-medium text-gray-800">{player.name}</span>
                            {paidAt && (
                              <span className="text-xs text-gray-400">
                                {new Date(paidAt).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleTogglePayment(player.name)}
                            className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1"
                            title="Desmarcar pago"
                          >
                            Desmarcar
                          </button>
                        </div>
                      );
                    })}
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Players management ──────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-bold text-gray-800 mb-1 mt-2">Jugadores permitidos</h3>
        <p className="text-sm text-gray-500 mb-4">
          Solo los nombres que agregues aquí podrán entrar a la quiniela. Cada jugador elige su propio PIN la primera vez.
        </p>

        {playerMsg && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-2 text-sm mb-4">
            {playerMsg}
          </div>
        )}

        <form onSubmit={handleAddPlayer} className="flex gap-2 mb-4">
          <input
            type="text"
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            placeholder="Nombre del jugador..."
            maxLength={40}
            className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-green-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!newPlayerName.trim()}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold px-5 py-2.5 rounded-xl transition-colors whitespace-nowrap"
          >
            + Agregar
          </button>
        </form>

        {players.length === 0 ? (
          <p className="text-gray-400 text-sm italic">No hay jugadores registrados aún.</p>
        ) : (
          <div className="space-y-2">
            {players
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((player) => (
                <div key={player.name} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${player.pin ? "bg-green-500" : "bg-gray-300"}`} />
                    <span className="font-medium text-gray-800">{player.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      player.pin ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}>
                      {player.pin ? "Activo" : "Pendiente (sin PIN)"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {player.pin && (
                      <button
                        onClick={() => handleResetPin(player.name)}
                        className="text-xs text-orange-500 hover:text-orange-700"
                        title="Reiniciar PIN"
                      >
                        Resetear PIN
                      </button>
                    )}
                    <button
                      onClick={() => handleRemovePlayer(player.name)}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400 space-y-1">
          <p>🟢 <strong>Activo</strong> — ya entró y eligió su PIN</p>
          <p>⚪ <strong>Pendiente</strong> — lo agregaste pero aún no ha entrado</p>
          <p>Si alguien olvidó su PIN, usa <strong>Resetear PIN</strong> — elegirá uno nuevo en su próximo login.</p>
        </div>
      </div>
    </div>
  );
}
