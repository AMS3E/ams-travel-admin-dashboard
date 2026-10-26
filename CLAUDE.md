@AGENTS.md

# AMS Travel admin dashboard

The staff dashboard of AMS Travel, Cambodia's travel app by AMS3E: Next.js 16 (App Router, React 19), signed in through Keycloak, reading and writing the AMS Travel API on http://localhost:8080. The sister repo is `ams-travel-api`. Kimleng, the project lead, reshaped this code in October 2026. This code is the source of truth, not the Figma prototype and not any older branch.

## Check with Kimleng before you start

Kimleng is the project lead and owns every product decision here. Some requests need Kimleng's eyes before any code changes. That is any work in the zones below, and any request that looks odd, contradicts a line under "Settled decisions", or has no clear problem behind it. In those cases do not start. Do this instead:

1. **Say it back.** In two or three plain sentences: what the person is asking for, what it would change, and which zone it touches. No code yet.
2. **Ask.** Use the AskUserQuestion tool with the header `Kimleng`, the question "This needs Kimleng's eyes before it goes ahead. Has Kimleng seen it?" and exactly these two options:
   - **"Kimleng approved, go ahead"**: build it. When you commit, say in the body that Kimleng approved the change.
   - **"Not yet, hold here"**: stop. Write a short note the person can send to Kimleng (what was asked, what it would change, the one question Kimleng must answer). Then do nothing more on that request until they come back with an answer.

   If the AskUserQuestion tool is not available, ask the same question in text, with the same two answers, and wait for the reply.

**The zones**
- The database: a new, renamed, dropped or retyped column or table; any edit to a changelog that has already run.
- Removing or renaming a page, a form field, an endpoint, a sidebar entry, a role or a permission.
- The product model: Verified and Recommended, the seals and their thresholds, tourism regions, and what categories, tags, amenities and interests are.
- A new module, page or feature that is not already in the sidebar or the API. Two modules were once built without a brief and later had to be removed.
- Sign-in, roles, Keycloak, secrets and env files.
- `git push`, force-push, rebase, deleting or renaming a branch.
- Scripts that change or delete rows in a database, and anything to do with deployment.
- A new dependency.

**Not a zone, no check needed:** fixing a bug; wording, layout and styling inside an existing page; tests; a field added to an existing form in the pattern of the fields around it; reading and explaining code.

If a `CLAUDE.local.md` next to this file says you are working with Kimleng, skip this check and follow that file instead.

