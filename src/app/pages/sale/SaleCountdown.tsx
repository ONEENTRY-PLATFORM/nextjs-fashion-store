'use client'
import { useState, useEffect, useCallback } from 'react';

export function useCountdown(target: number) {
  // Memoised on `target` so the ticking effect restarts against the new
  // deadline when the OE-driven end date arrives after first paint.
  const calc = useCallback(() => {
    const diff = Math.max(0, target - Date.now());
    return {
      days: Math.floor(diff / 86_400_000),
      hours: Math.floor((diff % 86_400_000) / 3_600_000),
      minutes: Math.floor((diff % 3_600_000) / 60_000),
      seconds: Math.floor((diff % 60_000) / 1_000),
    };
  }, [target]);
  const [time, setTime] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1_000);
    return () => clearInterval(id);
  }, [calc]);
  return time;
}

export function CountdownUnit({ value, label }: { value: number; label: string }) {
  const v = String(value).padStart(2, '0');
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center justify-center text-white w-[52px] h-[52px] bg-black/40 text-[22px] font-bold">
        {v}
      </div>
      <span className="text-white mt-1 text-[9px] tracking-[0.18em] uppercase opacity-70">
        {label}
      </span>
    </div>
  );
}
