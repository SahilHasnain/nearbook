# Plan: NEET Book Marketplace (MVP)

**Goal:** Help a student find and buy a used NEET book nearby within minutes.

---

## Stack

- **App:** Expo (existing) + expo-router + NativeWind + TypeScript
- **Data modes:** `EXPO_PUBLIC_DATA_MODE=demo | appwrite`
  - `demo` (default) — placeholder data in memory, no backend needed (`lib/api-demo.ts`, fake user in `lib/demo-user.ts`)
  - `appwrite` — real backend (`lib/api-appwrite.ts`); set the env vars in `.env.local`
- **Backend (appwrite mode):** Appwrite (Auth, Database, Storage, Realtime Chat) — one platform covers the whole MVP
- **State:** TanStack Query for server state
- **Rename app:** `naat-collection` → `nearbook` (app.json, package.json, scheme) ✔ done

The API layer is a facade (`lib/api.ts`) that picks the demo or appwrite implementation at runtime — screens never change between modes.

---

## Data Model (Appwrite collections)

| Collection | Key fields |
|---|---|
| `users` | not a collection — name/avatar on Appwrite account, city in account `prefs` |
| `listings` | title, subject, publisher, edition, condition, price, city, photos[], sellerId, sellerName, status(active/sold), description |
| `conversations` | buyerId, sellerId, buyerName, sellerName, listingId, listingTitle |
| `messages` | conversationId, senderId, text |
| `saved_books` | userId, listingId |

### Backend setup ✔ (done via `scripts/setup-appwrite.mjs` + `schema.json`)

- Database `nearbook` ✔, collections `listings`, `conversations`, `messages`, `saved_books` ✔ (documentSecurity: true, collection perms `create("any")` so logged-in users can create)
- Attributes + indexes created ✔ (script polls until attributes are "available" before adding indexes)
- Bucket `book_photos` ✔ (perms: `create("users")`, `read("any")`, `update("users")`, `delete("users")`, fileSecurity: false, 10MB, jpg/jpeg/png/webp/heic)
- Email/password auth enabled ✔
- Platforms NOT scriptable via API key — add manually in Console > Project Settings > Platforms: Web `http://localhost:8081`, Android `com.nearbook.app`, Apple `com.nearbook.app`
- Re-run anytime: `node scripts/setup-appwrite.mjs` (idempotent)

**Document permissions:** client `createDocument` calls pass explicit permissions — listings/saved_books owned by the user; conversations/messages readable+updatable by both participants.


---

## Screens (routes)

- `/` — Home: nearby listings (own city first), search bar, filter sheet
- `/listings/[id]` — Book details (photos, condition, price, seller card, chat button)
- `/sell` — Publish a listing (photos, title, edition, condition, price, city)
- `/chat` — Conversation list
- `/chat/[id]` — Thread with a buyer/seller
- `/saved` — Wishlist
- `/profile` — My listings, edit, mark sold

---

## MVP Features (build order)

1. **Auth (progressive)** — browse/sign-in-free; first gated action (message, save, sell) opens a bottom-sheet email-OTP modal (`createEmailToken` + `createSession`). No password flow. Demo mode auto-signs in the demo user.
2. **Browse** — list active listings, search by title, filter by subject / publisher / condition / price
3. **Nearby first** — sort/boost listings in user's city
4. **Sell** — photo upload (storage), form → creates listing (default status: active)
5. **Details** — full listing view + seller card
6. **Chat** — 1:1 buyer↔seller threads tied to a listing, realtime messages, no calls
7. **Saved** — toggle wishlist from any listing
8. **My listings** — manage own posts, mark sold (removes from browse)

---

## Phases

**Phase 0 — Setup (0.5–1d)**
Rename app, add Appwrite SDK, auth screens, schema collections.

**Phase 1 — Core loop (3–5d)**
Browse + search + filters + details. Near-empty but the marketplace must read well.

**Phase 2 — Selling (2–3d)**
Publish flow with photo upload + validation + my listings.

**Phase 3 — Connect (3–4d)**
Chat (conversations + realtime messages) + saved books.

**Phase 4 — Polish (1–2d)**
Empty states, loading skeletons, pull-to-refresh, sold flow, basic error handling.

**Ship when:** a student can search a book, message the seller, and buy it nearby.

---

## Out of Scope (MVP)

Payments, delivery, ratings, AI, recommendations, auctions, wallet, admin workflow, JEE/UPSC/etc. expansion.

---

## Later (post-validation)

Featured listings, seller boost, verified badge, local bookshop ads → then expand to JEE → UPSC → CA → college → school books.