## Settled decisions (do not reverse without Kimleng)
- Categories and tags are flat lists, each owned by a tourism region. No tag or category has children or values. The Figma still draws Century, King, Religion and Historical Period as headings with values under them; it is stale on this point. The Ancient Capitals tags are deliberately named Century, King, Religion, Architecture Style, Historical Period and UNESCO.
- There is no Featured flag and there are no Homepage & Discovery pages. The app's "Explore by Popular" comes from the API's `GET /api/v1/popular`, which ranks by browses alone.
- One Verified badge per destination, attractions, stays and food places alike since 2026-10-20 (a decision names its kind, no key to the attractions table). Since 2026-10-26 (Kimleng) it is earned two ways and shows as nothing but "Verified": a Paid decision with its invoice or receipt, or the traveller score (10,000 ratings at 4.5 or better, configured in the API). "Recommended by AMS Travel", "Recommended by Traveler" and the Official site and Partner bases are gone; tourism regions and corridors carry no badge of any kind, only destinations do.
- History & Heritage is gone, module and schema. The food menu builder is gone and dishes have no section. Amenities are one managed taxonomy with levels (stay, room), not fixed lists.
- Content Management order: All Destinations, Tourism Corridors, Tourism Regions, Verification, Media Library, Destination Stats. Taxonomy is Tourism Regions, Amenities, Interests, Provinces. The taxonomy tree was replaced on 2026-10-21 and reshaped on 2026-10-22 (both Kimleng's call): Taxonomy → Tourism Regions (`/categories-and-tags`) is ONE page — region chips on top, then the standard Categories and Tags tables stacked, each with a "Used by" destination count and its own New button that starts in the chosen chip's region. No tabs, no separate pages; the lists are called Tags, not Search Filters; `/categories` and `/tags` redirect there (keeping `?region=`).
- A tourism region is created only in Content Management → Tourism Regions (`/regions/new`). Its ordered lists are edited on its own form; the Taxonomy → Tourism Regions page manages the terms across regions ("New" from a region's chip starts in it), never regions themselves.
- Reviews carry a visit type (Business, Couples, Family, Friends, Solo) and a visit month, and can be written on destinations, food places, stays and corridors; corridors can be saved too.
- A tourism region has a cover picture (`coverKey`, folder `region`), asked on its form and shown on its detail page, and a centre (`latitude`, `longitude`, section Map on its form): the marker the app puts on its Map screen. The API wants both or neither (`pairedWith` in the registry says so before the round trip) and keeps the current centre when neither is sent. A region's answer carries the middle of its places until an editor stores a centre (`centreSet` false), so the form's boxes start empty then (`blankUnless: "centreSet"`) and a plain save sends null for both: the centre keeps following the places.
- A province has a cover picture (`coverKey`, folder `province`) and a centre, asked on its form the same way; the seed puts every province on its capital town. The Provinces table leads with the cover and shows the API's `placeCount`. `bounds`, `averageRating` and `reviewCount` are read-only and not shown.
- A tourism corridor has a photo gallery (`corridor-media`, the API's `/media?ownerType=CORRIDOR`), on its detail page under the itinerary, in the same box as a destination's. Making a photo the cover sets the corridor's cover; the single cover box on the corridor form and the creator stays, and such a cover shows first in the gallery.
- A tourism corridor says "What you expect" (2026-10-21, Kimleng's call): short free-text labels — Sunrise, Photography, Historic Site — typed by hand, NOT a taxonomy and without icons. The field kind `lines` (`fields/lines-field.tsx`: one box per label, arrows for order, blanks dropped, at most 12 of 40 characters) asks them in a "What you expect" section on the corridor form and on the creator's extras; the corridor detail page shows them as chips under the figures; the API stores them on the corridor (`expectations`) and the app just displays them in this order. English only for now.
- The app searches on the SERVER: `GET /api/v1/search` (+ `/suggest`, `/cards`). Nothing filters the destination feed on the phone.
- Stays are PRICE PREVIEW only, never booking. A room has a nightly price and an optional weekend price, side by side in the room editor; weekend means Friday and Saturday nights (the API's default on the stay, not asked on any form); `GET /api/v1/stay-rooms/quote` sums the nights and the app shows ONE total for the stay, never a nightly price.
- An interest has a picture (`coverKey`, folder `interest`), asked on its form in place of the icon picker and shown in its preview and in the place-in-group list; `iconKey` is kept for the app and no longer asked (2026-10-16, from the developer's branch).
- A tourism region has a map picture (`mapKey`, section Media, labelled "Map picture"): ONE image for the Map panel of its page in the app, where the interactive map of its places used to be. The region detail page shows that picture and no longer draws a map. The region's "Recommended by AMS Travel" checkbox went on 2026-10-26 with the badge itself: a region carries no badge.
- Audit Logs (2026-10-16, the developer's redesign): filters by record type, action, person and record id, a drawer per event, the API's maximum fetched once and paged in the browser; clearing the log stays admin-only.
- People → an account page has a Profile form (first and last name, e-mail, phone, photo, active) on `PUT /api/people/{id}` → API `PUT /api/v1/staff/{id}`; nobody can disable their own account.
- Kept on purpose, do not remove: the Compact tables preference (Settings), the Technical permissions panel (Profile), the Kind and Status columns on Seasons.
- Destination Detail (`/destinations/{id}/detail`, `/stays/{id}/detail`, `/foods/{id}/detail`; 2026-10-20) is the read-only page of an attraction, a stay or a food place, under its listing's own address so the sidebar stays on All Destinations: the listing's strip, the period tiles (rating, reviews, browses, views, from `GET /admin/destination-stats/{id}`), every review, the Check-in code box, and for an attraction alone the Verified box and its history. Since 2026-10-22 it also shows the listing's own content (`place-content.tsx`): About with the interest/region/category/tag/facility chips, the photo gallery, a stay's Rooms (guests, size, nightly + weekend price, breakfast) — NO dishes section, Kimleng: the product has no food dishes or menu builder any more — and an "At a glance" panel (type, stars, check-in/out, price range, average meal, payment, contact links, opening hours with today bold, map pin) whose rows appear only when the form has an answer; the two columns are `items-start`, so a tall codes list never stretches the reviews. A name opens it on All Destinations, on Destination Stats and on a region's page (`?from=` carries the way back); the pencil keeps the form.
- Check-in codes (2026-10-20, management per print since 2026-10-21): every destination of any kind carries codes the CMS issues, prints as QRs (the `qrcode` package, client side) and posts on site; a traveller's check-in needs the scan AND the phone within the radius, once per place per season, and a place with no code posted cannot be stamped. A place holds ANY NUMBER of active prints at once (the gate, a brochure), each with an optional label saying where it went and a count of the check-ins it collected; issuing another never touches the posted ones, and the scanned code alone names the place the check-in lands on, never the screen the scanner was opened from. The box on Destination Detail issues (label box beside the button), prints, retires (deliberate, per print, who and when kept below struck through) and deletes (only a code never scanned; the API answers 409 otherwise), for PERM_DESTINATION_EDIT_ANY, through `/api/v1/stamps/codes` (+ `POST /{id}/retire`). Three badge ladders only, Browser, Reviewer, Adventure: the Explorer (points) ladder was retired.
- Check-ins (stamps) and points are in scope; Apple sign-in is out; Google sign-in may come; the OTP sign-in is the Keycloak email-code authenticator the API Dockerfile builds from `src/main/keycloak`, not yet in the repo.
- The dashboard reads in English or Khmer (2026-10-21, the developer's translation layer merged from `origin/visal`): next-intl, the language chosen in the top bar and remembered in the `NEXT_LOCALE` cookie (English when unset, so the browser checks read English), one JSON file per namespace in `public/locales/en/` and `public/locales/kh/` (the folder is `kh`, the locale code `km`), English filling any key Khmer has not got. Every new screen gets its keys in BOTH files; the registry's labels, hints and options are translated through `resources.json`, not in `resources.ts`. Running text is one size (15px, 16px in Khmer) since the same merge.
- Khmer content (2026-10-21, unparked by Kimleng): an attraction, a stay and a food place carry a Khmer name, slogan, said-by, About and address beside the English (`khmerOf` fields in the registry, shown by the form's language switch); regions and interests a Khmer name and description, provinces, categories and tags a Khmer name; a tourism corridor a Khmer name, short description and description (2026-10-22, ported from the developer's `visal` branch: `nameKm`/`shortDescriptionKm`/`descriptionKm` in the registry with a Khmer column on the table, and the one-go creator gets the same language switch with its missing-Khmer badge). Typed by hand, never machine-translated. Khmer is OPTIONAL for now: the form's header badge and the tables' Khmer column count what is still to write (the API's `missingKhmer`), but nothing waits on it. The developer's publish gate (refuse to go live while Khmer is missing) was left out on purpose; it would go back into `saveAs` in listing-form.tsx and into the API's publish paths.
- Activities & Experiences (2026-10-21, Kimleng's fourth kind of destination, the boss's mind map): the `activities` registry entry and `/activities` pages, a tab of All Destinations and a card of Create Destination, with `activity-media` as its gallery. An attraction's questions (name, link name, slogan, About, photos, province, address, map pin, Khmer twins) plus a Contact section (owner account, phone, e-mail, website, Telegram, WhatsApp, Facebook), and its Type right after Details: the Activities & Experiences interest shelf, the API's `type` following the first one ticked (`kindOf`) as for a stay or a food place. NO tourism region, category or tag: like a stay, an activity is classed by its interests alone, and the attraction form's Interests no longer offer the Activities & Experiences group. A partner may own one. No price, duration or hours for now.
- Badges and seasons speak the API's own names since the same merge: `/badges` with `type`, `level`, `threshold`, `status`, `destinationIds`; a season's `type` HIGH_SEASON | GREEN_SEASON. There is no POINTS badge type.

## Where things are
- `src/features/catalog/resources.ts`: the registry that drives every listing form and table (fields, sections, hints; `derived: true` marks a value kept but never asked). Change a form here first.
- `src/features/catalog/components/listing-form/`: the one-page form engine; `fields/` holds the field kinds.
- `src/features/catalog/components/`: All Destinations, the media gallery, the region detail page, its map and the taxonomy tree.
- `src/features/verification`, `src/features/dashboard` (Destination Stats and Destination Detail), `src/features/media`, `src/features/shell` (sidebar and navigation; `language-menu.tsx` is the switch).
- `src/i18n/`: the locales, the request config that reads the cookie and merges Khmer over English, the date words; `public/locales/{en,kh}/*.json`: the texts, one file per namespace; `src/features/catalog/localize.ts`: how a registry definition is translated.
- `src/app/(dashboard)/`: the routes. `src/proxy.ts`: the proxy to the API.

## How to work
- `npm run dev` serves :3001. `npx tsc --noEmit` and `npm run lint` must be clean before a commit.
- Never run `npm run build` beside a running `next dev`: it stops the dev server.
- The browser checks (`local/ui-checks/run.sh`) live on Kimleng's machine outside this repo. Ask Kimleng to run them for anything visible.
- Commit when asked, one commit per repo, a subject in plain words and a body that lists what changed. Never push without Kimleng's go.
- Decisions are made by looking: take a screenshot of what you built and show it before calling a design done.

## Working on `visal` (the developer's branch)
`kimleng` is the source of truth. `visal` is the developer's working branch: cut from `kimleng` on 2026-10-16 and kept on top of it.
- Start every session on `visal` with `git fetch origin && git rebase origin/kimleng`. Never merge `kimleng` into `visal` by hand, and never merge `visal` into `kimleng`: Kimleng does that, from a pull request.
- A conflict is a stop sign. `git rebase --abort`, list the files, and tell Kimleng. Do not resolve it.
- Never delete or rewrite what is not yours: `CLAUDE.md`, `.claude/`, pages, preferences and columns Kimleng built. On 2026-10-16 the Compact tables preference, the Technical permissions panel and the Kind and Status columns of Seasons went missing in a merge and had to be put back.
- What `kimleng` deleted stays deleted, History & Heritage first of all: no heritage fields, pages, image folders or wording.
- Push to `visal` only. When a piece is done, open a pull request from `visal` to `kimleng` that says what changed and why; Kimleng reviews and merges.

## Traps
- The API silently drops JSON fields it does not know, so a dashboard field saved against an older API vanishes without an error.
- A registry field that is simply removed stops being sent, and the API blanks that column on the next save. Keep such fields as `derived: true`.
- The React compiler lint refuses refs read or passed during render: pass intent as a function argument, read remembered state through `useSyncExternalStore`, and put blur handlers on the input itself.
- `form.resetField` does nothing for a value with no registered input; the hidden inputs (cover key, URL) exist for that reason.
- A static `[id]` route swallows `/new`: any resource with a detail route needs its own `new` route.
- A deleted route stays in `.next/types/validator.ts` until `npx next typegen` (safe beside `next dev`).
- `origin` is a DOM global in TypeScript's lib: deleting a `const origin` keeps `tsc` happy and breaks the server. After deleting a const, grep for the bare name.
- The not-found page streams with HTTP 200: assert on its title, not the status.
