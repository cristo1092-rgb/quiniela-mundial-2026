"use client";
import { useEffect, useState } from "react";
import { Match, getDeadlineUTC, isKickoffPast } from "@/lib/matches";
import { Prediction, Result } from "@/lib/scoring";
import Flag from "@/components/Flag";

interface Props {
  matches: Match[]; // ya resueltos (knockoutTeams aplicados)
  predictions: Record<string, Prediction>;
  results: Record<string, Result>;
}

function formatCountdown(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function TodayMatches({ matches, predictions, results }: Props) {
  // Re-render cada 30s para mantener el countdown vivo
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const today = new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD local
  const todayMatches = matches
    .filter((m) => m.date === today)
    .sort((a, b) => a.time.localeCompare(b.time));

  if (todayMatches.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
      <div className="bg-gradient-to-r from-green-700 to-green-600 px-4 py-2.5 flex items-center justify-between">
        <p className="text-white text-xs font-bold uppercase tracking-wider">🔥 Hoy juegan</p>
        <span className="text-green-200 text-xs font-semibold">{todayMatches.length} partido{todayMatches.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="divide-y divide-gray-100">
        {todayMatches.map((m) => {
          const pred = predictions[m.id];
          const result = results[m.id];
          const closed = isKickoffPast(m);
          const msLeft = getDeadlineUTC(m).getTime() - Date.now();
          const closingSoon = !closed && msLeft <= 60 * 60 * 1000;

          return (
            <div key={m.id} className="flex items-center gap-2 px-4 py-2.5">
              <span className="text-xs text-gray-400 font-semibold w-11 flex-shrink-0">{m.time}</span>
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <Flag code={m.homeFlag} size={18} />
                <span className="text-sm font-semibold text-gray-800 truncate">{m.homeTeam}</span>
                <span className="text-xs text-gray-400 flex-shrink-0">vs</span>
                <span className="text-sm font-semibold text-gray-800 truncate">{m.awayTeam}</span>
                <Flag code={m.awayFlag} size={18} />
              </div>
              <div className="flex-shrink-0">
                {result ? (
                  <span className="text-xs font-black text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">
                    {result.g1}-{result.g2}
                  </span>
                ) : closed ? (
                  <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">🔒</span>
                ) : pred ? (
                  <span className="text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                    ✓ {pred.g1}-{pred.g2}
                  </span>
                ) : (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    closingSoon ? "text-amber-700 bg-amber-50 border border-amber-200" : "text-gray-500 bg-gray-50 border border-gray-200"
                  }`}>
                    ⏱ Cierra en {formatCountdown(msLeft)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
