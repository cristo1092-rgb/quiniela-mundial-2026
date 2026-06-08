"use client";
import { useState, useEffect } from "react";
import { Match, isKickoffPast, getKickoffUTC } from "@/lib/matches";
import { Prediction, Result, getResultLabel } from "@/lib/scoring";

interface Props {
  match: Match;
  prediction?: Prediction;
  result?: Result;
  onPredict: (matchId: string, pred: Prediction) => void;
  saving?: boolean;
}

export default function MatchCard({ match, prediction, result, onPredict, saving }: Props) {
  const [localG1, setLocalG1] = useState<string>(prediction !== undefined ? String(prediction.g1) : "");
  const [localG2, setLocalG2] = useState<string>(prediction !== undefined ? String(prediction.g2) : "");

  // Sync when prediction changes externally (e.g. Firebase push)
  useEffect(() => {
    if (prediction !== undefined) {
      setLocalG1(String(prediction.g1));
      setLocalG2(String(prediction.g2));
    }
  }, [prediction]);

  const isLocked = !!result;
  const isTBD = match.homeTeam === "TBD" || match.awayTeam === "TBD";
  const kickoffPast = isKickoffPast(match); // true once kickoff time passes in Monterrey CDT
  const canPredict = !isLocked && !isTBD && !kickoffPast;

  // Points calculation
  const predLabel = prediction !== undefined ? getResultLabel(prediction.g1, prediction.g2) : null;
  const actualLabel = result ? getResultLabel(result.g1, result.g2) : null;
  const isExact = prediction !== undefined && result &&
    prediction.g1 === result.g1 && prediction.g2 === result.g2;
  const isResultCorrect = predLabel && actualLabel && predLabel === actualLabel;
  const isWrong = result && prediction !== undefined && !isResultCorrect;

  function handleSave() {
    if (!canPredict) return;
    const g1 = parseInt(localG1);
    const g2 = parseInt(localG2);
    if (isNaN(g1) || isNaN(g2) || g1 < 0 || g2 < 0) return;
    onPredict(match.id, { g1, g2 });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSave();
  }

  const hasPendingChange = prediction === undefined
    ? (localG1 !== "" || localG2 !== "")
    : (localG1 !== String(prediction.g1) || localG2 !== String(prediction.g2));

  return (
    <div className={`bg-white rounded-xl border-2 transition-all ${
      isExact        ? "border-yellow-400 bg-yellow-50" :
      isResultCorrect ? "border-green-400 bg-green-50" :
      isWrong        ? "border-red-300 bg-red-50" :
      isLocked       ? "border-gray-200 bg-gray-50" :
                       "border-gray-100 hover:border-gray-300"
    }`}>

      {/* Result banner */}
      {result && (
        <div className={`rounded-t-xl px-4 py-2 flex items-center justify-between ${
          isExact         ? "bg-yellow-400 text-yellow-900" :
          isResultCorrect ? "bg-green-500 text-white" :
          isWrong         ? "bg-red-400 text-white" :
                            "bg-gray-700 text-white"
        }`}>
          <span className="text-xs opacity-75">Resultado final</span>
          <span className="font-mono font-bold text-xl tracking-widest">
            {result.g1} — {result.g2}
          </span>
          <span className="text-xs font-bold">
            {!prediction  ? "Sin pred." :
             isExact      ? "⭐ +5 pts" :
             isResultCorrect ? "✓ +3 pts" :
                            "✗ 0 pts"}
          </span>
        </div>
      )}

      <div className="p-4">
        {/* Teams + score inputs row */}
        <div className="flex items-center gap-2">
          {/* Home team */}
          <div className="flex-1 flex flex-col items-center text-center min-w-0">
            <span className="text-3xl leading-none">{match.homeFlag}</span>
            <span className="text-xs font-semibold text-gray-700 mt-1 leading-tight truncate w-full px-1">
              {isTBD && match.homeLabel
                ? <span className="text-gray-400 italic">{match.homeLabel}</span>
                : match.homeTeam}
            </span>
          </div>

          {/* Score inputs */}
          <div className="flex-shrink-0 flex flex-col items-center gap-1">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="20"
                value={localG1}
                onChange={(e) => canPredict && setLocalG1(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                disabled={!canPredict}
                placeholder="?"
                inputMode="numeric"
                className={`w-12 h-12 text-center font-bold text-xl rounded-xl border-2 focus:outline-none transition-colors touch-manipulation
                  ${!canPredict
                    ? "bg-gray-100 border-gray-200 text-gray-500 cursor-default"
                    : hasPendingChange && localG1 !== ""
                    ? "border-green-400 focus:border-green-500 bg-white"
                    : "border-gray-300 focus:border-green-500 bg-white"
                  }`}
              />
              <span className="text-gray-400 font-bold">—</span>
              <input
                type="number"
                min="0"
                max="20"
                value={localG2}
                onChange={(e) => canPredict && setLocalG2(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                disabled={!canPredict}
                placeholder="?"
                inputMode="numeric"
                className={`w-12 h-12 text-center font-bold text-xl rounded-xl border-2 focus:outline-none transition-colors touch-manipulation
                  ${!canPredict
                    ? "bg-gray-100 border-gray-200 text-gray-500 cursor-default"
                    : hasPendingChange && localG2 !== ""
                    ? "border-green-400 focus:border-green-500 bg-white"
                    : "border-gray-300 focus:border-green-500 bg-white"
                  }`}
              />
            </div>
            <span className="text-xs text-gray-400">
              {getKickoffUTC(match).toLocaleString("es-MX", {
                timeZone: "America/Monterrey",
                day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
              })}
            </span>
            {/* Deduced result label */}
            {localG1 !== "" && localG2 !== "" && !isNaN(parseInt(localG1)) && !isNaN(parseInt(localG2)) && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                canPredict ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
              }`}>
                {getResultLabel(parseInt(localG1), parseInt(localG2))}
              </span>
            )}
          </div>

          {/* Away team */}
          <div className="flex-1 flex flex-col items-center text-center min-w-0">
            <span className="text-3xl leading-none">{match.awayFlag}</span>
            <span className="text-xs font-semibold text-gray-700 mt-1 leading-tight truncate w-full px-1">
              {isTBD && match.awayLabel
                ? <span className="text-gray-400 italic">{match.awayLabel}</span>
                : match.awayTeam}
            </span>
          </div>
        </div>

        {/* Status row */}
        <div className="mt-3 flex items-center justify-between text-xs">
          {/* Prediction saved badge */}
          {prediction !== undefined && !result && (
            <span className="text-green-600 font-medium flex items-center gap-1">
              {saving ? (
                <span className="inline-block w-3 h-3 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              ) : "✓"} Guardado: {prediction.g1}–{prediction.g2}
            </span>
          )}
          {!prediction && !result && !isTBD && !kickoffPast && (
            <span className="text-gray-400 italic">Sin predicción</span>
          )}
          {isLocked && !prediction && (
            <span className="text-gray-400 italic">Sin predicción</span>
          )}
          {/* Lock indicator */}
          {(isLocked || kickoffPast) && (
            <span className="text-gray-400 flex items-center gap-1 ml-auto">
              🔒 {isLocked ? "Cerrado" : "Iniciado"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
