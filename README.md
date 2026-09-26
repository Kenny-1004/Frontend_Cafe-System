# Campus Café — Frontend (kiosk + staff panels)

React + TypeScript + Vite, with TanStack Query for all server data.
Talks to the API in `../Backend_Cafe-System`.

## Login info

Sign in at **http://localhost:5173/staff/login**. Each role lands on its own screen.

| Username | Password | Role | Opens | Can use |
| --- | --- | --- | --- | --- |
| `admin` | `cafe12345` | Manager | `/staff/admin` | Everything: back office, cashier, board, kiosk preview |
| `cashier1` | `cafe12345` | Cashier | `/staff/cashier` | Cashier + orders board |
| `cashier2` | `cafe12345` | Cashier | `/staff/cashier` | Cashier + orders board |
| `barista1` | `cafe12345` | Barista (kitchen) | `/staff/board` | Orders board |
| `barista2` | `cafe12345` | Barista (kitchen) | `/staff/board` | Orders board |

- `cafe12345` is a **development password** set by `npm run db:seed` / `npm run db:dev-passwords`
  (never in production). Change one with `npm run staff:password -- admin "new-password"`, or from
  *Back office → Staff*. Setting a password signs that person out everywhere.
- 5 wrong passwords in a minute locks that username for a minute on that computer.
- **Kiosk (`http://localhost:5173/`)** has no login: a tablet is paired once. Sign in as `admin`,
  open *Back office → Kiosks → Register kiosk*, then type the 8-character code on the tablet
  (valid 15 minutes, works once). Signed-in managers can open the kiosk directly as a preview.
- **Database logins** (in `Backend_Cafe-System/.env`, never committed):
  `DATABASE_URL` uses `cafe_api` (the API's restricted login) and `MIGRATION_DATABASE_URL` uses
  your `postgres` owner account (migrations and seeding). Reset the API's database password with
  `npm run db:app-login -- cafe_api "<new password>"` and update `.env`.

## Run it

```bash
# 1. start the backend (in Backend_Cafe-System)
npm run dev                  # listens on PORT from its .env (5006)

# 2. start the kiosk (in this folder)
npm install
npm run dev                  # http://localhost:5173
```

Vite proxies `/api` to the backend, so the backend needs no CORS setup.
If the backend runs on another port: `API_URL=http://localhost:4000 npm run dev`.

## Scripts

| Script            | What it does                          |
| ----------------- | ------------------------------------- |
| `npm run dev`     | Dev server with hot reload            |
| `npm run build`   | Type-check, then build to `dist/`     |
| `npm run preview` | Serve the production build (with the `/api` proxy) |
| `npm run lint`    | oxlint                                |

## Screens

| Route | Who | Screen |
| --- | --- | --- |
| `/` | customers | Kiosk menu (paired tablets only; others see the pairing screen) |
| `/orders/:publicId` | customers | Receipt with the order number; updates live, chimes when ready |
| `/staff/login` | staff | Sign-in (see **Login info** above) |
| `/staff/cashier` | cashier, admin | Look up an order number, take cash, see the change, cancel |
| `/staff/board` | barista, cashier, admin | Preparing / Ready columns, Done, Picked up, full-screen mode |
| `/staff/admin` | admin | Dashboard: today's sales, charts, best sellers, low stock |
| `/staff/admin/orders` | admin | Order history, filters, audit timeline |
| `/staff/admin/menu` | admin | Products, prices, show/hide, recipes, categories |
| `/staff/admin/inventory` | admin | Stock, restock / waste / adjust, ledger history |
| `/staff/admin/suppliers` | admin | Suppliers and price lists |
| `/staff/admin/deliveries` | admin | Create from price list, receive actual quantities |
| `/staff/admin/staff` | admin | Accounts, roles, deactivate, reset passwords |
| `/staff/admin/reports` | admin | Date ranges, daily sales chart, best sellers, CSV export |
| `/staff/admin/kiosks` | admin | Register tablets, one-time pairing codes, deactivate, re-pair |

## Structure

```
src/
  api/          client.ts (fetch + session refresh), types.ts, kiosk.ts, staff.ts, admin.ts
                (TanStack Query hooks for every endpoint)
  auth/         SessionProvider (GET /auth/session), RequireStaff route guard
  realtime/     useEventStream: SSE with reconnect + session refresh
  cart/         kiosk cart reducer and provider
  components/   kiosk components (Header, ProductCard, ProductDialog, CartPanel)
  pages/        kiosk pages (MenuPage, OrderPage)
  staff/        StaffLayout, LiveIndicator, pages/ (Login, Cashier, Board), admin/ (back office)
  ui/           Dialog, toasts, Switch, ColumnChart, status badges, formatting helpers
  lib/          money (centavo arithmetic), menu (size grouping), uuid
  index.css     kiosk theme · staff.css  staff panels
```

## How data flows

- **Kiosk pairing.** `KioskGate` asks `GET /kiosk/session`; an unpaired tablet shows the pairing screen and
  redeems the manager's one-time code for an httpOnly device cookie. Managers see a preview banner.

- **Server state = TanStack Query.** Every screen reads through hooks in `src/api/*`; mutations
  invalidate the affected queries, and the board uses optimistic updates for Done / Picked up.
- **Live updates = SSE → invalidate.** Screens subscribe with `useEventStream` (kiosk: own order and
  menu; cashier, board, admin: their channels). An event only says *what* changed; the query
  re-fetches the truth. On reconnect every snapshot is re-fetched, so nothing is missed.
- **Sessions.** Staff cookies are httpOnly; the page never sees a token. A 401 triggers one shared
  refresh + retry; if the session is really gone the app returns to sign-in.
- **Placing an order** sends an `Idempotency-Key` (one per checkout), so a retry after a network
  error can never create a second order.
- **Money** is decimal strings from the API; arithmetic is in whole centavos, and the amount the
  cashier hands back is the one the server returned.
- The TanStack Query devtools button (bottom-left) only appears in development.
