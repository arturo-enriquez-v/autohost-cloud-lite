"use client";

import type { MetricRange } from "@/lib/features/nodes/types";

export const METRIC_RANGES: { value: MetricRange; label: string }[] = [
  { value: "1d", label: "24h" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];

/** Segmented control for the 24h / 7 days / 30 days chart ranges. */
export function RangeSelector({ value, onChange }: { value: MetricRange; onChange: (r: MetricRange) => void }) {
  return (
    <div className="flex items-center rounded-md border bg-background text-sm" role="group" aria-label="Time range">
      {METRIC_RANGES.map((r) => (
        <button
          key={r.value}
          onClick={() => onChange(r.value)}
          aria-pressed={value === r.value}
          className={`px-3 py-1.5 transition-colors first:rounded-l-md last:rounded-r-md ${
            value === r.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
