"use client";
import { PlayerScore } from "@/lib/scoring";

interface Props {
  scores: PlayerScore[];
  currentPlayer?: string;
}

export default function RankingTable({ scores, currentPlayer }: Props) {
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
            <th className="px-4 py-3 text-left w-8">#</th>
            <th className="px-4 py-3 text-left">Jugador</th>
            <th className="px-4 py-3 text-right">Puntos</th>
            <th className="px-4 py-3 text-right hidden sm:table-cell">Aciertos</th>
            <th className="px-4 py-3 text-right hidden sm:table-cell">Jugados</th>
            <th className="px-4 py-3 text-right hidden md:table-cell">%</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {scores.map((player, index) => {
            const isCurrentPlayer = player.name === currentPlayer;
            const pct = player.played > 0
              ? Math.round((player.correct / player.played) * 100)
              : 0;
            const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : null;

            return (
              <tr
                key={player.name}
                className={`transition-colors ${
                  isCurrentPlayer
                    ? "bg-green-50 border-l-4 border-green-500"
                    : "hover:bg-gray-50"
                }`}
              >
                <td className="px-4 py-3 font-bold text-gray-500">
                  {medal ?? index + 1}
                </td>
                <td className="px-4 py-3">
                  <span className={`font-semibold ${isCurrentPlayer ? "text-green-700" : "text-gray-800"}`}>
                    {player.name}
                    {isCurrentPlayer && <span className="ml-2 text-xs text-green-600">(tú)</span>}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-bold text-gray-900 text-base">{player.points}</span>
                  <span className="text-gray-400 text-xs ml-1">pts</span>
                </td>
                <td className="px-4 py-3 text-right text-gray-600 hidden sm:table-cell">
                  {player.correct}
                </td>
                <td className="px-4 py-3 text-right text-gray-500 hidden sm:table-cell">
                  {player.played}
                </td>
                <td className="px-4 py-3 text-right hidden md:table-cell">
                  <span className={`font-medium ${pct >= 60 ? "text-green-600" : pct >= 40 ? "text-yellow-600" : "text-gray-500"}`}>
                    {pct}%
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
