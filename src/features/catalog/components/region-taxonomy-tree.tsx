"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { ArrowUpRight, Check, ChevronDown, ChevronRight, Loader2, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RowMenu } from "@/components/ui/row-menu";
import { Surface } from "@/components/ui/surface";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { SearchField, Toolbar } from "@/components/ui/toolbar";
import { canManageResource } from "@/features/auth/permissions";
import { useGetCatalogQuery, useSaveRecordMutation, useSetRecordStatusMutation } from "@/features/catalog/api/catalog-api";
import type { CatalogRecord } from "@/features/catalog/api/contracts";
import { QueryState } from "@/features/cms/components/query-state";
import { cn } from "@/lib/utils";
import { useApiErrorMessage } from "@/store/api/api-error";

type TermKind = "categories" | "tags";

const ids = (value: unknown): string[] => (Array.isArray(value) ? value.map(String) : []);
const text = (value: unknown): string => (typeof value === "string" ? value : "");

/**
 * Taxonomy → Categories & Tags: one tree, each tourism region opening onto
 * the categories and the search filters that are its own, in the order its
 * page shows them, with how many destinations use each. A term is added,
 * renamed, retired or restored in place; its description and icon are on
 * its own form, one click away.
 *
 * The region owns the lists: adding a term here writes it onto the region
 * through the term's "Tourism regions" link, the same way the term's form
 * does. A term two regions share shows under both, and says so.
 */
