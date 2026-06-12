"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { MATCHES, KNOCKOUT_STAGES, GROUP_STAGES, getMatchKickoffUTC } from "@/lib/matches";
import Flag from "@/components/Flag";
import { Prediction, Result, getResultLabel } from "@/lib/scoring";
import { isFirebaseConfigured, getLocalResults } from "@/lib/localFallback";

type JornadaTab = 1 | 2 | 3 | "elim";

const JORNADA_RANGES: Record<1 | 2 | 3, [string, string]> = {
  1: ["2026-06-11", "2026-06-17"],
  2: ["2026-06-18", "2026-06-24"],
  3: ["2026-06-25", "2026-06-27"],
};
const JORNADA_LABELS: Record<JornadaTab, string> = {
  1: "Jornada 1",
  2: "Jornada 2",
  3: "Jornada 3",
  elim: "Eliminatorias",
};

function getCurrentJornada(): JornadaTab {
  const today = new Date().toISOString().slice(0, 10);
  if (today < "2026-06-18") return 1;
  if (today < "2026-06-25") return 2;
  if (today <= "2026-06-27") return 3;
  return "elim";
}

function formatDateHeader(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
}

export default function PrediccionesPage() {
  const [predictions, setPredictions] = useState<Record<string, Record<string, Prediction>>>({});
  const [results, setResults] = useState<Record<string, Result>>({});
  const [activeJornada, setActiveJornada] = useState<JornadaTab>(getCurrentJornada);

  useEffect(() => {
    setResults(getLocalResults());
    if (!isFirebaseConfigured()) return;
    const unsubR = onValue(ref(db, "results"), (snap) => {
      setResults({ ...getLocalResults(), ...(snap.val() ?? {}) });
    });
    const unsubP = onValue(ref(db, "predictions"), (snap) => {
      setPredictions(snap.val() ?? {});
    });
    return () => { unsubR(); unsubP(); };
  }, []);

  const players = Object.keys(predictions).sort();

  // Get matches for the active jornada, sorted by date+time
  function getJornadaMatches() {
    let base;
    if (activeJornada === "elim") {
      base = MATCHES.filter((m) => KNOCKOUT_STAGES.includes(m.stage as typeof KNOCKOUT_STAGES[number]));
    } else {
      const [start, end] = JORNADA_RANGES[activeJornada];
      base = MATCHES.filter((m) =>
        GROUP_STAGES.includes(m.stage as typeof GROUP_STAGES[number]) &&
        m.date >= start && m.date <= end
      );
    }
    return base.sort((a, b) =>
      a.date !== b.date ? a.date.localeCompare(b.date) : a.time.localeCompare(b.time)
    );
  }

  // Group matches by date
  function groupByDate(matches: typeof MATCHES) {
    return matches.reduce((acc, m) => {
      (acc[m.date] ??= []).push(m);
      return acc;
    }, {} as Record<string, typeof MATCHES>);
  }

  const jornadaMatches = getJornadaMatches();
  const byDate = groupByDate(jornadaMatches);
  const totalMatches = jornadaMatches.length;
  const matchesWithResult = jornadaMatches.filter((m) => results[m.id]).length;

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-gray-900">Predicciones</h2>
        <p className="text-gray-500 text-sm mt-1">
          {players.length} jugadores · {Object.keys(results).length} resultados cargados
        </p>
      </div>

      {/* Jornada tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-4 px-4 scrollbar-hide">
        {([1, 2, 3, "elim"] as JornadaTab[]).map((j) => {
          const jMatches = (() => {
            if (j === "elim") return MATCHES.filter((m) => KNOCKOUT_STAGES.includes(m.stage as typeof KNOCKOUT_STAGES[number]));
            const [start, end] = JORNADA_RANGES[j];
            return MATCHES.filter((m) => GROUP_STAGES.includes(m.stage as typeof GROUP_STAGES[number]) && m.date >= start && m.date <= end);
          })();
          const withResult = jMatches.filter((m) => results[m.id]).length;
          return (
            <button
              key={j}
              onClick={() => setActiveJornada(j)}
              className={`flex-shrink-0 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeJornada === j
                  ? "bg-green-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {JORNADA_LABELS[j]}
              {withResult > 0 && activeJornada !== j && (
                <span className="ml-1.5 text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">
                  {withResult}/{jMatches.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Jornada subtitle */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-gray-700">
          {JORNADA_LABELS[activeJornada]}
          {activeJornada !== "elim" && (
            <span className="text-sm font-normal text-gray-400 ml-2">
              {(() => {
                const [s, e] = JORNADA_RANGES[activeJornada];
                const sd = new Date(`${s}T12:00:00`);
                const ed = new Date(`${e}T12:00:00`);
                return `${sd.getDate()}–${ed.getDate()} ${ed.toLocaleDateString("es-MX", { month: "long" })}`;
              })()}
            </span>
          )}
        </h3>
        {matchesWithResult > 0 && (
          <span className="text-xs text-gray-400">{matchesWithResult}/{totalMatches} con resultado</span>
        )}
      </div>

      {players.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">📋</div>
          <p>Aún no hay predicciones registradas.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(byDate).map(([date, dayMatches]) => (
            <div key={date}>
              {/* Date divider */}
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider capitalize">
                  {formatDateHeader(date)}
                </span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <div className="space-y-3">
                {dayMatches.map((match) => {
                  const result = results[match.id];
                  const actualLabel = result ? getResultLabel(result.g1, result.g2) : null;
                  const playersWithPred = players.filter((p) => predictions[p]?.[match.id]);
                  const kickoff = getMatchKickoffUTC(match).toLocaleString("es-MX", {
                    timeZone: "America/Monterrey",
                    hour: "2-digit", minute: "2-digit",
                  });

                  return (
                    <div key={match.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      {/* Match header */}
                      <div className={`px-4 py-3 flex items-center justify-between gap-3 ${
                        result ? "bg-gray-800" : "bg-gray-50 border-b border-gray-100"
                      }`}>
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <Flag code={match.homeFlag} size={16} />
                          <span className={`font-semibold text-sm truncate ${result ? "text-white" : "text-gray-700"}`}>
                            {match.homeTeam}
                          </span>
                          <span className={`opacity-40 shrink-0 text-xs ${result ? "text-white" : "text-gray-500"}`}>vs</span>
                          <span className={`font-semibold text-sm truncate ${result ? "text-white" : "text-gray-700"}`}>
                            {match.awayTeam}
                          </span>
                          <Flag code={match.awayFlag} size={16} />
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {!result && (
                            <span className="text-xs text-gray-400">⚽ {kickoff}</span>
                          )}
                          {result ? (
                            <span className="font-mono font-black text-xl text-white">{result.g1}–{result.g2}</span>
                          ) : (
                            <span className="text-xs text-gray-300 hidden sm:block">Sin resultado</span>
                          )}
                        </div>
                      </div>

                      {/* Prediction bar */}
                      {(() => {
                        const homePlayers = players.filter(p => predictions[p]?.[match.id] && getResultLabel(predictions[p][match.id].g1, predictions[p][match.id].g2) === "1");
                        const drawPlayers = players.filter(p => predictions[p]?.[match.id] && getResultLabel(predictions[p][match.id].g1, predictions[p][match.id].g2) === "X");
                        const awayPlayers = players.filter(p => predictions[p]?.[match.id] && getResultLabel(predictions[p][match.id].g1, predictions[p][match.id].g2) === "2");
                        const total = homePlayers.length + drawPlayers.length + awayPlayers.length;

                        if (total === 0) return (
                          <div className="px-4 py-3">
                            <span className="text-xs text-gray-400 italic">Nadie ha predicho este partido aún</span>
                          </div>
                        );

                        const homePct = Math.round((homePlayers.length / total) * 100);
                        const drawPct = Math.round((drawPlayers.length / total) * 100);
                        const awayPct = 100 - homePct - drawPct;

                        return (
                          <div className="px-4 py-3">
                            {/* % labels */}
                            <div className="flex justify-between text-xs mb-1.5">
                              <div>
                                <div className="font-semibold text-gray-700 truncate max-w-[90px]">{match.homeTeam}</div>
                                <div className="font-black text-blue-500">{homePct}%</div>
                              </div>
                              <div className="text-center">
                                <div className="font-semibold text-gray-700">Empate</div>
                                <div className="font-black text-gray-400">{drawPct}%</div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold text-gray-700 truncate max-w-[90px]">{match.awayTeam}</div>
                                <div className="font-black text-orange-500">{awayPct}%</div>
                              </div>
                            </div>
                            {/* Bar */}
                            <div className="flex h-2.5 rounded-full overflow-hidden gap-px">
                              {homePct > 0 && <div style={{width:`${homePct}%`}} className="bg-blue-500 rounded-l-full" />}
                              {drawPct > 0 && <div style={{width:`${drawPct}%`}} className={`bg-gray-300 ${homePct === 0 ? "rounded-l-full" : ""} ${awayPct === 0 ? "rounded-r-full" : ""}`} />}
                              {awayPct > 0 && <div style={{width:`${awayPct}%`}} className="bg-orange-400 rounded-r-full" />}
                            </div>
                            {/* Player name pills */}
                            <div className="mt-2.5 flex flex-wrap gap-1">
                              {players.filter(p => predictions[p]?.[match.id]).map(player => {
                                const pred = predictions[player][match.id];
                                const predLabel = getResultLabel(pred.g1, pred.g2);
                                const isExact = result && pred.g1 === result.g1 && pred.g2 === result.g2;
                                const isCorrect = result && actualLabel && predLabel === actualLabel && !isExact;
                                const isWrong = result && !isExact && !isCorrect;
                                return (
                                  <span key={player} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
                                    isExact   ? "bg-yellow-50 border-yellow-300 text-yellow-800" :
                                    isCorrect ? "bg-green-50 border-green-300 text-green-700" :
                                    isWrong   ? "bg-red-50 border-red-200 text-red-600" :
                                    predLabel === "1" ? "bg-blue-50 border-blue-200 text-blue-700" :
                                    predLabel === "X" ? "bg-gray-100 border-gray-200 text-gray-500" :
                                                        "bg-orange-50 border-orange-200 text-orange-700"
                                  }`}>
                                    {player}
                                    {result ? (
                                      <span className="font-mono font-bold">{pred.g1}–{pred.g2} {isExact ? "⭐" : isCorrect ? "✓" : "✗"}</span>
                                    ) : predLabel === "X" ? (
                                      <span className="font-semibold">Emp</span>
                                    ) : (
                                      <Flag code={predLabel === "1" ? match.homeFlag : match.awayFlag} size={12} />
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
