"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Surface, SurfaceHeader } from "@/components/ui/surface";
import { GROWTH_RANGES, dayValue, destinationGrowth, growthWindow, type GrowthRange } from "../summary";

const control =
  "h-8 rounded-md border border-line-strong bg-paper px-2 text-xs text-ink-soft hover:border-line-hover focus:border-teal focus:ring-3 focus:ring-teal/15 focus:outline-none";

/** Listings created per day, week or month — attractions, stays and food listings. */
export function DestinationGrowth({ listings }: { readonly listings: readonly { readonly createdAt: string | null }[] | null | undefined }) {
  const [range, setRange] = useState<GrowthRange>("12m");
  const [custom, setCustom] = useState(() => {
    const today = new Date();
    return { from: dayValue(new Date(today.getTime() - 29 * 86_400_000)), to: dayValue(today) };
  });
  const period = useMemo(() => growthWindow(range, new Date(), custom), [range, custom]);
  const points = useMemo(() => (period ? destinationGrowth(listings ?? [], period) : []), [listings, period]);
  const total = points.reduce((sum, point) => sum + point.count, 0);
  const unit = period?.unit ?? "day";

  return (
    <Surface>
      <SurfaceHeader
        actions={
          <select
            aria-label="Destination growth period"
            className={control}
            onChange={(event) => setRange(event.target.value as GrowthRange)}
            value={range}
          >
            {GROWTH_RANGES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        }
        description={`Attractions, stays and food listings created each ${unit}`}
        title="Destination growth"
      />
      {listings ? (
        <div className="px-4 pt-3 pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted">
              <span className="text-lg font-semibold text-ink tabular-nums">{total}</span> created in this period
            </p>
            {range === "custom" ? (
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                <input
                  aria-label="From date"
                  className={control}
                  max={custom.to || undefined}
                  onChange={(event) => setCustom((value) => ({ ...value, from: event.target.value }))}
                  type="date"
                  value={custom.from}
                />
                <span aria-hidden>–</span>
                <input
                  aria-label="To date"
                  className={control}
                  min={custom.from || undefined}
                  onChange={(event) => setCustom((value) => ({ ...value, to: event.target.value }))}
                  type="date"
                  value={custom.to}
                />
              </div>
            ) : null}
          </div>
          {period ? (
            <div
              aria-label={`Destinations created per ${unit}: ${points.map((point) => `${point.label}: ${point.count}`).join(", ")}`}
              className="mt-2 h-44 min-w-0"
              role="img"
            >
              <ResponsiveContainer height="100%" width="100%">
                <BarChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis axisLine={false} dataKey="tick" dy={4} minTickGap={8} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickLine={false} />
                  <YAxis allowDecimals={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, boxShadow: "var(--elevation-pop)", color: "var(--foreground)", fontSize: 12, padding: "6px 10px" }}
                    cursor={{ fill: "var(--surface-hover)" }}
                    labelFormatter={(_, payload) => payload[0]?.payload?.label ?? ""}
                  />
                  <Bar dataKey="count" fill="var(--primary-line)" maxBarSize={28} name="New destinations" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-10 text-center text-xs text-muted">Choose a start and end date.</p>
          )}
          {period && !total ? (
            <p className="pb-2 text-center text-xs text-muted">Nothing was created in this period.</p>
          ) : null}
        </div>
      ) : (
        <p className="px-4 py-10 text-center text-sm text-muted">Destination growth data is unavailable.</p>
      )}
    </Surface>
  );
}

/** Every destination counted once, as a single proportional bar with its legend. */
export function ContentStatus({ rows }: { readonly rows: readonly { name: string; value: number; color: string }[] | null }) {
  const total = rows?.reduce((sum, row) => sum + row.value, 0) ?? 0;

  return (
    <Surface>
      <SurfaceHeader description="Each destination, by status and its latest request" title="Content status" />
      {rows ? (
        <div className="px-4 py-3">
          <div
            aria-label={rows.map((row) => `${row.name}: ${row.value}`).join(", ")}
            className="flex h-2 overflow-hidden rounded-full bg-sand-deep"
            role="img"
          >
            {total
              ? rows.map((row) =>
                  row.value ? (
                    <span className="h-full" key={row.name} style={{ width: `${(row.value / total) * 100}%`, background: row.color }} />
                  ) : null,
                )
              : null}
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
            {rows.map((row) => (
              <div className="flex items-center gap-2 text-sm" key={row.name}>
                <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: row.color }} />
                <dt className="min-w-0 flex-1 truncate text-ink-soft">{row.name}</dt>
                <dd className="font-medium text-ink tabular-nums">{row.value.toLocaleString()}</dd>
                <dd className="w-9 text-right text-xs text-muted tabular-nums">
                  {total ? Math.round((row.value / total) * 100) : 0}%
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : (
        <p className="px-4 py-8 text-center text-sm text-muted">Content status data is unavailable.</p>
      )}
    </Surface>
  );
}
