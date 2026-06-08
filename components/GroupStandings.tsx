"use client";
import { TeamStats } from "@/lib/standings";
import Flag from "@/components/Flag";

interface Props {
  standings: TeamStats[];
  matchesPlayed: number;   // 0-6
  bestThirdNames?: Set<string>; // teams that advance as best 3rd
  allGroupsComplete?: boolean;  // only show "3° mejor" badge when all 12 groups finished
}

export default function GroupStandings({ standings, matchesPlayed, bestThirdNames, allGroupsComplete }: Props) {
  if (standings.length === 0) return null;

  function advanceBadge(t: TeamStats, pos: number) {
    if (pos <= 2) return (
      <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-700">Clasifica</span>
    );
    // Only show "3° Mejor" once ALL 12 groups are done — before that it's provisional
    if (pos === 3 && allGroupsComplete && bestThirdNames?.has(t.team)) return (
      <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">3° Mejor</span>
    );
    if (pos === 3 && matchesPlayed === 6 && !allGroupsComplete) return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-600 border border-yellow-200">En espera</span>
    );
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h4 className="font-bold text-gray-800 text-sm">Tabla de posiciones</h4>
        <span className="text-xs text-gray-500">{matchesPlayed}/6 partidos jugados</span>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100">
            <th className="px-3 py-2 text-left w-6">#</th>
            <th className="px-3 py-2 text-left">Equipo</th>
            <th className="px-3 py-2 text-center w-8 font-medium">PJ</th>
            <th className="px-3 py-2 text-center w-8 font-medium hidden sm:table-cell">G</th>
            <th className="px-3 py-2 text-center w-8 font-medium hidden sm:table-cell">E</th>
            <th className="px-3 py-2 text-center w-8 font-medium hidden sm:table-cell">P</th>
            <th className="px-3 py-2 text-center w-10 font-medium">GD</th>
            <th className="px-3 py-2 text-center w-8 font-medium">GF</th>
            <th className="px-3 py-2 text-center w-10 font-bold text-gray-700">Pts</th>
            <th className="px-3 py-2 text-left hidden sm:table-cell"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {standings.map((team, idx) => {
            const pos = idx + 1;
            const isAdvancing = pos <= 2 || (allGroupsComplete && bestThirdNames?.has(team.team));
            return (
              <tr key={team.team} className={`transition-colors ${
                pos === 1 ? "bg-green-50" :
                pos === 2 ? "bg-green-50/60" :
                isAdvancing ? "bg-blue-50/40" :
                "hover:bg-gray-50"
              }`}>
                <td className="px-3 py-2.5 font-bold text-gray-500 text-center">{pos}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Flag code={team.flag} size={20} />
                    <span className={`font-semibold text-sm ${isAdvancing ? "text-gray-900" : "text-gray-600"}`}>
                      {team.team}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-center text-gray-600">{team.played}</td>
                <td className="px-3 py-2.5 text-center text-gray-600 hidden sm:table-cell">{team.won}</td>
                <td className="px-3 py-2.5 text-center text-gray-600 hidden sm:table-cell">{team.drawn}</td>
                <td className="px-3 py-2.5 text-center text-gray-600 hidden sm:table-cell">{team.lost}</td>
                <td className="px-3 py-2.5 text-center font-medium text-gray-700">
                  {team.gd > 0 ? `+${team.gd}` : team.gd}
                </td>
                <td className="px-3 py-2.5 text-center text-gray-600">{team.gf}</td>
                <td className="px-3 py-2.5 text-center">
                  <span className="font-bold text-gray-900 text-base">{team.pts}</span>
                </td>
                <td className="px-3 py-2.5 hidden sm:table-cell">
                  {advanceBadge(team, pos)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Legend */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-green-100 inline-block" /> Clasifica directo
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-blue-100 inline-block" /> Mejor 3°
        </span>
      </div>
    </div>
  );
}
