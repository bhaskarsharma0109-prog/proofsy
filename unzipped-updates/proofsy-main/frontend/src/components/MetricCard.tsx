"use client";

import { ReactNode, useEffect, useState } from "react";

interface MetricCardProps {
  label: string;
  value: number;
  suffix?: string;
  icon: ReactNode;
  iconClassName: string;
  loading?: boolean;
  changeLabel?: string;
}

function useCountUp(target: number, duration = 1000) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setValue(target);
        clearInterval(timer);
        return;
      }

      setValue(Math.floor(start));
    }, 16);

    return () => clearInterval(timer);
  }, [target, duration]);

  return value;
}

export default function MetricCard({
  label,
  value,
  suffix,
  icon,
  iconClassName,
  loading = false,
  changeLabel,
}: MetricCardProps) {
  const animatedValue = useCountUp(value);

  return (
    <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6 hover:shadow-md hover:border-[var(--color-border-strong)] transition-all cursor-default group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-2">
            {label}
          </p>
          <p className="text-3xl font-bold text-[var(--color-foreground)] tabular-nums">
            {loading ? "—" : animatedValue.toLocaleString()}
            {suffix && <span className="text-lg text-[var(--color-muted)] ml-0.5">{suffix}</span>}
          </p>
        </div>
        <div className={`w-10 h-10 rounded-xl ${iconClassName} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
      {changeLabel && (
        <div className="mt-3 flex items-center gap-1.5">
          <span className="text-xs font-semibold text-[var(--color-success)]">{changeLabel}</span>
          <span className="text-[11px] text-[var(--color-muted)]">vs last period</span>
        </div>
      )}
    </div>
  );
}
