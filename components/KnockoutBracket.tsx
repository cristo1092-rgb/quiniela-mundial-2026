import Flag from "@/components/Flag";
import { Match } from "@/lib/matches";
import { Prediction, Result } from "@/lib/scoring";

interface Props {
  matches: Match[];
  predictions: Record<string, Prediction>;
  results: Record<string, Result>;
}

function TeamRow({ flag, name, goals, isWinner, isTBD }: {
  flag: string; name: string; goals?: number; isWinner?: boolean; isTBD?: boolean;
}) {
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1.5 ${isWinner ? "bg-green-50" : ""}`}>
      <Flag code={flag} size={16} />
      <span className={`text-xs flex-1 truncate ${
        isTBD ? "text-gray-300 italic" :
        isWinner ? "font-bold text-green-800" : "text-gray-700"
      }`}>
        {isTBD ? "Por definir" : name}
      </span>
      {goals !== undefined && (
        <span className={`font-mono font-bold text-xs min-w-[16px] text-right ${isWinner ? "text-green-700" : "text-gray-500"}`}>
          {goals}
        </span>
      )}
    </div>
  );
}

export default function KnockoutBracket({ matches, predictions, results }: Props) {
  if (matches.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
      {matches.map((m) => {
        const result = results[m.id];
        const pred = predictions[m.id];
        const isTBDHome = m.homeTeam === "TBD";
        const isTBDAway = m.awayTeam === "TBD";
        const homeWins = result && result.g1 > result.g2;
        const awayWins = result && result.g1 < result.g2;

        return (
          <div key={m.id} className={`rounded-xl border-2 overflow-hidden shadow-sm ${
            result ? "border-gray-300 bg-white" : "border-dashed border-gray-200 bg-gray-50"
          }`}>
            {/* Match label */}
            <div className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider flex items-center justify-between ${
              result ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-400"
            }`}>
              <span>{m.homeLabel || m.awayLabel || "Partido"}</span>
              {pred && !result && (
                <span className="text-blue-300 normal-case font-normal">Mi pred: {pred.g1}–{pred.g2}</span>
              )}
              {result && pred && (
                <span className={`normal-case font-normal ${
                  pred.g1 === result.g1 && pred.g2 === result.g2 ? "text-yellow-400" :
                  ((pred.g1 > pred.g2) === (result.g1 > result.g2) && pred.g1 !== pred.g2) ||
                  (pred.g1 === pred.g2 && result.g1 === result.g2) ? "text-green-400" : "text-red-400"
                }`}>
                  {pred.g1}–{pred.g2}
                </span>
              )}
            </div>

            {/* Home team */}
            <TeamRow
              flag={m.homeFlag}
              name={m.homeTeam}
              goals={result?.g1}
              isWinner={!!homeWins}
              isTBD={isTBDHome}
            />
            <div className="h-px bg-gray-100 mx-2" />
            {/* Away team */}
            <TeamRow
              flag={m.awayFlag}
              name={m.awayTeam}
              goals={result?.g2}
              isWinner={!!awayWins}
              isTBD={isTBDHome || isTBDAway}
            />
          </div>
        );
      })}
    </div>
  );
}
