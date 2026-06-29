"use client";
import { useState } from "react";
import { PlayerScore, Prediction, Result, calcMatchPoints, getResultLabel } from "@/lib/scoring";
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

  if (scores.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-4xl mb-3">🏆</div>
        <p>Nadie ha hecho predicciones aún.</p>
        <p className="text-sm mt-1">¡Sé el primero!</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
            <th className="px-3 py-3 text-left w-8">#</th>
            <th className="px-3 py-3 text-left">Jugador</th>
            <th className="px-3 py-3 text-right">Puntos</th>
            <th className="px-3 py-3 text-right hidden sm:table-cell">Aciertos</th>
            <th className="px-3 py-3 text-right hidden sm:table-cell">Jugados</th>
            <th className="px-3 py-3 text-right hidden md:table-cell">%</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {scores.map((player, index) => {
            const isCurrentPlayer = player.name === currentPlayer;
            const pct = player.played > 0
              ? Math.round((player.correct / player.played) * 100)
              : 0;
            const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : null;
            const isExpanded = expanded === player.name;
            const hasDetail = !!(allPredictions && results);

            // Build per-match breakdown for this player
            const playerPreds = allPredictions?.[player.name] ?? {};
            const playedMatches = results
              ? MATCHES.filter((m) => results[m.id] && playerPreds[m.id])
              : [];

            return [
              <tr
                key={player.name}
                onClick={() => hasDetail && setExpanded(isExpanded ? null : player.name)}
                className={`transition-colors ${
                  isCurrentPlayer
                    ? "bg-green-50 border-l-4 border-green-500"
                    : "hover:bg-gray-50"
                } ${hasDetail ? "cursor-pointer select-none" : ""}`}
              >
                <td className="px-3 py-3 font-bold text-gray-500">
                  <span className="flex items-center gap-1">
                    {medal ?? index + 1}
                    {movement && movement[player.name] !== undefined && movement[player.name] !== 0 && (
                      movement[player.name] > 0
                        ? <span className="text-[10px] text-green-600 font-black">▲{movement[player.name]}</span>
                        : <span className="text-[10px] text-red-500 font-black">▼{Math.abs(movement[player.name])}</span>
                    )}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1.5">
                    {avatars?.[player.name] && (
                      <span className="text-xl flex-shrink-0">{avatars[player.name]}</span>
                    )}
                    <span className={`font-semibold truncate max-w-[130px] block ${isCurrentPlayer ? "text-green-700" : "text-gray-800"}`}>
                      {player.name}
                      {isCurrentPlayer && <span className="ml-1 text-xs text-green-600">(tú)</span>}
                    </span>
                    {hasDetail && (
                      <span className={`text-gray-300 text-xs transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>▼</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-3 text-right">
                  <span className="font-bold text-gray-900 text-base">{player.points}</span>
                  <span className="text-gray-400 text-xs ml-1">pts</span>
                </td>
                <td className="px-3 py-3 text-right text-gray-600 hidden sm:table-cell">
                  {player.correct}
                </td>
                <td className="px-3 py-3 text-right text-gray-500 hidden sm:table-cell">
                  {player.played}
                </td>
                <td className="px-3 py-3 text-right hidden md:table-cell">
                  <span className={`font-medium ${pct >= 60 ? "text-green-600" : pct >= 40 ? "text-yellow-600" : "text-gray-500"}`}>
                    {pct}%
                  </span>
                </td>
              </tr>,

              // Expanded detail row
              isExpanded && hasDetail && (
                <tr key={`${player.name}-detail`} className={isCurrentPlayer ? "bg-green-50" : "bg-gray-50"}>
                  <td colSpan={6} className="px-3 py-3">
                    {playedMatches.length === 0 ? (
                      <p className="text-xs text-gray-400 italic text-center py-2">Ningún partido jugado aún.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-64 overflow-y-auto">
                        <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Historial partido por partido</p>
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
                  </td>
                </tr>
              ),
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}
