"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface ActivityPoint {
  /** Short weekday, e.g. `Mon`. */
  readonly day: string;
  /** The full date, for the tooltip. */
  readonly date: string;
  readonly writes: number;
}

/**
 * Writes per day.
 *
 * One series, so there is no legend: the panel title says what is plotted, and
 * a second colour would only repeat it. The bars carry the one hue in the
 * palette — a value ramp here would encode height twice and say nothing new.
 */
function TooltipCard({ point }: { readonly point: ActivityPoint }) {
  return (
    <div className="card px-3 py-2 text-xs">
      <p className="font-semibold text-ink">{point.date}</p>
      <p className="mt-0.5 text-muted">
        {point.writes} {point.writes === 1 ? "write" : "writes"}
      </p>
    </div>
  );
}

export function ActivityChart({ data }: { readonly data: readonly ActivityPoint[] }) {
  return (
    <div className="h-56">
      <ResponsiveContainer height="100%" width="100%">
        <BarChart data={[...data]} margin={{ left: -18, right: 8, top: 8 }}>
          {/* Hairline, solid, one step off the surface — chrome, not data. */}
          <CartesianGrid
            stroke="var(--border)"
            strokeDasharray="0"
            vertical={false}
          />
          <XAxis
            axisLine={false}
            dataKey="day"
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickLine={false}
            width={44}
          />
          <Tooltip
            content={(props) => {
              const point = props.payload?.[0]?.payload as ActivityPoint | undefined;
              return props.active && point ? <TooltipCard point={point} /> : null;
            }}
            cursor={{ fill: "color-mix(in oklab, var(--primary-line) 8%, transparent)" }}
          />
          <Bar
            dataKey="writes"
            fill="var(--primary-line)"
            maxBarSize={24}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
