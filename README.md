# AMS Travel CMS

The Next.js CMS for the AMS Travel Spring Boot API. Run `npm run dev` on port **3001**; the public website runs on port 3000.

## Navigation

Everyone opens `/dashboard`. The sidebar and available actions are filtered by permission grants through one configuration in `src/features/shell/nav.ts`.

Each role has its own sidebar, defined once in `roleNavigation`:

| Role | Groups |
| --- | --- |
| Partner | Content Management (Destinations, Create Destination, Verification, My Content) · Partner Management (Partner Requests, Drafts, Listing Approvals) |
| Contributor | Content Management (as Partner) · Contributor Management (Contributor Requests, Drafts, Listing Approvals) |
| Editor | Content Management (Destinations, Create Destination, Tourism Regions, Corridors, Historical Data, Verification, Drafts, My Content) · Homepage & Discovery (Hero / Banner, Recommended, Popular) · Taxonomy (Provinces, Interests, Categories, Tags, Activities) · Contributor Management · Editor Management |
| BDO | As Editor, with Partner Management and BDO Management |
| Admin | As Editor, with Partner, Contributor, Editor and BDO Management, and Administration (Users, Roles & Permissions, Audit Logs, Settings) |

A reviewing Management group has five pages: Requests, Drafts, Verification Requests, Listing Verification, and Listing Approvals. Reviews, Media Library, Featured and Homepage Sections are no longer in the sidebar but keep their URLs.

The desktop sidebar can collapse to icons. Groups can collapse independently. Mobile navigation uses a modal drawer with keyboard dismissal and focus containment. Supporting heritage, destination-detail, region-coverage, and season editors remain available under **Settings → Catalog configuration**. A destination's architecture styles and religions are fields on its form; its timeline and monarchs are edited in the heritage panel beneath it.

## Stack and state

Next.js 16.3.3, React 19, TypeScript, Tailwind CSS 4, shadcn-style components, Redux Toolkit, RTK Query, TanStack Table 8, React Hook Form, Zod, Recharts, Lucide, and Keycloak. TanStack Query has been removed.

- `src/store/store.ts` creates a separate store per provider instance.
- `src/store/slices/` contains sidebar and UI preferences only.
- `src/store/api/base-api.ts` owns the shared API cache, error messages, and invalidation tags.
- Feature APIs use `injectEndpoints()` in `features/*/api/`.
- Authenticated user data stays in RTK Query; it is not copied into an auth slice.
- Catalog lists use RTK Query for server pagination requests and dynamic reference options. Forms keep React Hook Form and Zod validation.
- Catalog, curation, verification, review, publishing, and upload mutations invalidate affected tags. Existing account/profile server actions also invalidate subscribed caches after successful changes.
- The existing server-side form loaders and validation actions remain in use for authenticated edit routes.

