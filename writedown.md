# How PassCount Works

## The big picture

PassCount is two separate things that talk to each other over HTTP:

1. **The frontend** — a Next.js app, exported as static HTML/JS/CSS, wrapped by Capacitor to run as an Android/iOS app (and it also just works as a regular website). This is the app itself — all the screens, counters, trainings, equipment lists.
2. **The backend** — an ASP.NET Core Web API, deployed separately (to your Azure App Service). It only exists to handle the *optional* login/register/sync feature. The app never needs it to function.

They're independent. You could delete the backend entirely and the app would keep working exactly as it did before — just without cross-device sync.

---

## Part 1: The frontend (how the app itself works)

### Local-first storage
Every piece of data — counters, decrement/reset/edit logs, trainings, equipment lists, settings — lives in the browser's/WebView's `localStorage`, read and written by `lib/CounterContext.tsx`. This is a React Context that wraps the whole app (`app/layout.tsx`), so any page can read `counters`, call `addCounter(...)`, `decrementCounter(id)`, etc.

Nothing here changed from before. This is still the source of truth on the device.

### Pages
Each screen is a route under `app/`:
- `/` — home, list of counters
- `/add`, `/edit` — create/edit a counter
- `/log` — history of decrements/resets/edits
- `/trainings`, `/add-training` — recurring training reminders
- `/equipment`, `/equipment-list`, `/add-equipment` — packing lists
- `/settings` — preferences, plus the new **Account** row
- `/account` — the new sign-in/register screen

### What I added: the sync layer
Three new files sit *alongside* `CounterContext`, not inside it:

- **`lib/api.ts`** — talks to the backend. Handles login/register/refresh/logout, and `GET`/`PUT /api/data` to pull/push your whole dataset. Stores your login tokens using `@capacitor/preferences` (which uses secure native storage on a phone, and falls back to `localStorage` automatically in a browser).
- **`lib/AuthContext.tsx`** — tracks whether you're logged in and as whom. Wraps `CounterProvider` in `layout.tsx`.
- **`lib/useSyncEngine.ts`** — the actual sync logic, used inside `CounterContext`:
  - **On login:** fetches your cloud data. If the cloud is empty, it pushes your local data up. If your device is empty, it pulls the cloud data down. If **both** have real data, it shows you a one-time choice ("keep this device's data" vs "use cloud data") — this is the `ConflictPrompt` you'll see on the Account page in that case.
  - **After that:** every time your data changes (add a counter, tap decrement, pack a list...), it waits 1.5 seconds of quiet, then pushes your *entire* dataset to the server in one shot. This is a deliberately simple design — full replace, not per-field merging — which is much harder to get subtly wrong.
  - **If you're not logged in:** none of this runs. Zero network calls, zero backend dependency.

You can see this happening in Settings → Account: a small badge shows "Syncing…", "Synced 3:42 PM", or an error, and taps through to the account screen.

---

## Part 2: The backend (how sync works server-side)

An ASP.NET Core Web API with three real capabilities:

1. **`POST /api/auth/register`** — creates an account. Password is hashed by ASP.NET Core Identity (never stored in plain text), and a JWT + refresh token pair is returned.
2. **`POST /api/auth/login`** — checks email + password, returns the same token pair. After 5 wrong passwords, the account locks for 15 minutes. Wrong password and "email doesn't exist" return the *same* generic error, so nobody can probe which emails are registered.
3. **`GET`/`PUT /api/data`** — the sync endpoint, requires a valid JWT. `GET` returns your counters/logs/trainings/equipment/settings; `PUT` replaces all of it with what you send. Every query is filtered by the user id embedded in your token — there's no way to read or write someone else's data.

Access tokens (JWTs) expire in 30 minutes; the app silently uses the refresh token to get a new one when needed, so you don't get logged out mid-use. Refresh tokens themselves rotate on every use and are stored server-side only as a hash — if a used-up refresh token is ever presented again, that's treated as a stolen-token signal and **every** session for that account gets revoked automatically.

Data lives in a real database — SQLite for local dev (a single file, zero setup), SQL Server/Azure SQL in production.

---

## Setting everything up

### Step 1 — Frontend, running locally

```bash
cd passcount-main
npm install
npm run dev
```

Open `http://localhost:3000`. At this point the app works fully offline — no backend needed yet.

### Step 2 — Backend, running locally

```bash
cd passcount-main/backend/PassCount.Api
dotnet tool install --global dotnet-ef   # one-time
dotnet ef migrations add InitialCreate
dotnet run
```

This starts the API at `http://localhost:5220` (set in `Properties/launchSettings.json`), using a local `passcount.db` SQLite file created automatically on first run.

**⚠️ One thing to do first:** I couldn't compile this backend myself (no .NET SDK in my sandbox). Run `dotnet build` before the steps above — if you get errors, paste them back to me and I'll fix them right away.

### Step 3 — Connect frontend to backend

```bash
cd passcount-main
cp .env.local.example .env.local
```

It already defaults to `http://localhost:5220`. Restart `npm run dev`. Now Settings → Account lets you actually register/log in against your local backend.

### Step 4 — Deploying the backend to Azure

Your screenshots showed an App Service called **PassCount** created with the **.NET 10 (LTS)** stack — I built this against **.NET 8 (LTS)** instead (explained in `backend/README.md`: higher confidence writing it correctly by hand without a compiler). When you (re)create the App Service, just pick **.NET 8 (LTS)** in that dropdown instead — everything else you already configured (resource group `RSC-BuS-01`, region, free tier) stays the same.

In the Azure Portal, under the App Service → **Configuration → Application settings**, add:

| Setting | Value |
|---|---|
| `Jwt__Key` | A long random secret — generate with `openssl rand -base64 48` |
| `Jwt__Issuer` | `PassCountApi` |
| `Jwt__Audience` | `PassCountClient` |
| `Database__Provider` | `SqlServer` |
| `ConnectionStrings__Default` | Your Azure SQL connection string |
| `Cors__AllowedOrigins__0` | Wherever your frontend is hosted |
| `Cors__AllowedOrigins__1` | `capacitor://localhost` |

You'll need an actual database in Azure (SQLite is a local file and won't survive restarts) — an Azure SQL Database on the Basic/Serverless tier is the cheapest fit. Full deploy commands (`dotnet publish` + `az webapp deploy`) are in `backend/README.md`.

### Step 5 — Point the deployed frontend at the deployed backend

Update `.env.local` (or your build environment) to your Azure URL:
```
NEXT_PUBLIC_API_URL=https://passcount-<your-app>.azurewebsites.net
```
Rebuild (`npm run build`) — this value is baked in at build time, not read at runtime.

### Step 6 — Native apps

If/when you rebuild the Android/iOS wrapper, run `npm run cap:sync` (or `cap:android`/`cap:ios`) after any frontend rebuild so the native shell picks up the new static export, including the `@capacitor/preferences` plugin I added — Android needs `npx cap sync android` at least once to pull that native dependency in.

Want me to walk through any one of these steps in more depth, or help troubleshoot once you run the actual `dotnet build`?

THIS MARKDOWN WAS GENERATED BU CLAUDE AI.