export function RegionTaxonomyTree({ grants }: { readonly grants: readonly string[] }) {
  const t = useTranslations("catalog.tree");
  const regions = useGetCatalogQuery("regions");
  const categories = useGetCatalogQuery("categories");
  const tags = useGetCatalogQuery("tags");
  const destinations = useGetCatalogQuery("destinations");
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const [search, setSearch] = useState("");
  const editable = canManageResource(grants, "categories");

  const tourism = useMemo(
    () => (regions.data ?? []).filter((row) => row.kind === "TOURISM").toSorted((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0) || text(a.name).localeCompare(text(b.name))),
    [regions.data],
  );
  const byId = useMemo(() => ({
    categories: new Map((categories.data ?? []).map((row) => [row.id, row])),
    tags: new Map((tags.data ?? []).map((row) => [row.id, row])),
  }), [categories.data, tags.data]);
  const regionName = useMemo(() => new Map(tourism.map((row) => [row.id, text(row.name)])), [tourism]);

  /* How many destinations use each term, and sit in each region. */
  const usage = useMemo(() => {
    const terms = new Map<string, number>();
    const inRegion = new Map<string, number>();
    for (const place of destinations.data ?? []) {
      for (const id of [...ids(place.categoryIds), ...ids(place.tagIds)]) terms.set(id, (terms.get(id) ?? 0) + 1);
      for (const id of ids(place.tourismRegionIds)) inRegion.set(id, (inRegion.get(id) ?? 0) + 1);
    }
    return { terms, inRegion };
  }, [destinations.data]);

  const needle = search.trim().toLowerCase();
  const matches = (row: CatalogRecord | undefined) => Boolean(row && text(row.name).toLowerCase().includes(needle));
  /* A search opens every region holding a match, and hides the rest. */
  const shown = tourism.filter((region) => !needle || matches(region) || ids(region.categoryIds).some((id) => matches(byId.categories.get(id))) || ids(region.tagIds).some((id) => matches(byId.tags.get(id))));
  const isOpen = (id: string) => (needle ? true : open.has(id));
  const toggle = (id: string) => setOpen((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const allOpen = tourism.length > 0 && tourism.every((region) => open.has(region.id));

  const loading = regions.isLoading || categories.isLoading || tags.isLoading;
  const error = regions.error ?? categories.error ?? tags.error;

  return (
    <Surface aria-label={t("label")}>
      <Toolbar>
        <SearchField label={t("filter")} onChange={setSearch} placeholder={t("filterPlaceholder")} value={search} />
        <Button onClick={() => setOpen(allOpen ? new Set() : new Set(tourism.map((region) => region.id)))} size="sm" type="button" variant="ghost">
          {allOpen ? t("collapseAll") : t("expandAll")}
        </Button>
      </Toolbar>
      {loading || error ? (
        <div className="p-3">
          <QueryState error={error} loading={loading} retry={() => { regions.refetch(); categories.refetch(); tags.refetch(); }} />
        </div>
      ) : null}
      {regions.data && categories.data && tags.data ? (
        <Table>
          <TableHead>
            <TableRow className="hover:bg-transparent">
              <TableHeaderCell>{t("name")}</TableHeaderCell>
              <TableHeaderCell className="text-right">{t("usedBy")}</TableHeaderCell>
              <TableHeaderCell className="text-right">
                <span className="sr-only">{t("actions")}</span>
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {shown.map((region) => (
              <RegionRows
                byId={byId}
                editable={editable}
                key={region.id}
                needle={needle}
                onToggle={() => toggle(region.id)}
                open={isOpen(region.id)}
                region={region}
                regionName={regionName}
                usage={usage}
              />
            ))}
            {!shown.length ? (
              <TableRow className="hover:bg-transparent">
                <TableCell className="py-6 text-center text-muted" colSpan={3}>
                  {needle ? t("noMatch") : t("noRegion")}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      ) : null}
    </Surface>
  );
}

interface Shared {
  readonly byId: { readonly categories: Map<string, CatalogRecord>; readonly tags: Map<string, CatalogRecord> };
  readonly regionName: Map<string, string>;
  readonly usage: { readonly terms: Map<string, number>; readonly inRegion: Map<string, number> };
  readonly editable: boolean;
  readonly needle: string;
}

/** One region: its row, and when open, its two lists. */
function RegionRows({ region, open, onToggle, ...shared }: Shared & { readonly region: CatalogRecord; readonly open: boolean; readonly onToggle: () => void }) {
  const t = useTranslations("catalog.tree");
  const categoryIds = ids(region.categoryIds);
  const tagIds = ids(region.tagIds);
  const used = shared.usage.inRegion.get(region.id) ?? 0;
  return (
    <>
      <TableRow className="bg-sand/40" data-region-id={region.id}>
        <TableCell className="py-3">
          <button aria-expanded={open} className="flex items-center gap-2 text-left" onClick={onToggle} type="button">
            {open ? <ChevronDown aria-hidden className="size-4 text-muted" /> : <ChevronRight aria-hidden className="size-4 text-muted" />}
            <span className="font-semibold text-ink">{text(region.name)}</span>
            <span className="text-xs text-muted">{t("regionCounts", { categories: categoryIds.length, tags: tagIds.length })}</span>
            {region.isActive === false ? <Badge tone="neutral">{t("retired")}</Badge> : null}
          </button>
        </TableCell>
        <TableCell className="py-3 text-right text-muted tabular-nums">{t("used", { count: used })}</TableCell>
        <TableCell className="py-3 text-right">
          <span className="flex justify-end">
            <Link className="inline-flex items-center gap-1 text-xs font-medium text-teal-deep hover:underline" href={`/regions/${region.id}`}>
              {t("openRegion")}
              <ArrowUpRight aria-hidden className="size-3" />
            </Link>
          </span>
        </TableCell>
      </TableRow>
      {open ? (
        <>
          <TermList kind="categories" region={region} termIds={categoryIds} {...shared} />
          <TermList kind="tags" region={region} termIds={tagIds} {...shared} />
        </>
      ) : null}
    </>
  );
}

/** A region's categories, or its tags: the group row with its Add, then one row per term. */
function TermList({ kind, region, termIds, byId, regionName, usage, editable, needle }: Shared & { readonly kind: TermKind; readonly region: CatalogRecord; readonly termIds: readonly string[] }) {
  const t = useTranslations("catalog.tree");
  const format = useFormatter();
  const errorMessage = useApiErrorMessage();
  const rows = termIds.map((id) => byId[kind].get(id)).filter((row): row is CatalogRecord => Boolean(row));
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [save, saving] = useSaveRecordMutation();
  const shownRows = needle ? rows.filter((row) => text(row.name).toLowerCase().includes(needle)) : rows;
  const usedByGroup = rows.reduce((sum, row) => sum + (usage.terms.get(row.id) ?? 0), 0);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const wanted = name.trim();
    if (!wanted) return;
    setProblem(null);
    try {
      const result = await save({ resource: kind, values: { name: wanted, nameKm: "", description: "", status: "ACTIVE", tourismRegionIds: [region.id] } }).unwrap();
      if (!result.ok) {
        setProblem(result.message);
        return;
      }
      setName("");
      setAdding(false);
    } catch (failure) {
      setProblem(errorMessage(failure));
    }
  }

  return (
    <>
      <TableRow className="hover:bg-transparent" data-group={`${region.id}:${kind}`}>
        <TableCell className="py-3 pl-10">
          <span className="flex items-center gap-2">
            <span className="font-medium text-ink">{t(`lists.${kind}.title`)}</span>
            <span className="text-xs text-muted">{format.number(rows.length)}</span>
          </span>
        </TableCell>
        <TableCell className="py-3 text-right text-muted tabular-nums">{t("used", { count: usedByGroup })}</TableCell>
        <TableCell className="py-3 text-right">
          {/* A flex box, not a line box: an inline button that starts with an icon would push the row taller. */}
          <span className="flex justify-end">
            {editable && !adding ? (
              <Button className="h-5 px-1.5" onClick={() => { setAdding(true); setProblem(null); }} size="sm" type="button" variant="ghost">
                <Plus aria-hidden className="size-3.5" />
                {t(`lists.${kind}.add`)}
              </Button>
            ) : null}
          </span>
        </TableCell>
      </TableRow>
      {adding ? (
        <TableRow className="hover:bg-transparent">
          <TableCell className="pl-16" colSpan={3}>
            <form className="flex flex-wrap items-center gap-2" onSubmit={add}>
              <Input aria-label={t(`lists.${kind}.newFor`, { region: text(region.name) })} autoFocus className="h-8 w-64 text-sm" maxLength={100} onChange={(event) => setName(event.target.value)} placeholder={t(`lists.${kind}.example`)} value={name} />
              <Button disabled={saving.isLoading || !name.trim()} size="sm" type="submit">
                {saving.isLoading ? <Loader2 aria-hidden className="size-3.5 animate-spin" /> : <Check aria-hidden className="size-3.5" />}
                {t("add")}
              </Button>
              <Button onClick={() => { setAdding(false); setName(""); setProblem(null); }} size="sm" type="button" variant="ghost">
                {t("cancel")}
              </Button>
              {problem ? <span className="text-xs font-medium text-heritage" role="alert">{problem}</span> : null}
            </form>
          </TableCell>
        </TableRow>
      ) : null}
      {shownRows.map((row) => (
        <TermRow editable={editable} key={row.id} kind={kind} region={region} regionName={regionName} row={row} used={usage.terms.get(row.id) ?? 0} />
      ))}
      {!rows.length && !adding ? (
        <TableRow className="hover:bg-transparent">
          <TableCell className="pl-16 text-xs text-muted" colSpan={3}>{t("noneYet")}</TableCell>
        </TableRow>
      ) : null}
    </>
  );
}

/** One term under its region: rename in place, retire or restore, or open its form. */
function TermRow({ kind, region, row, used, regionName, editable }: { readonly kind: TermKind; readonly region: CatalogRecord; readonly row: CatalogRecord; readonly used: number; readonly regionName: Map<string, string>; readonly editable: boolean }) {
  const t = useTranslations("catalog.tree");
  const errorMessage = useApiErrorMessage();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(text(row.name));
  const [problem, setProblem] = useState<string | null>(null);
  const [save, saving] = useSaveRecordMutation();
  const [setStatus, changing] = useSetRecordStatusMutation();
  const retired = row.isActive === false;
  const elsewhere = ids(row.tourismRegionIds).filter((id) => id !== region.id).map((id) => regionName.get(id)).filter(Boolean);

  async function rename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const wanted = name.trim();
    if (!wanted || wanted === text(row.name)) {
      setRenaming(false);
      return;
    }
    setProblem(null);
    try {
      /* The form's own fields, so nothing the row has is lost: its regions above all, which the save writes back. */
      const result = await save({ resource: kind, id: row.id, values: { name: wanted, nameKm: text(row.nameKm), description: text(row.description), status: retired ? "INACTIVE" : "ACTIVE", tourismRegionIds: ids(row.tourismRegionIds) } }).unwrap();
      if (!result.ok) {
        setProblem(result.message);
        return;
      }
      setRenaming(false);
    } catch (failure) {
      setProblem(errorMessage(failure));
    }
  }

  async function flip() {
    setProblem(null);
    try {
      await setStatus({ resource: kind, id: row.id, status: retired ? "ACTIVE" : "INACTIVE" }).unwrap();
    } catch (failure) {
      setProblem(errorMessage(failure));
    }
  }

  return (
    <TableRow className={cn(retired && "text-muted")} data-term-id={row.id}>
      <TableCell className="py-3 pl-16 align-middle">
        {renaming ? (
          <form className="flex flex-wrap items-center gap-2" onSubmit={rename}>
            <Input aria-label={t("renameName", { name: text(row.name) })} autoFocus className="h-7 w-64 text-sm" maxLength={100} onChange={(event) => setName(event.target.value)} value={name} />
            <Button className="size-7" disabled={saving.isLoading} size="icon-sm" title={t("save")} type="submit">
              {saving.isLoading ? <Loader2 aria-hidden className="size-3.5 animate-spin" /> : <Check aria-hidden className="size-3.5" />}
            </Button>
            <Button className="size-7" onClick={() => { setRenaming(false); setName(text(row.name)); setProblem(null); }} size="icon-sm" title={t("cancel")} type="button" variant="ghost">
              <X aria-hidden className="size-3.5" />
            </Button>
          </form>
        ) : (
          <span className="flex flex-wrap items-center gap-2">
            <span className={cn("text-ink", retired && "text-muted line-through")}>{text(row.name)}</span>
            {retired ? <Badge tone="neutral">{t("retired")}</Badge> : null}
            {elsewhere.length ? <span className="text-xs text-muted">{t("alsoIn", { list: elsewhere.join(", ") })}</span> : null}
          </span>
        )}
        {problem ? <p className="mt-1 text-xs font-medium text-heritage" role="alert">{problem}</p> : null}
      </TableCell>
      <TableCell className="py-3 text-right text-muted tabular-nums">{t("used", { count: used })}</TableCell>
      <TableCell className="py-2 text-right whitespace-nowrap">
        {/* One three-dot button holds the row's actions; the row stays as tall as its neighbours. */}
        <span className="flex items-center justify-end">
          {!renaming ? (
            <RowMenu
              items={[
                ...(editable
                  ? [
                      { label: t("rename"), onSelect: () => setRenaming(true) },
                      { label: retired ? t("restore") : t("retire"), onSelect: () => void flip(), disabled: changing.isLoading, danger: !retired },
                    ]
                  : []),
                { label: t("openForm"), href: `/${kind}/${row.id}` },
              ]}
              label={text(row.name)}
            />
          ) : null}
        </span>
      </TableCell>
    </TableRow>
  );
}