This follows the [Redux Toolkit guidance for Next.js stores](https://redux-toolkit.js.org/usage/nextjs).

## Authentication and API requests

Sign in through Keycloak at `/login`. The dashboard uses the public `amsadmin-dashboard` client in the `amsadmin` realm. The public website uses the separate `amstravel` realm.

```text
Keycloak login
  → HttpOnly session cookie
  → RTK Query → same-origin Next.js API handlers
  → Spring Boot with the authenticated user's bearer token
  → permission-scoped data → RTK Query cache → CMS
```

Bearer tokens remain in HttpOnly cookies and are forwarded server-side. They are never hard-coded or stored in Redux or local storage. Spring Boot remains the authorization boundary; hiding navigation does not grant or revoke access.

Supported workspace roles are PARTNER, CONTRIBUTOR, EDITOR, BDO, and ADMIN. Permissions, rather than role-name comparisons, determine navigation and actions. The local realm definition is in `deployment/keycloak/amsadmin-realm.json`.

Profile name, email, and avatar come from Spring's `/users/me`. **The current Spring response does not contain roles or permissions**, so the Next.js `/api/auth/me` adapter combines that profile with the verified Keycloak token grants. Role changes require a new Keycloak token to change effective session authorities.

## Available features and backend limits

- Dashboard totals, scoped destinations, publish requests, and audit activity use existing authorized Spring endpoints. The Next.js `/api/dashboard` adapter aggregates those reads because Spring does not yet expose a unified `/dashboard` endpoint. Failed sources remain unavailable and are identified in an error banner.
- Recommended, Popular Now, and Featured update the existing destination boolean flags. Homepage Sections links to those collections; section order and layout remain defined by the public website.
- Publish Requests supports approvals, reasoned rejections, withdrawal, and links to the submission form.
- Reviews supports hiding and restoring reviews.
- Media Library shows gallery records and supports image uploads. An upload must be attached to a destination/gallery record before it appears as saved content.
- Every gallery table — Destination Media, Stay Media, Food Media — has an **Add photos** box above its list: pick whose gallery it is, choose any number of files, and one row is written per picture, numbered after the ones already there. Uploads go ten at a time, which is what `POST /medias/batch` accepts; a batch is stored all or nothing, and a failure says how many were added before it stopped.
- Partners and Partner Listings are derived from authorized partner publish requests. They do not represent a complete partner account directory.
- Destination verification (its own service in the API — not a badge; badges are earned by visitors exploring destinations) is managed in one place and opened from three: **Content Management → Verification** (the desk's queue, filtered Awaiting / Verified / All), the shield action on a row of **Destinations**, and the **Verify** button on a destination's own page. All three open the same drawer: a decision, the invoice or reference number, a note, an evidence image uploaded to the private `verification` folder, and the destination's full verification history. What each desk may verify comes from the API's `GET /destination-verifications/queue` — partner listings for a BDO, contributor drafts for an editor, every destination for an administrator — so no screen offers a Verify action the API would refuse. Partners and contributors see whether their rows are verified but have no Verify action. The edit form has no Verified checkbox.
- Users supports live search, account creation, and the existing role-assignment form. Account administration runs through Spring's Keycloak Admin Client.
- Roles and Permissions display the current session grants. Spring does not yet expose organization-wide role/permission CRUD or permission assignment endpoints. The existing account forms offer the five business roles supported by the backend contract.
- Settings provides session-local compact table preferences and links to existing catalog configuration editors.
- Spring's catalog workspace endpoints currently return arrays. The Next.js handler applies search/status filtering and pagination **after Spring applies ownership**, so sensitive records are not fetched into Redux and filtered for authorization in the browser. Database-level pagination, province/region search filters, and a unified destination search contract still require backend support.
- The activity chart covers the latest 200 audit entries, not a complete historical analytics dataset.

Legacy `/people`, `/publishing`, `/audit`, and gallery edit URLs remain available. Sidebar selection recognizes their new navigation names.

## Local setup

```bash
npm install
npm run dev
```

Configure `.env.local` using `.env.example`. The existing local services must also be running:

```bash
cd ../deployment
docker compose up -d
cd ../api/api
./gradlew bootRun
```

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Public dashboard origin, normally `http://localhost:3001`; used for login callbacks and mutation origin checks, including behind Docker or a proxy |
| `API_BASE_URL` | Spring base URL, normally `http://localhost:8080/api/v1` |
| `KEYCLOAK_ISSUER_URL` | Back-office realm issuer |
| `KEYCLOAK_CLIENT_ID` | `amsadmin-dashboard` |

Keycloak client settings: client authentication off, standard authorization code flow, PKCE S256, callback `http://localhost:3001/api/auth/callback`, and web origin `http://localhost:3001`.

User administration requires `KEYCLOAK_ADMIN_ENABLED` and the Keycloak Admin Client credentials on the **Spring API**, not this frontend. The application ADMIN role does not grant access to the Keycloak administration console.

Use the avatar to open **My profile** (`/profile`). The cover takes the colour of your role, and edits to your display name or photo preview there before you save. Photos can be dropped on the picker, chosen from your device, or pasted as an address. Beside the form the page shows:

- **Your contributions** — the destinations you created, how many are live, in review and verified, and your latest submissions with their decisions;
- **What you can do** — your role's capabilities in plain words, worked out by the same permission helpers the screens use (`src/features/profile/access.ts`), with the raw `PERM_` grants folded away for support;
- **Your role** — your home screen, the desks you review, and who reviews what you submit;
- **Sign-in & security** — links to Keycloak's own pages for password, two-factor and signed-in devices, since none of those are stored here, and Sign out.

Sign out clears the CMS session and ends the Keycloak login.

## Validation

```bash
npm run lint
npx tsc --noEmit
npm run test
npm run build
```

Tests cover authentication actions, the real realm permission composites, exact CMS navigation ordering, role boundaries, and active route matching. Google Fonts are downloaded at build time by `next/font`, so a clean production build needs access to Google Fonts.
