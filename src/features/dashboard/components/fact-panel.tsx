export interface Fact {
  readonly label: string;
  readonly value: string | number | null | undefined;
  readonly hint?: string;
}

/**
 * A handful of figures that belong together but do not each deserve a tile —
 * the review breakdown, the season that is running.
 */
export function FactPanel({ facts }: { readonly facts: readonly Fact[] }) {
  return (
    <dl className="panel grid gap-4 px-4 py-3 sm:grid-cols-2 lg:grid-cols-3">
      {facts.map((fact) => (
        <div key={fact.label}>
          <dt className="text-xs font-medium text-muted">{fact.label}</dt>
          <dd className="mt-1 text-xl font-semibold text-ink tabular-nums">
            {fact.value ?? "—"}
          </dd>
          {fact.hint ? (
            <dd className="mt-0.5 text-xs text-muted">{fact.hint}</dd>
          ) : null}
        </div>
      ))}
    </dl>
  );
}
