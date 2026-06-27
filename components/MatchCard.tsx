"use client";
import { useState, useEffect, useRef } from "react";
import { Match, isKickoffPast, getDeadlineUTC, getMatchKickoffUTC, KNOCKOUT_STAGES } from "@/lib/matches";
import { Prediction, Result, KnockoutDecision, getResultLabel } from "@/lib/scoring";
import Flag from "@/components/Flag";

export interface VoteDistribution {
  home: number;
  draw: number;
  away: number;
  total: number;
}

interface Props {
  match: Match;
  prediction?: Prediction;
  result?: Result;
  knockoutDecision?: KnockoutDecision;
  onPredict: (matchId: string, pred: Prediction) => void;
  onDelete?: (matchId: string) => void;
  saving?: boolean;
  votes?: VoteDistribution;
}

function Stepper({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled: boolean }) {
  const num = value === "" ? null : parseInt(value);

  function inc() { onChange(String((num ?? -1) + 1)); }
  function dec() { if (num === null || num <= 0) return; onChange(String(num - 1)); }

  return (
    <div className="flex flex-col items-center gap-0.5">
      <button
        type="button"
        onClick={inc}
        disabled={disabled}
        className={`w-11 h-10 flex items-center justify-center rounded-t-lg text-xl font-bold leading-none transition-colors
          ${disabled ? "bg-gray-100 text-gray-300 cursor-default" : "bg-green-50 text-green-700 hover:bg-green-100 active:bg-green-200"}`}
      >+</button>
      <div className={`w-11 h-12 flex items-center justify-center font-mono font-bold text-2xl rounded-none border-x border-gray-200
        ${disabled ? "bg-gray-100 text-gray-400" : "bg-white text-gray-900"}`}>
        {num !== null ? num : <span className="text-gray-300 text-lg">?</span>}
      </div>
      <button
        type="button"
        onClick={dec}
        disabled={disabled || num === null || num <= 0}
        className={`w-11 h-10 flex items-center justify-center rounded-b-lg text-xl font-bold leading-none transition-colors
          ${disabled || num === null || num <= 0 ? "bg-gray-100 text-gray-300 cursor-default" : "bg-green-50 text-green-700 hover:bg-green-100 active:bg-green-200"}`}
      >−</button>
    </div>
  );
}

/** Converts raw match labels into readable slot descriptions. */
function formatSlotLabel(label: string): string {
  // "1A" → "1° Gr. A" | "2C" → "2° Gr. C"
  const groupPos = label.match(/^([12])([A-L])$/);
  if (groupPos) return `${groupPos[1]}° Gr. ${groupPos[2]}`;

  // "3ABC" → "3° Mejor A/B/C"
  const thirdGroup = label.match(/^3([A-L]+)$/);
  if (thirdGroup) return `3° Mejor ${thirdGroup[1].split("").join("/")}`;

  // "G R32-1" → "G. R32-1" | "G R16-3" → "G. R16-3" | "G QF-2" → "G. QF-2"
  const winner = label.match(/^G ([A-Z0-9]+-\d+)$/);
  if (winner) return `G. ${winner[1]}`;

  // "Perdedor SF-1" → "Perd. SF-1"
  const loser = label.match(/^Perdedor ([A-Z]+-\d+)$/);
  if (loser) return `Perd. ${loser[1]}`;

  return label;
}

function useCountdown(deadline: Date) {
  const [timeLeft, setTimeLeft] = useState(() => deadline.getTime() - Date.now());
  useEffect(() => {
    const t = setInterval(() => setTimeLeft(deadline.getTime() - Date.now()), 1000);
    return () => clearInterval(t);
  }, [deadline]);
  return timeLeft;
}

