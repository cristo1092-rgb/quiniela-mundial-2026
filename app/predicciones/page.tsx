"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { MATCHES, STAGE_LABELS, GROUP_STAGES, KNOCKOUT_STAGES, Stage } from "@/lib/matches";
import { Prediction, Result, getResultLabel } from "@/lib/scoring";
import { isFirebaseConfigured, getLocalResults } from "@/lib/localFallback";

export default function PrediccionesPage() {
  const [predictions, setPredictions] = useState<Record<string, Record<string, Prediction>>>({});
  const [results, setResults] = useState<Record<string, Result>>({});
  const [activeStage, setActiveStage] = useState<Stage>("groupA");

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
  const allStages = [...GROUP_STAGES, ...KNOCKOUT_STAGES];
  const stageMatches = MATCHES.filter((m) => m.stage === activeStage);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Predicciones de todos</h2>
        <p className="text-gray-500 text-sm mt-1">{players.length} jugadores · {Object.keys(results).length} resultados cargados</p>
      </div>

      {/* Stage tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-6 -mx-4 px-4 scrollbar-hide">
        <div className="flex gap-1 flex-nowrap">
          <span className="text-xs text-gray-400 self-center px-1 flex-shrink-0">Grupos</span>
          {GROUP_STAGES.map((stage) => (
            <button key={stage} onClick={() => setActiveStage(stage)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeStage === stage ? "bg-green-600 text-white" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}>
              {STAGE_LABELS[stage].replace("Grupo ", "")}
            </button>
          ))}
          <span className="text-xs text-gray-400 self-center px-1 flex-shrink-0 ml-2">Eliminatorias</span>
          {KNOCKOUT_STAGES.map((stage) => (
            <button key={stage} onClick={() => setActiveStage(stage)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeStage === stage ? "bg-green-600 text-white" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}>
              {stage === "round32" ? "R32" : stage === "round16" ? "R16" : stage === "quarters" ? "QF" : stage === "semis" ? "SF" : stage === "thirdPlace" ? "3°" : "🏆"}
            </button>
          ))}
        </div>
      </div>

      <h3 className="text-lg font-bold text-gray-800 mb-4">{STAGE_LABELS[activeStage]}</h3>

      {players.length === 0 && (
        <p className="text-center text-gray-400 text-sm py-12">Aún no hay predicciones registradas.</p>
      )}

      <div className="space-y-4">
        {stageMatches.map((match) => {
          const result = results[match.id];
          const actualLabel = result ? getResultLabel(result.g1, result.g2) : null;

          return (
            <div key={match.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Match header */}
              <div className={`px-4 py-3 flex items-center justify-between ${result ? "bg-gray-800 text-white" : "bg-gray-50 border-b border-gray-200"}`}>
                <span className={`font-semibold text-sm ${result ? "text-white" : "text-gray-700"}`}>
                  {match.homeFlag} {match.homeTeam} vs {match.awayTeam} {match.awayFlag}
                </span>
                {result ? (
                  <span className="font-mono font-bold text-lg text-white">{result.g1} — {result.g2}</span>
                ) : (
                  <span className="text-xs text-gray-400">Sin resultado</span>
                )}
              </div>

              {/* Players predictions */}
              {players.length === 0 ? (
                <p className="text-xs text-gray-400 px-4 py-3">Sin predicciones.</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {players.map((player) => {
                    const pred = predictions[player]?.[match.id];
                    if (!pred) return (
                      <div key={player} className="px-4 py-2.5 flex items-center justify-between">
                        <span className="text-sm text-gray-700">{player}</span>
                        <span className="text-xs text-gray-300 italic">Sin predicción</span>
                      </div>
                    );

                    const predLabel = getResultLabel(pred.g1, pred.g2);
                    const isExact = result && pred.g1 === result.g1 && pred.g2 === result.g2;
                    const isCorrect = actualLabel && predLabel === actualLabel;
                    const isWrong = result && !isCorrect;

                    return (
                      <div key={player} className={`px-4 py-2.5 flex items-center justify-between ${
                        isExact ? "bg-yellow-50" : isCorrect ? "bg-green-50" : isWrong ? "bg-red-50" : ""
                      }`}>
                        <span className="text-sm font-medium text-gray-800">{player}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            predLabel === "1" ? "bg-blue-100 text-blue-700" :
                            predLabel === "X" ? "bg-gray-100 text-gray-600" :
                            "bg-orange-100 text-orange-700"
                          }`}>{predLabel}</span>
                          <span className="font-mono font-bold text-gray-800">{pred.g1} — {pred.g2}</span>
                          {isExact && <span className="text-yellow-500 text-sm">⭐</span>}
                          {!isExact && isCorrect && <span className="text-green-500 text-sm">✓</span>}
                          {isWrong && <span className="text-red-400 text-sm">✗</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
