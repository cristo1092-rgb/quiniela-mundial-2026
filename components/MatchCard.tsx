"use client";
import { useState, useEffect, useRef } from "react";
import { Match, isKickoffPast, getKickoffUTC } from "@/lib/matches";
import { Prediction, Result, getResultLabel } from "@/lib/scoring";

interface Props {
  match: Match;
  prediction?: Prediction;
  result?: Result;
  onPredict: (matchId: string, pred: Prediction) => void;
  onDelete?: (matchId: string) => void;
  saving?: boolean;
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
        className={`w-9 h-7 flex items-center justify-center rounded-t-lg text-lg font-bold leading-none transition-colors
          ${disabled ? "bg-gray-100 text-gray-300 cursor-default" : "bg-green-50 text-green-700 hover:bg-green-100 active:bg-green-200"}`}
      >+</button>
      <div className={`w-9 h-10 flex items-center justify-center font-mono font-bold text-2xl rounded-none border-x border-gray-200
        ${disabled ? "bg-gray-100 text-gray-400" : "bg-white text-gray-900"}`}>
        {num !== null ? num : <span className="text-gray-300 text-lg">?</span>}
      </div>
      <button
        type="button"
        onClick={dec}
        disabled={disabled || num === null || num <= 0}
        className={`w-9 h-7 flex items-center justify-center rounded-b-lg text-lg font-bold leading-none transition-colors
          ${disabled || num === null || num <= 0 ? "bg-gray-100 text-gray-300 cursor-default" : "bg-green-50 text-green-700 hover:bg-green-100 active:bg-green-200"}`}
      >−</button>
    </div>
  );
}

export default function MatchCard({ match, prediction, result, onPredict, onDelete, saving }: Props) {
  const [localG1, setLocalG1] = useState<string>(prediction !== undefined ? String(prediction.g1) : "");
  const [localG2, setLocalG2] = useState<string>(prediction !== undefined ? String(prediction.g2) : "");
  const [justSaved, setJustSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const prevSaving = useRef(saving);

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
  const kickoffPast = isKickoffPast(match);
  const canPredict = !isLocked && !isTBD && !kickoffPast;

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
        <div className={`px-4 py-2.5 flex items-center justify-between ${
          isExact         ? "bg-yellow-400 text-yellow-900" :
          isResultCorrect ? "bg-green-500 text-white" :
          isWrong         ? "bg-red-400 text-white" :
                            "bg-gray-700 text-white"
        }`}>
          <span className="text-xs font-medium opacity-80">Resultado oficial</span>
          <span className="font-mono font-black text-2xl tracking-widest">
            {result.g1} — {result.g2}
          </span>
          <span className="text-xs font-bold">
            {!prediction  ? "—" :
             isExact      ? "⭐ +5" :
             isResultCorrect ? "✓ +3" : "✗ 0"}
          </span>
        </div>
      )}

      <div className="p-4">
        {/* Teams + stepper row */}
        <div className="flex items-center gap-2">
          {/* Home team */}
          <div className="flex-1 flex flex-col items-center text-center min-w-0 gap-1">
            <span className="text-3xl leading-none">{match.homeFlag}</span>
            <span className="text-xs font-bold text-gray-800 leading-tight truncate w-full px-1">
              {isTBD && match.homeLabel
                ? <span className="text-gray-400 font-normal italic">{match.homeLabel}</span>
                : match.homeTeam}
            </span>
          </div>

          {/* Steppers */}
          <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-1">
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <Stepper value={localG1} onChange={(v) => handleChange("g1", v)} disabled={!canPredict} />
              </div>
              <span className="text-gray-400 font-black text-lg w-4 text-center">—</span>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <Stepper value={localG2} onChange={(v) => handleChange("g2", v)} disabled={!canPredict} />
              </div>
            </div>

            {/* Date */}
            <span className="text-xs text-gray-400">
              {getKickoffUTC(match).toLocaleString("es-MX", {
                timeZone: "America/Monterrey",
                day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
              })}
            </span>

            {/* Result label badge */}
            {localLabel && (
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                canPredict
                  ? localLabel === "1" ? "bg-blue-100 text-blue-700"
                    : localLabel === "X" ? "bg-gray-100 text-gray-600"
                    : "bg-orange-100 text-orange-700"
                  : "bg-gray-100 text-gray-500"
              }`}>
                {localLabel === "1" ? `Gana ${match.homeTeam}` : localLabel === "2" ? `Gana ${match.awayTeam}` : "Empate"}
              </span>
            )}
          </div>

          {/* Away team */}
          <div className="flex-1 flex flex-col items-center text-center min-w-0 gap-1">
            <span className="text-3xl leading-none">{match.awayFlag}</span>
            <span className="text-xs font-bold text-gray-800 leading-tight truncate w-full px-1">
              {isTBD && match.awayLabel
                ? <span className="text-gray-400 font-normal italic">{match.awayLabel}</span>
                : match.awayTeam}
            </span>
          </div>
        </div>

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
