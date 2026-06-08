"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { ref, onValue, set, remove } from "firebase/database";
import {
  MATCHES,
  GROUP_STAGES,
  KNOCKOUT_STAGES,
  STAGE_LABELS,
  Stage,
  Match,
} from "@/lib/matches";
import { Prediction, Result } from "@/lib/scoring";
import { calcGroupStandings, calcAllStandings, calcAdvancing, groupMatchesPlayed, isGroupComplete } from "@/lib/standings";
import {
  isFirebaseConfigured,
  getLocalResults,
  getLocalPredictions,
  saveLocalPrediction,
  deleteLocalPrediction,
  getLocalKnockoutTeams,
} from "@/lib/localFallback";
import MatchCard from "@/components/MatchCard";
import GroupStandings from "@/components/GroupStandings";
import HowToPlay from "@/components/HowToPlay";
import { requestNotificationPermission, registerServiceWorker, sendLocalNotification } from "@/lib/notifications";

export default function QuinielaPage() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [results, setResults] = useState<Record<string, Result>>({});
  const [knockoutTeams, setKnockoutTeams] = useState<Record<string, string>>({});
  const [activeStage, setActiveStage] = useState<Stage>("groupA");
  const [saving, setSaving] = useState<string | null>(null);
  const touchStartX = useRef<number | null>(null);
  const allStagesRef = useRef([...GROUP_STAGES, ...KNOCKOUT_STAGES]);
  const prevResultCount = useRef(0);

  // Register service worker and ask for notification permission
  useEffect(() => {
    registerServiceWorker();
  }, []);

  // Load player from localStorage — redirect to /entrar if not logged in
  useEffect(() => {
    const stored = localStorage.getItem("quinielaPlayer");
    const authed = localStorage.getItem("quinielaPlayerAuth");
    if (stored && authed === "true") setPlayerName(stored);
    else router.replace("/entrar");
  }, [router]);

  // Listen to results — localStorage first, Firebase override if configured
  useEffect(() => {
    setResults(getLocalResults());
    setKnockoutTeams(getLocalKnockoutTeams());

    if (!isFirebaseConfigured()) {
      // Listen for changes from admin tab via storage events
      const handler = (e: StorageEvent) => {
        if (e.key === "quiniela_results") setResults(getLocalResults());
        if (e.key === "quiniela_knockout") setKnockoutTeams(getLocalKnockoutTeams());
      };
      window.addEventListener("storage", handler);
      return () => window.removeEventListener("storage", handler);
    }

    const unsubResults = onValue(ref(db, "results"), (snap) => {
      const newResults = { ...getLocalResults(), ...(snap.val() ?? {}) };
      const newCount = Object.keys(newResults).length;
      if (prevResultCount.current > 0 && newCount > prevResultCount.current) {
        sendLocalNotification("⚽ Nuevo resultado", "El admin cargó un resultado. ¡Revisa tu ranking!");
      }
      prevResultCount.current = newCount;
      setResults(newResults);
    });
    const unsubKO = onValue(ref(db, "knockoutTeams"), (snap) => {
      setKnockoutTeams({ ...getLocalKnockoutTeams(), ...(snap.val() ?? {}) });
    });
    return () => { unsubResults(); unsubKO(); };
  }, []);

  // Load this player's predictions from localStorage + Firebase
  useEffect(() => {
    if (!playerName) return;
    setPredictions(getLocalPredictions(playerName));

    if (!isFirebaseConfigured()) return;
    const unsub = onValue(ref(db, `predictions/${playerName}`), (snap) => {
      const fbPreds = snap.val() ?? {};
      setPredictions({ ...getLocalPredictions(playerName), ...fbPreds });
    });
    return unsub;
  }, [playerName]);

  const handlePredict = useCallback(
    async (matchId: string, pred: Prediction) => {
      if (!playerName) return;
      saveLocalPrediction(playerName, matchId, pred);
      setPredictions((prev) => ({ ...prev, [matchId]: pred }));
      setSaving(matchId);
      if (isFirebaseConfigured()) {
        try {
          await set(ref(db, `predictions/${playerName}/${matchId}`), pred);
        } catch { /* localStorage already saved */ }
      }
      setSaving(null);
    },
    [playerName]
  );

  const handleDelete = useCallback(
    async (matchId: string) => {
      if (!playerName) return;
      deleteLocalPrediction(playerName, matchId);
      setPredictions((prev) => { const n = { ...prev }; delete n[matchId]; return n; });
      if (isFirebaseConfigured()) {
        try {
          await remove(ref(db, `predictions/${playerName}/${matchId}`));
        } catch { /* localStorage already deleted */ }
      }
    },
    [playerName]
  );

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 50) return;
    const stages = allStagesRef.current;
    setActiveStage((cur) => {
      const idx = stages.indexOf(cur);
      if (dx < 0 && idx < stages.length - 1) return stages[idx + 1];
      if (dx > 0 && idx > 0) return stages[idx - 1];
      return cur;
    });
  }, []);

  // Merge static match data with dynamic knockout team names
  function resolveMatch(match: Match): Match {
    if (match.homeTeam !== "TBD" && match.awayTeam !== "TBD") return match;
    return {
      ...match,
      homeTeam: knockoutTeams[`${match.id}_home`] ?? "TBD",
      awayTeam: knockoutTeams[`${match.id}_away`] ?? "TBD",
      homeFlag: knockoutTeams[`${match.id}_homeFlag`] ?? "🏳️",
      awayFlag: knockoutTeams[`${match.id}_awayFlag`] ?? "🏳️",
    };
  }

  const allStages = allStagesRef.current;
  const stageMatches = MATCHES.filter((m) => m.stage === activeStage).map(resolveMatch);

  const totalPredictions = Object.keys(predictions).length;
  const totalMatches = MATCHES.length;

  if (!playerName) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <HowToPlay />
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Hola, <span className="text-green-600">{playerName}</span> 👋
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            {totalPredictions} de {totalMatches} partidos predichos
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          {"Notification" in window && Notification.permission === "default" && (
            <button
              onClick={async () => { await requestNotificationPermission(); }}
              className="text-xs text-blue-600 border border-blue-200 rounded-lg px-2 py-1.5 hover:bg-blue-50 flex items-center gap-1"
            >
              🔔 Activar avisos
            </button>
          )}
          <button
            onClick={() => {
              localStorage.removeItem("quinielaPlayer");
              setPlayerName(null);
            }}
            className="text-sm text-gray-400 hover:text-gray-600 underline"
          >
            Cambiar nombre
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
        <div
          className="bg-green-500 h-2 rounded-full transition-all"
          style={{ width: `${(totalPredictions / totalMatches) * 100}%` }}
        />
      </div>

      {/* Stage tabs — horizontal scroll, large touch targets */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-6 -mx-4 px-4 scrollbar-hide">
        <div className="flex gap-1 flex-nowrap">
          {/* Group divider */}
          <span className="text-xs text-gray-400 self-center px-1 flex-shrink-0">Grupos</span>
          {GROUP_STAGES.map((stage) => {
            const stageMatches = MATCHES.filter((m) => m.stage === stage);
            const predicted = stageMatches.filter((m) => predictions[m.id]).length;
            const hasResult = stageMatches.some((m) => results[m.id]);
            return (
              <button
                key={stage}
                onClick={() => setActiveStage(stage)}
                className={`flex-shrink-0 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative ${
                  activeStage === stage
                    ? "bg-green-600 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                {STAGE_LABELS[stage].replace("Grupo ", "")}
                {hasResult && predicted === stageMatches.length && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full" />
                )}

              </button>
            );
          })}
          {/* Knockout divider */}
          <span className="text-xs text-gray-400 self-center px-1 flex-shrink-0 ml-2">Eliminatorias</span>
          {KNOCKOUT_STAGES.map((stage) => (
            <button
              key={stage}
              onClick={() => setActiveStage(stage)}
              className={`flex-shrink-0 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeStage === stage
                  ? "bg-green-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {stage === "round32" ? "R32" :
               stage === "round16" ? "R16" :
               stage === "quarters" ? "QF" :
               stage === "semis" ? "SF" :
               stage === "thirdPlace" ? "3°" : "🏆"}
            </button>
          ))}
        </div>
      </div>

      {/* Stage header */}
      <h3 className="text-lg font-bold text-gray-800 mb-4">
        {STAGE_LABELS[activeStage]}
        <span className="text-sm font-normal text-gray-400 ml-2">
          ({stageMatches.filter((m) => predictions[m.id]).length}/{stageMatches.length} predichos)
        </span>
      </h3>

      {/* Match grid — swipe horizontally to change stage */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {stageMatches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            prediction={predictions[match.id]}
            result={results[match.id]}
            onPredict={handlePredict}
            onDelete={handleDelete}
            saving={saving === match.id}
          />
        ))}
      </div>

      {/* Group standings (only shown when viewing a group tab) */}
      {GROUP_STAGES.includes(activeStage as typeof GROUP_STAGES[number]) && (() => {
        const standings = calcGroupStandings(activeStage, results);
        const allStandings = calcAllStandings(results);
        const allGroupsComplete = GROUP_STAGES.every((s) => isGroupComplete(s, results));
        const { bestThird } = calcAdvancing(allStandings);
        const bestThirdNames = new Set(bestThird.map((t) => t.team));
        const played = groupMatchesPlayed(activeStage, results);
        return (
          <div className="mt-6">
            <GroupStandings
              standings={standings}
              matchesPlayed={played}
              bestThirdNames={bestThirdNames}
              allGroupsComplete={allGroupsComplete}
            />
          </div>
        );
      })()}

      {/* Quick nav: next stage */}
      {(() => {
        const idx = allStages.indexOf(activeStage);
        const nextStage = allStages[idx + 1];
        if (!nextStage) return null;
        return (
          <div className="mt-6 text-center">
            <button
              onClick={() => setActiveStage(nextStage)}
              className="text-green-600 hover:text-green-700 font-medium text-sm"
            >
              Siguiente: {STAGE_LABELS[nextStage]} →
            </button>
          </div>
        );
      })()}
    </div>
  );
}
