"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Metric, MetricStrip } from "@/components/ui/metric-strip";
import { Select } from "@/components/ui/select";
import { SearchField, SegmentedControl, Toolbar } from "@/components/ui/toolbar";
import { QueryState } from "@/features/cms/components/query-state";
import {
  type CustomerAccount,
  useGetCustomersQuery,
  useGetUsersQuery,
} from "@/features/people/api/people-api";
import {
  customersOnly,
  NEW_WITHIN_DAYS,
  summarize,
  visibleCustomers,
  type CustomerSort,
  type StatusFilter,
} from "@/features/people/customers";
import { cn } from "@/lib/utils";
import { CUSTOMER_COLUMNS, CustomerRow } from "./customer-row";
import { NewCustomerForm } from "./new-customer-form";

/* One empty list for every render before the first answer, so the memos below hold. */
const NONE: readonly CustomerAccount[] = [];

const FILTERS: readonly { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

/**
 * Customers of the public site — the people who registered an account — and
 * everything an account manager does to them: find, create, edit (photo
 * included), block and delete.
 *
 * The `users` table is written the first time any Keycloak identity presents a
 * token, so the staff who sign into this dashboard land in it too. Their
 * back-office account carries the same e-mail the row was created from, which
 * is what separates the two lists here; the staff themselves are on Roles.
 */
export function CustomerDirectory({ canManage }: { readonly canManage: boolean }) {
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [sort, setSort] = useState<CustomerSort>("newest");
  const [creating, setCreating] = useState(false);
  const customers = useGetCustomersQuery();
  const staff = useGetUsersQuery("");

  const everyone = customers.data ?? NONE;
  const theirs = useMemo(() => customersOnly(everyone, staff.data ?? []), [everyone, staff.data]);
  const figures = useMemo(() => summarize(theirs), [theirs]);
  const rows = useMemo(() => visibleCustomers(theirs, { status, term, sort }), [theirs, status, term, sort]);
  const excluded = everyone.length - theirs.length;
  const loading = customers.isLoading || staff.isLoading;
  const counts: Readonly<Record<StatusFilter, number>> = {
    ALL: figures.total,
    ACTIVE: figures.active,
    INACTIVE: figures.inactive,
  };
  const filtered = Boolean(term.trim()) || status !== "ALL";

  return (
    <div className="flex flex-col gap-4">
      <MetricStrip>
        <Metric hint="Registered on the public site" label="Customers" value={loading ? null : figures.total} />
        <Metric hint="Can sign in" label="Active" tone={figures.active ? "success" : "neutral"} value={loading ? null : figures.active} />
        <Metric hint="Sign-in blocked" label="Inactive" value={loading ? null : figures.inactive} />
        <Metric hint={`Joined in the last ${NEW_WITHIN_DAYS} days`} label="New" value={loading ? null : figures.recent} />
      </MetricStrip>

      {creating && canManage ? <NewCustomerForm onClose={() => setCreating(false)} /> : null}

      <section aria-label="Customers" className="panel min-w-0 overflow-hidden">
        <Toolbar>
          <SearchField
            className="max-w-sm"
            label="Search customers"
            onChange={setTerm}
            placeholder="Search name, e-mail or phone…"
            value={term}
          />

          <SegmentedControl
            label="Status"
            onChange={setStatus}
            options={FILTERS.map((filter) => ({
              ...filter,
              count: loading ? null : counts[filter.value],
            }))}
            value={status}
          />

          <Select
            aria-label="Sort customers"
            className="h-8 w-36 text-sm"
            onChange={(event) => setSort(event.target.value as CustomerSort)}
            value={sort}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name A–Z</option>
          </Select>

          {canManage ? (
            <Button className="ml-auto" disabled={creating} onClick={() => setCreating(true)} size="sm" type="button">
              <UserPlus aria-hidden className="size-3.5" />
              New customer
            </Button>
          ) : null}
        </Toolbar>

        {customers.error || staff.error ? (
          <div className="p-4">
            <QueryState
              error={customers.error ?? staff.error}
              retry={() => {
                void customers.refetch();
                void staff.refetch();
              }}
            />
          </div>
        ) : loading ? (
          <div aria-busy="true" aria-label="Loading customers" className="divide-y divide-line" role="status">
            {[0, 1, 2, 3].map((placeholder) => (
              <div className="flex items-center gap-3 px-4 py-3" key={placeholder}>
                <span className="size-8 animate-pulse rounded-full bg-sand-deep" />
                <span className="flex flex-1 flex-col gap-1.5">
                  <span className="h-3 w-36 animate-pulse rounded-sm bg-sand-deep" />
                  <span className="h-2.5 w-56 max-w-full animate-pulse rounded-sm bg-sand-deep" />
                </span>
              </div>
            ))}
          </div>
        ) : rows.length ? (
          <>
            <div aria-hidden className={cn(CUSTOMER_COLUMNS, "h-9 border-b border-line bg-sand text-xs font-medium text-muted")}>
              <span>Customer</span>
              <span className="hidden md:block">Phone</span>
              <span className="hidden lg:block">Joined</span>
              <span className="hidden sm:block">Status</span>
              <span />
            </div>
            <div className="divide-y divide-line">
              {rows.map((customer) => (
                <CustomerRow canManage={canManage} customer={customer} key={customer.id} />
              ))}
            </div>
            <p className="border-t border-line px-4 py-2 text-xs text-muted tabular-nums">
              Showing {rows.length} of {figures.total} {figures.total === 1 ? "customer" : "customers"}
            </p>
          </>
        ) : (
          <EmptyState
            action={
              filtered ? (
                <Button
                  onClick={() => {
                    setTerm("");
                    setStatus("ALL");
                  }}
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  Clear filters
                </Button>
              ) : canManage ? (
                <Button onClick={() => setCreating(true)} size="sm" type="button">
                  <UserPlus aria-hidden className="size-3.5" />
                  Create customer
                </Button>
              ) : null
            }
            description={
              filtered
                ? "Try another name, e-mail or phone, or show every status."
                : "Customers will appear here after registering."
            }
            icon={filtered ? Search : Users}
            title={filtered ? "No customer matches" : "No customers yet"}
          />
        )}
      </section>

      {excluded > 0 ? (
        <p className="text-xs text-muted">
          {excluded} staff {excluded === 1 ? "account is" : "accounts are"} held back from
          this list. Find {excluded === 1 ? "it" : "them"} under{" "}
          <Link className="text-teal-deep underline-offset-2 hover:underline" href="/roles">
            Roles &amp; Permissions
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}
