import type {
  CmsUser,
  CustomerAccount,
} from "@/features/people/api/people-api";

/** The business roles that make an account staff rather than a customer. */
const STAFF_ROLES: ReadonlySet<string> = new Set(["PARTNER", "CONTRIBUTOR", "EDITOR", "BDO", "ADMIN"]);

/** A customer's name as the list shows it: their full name, or their e-mail when they gave none. */
export function customerName(customer: Pick<CustomerAccount, "fullName" | "email">): string {
  return customer.fullName?.trim() || customer.email;
}

/**
 * Telling the public site's customers apart from this dashboard's staff.
 *
 * Both live in the same `users` table: the API writes a row the first time any
 * Keycloak identity presents a token, and that includes an editor signing in
 * here. The row mirrors the business roles that token carried, so a staff role
 * on it settles the question. A row whose roles have not caught up — one written
 * before its first staff sign-in — is still matched by e-mail against the
 * back-office accounts, since both came from the same Keycloak account.
 */
export function customersOnly(
  rows: readonly CustomerAccount[],
  staff: readonly CmsUser[],
): readonly CustomerAccount[] {
  const staffEmails = new Set(
    staff
      .map((person) => person.email?.trim().toLowerCase())
      .filter((email): email is string => Boolean(email)),
  );
  return rows.filter(
    (customer) =>
      !(customer.roles ?? []).some((role) => STAFF_ROLES.has(role)) &&
      !staffEmails.has(customer.email.trim().toLowerCase()),
  );
}

/** Name, e-mail, or phone, case-insensitively. An empty term matches all. */
export function matchesCustomer(
  customer: CustomerAccount,
  term: string,
): boolean {
  const needle = term.trim().toLowerCase();
  if (!needle) return true;
  return [customer.fullName, customer.email, customer.phone].some((field) =>
    field?.toLowerCase().includes(needle),
  );
}

export type StatusFilter = "ALL" | CustomerAccount["status"];
export type CustomerSort = "newest" | "oldest" | "name";

/** How recently "new" means, on the Users screen's tile. */
export const NEW_WITHIN_DAYS = 30;

/** The four figures over the list. `now` is a parameter so a test can pin it. */
export function summarize(
  customers: readonly CustomerAccount[],
  now: number = Date.now(),
): { total: number; active: number; inactive: number; recent: number } {
  const since = now - NEW_WITHIN_DAYS * 24 * 60 * 60 * 1000;
  let active = 0;
  let recent = 0;
  for (const customer of customers) {
    if (customer.status === "ACTIVE") active += 1;
    if (Date.parse(customer.createdAt) >= since) recent += 1;
  }
  return { total: customers.length, active, inactive: customers.length - active, recent };
}

/**
 * What the list shows: one status or both, matching the search, in the
 * chosen order. Newest first by default — the person an administrator is
 * looking for is usually the one who just registered.
 */
export function visibleCustomers(
  customers: readonly CustomerAccount[],
  { status, term, sort }: { status: StatusFilter; term: string; sort: CustomerSort },
): readonly CustomerAccount[] {
  const shown = customers.filter(
    (customer) =>
      (status === "ALL" || customer.status === status) && matchesCustomer(customer, term),
  );
  const byJoined = (a: CustomerAccount, b: CustomerAccount) =>
    Date.parse(a.createdAt) - Date.parse(b.createdAt);
  return [...shown].sort((a, b) => {
    if (sort === "name") {
      return customerName(a).localeCompare(customerName(b), undefined, { sensitivity: "base" });
    }
    return sort === "oldest" ? byJoined(a, b) : byJoined(b, a);
  });
}
