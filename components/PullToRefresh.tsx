"use client";
import { useRef, useState, useCallback } from "react";

interface Props {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

const THRESHOLD = 65; // px para activar

export default function PullToRefresh({ onRefresh, children }: Props) {
  const startY = useRef<number | null>(null);
  const [pullDelta, setPullDelta] = useState(0); // 0–THRESHOLD
  const [refreshing, setRefreshing] = useState(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (startY.current === null || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0 && window.scrollY === 0) {
      setPullDelta(Math.min(delta, THRESHOLD + 20));
    }
  }, [refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (startY.current === null) return;
    startY.current = null;
    if (pullDelta >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDelta(0);
      await onRefresh();
      setRefreshing(false);
    } else {
      setPullDelta(0);
    }
  }, [pullDelta, refreshing, onRefresh]);

  const progress = Math.min(pullDelta / THRESHOLD, 1);
  const showIndicator = pullDelta > 8 || refreshing;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-200"
        style={{ height: showIndicator ? Math.max(pullDelta * 0.55, refreshing ? 40 : 0) : 0 }}
      >
        <div className={`flex flex-col items-center gap-1 transition-opacity duration-200 ${showIndicator ? "opacity-100" : "opacity-0"}`}>
          {refreshing ? (
            <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <div
              className="w-6 h-6 border-2 border-green-400 rounded-full flex items-center justify-center transition-transform"
              style={{ transform: `rotate(${progress * 360}deg)` }}
            >
              <svg viewBox="0 0 12 12" className="w-3 h-3 fill-green-400">
                <path d="M6 1v4l3-3-3 3-3-3 3 3V1z M1 7a5 5 0 0 0 10 0" />
              </svg>
            </div>
          )}
          <span className="text-[10px] text-green-600 font-semibold">
            {refreshing ? "Actualizando…" : progress >= 1 ? "Suelta para actualizar" : "Jala para actualizar"}
          </span>
        </div>
      </div>

      {children}
    </div>
  );
}
