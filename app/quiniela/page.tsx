"use client";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
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
  Jornada,
  JORNADA_LABELS,
  JORNADA_RANGES,
  isKickoffPast,
  getDeadlineUTC,
  getJornadaMatches as getJornadaMatchesBase,
  getCurrentJornada,
} from "@/lib/matches";
import { Prediction, Result, KnockoutDecision, calcRanking } from "@/lib/scoring";
import { VoteDistribution } from "@/components/MatchCard";
import { calcGroupStandings, calcAllStandings, calcAdvancing, groupMatchesPlayed, isGroupComplete, computeAutoKnockoutTeams } from "@/lib/standings";
import {
  isFirebaseConfigured,
  getLocalResults,
  getLocalPredictions,
  saveLocalPrediction,
  deleteLocalPrediction,
  getLocalKnockoutTeams,
  getLocalKnockoutWinners,
  getLocalKnockoutDecisions,
} from "@/lib/localFallback";
import MatchCard from "@/components/MatchCard";
import GroupStandings from "@/components/GroupStandings";
import KnockoutBracket from "@/components/KnockoutBracket";
import HowToPlay from "@/components/HowToPlay";
import PullToRefresh from "@/components/PullToRefresh";
import TodayMatches from "@/components/TodayMatches";

export default function QuinielaPage() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [results, setResults] = useState<Record<string, Result>>({});
  const [knockoutTeams, setKnockoutTeams] = useState<Record<string, string>>({});
  const [knockoutWinners, setKnockoutWinners] = useState<Record<string, "home" | "away">>({});
  const [knockoutDecisions, setKnockoutDecisions] = useState<Record<string, KnockoutDecision>>({});
  const [activeStage, setActiveStage] = useState<Stage>("groupA");
  const [saving, setSaving] = useState<string | null>(null);
  const [allPredictions, setAllPredictions] = useState<Record<string, Record<string, Prediction>>>({});
  const [viewMode, setViewMode] = useState<"stage" | "jornada">("jornada");
  const [activeJornada, setActiveJornada] = useState<Jornada | "hoy">(() => {
    const today = new Date().toLocaleDateString("sv-SE");
    return MATCHES.some((m) => m.date === today) ? "hoy" : getCurrentJornada();
  });
  const touchStartX = useRef<number | null>(null);
  const allStagesRef = useRef([...GROUP_STAGES, ...KNOCKOUT_STAGES]);
  const prevResultCount = useRef(0);


  // Load player from localStorage — redirect to /entrar if not logged in
  useEffect(() => {
    const stored = localStorage.getItem("quinielaPlayer");
    const authed = localStorage.getItem("quinielaPlayerAuth");
    if (stored && authed === "true") setPlayerName(stored);
    else router.replace("/entrar");
  }, [router]);

  // Listen to results — localStorage only when Firebase not configured
  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setResults(getLocalResults());
      setKnockoutTeams(getLocalKnockoutTeams());
    }

    if (!isFirebaseConfigured()) {
      setKnockoutWinners(getLocalKnockoutWinners());
      const handler = (e: StorageEvent) => {
        if (e.key === "quiniela_results") setResults(getLocalResults());
        if (e.key === "quiniela_knockout") setKnockoutTeams(getLocalKnockoutTeams());
        if (e.key === "quiniela_knockout_winners") setKnockoutWinners(getLocalKnockoutWinners());
      };
      window.addEventListener("storage", handler);
      return () => window.removeEventListener("storage", handler);
    }

    const unsubResults = onValue(ref(db, "results"), (snap) => {
      const newResults = snap.val() ?? {};
      const newCount = Object.keys(newResults).length;
      prevResultCount.current = newCount;
      setResults(newResults);
    });
    const unsubKO = onValue(ref(db, "knockoutTeams"), (snap) => {
      setKnockoutTeams({ ...getLocalKnockoutTeams(), ...(snap.val() ?? {}) });
    });
    const unsubKOW = onValue(ref(db, "knockoutWinners"), (snap) => {
      setKnockoutWinners({ ...getLocalKnockoutWinners(), ...(snap.val() ?? {}) });
    });
    const unsubKOD = onValue(ref(db, "knockoutDecision"), (snap) => {
      setKnockoutDecisions({ ...getLocalKnockoutDecisions(), ...(snap.val() ?? {}) });
    });
    const unsubAllPreds = onValue(ref(db, "predictions"), (snap) => {
      setAllPredictions(snap.val() ?? {});
    });
    return () => { unsubResults(); unsubKO(); unsubKOW(); unsubKOD(); unsubAllPreds(); };
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

  // Auto-computed knockout teams + provisional set (recalculates when results change)
  const { teams: autoKnockoutTeams, provisional: provisionalIds } = useMemo(
    () => computeAutoKnockoutTeams(results, knockoutWinners),
    [results, knockoutWinners]
  );

  // Merge static match data with knockout teams (manual admin overrides auto-computed)
  function resolveMatch(match: Match): Match {
    if (match.homeTeam !== "TBD" && match.awayTeam !== "TBD") return match;
    const merged = { ...autoKnockoutTeams, ...knockoutTeams };
    const isProvisional = provisionalIds.has(match.id) && !knockoutTeams[`${match.id}_home`];
    return {
      ...match,
      homeTeam: merged[`${match.id}_home`] ?? "TBD",
      awayTeam: merged[`${match.id}_away`] ?? "TBD",
      homeFlag: merged[`${match.id}_homeFlag`] ?? "🏳️",
      awayFlag: merged[`${match.id}_awayFlag`] ?? "🏳️",
      provisional: isProvisional,
    };
  }

  const allStages = allStagesRef.current;
  const stageMatches = MATCHES.filter((m) => m.stage === activeStage).map(resolveMatch);

  // My ranking position and points
  const rankingScores = calcRanking(allPredictions, results);
  const myScore = rankingScores.find((s) => s.name === playerName);
  const myRank = myScore ? rankingScores.indexOf(myScore) + 1 : null;

  // Vote distribution per match
  function getVotes(matchId: string): VoteDistribution {
    let home = 0, draw = 0, away = 0;
    for (const preds of Object.values(allPredictions)) {
      const p = preds[matchId];
      if (!p) continue;
      if (p.g1 > p.g2) home++;
      else if (p.g1 < p.g2) away++;
      else draw++;
    }
    return { home, draw, away, total: home + draw + away };
  }

  // Jornada helpers (rangos y filtro base viven en lib/matches.ts)
  function getJornadaMatches(jornada: Jornada | "hoy"): Match[] {
    if (jornada === "hoy") {
      const today = new Date().toLocaleDateString("sv-SE");
      return MATCHES.map(resolveMatch)
        .filter((m) => m.date === today)
        .sort((a, b) => a.time.localeCompare(b.time));
    }
    return getJornadaMatchesBase(jornada).map(resolveMatch).sort((a, b) =>
      a.date !== b.date ? a.date.localeCompare(b.date) : a.time.localeCompare(b.time)
    );
  }

  function groupByDate(matches: Match[]): Record<string, Match[]> {
    return matches.reduce((acc, m) => {
      (acc[m.date] ??= []).push(m);
      return acc;
    }, {} as Record<string, Match[]>);
  }

  function formatDateHeader(dateStr: string): string {
    const d = new Date(`${dateStr}T12:00:00`);
    return d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
  }


  const totalPredictions = Object.keys(predictions).length;
  const totalMatches = MATCHES.length;

  // Pending predictions: matches in current jornada without a prediction that haven't started yet
  const currentJornada = getCurrentJornada();
  const pendingMatches = getJornadaMatches(currentJornada).filter(
    (m) => !predictions[m.id] && !results[m.id] && !isKickoffPast(m)
  );
  const pendingCount = pendingMatches.length;

  if (!playerName) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={() => new Promise(r => setTimeout(r, 600))}>
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
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
        <div
          className="bg-green-500 h-2 rounded-full transition-all"
          style={{ width: `${(totalPredictions / totalMatches) * 100}%` }}
        />
      </div>

      {/* Recordatorio: predicciones pendientes */}
      {pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3 mb-4">
          <span className="text-2xl flex-shrink-0">⏰</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-amber-800">
              {pendingCount === 1
                ? `Te falta 1 predicción en ${JORNADA_LABELS[currentJornada]}`
                : `Te faltan ${pendingCount} predicciones en ${JORNADA_LABELS[currentJornada]}`}
            </p>
            <p className="text-xs text-amber-600">Cada partido cierra 30 min antes de iniciar</p>
          </div>
          <button
            onClick={() => { setViewMode("jornada"); setActiveJornada(currentJornada); }}
            className="flex-shrink-0 text-xs bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-1.5 rounded-lg transition-colors"
          >
            Ver →
          </button>
        </div>
      )}

      {/* Hoy juegan — ocultar cuando el tab "Hoy" ya muestra los mismos partidos */}
      {!(viewMode === "jornada" && activeJornada === "hoy") && (
        <TodayMatches
          matches={MATCHES.map(resolveMatch)}
          predictions={predictions}
          results={results}
        />
      )}

      {/* View mode toggle */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-gray-500 font-medium">Ver:</span>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => setViewMode("stage")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === "stage" ? "bg-green-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Por grupo
          </button>
          <button
            onClick={() => setViewMode("jornada")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-gray-200 ${
              viewMode === "jornada" ? "bg-green-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Por jornada
          </button>
        </div>
      </div>

      {viewMode === "stage" ? (
        <>
          {/* Stage tabs — horizontal scroll, large touch targets */}
          <div className="flex gap-1 overflow-x-auto pb-2 mb-6 -mx-4 px-4 scrollbar-hide">
            <div className="flex gap-1 flex-nowrap">
              <span className="text-xs text-gray-400 self-center px-1 flex-shrink-0">Grupos</span>
              {GROUP_STAGES.map((stage) => {
                const sm = MATCHES.filter((m) => m.stage === stage);
                const predicted = sm.filter((m) => predictions[m.id]).length;
                const hasResult = sm.some((m) => results[m.id]);
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
                    {hasResult && predicted === sm.length && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full" />
                    )}
                  </button>
                );
              })}
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
                  {stage === "round32" ? "R32" : stage === "round16" ? "R16" :
                   stage === "quarters" ? "QF" : stage === "semis" ? "SF" :
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

          {/* Match grid or bracket — swipe to change stage */}
          <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            {KNOCKOUT_STAGES.includes(activeStage as typeof KNOCKOUT_STAGES[number]) ? (
              <>
                <KnockoutBracket matches={stageMatches} predictions={predictions} results={results} />
                <div className="mt-4 space-y-3">
                  {stageMatches.filter((m) => !results[m.id] && m.homeTeam !== "TBD").map((match) => (
                    <MatchCard key={match.id} match={match} prediction={predictions[match.id]}
                      result={results[match.id]} knockoutDecision={knockoutDecisions[match.id]}
                      onPredict={handlePredict} onDelete={handleDelete}
                      saving={saving === match.id} votes={getVotes(match.id)} />
                  ))}
                </div>
              </>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {stageMatches.map((match) => (
                  <MatchCard key={match.id} match={match} prediction={predictions[match.id]}
                    result={results[match.id]} knockoutDecision={knockoutDecisions[match.id]}
                    onPredict={handlePredict} onDelete={handleDelete}
                    saving={saving === match.id} votes={getVotes(match.id)} />
                ))}
              </div>
            )}
          </div>

          {/* Group standings */}
          {GROUP_STAGES.includes(activeStage as typeof GROUP_STAGES[number]) && (() => {
            const standings = calcGroupStandings(activeStage, results);
            const allStandings = calcAllStandings(results);
            const allGroupsComplete = GROUP_STAGES.every((s) => isGroupComplete(s, results));
            const { bestThird } = calcAdvancing(allStandings);
            const bestThirdNames = new Set(bestThird.map((t) => t.team));
            const played = groupMatchesPlayed(activeStage, results);
            return (
              <div className="mt-6">
                <GroupStandings standings={standings} matchesPlayed={played}
                  bestThirdNames={bestThirdNames} allGroupsComplete={allGroupsComplete} />
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
                <button onClick={() => setActiveStage(nextStage)}
                  className="text-green-600 hover:text-green-700 font-medium text-sm">
                  Siguiente: {STAGE_LABELS[nextStage]} →
                </button>
              </div>
            );
          })()}
        </>
      ) : (
        <>
          {/* Jornada tabs */}
          {(() => {
            const today = new Date().toLocaleDateString("sv-SE");
            const hasTodayMatches = MATCHES.some((m) => m.date === today);
            return (
              <div className="flex gap-2 mb-6 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
                {hasTodayMatches && (
                  <button
                    onClick={() => setActiveJornada("hoy")}
                    className={`flex-shrink-0 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      activeJornada === "hoy"
                        ? "bg-green-600 text-white"
                        : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                    }`}
                  >
                    🔥 Hoy
                  </button>
                )}
                {([1, 2, 3, "elim"] as const).map((j) => {
                  const jMatches = getJornadaMatches(j);
                  const predicted = jMatches.filter((m) => predictions[m.id]).length;
                  const hasResult = jMatches.some((m) => results[m.id]);
                  return (
                    <button
                      key={j}
                      onClick={() => setActiveJornada(j)}
                      className={`flex-shrink-0 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors relative ${
                        activeJornada === j
                          ? "bg-green-600 text-white"
                          : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                      }`}
                    >
                      {JORNADA_LABELS[j]}
                      {activeJornada !== j && (
                        <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                          hasResult ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500"
                        }`}>
                          {predicted}/{jMatches.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })()}

          {/* Jornada header */}
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            {activeJornada === "hoy" ? "Partidos de hoy" : JORNADA_LABELS[activeJornada]}
            {activeJornada !== "elim" && activeJornada !== "hoy" && (
              <span className="text-sm font-normal text-gray-400 ml-2">
                {(() => {
                  const [start, end] = JORNADA_RANGES[activeJornada];
                  const s = new Date(`${start}T12:00:00`);
                  const e = new Date(`${end}T12:00:00`);
                  return `${s.getDate()}–${e.getDate()} ${e.toLocaleDateString("es-MX", { month: "long" })}`;
                })()}
              </span>
            )}
          </h3>

          {/* Matches grouped by date */}
          {(() => {
            const jornadaMatches = getJornadaMatches(activeJornada);
            const byDate = groupByDate(jornadaMatches);
            return (
              <div className="space-y-6">
                {Object.entries(byDate).map(([date, dayMatches]) => (
                  <div key={date}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-px flex-1 bg-gray-200" />
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider capitalize">
                        {formatDateHeader(date)}
                      </span>
                      <div className="h-px flex-1 bg-gray-200" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {dayMatches.map((match) => (
                        <MatchCard key={match.id} match={match} prediction={predictions[match.id]}
                          result={results[match.id]} knockoutDecision={knockoutDecisions[match.id]}
                          onPredict={handlePredict} onDelete={handleDelete}
                          saving={saving === match.id} votes={getVotes(match.id)} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </>
      )}
    </div>
    </PullToRefresh>
  );
}