function formatCountdown(ms: number) {
  if (ms <= 0) return null;
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function MatchCard({ match, prediction, result, knockoutDecision, onPredict, onDelete, saving, votes }: Props) {
  const [localG1, setLocalG1] = useState<string>(prediction !== undefined ? String(prediction.g1) : "");
  const [localG2, setLocalG2] = useState<string>(prediction !== undefined ? String(prediction.g2) : "");
  const [justSaved, setJustSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const prevSaving = useRef(saving);
  const deadline = getDeadlineUTC(match);
  const kickoffDate = getMatchKickoffUTC(match);
  const msLeft = useCountdown(deadline);

  useEffect(() => {
    if (prediction !== undefined) {
      setLocalG1(String(prediction.g1));
      setLocalG2(String(prediction.g2));
    } else {
      setLocalG1("");
      setLocalG2("");
    }
  }, [prediction]);

  useEffect(() => {
    if (prevSaving.current && !saving) {
      setJustSaved(true);
      const t = setTimeout(() => setJustSaved(false), 1000);
      return () => clearTimeout(t);
    }
    prevSaving.current = saving;
  }, [saving]);

  const isLocked = !!result;
  const isTBD = match.homeTeam === "TBD" || match.awayTeam === "TBD";
  const isProvisional = !!match.provisional;
  const isKnockout = KNOCKOUT_STAGES.includes(match.stage as typeof KNOCKOUT_STAGES[number]);
  const kickoffPast = isKickoffPast(match);
  const canPredict = !isLocked && !isTBD && !isProvisional && !kickoffPast;
  const minutesToClose = Math.floor((getDeadlineUTC(match).getTime() - Date.now()) / 60000);
  const closingSoon = canPredict && minutesToClose <= 60 && minutesToClose > 0;

  const predLabel = prediction !== undefined ? getResultLabel(prediction.g1, prediction.g2) : null;
  const actualLabel = result ? getResultLabel(result.g1, result.g2) : null;
  const isExact = prediction !== undefined && result &&
    prediction.g1 === result.g1 && prediction.g2 === result.g2;
  const isResultCorrect = predLabel && actualLabel && predLabel === actualLabel;
  const isWrong = result && prediction !== undefined && !isResultCorrect;

  function handleChange(side: "g1" | "g2", val: string) {
    if (!canPredict) return;
    if (side === "g1") setLocalG1(val); else setLocalG2(val);
    // Auto-save when both sides are valid
    const g1 = side === "g1" ? parseInt(val) : parseInt(localG1);
    const g2 = side === "g2" ? parseInt(val) : parseInt(localG2);
    if (!isNaN(g1) && !isNaN(g2) && g1 >= 0 && g2 >= 0) {
      onPredict(match.id, { g1, g2 });
    }
  }

  const hasPred = localG1 !== "" && localG2 !== "" && !isNaN(parseInt(localG1)) && !isNaN(parseInt(localG2));
  const localLabel = hasPred ? getResultLabel(parseInt(localG1), parseInt(localG2)) : null;

  return (
    <div className={`rounded-2xl border-2 transition-all duration-300 overflow-hidden shadow-sm ${
      justSaved       ? "border-green-400 shadow-green-100 shadow-md scale-[1.01]" :
      isExact         ? "border-yellow-400 bg-yellow-50" :
      isResultCorrect ? "border-green-400 bg-green-50" :
      isWrong         ? "border-red-300 bg-red-50" :
      isLocked        ? "border-gray-200 bg-gray-50" :
                        "border-gray-200 bg-white hover:border-green-300 hover:shadow-md"
    }`}>

      {/* Result banner */}
      {result && (
        <div className={`px-4 py-2.5 flex items-center justify-between gap-2 ${
          isExact         ? "bg-yellow-400 text-yellow-900" :
          isResultCorrect ? "bg-green-500 text-white" :
          isWrong         ? "bg-red-400 text-white" :
                            "bg-gray-700 text-white"
        }`}>
          <span className="text-xs font-medium opacity-80 shrink-0">Resultado oficial</span>
          <div className="flex flex-col items-center">
            <span className="font-mono font-black text-2xl tracking-widest leading-none">
              {result.g1} — {result.g2}
            </span>
            {knockoutDecision && (
              <span className="text-[10px] font-semibold opacity-90 mt-0.5">
                {knockoutDecision.method === "et"
                  ? `⚡ T.E. ${knockoutDecision.etG1}–${knockoutDecision.etG2}`
                  : `🥅 Pen. ${knockoutDecision.penHome}–${knockoutDecision.penAway}`}
              </span>
            )}
          </div>
          <span className="text-xs font-bold shrink-0">
            {!prediction  ? "—" :
             isExact      ? "⭐ +5" :
             isResultCorrect ? "✓ +3" : "✗ 0"}
          </span>
        </div>
      )}

      <div className="p-4">
        {/* Status badge */}
        {!result && (
          <div className="flex justify-end mb-2 -mt-1">
            {kickoffPast ? (
              <span className="text-[10px] font-bold bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">
                🔒 Cerrado
              </span>
            ) : isTBD ? (
              <span className="text-[10px] font-bold bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">
                ⏳ Por definir
              </span>
            ) : isProvisional ? (
              <span className="text-[10px] font-bold bg-purple-50 text-purple-500 px-2 py-0.5 rounded-full flex items-center gap-1">
                🔮 Tentativo
              </span>
            ) : closingSoon ? (
              <span className="text-[10px] font-bold bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse inline-block" />
                ⚠️ Cierra en {minutesToClose}min
              </span>
            ) : (
              <span className="text-[10px] font-bold bg-green-50 text-green-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse inline-block" />
                Abierto
              </span>
            )}
          </div>
        )}

        {/* Teams + stepper row */}
        <div className="flex items-center gap-2">
          {/* Home team */}
          <div className="flex-1 flex flex-col items-center text-center min-w-0 gap-1">
            <Flag code={match.homeFlag} size={32} />
            <span className="text-xs font-bold text-gray-800 leading-tight truncate w-full px-1">
              {isTBD && match.homeLabel
                ? <span className="text-gray-400 font-normal italic">{formatSlotLabel(match.homeLabel)}</span>
                : match.homeTeam}
            </span>
            {isProvisional && match.homeLabel && (
              <span className="text-[10px] text-purple-400 font-normal italic leading-none">
                {formatSlotLabel(match.homeLabel)}
              </span>
            )}
          </div>

          {/* Steppers */}
          <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
            {/* Floating save confirmation */}
            <div className="relative h-0 w-full flex justify-center">
              {justSaved && (
                <span className="absolute -top-2 text-green-500 font-black text-base animate-float-up pointer-events-none select-none z-10">
                  ✓
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <Stepper value={localG1} onChange={(v) => handleChange("g1", v)} disabled={!canPredict} />
              </div>
              <span className="text-gray-400 font-black text-lg w-4 text-center">—</span>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <Stepper value={localG2} onChange={(v) => handleChange("g2", v)} disabled={!canPredict} />
              </div>
            </div>

            {/* 90-min note for knockout matches */}
            {isKnockout && canPredict && (
              <span className="text-[10px] text-gray-400 text-center leading-tight">
                Predicción por los 90 min
              </span>
            )}

            {/* Kickoff time */}
            <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
              ⚽ {kickoffDate.toLocaleString("es-MX", {
                timeZone: "America/Monterrey",
                day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
              })}
            </span>

            {/* Countdown to prediction deadline — only show when open and closing within 7 days */}
            {canPredict && msLeft > 0 && msLeft < 7 * 24 * 60 * 60 * 1000 && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                msLeft < 3600_000 ? "bg-red-100 text-red-600" :
                msLeft < 24 * 3600_000 ? "bg-orange-100 text-orange-600" :
                "bg-blue-50 text-blue-600"
              }`}>
                🔒 cierra en {formatCountdown(msLeft)}
              </span>
            )}

            {/* Result label badge */}
            {localLabel && (
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                canPredict
                  ? localLabel === "1" ? "bg-blue-100 text-blue-700"
                    : localLabel === "X" ? "bg-gray-100 text-gray-600"
                    : "bg-orange-100 text-orange-700"
                  : "bg-gray-100 text-gray-500"
              }`}>
                {localLabel === "1" ? `Gana ${match.homeTeam}` : localLabel === "2" ? `Gana ${match.awayTeam}` : isKnockout ? "T. Extra / Pen." : "Empate"}
              </span>
            )}
          </div>

          {/* Away team */}
          <div className="flex-1 flex flex-col items-center text-center min-w-0 gap-1">
            <Flag code={match.awayFlag} size={32} />
            <span className="text-xs font-bold text-gray-800 leading-tight truncate w-full px-1">
              {isTBD && match.awayLabel
                ? <span className="text-gray-400 font-normal italic">{formatSlotLabel(match.awayLabel)}</span>
                : match.awayTeam}
            </span>
            {isProvisional && match.awayLabel && (
              <span className="text-[10px] text-purple-400 font-normal italic leading-none">
                {formatSlotLabel(match.awayLabel)}
              </span>
            )}
          </div>
        </div>

        {/* Vote distribution bar */}
        {votes && votes.total > 0 && (() => {
          const homePct = Math.round((votes.home / votes.total) * 100);
          const drawPct = Math.round((votes.draw / votes.total) * 100);
          const awayPct = 100 - homePct - drawPct;
          return (
            <div className="mt-2.5 border-t border-gray-100 pt-2.5 px-1">
              <div className="flex justify-between text-[10px] mb-1">
                <span className="font-bold text-blue-500">{homePct}%</span>
                <span className="text-gray-400">{drawPct > 0 ? `Emp ${drawPct}%` : ""}</span>
                <span className="font-bold text-orange-500">{awayPct}%</span>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden gap-[1px]">
                {homePct > 0 && <div style={{width:`${homePct}%`}} className="bg-blue-500" />}
                {drawPct > 0 && <div style={{width:`${drawPct}%`}} className="bg-gray-300" />}
                {awayPct > 0 && <div style={{width:`${awayPct}%`}} className="bg-orange-400" />}
              </div>
              <div className="flex justify-between text-[10px] mt-0.5 text-gray-400">
                <span className="truncate max-w-[70px]">{match.homeTeam.split(" ")[0]}</span>
                <span className="truncate max-w-[70px] text-right">{match.awayTeam.split(" ")[0]}</span>
              </div>
            </div>
          );
        })()}

        {/* Status row */}
        <div className="mt-3 flex items-center justify-between text-xs">
          {prediction !== undefined && !result && (
            <span className={`font-semibold flex items-center gap-1 transition-colors ${justSaved ? "text-green-500" : "text-green-600"}`}>
              {saving
                ? <span className="inline-block w-3 h-3 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                : justSaved ? "⭐" : "✓"
              }
              {justSaved ? "¡Guardado!" : `${prediction.g1}–${prediction.g2}`}
            </span>
          )}
          {!prediction && !result && !isTBD && !kickoffPast && (
            <span className="text-gray-400 italic">Sin predicción</span>
          )}
          {isLocked && !prediction && <span className="text-gray-400 italic">Sin predicción</span>}

          {/* Delete */}
          {prediction !== undefined && canPredict && onDelete && (
            confirmDelete ? (
              <div className="flex items-center gap-1 ml-auto">
                <span className="text-red-500">¿Borrar?</span>
                <button onClick={() => { onDelete(match.id); setConfirmDelete(false); }}
                  className="text-red-500 font-bold px-1.5 py-0.5 rounded bg-red-50 hover:bg-red-100">Sí</button>
                <button onClick={() => setConfirmDelete(false)}
                  className="text-gray-400 font-bold px-1.5 py-0.5 rounded bg-gray-50 hover:bg-gray-100">No</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)}
                className="ml-auto text-gray-300 hover:text-red-400 transition-colors p-1 -mr-1" title="Eliminar predicción">
                🗑
              </button>
            )
          )}

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
