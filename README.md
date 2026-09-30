# AMS Travel CMS

The back-office dashboard for AMS Travel, built with Next.js. It runs on port **3001**, and the public website runs on port 3000. All data comes from the Spring Boot API.

## Run

```bash
npm install
npm run dev          # http://localhost:3001
```

The API, Keycloak and MinIO must be running first. To start everything, including this app, run `docker compose up -d --build` from `../api/deployment`.

Copy `.env.example` to `.env.local` and fill it in:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | This app's origin (`http://localhost:3001`) |
| `NEXT_PUBLIC_TRAVEL_SITE_URL` | Public website (`http://localhost:3000`) |
| `API_BASE_URL` | Spring API (`http://localhost:8080/api/v1`) |
| `KEYCLOAK_ISSUER_URL` | `amsadmin` realm issuer |
| `KEYCLOAK_INTERNAL_URL` | Server-side Keycloak URL (same as the issuer outside Docker) |
| `KEYCLOAK_CLIENT_ID` / `KEYCLOAK_CLIENT_SECRET` | The `amsadmin-dashboard` client (server-side only) |

## Sign-in

Users sign in on Keycloak's own login page in the `amsadmin` realm. The flow is Authorization Code with PKCE on a confidential client. Staff accounts must also enter a 6-digit code sent by email.

```text
Keycloak → HttpOnly session cookie → same-origin /api routes → Spring API (bearer token)
```

The token stays in the HttpOnly cookie. It never goes into Redux or local storage. Spring decides who can access what, so hiding a menu item in the dashboard does not grant or block access.

## Roles

Each role sees its own sidebar, defined in [`src/features/shell/nav.ts`](src/features/shell/nav.ts). Which actions a user can take depends on their permission grants, not their role name.

| Role | Sees |
| --- | --- |
| Partner | Own stays and food · Partner desk (sends work to a BDO) |
| Contributor | Own content · Contributor desk (sends work to an editor) |
| Editor | Catalogue, Homepage & Discovery, Taxonomy, History & Heritage · reviews contributors |
| BDO | Same as Editor · reviews partners |
| Admin | Everything · Administration (Users, Roles, Audit Logs, Settings) |

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Redux Toolkit + RTK Query · React Hook Form + Zod · TanStack Table · Recharts · Leaflet

- `src/app/`: routes, including the `/api` handlers that forward requests to Spring
- `src/features/<feature>/`: each feature's screens, API endpoints (`injectEndpoints`) and helpers
- `src/store/`: one `baseApi` for caching and tags, plus slices for UI preferences only
- `src/components/ui/`: shared UI building blocks

## Checks

```bash
npm run lint
npx tsc --noEmit
npm run build
```
