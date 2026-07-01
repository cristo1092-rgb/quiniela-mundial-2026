"use client";
import { useState } from "react";
import { PlayerScore, Prediction, Result, calcMatchPoints } from "@/lib/scoring";
import { MATCHES } from "@/lib/matches";

interface Props {
  scores: PlayerScore[];
  currentPlayer?: string;
  allPredictions?: Record<string, Record<string, Prediction>>;
  results?: Record<string, Result>;
  avatars?: Record<string, string>;
  /** Positions gained (+) or lost (−) vs. before the current jornada */
  movement?: Record<string, number>;
  /** Resolved knockout team names keyed by `${matchId}_home` / `${matchId}_away` */
  knockoutTeams?: Record<string, string>;
}

export default function RankingTable({ scores, currentPlayer, allPredictions, results, avatars, movement, knockoutTeams }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [historyPlayer, setHistoryPlayer] = useState<string | null>(null);

  if (scores.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-4xl mb-3">🏆</div>
        <p>Nadie ha hecho predicciones aún.</p>
        <p className="text-sm mt-1">¡Sé el primero!</p>
      </div>
    );
  }

  const hasDetail = !!(allPredictions && results);

  return (
    <div className="divide-y divide-gray-100">
      {scores.map((player, index) => {
        const isCurrentPlayer = player.name === currentPlayer;
        const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : null;
        const isExpanded = expanded === player.name;
        const showHistory = historyPlayer === player.name;
        const move = movement?.[player.name];

        const playerPreds = allPredictions?.[player.name] ?? {};
        const playedMatches = results
          ? MATCHES.filter((m) => results[m.id] && playerPreds[m.id])
          : [];

        return (
          <div key={player.name}>
            {/* Main row */}
            <div
              onClick={() => {
                if (!hasDetail) return;
                if (isExpanded) {
                  setExpanded(null);
                  setHistoryPlayer(null);
                } else {
                  setExpanded(player.name);
                  setHistoryPlayer(null);
                }
              }}
              className={`flex items-center gap-3 px-4 py-3.5 transition-colors ${
                isCurrentPlayer
                  ? "bg-green-50 border-l-4 border-green-500"
                  : "hover:bg-gray-50"
              } ${hasDetail ? "cursor-pointer select-none" : ""}`}
            >
              {/* Position + movement */}
              <div className="w-8 flex-shrink-0 flex items-center gap-0.5">
                <span className="text-sm font-bold text-gray-500">{medal ?? index + 1}</span>
                {move !== undefined && move !== 0 && (
                  move > 0
                    ? <span className="text-[10px] text-green-600 font-black">▲{move}</span>
                    : <span className="text-[10px] text-red-500 font-black">▼{Math.abs(move)}</span>
                )}
              </div>

              {/* Avatar + name */}
              <div className="flex-1 flex items-center gap-2 min-w-0">
                {avatars?.[player.name] && (
                  <span className="text-xl flex-shrink-0">{avatars[player.name]}</span>
                )}
                <span className={`font-semibold truncate ${isCurrentPlayer ? "text-green-700" : "text-gray-800"}`}>
                  {player.name}
                  {isCurrentPlayer && <span className="ml-1 text-xs text-green-600 font-normal">(tú)</span>}
                </span>
                {hasDetail && (
                  <span className={`text-gray-300 text-xs flex-shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>▼</span>
                )}
              </div>

              {/* Points */}
              <div className="flex-shrink-0 text-right">
                <span className="text-xl font-black text-gray-900">{player.points}</span>
                <span className="text-xs text-gray-400 ml-0.5">pts</span>
              </div>
            </div>

            {/* Stats summary (first tap) */}
            {isExpanded && hasDetail && (
              <div className={`px-4 py-3 border-t border-gray-100 ${isCurrentPlayer ? "bg-green-50/60" : "bg-gray-50"}`}>
                {playedMatches.length === 0 ? (
                  <p className="text-xs text-gray-400 italic text-center py-1">Ningún partido jugado aún.</p>
                ) : (
                  <>
                    {/* 4-stat summary */}
                    <div className="grid grid-cols-4 gap-1 text-center mb-3">
                      <div>
                        <p className="text-lg font-black text-gray-900">{player.points}</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Pts</p>
                      </div>
                      <div>
                        <p className="text-lg font-black text-yellow-500">{player.exact}</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Exactos</p>
                      </div>
                      <div>
                        <p className="text-lg font-black text-green-600">{player.correct}</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Correctos</p>
                      </div>
                      <div>
                        <p className="text-lg font-black text-gray-500">{player.played}</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Jugados</p>
                      </div>
                    </div>

                    {/* History toggle */}
                    {!showHistory ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); setHistoryPlayer(player.name); }}
                        className="text-xs text-green-600 font-semibold hover:underline w-full text-center py-0.5"
                      >
                        Ver partidos →
                      </button>
                    ) : (
                      <div className="space-y-1.5 mt-1">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Historial</p>
                        {playedMatches.map((m) => {
                          const pred = playerPreds[m.id];
                          const res = results![m.id];
                          const pts = calcMatchPoints(pred, res);
                          const isExact = pts === 5;
                          const isCorrect = pts === 3;
                          return (
                            <div key={m.id} className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs border ${
                              isExact   ? "bg-yellow-50 border-yellow-200" :
                              isCorrect ? "bg-green-50 border-green-200" :
                                          "bg-red-50 border-red-100"
                            }`}>
                              <span className="font-medium text-gray-700 truncate max-w-[160px]">
                                {knockoutTeams?.[`${m.id}_home`] ?? m.homeTeam} — {knockoutTeams?.[`${m.id}_away`] ?? m.awayTeam}
                              </span>
                              <div className="flex items-center gap-2 shrink-0 ml-2">
                                <span className="text-gray-500">
                                  Pred: <span className="font-mono font-bold text-gray-700">{pred.g1}–{pred.g2}</span>
                                </span>
                                <span className="text-gray-400">|</span>
                                <span className="text-gray-500">
                                  Real: <span className="font-mono font-bold text-gray-700">{res.g1}–{res.g2}</span>
                                </span>
                                <span className={`font-bold min-w-[32px] text-right ${isExact ? "text-yellow-600" : isCorrect ? "text-green-600" : "text-red-500"}`}>
                                  {isExact ? "⭐ +5" : isCorrect ? "✓ +3" : "✗ 0"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
