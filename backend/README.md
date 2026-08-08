# PassCount API (backend)

ASP.NET Core 8 Web API providing **optional** account login/registration and
cloud sync for the PassCount app. The mobile/web app works completely
offline without this — this only powers the optional "sign in to sync"
feature added in the Account screen.

## What it does

- Register / log in with email + password (ASP.NET Core Identity — passwords
  are hashed, never stored in plain text)
- Short-lived JWT access tokens (30 min) + rotating refresh tokens (30 days,
  stored server-side only as a SHA-256 hash, single-use, reuse triggers a
  full session revoke as a theft precaution)
- One authenticated endpoint pair, `GET/PUT /api/data`, that syncs a user's
  entire dataset (counters, logs, trainings, equipment lists, settings) —
  the client always sends its complete local state, so there's no complex
  per-field merge logic on the server
- Every query is scoped to the signed-in user's id from the JWT — nobody can
  read or write another user's data
- Rate limiting on auth endpoints (10 requests/min/IP) to slow down
  brute-forcing
- Account lockout after 5 failed logins (15 min)
- Generic "invalid email or password" errors on login — doesn't reveal
  whether an email is registered

## Project layout

```
backend/PassCount.Api/
  Program.cs              - service registration, middleware pipeline
  Data/                    - EF Core DbContext, ApplicationUser, RefreshToken
  Entities/                - EF Core entities (Counter, LogEntry, Training, ...)
  Dtos/                    - request/response shapes, camelCase over the wire
  Services/TokenService.cs - JWT + refresh token issuance
  Controllers/
    AuthController.cs      - register / login / refresh / logout
    DataController.cs      - GET/PUT /api/data (the sync endpoint)
```

## ⚠️ I could not compile this in my sandbox

I don't have the .NET SDK or internet access to install it in the
environment I built this in, so **this code has not been run through
`dotnet build`**. I wrote it carefully using standard, well-established
ASP.NET Core 8 / EF Core 8 / Identity patterns, but please run a build
before deploying and send me any compiler errors — I'll fix them.

```bash
cd backend/PassCount.Api
dotnet build
```

## Local setup

1. Install the [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
   if you don't have it.
2. Install the EF Core CLI tool (one-time):
   ```bash
   dotnet tool install --global dotnet-ef
   ```
3. From `backend/PassCount.Api`, create the initial migration and database
   (uses SQLite locally — zero setup, no server needed):
   ```bash
   dotnet ef migrations add InitialCreate
   dotnet run
   ```
   `Program.cs` runs `db.Database.Migrate()` automatically on startup, so the
   SQLite file (`passcount.db`) and schema are created for you the first
   time you run it.
4. The API listens on the URL printed in the console (typically
   `http://localhost:5220` or similar — check `Properties/launchSettings.json`
   after your first `dotnet run`, or override with `dotnet run --urls
   http://localhost:5220`). Swagger UI is available at `/swagger` in
   development.
5. In the frontend, copy `.env.local.example` to `.env.local` and point
   `NEXT_PUBLIC_API_URL` at that URL, then `npm run dev`.

The dev JWT signing key in `appsettings.Development.json` is a placeholder —
fine for local dev, **never use it in production**.

## Deploying to your Azure App Service

Your screenshots show an App Service named **PassCount** in resource group
**RSC-BuS-01**, created with the **.NET 10 (LTS)** runtime stack. I built
this against **.NET 8 (LTS)** instead — it's a long-term-support release I
have high confidence in getting exactly right by hand, since I couldn't
compile-check the code myself. Two ways to reconcile that:

- **Easiest:** when creating/editing the App Service, pick **.NET 8 (LTS)**
  as the runtime stack instead of .NET 10. Everything else you configured
  (resource group, region, free tier plan) stays the same.
- Or, once you (or I, in a future turn) have verified this builds cleanly,
  bump `<TargetFramework>` in `PassCount.Api.csproj` to `net10.0` and
  update the NuGet package versions to match.

### App settings you need to configure in Azure

In the App Service → **Settings → Environment variables** (or "Configuration"
→ "Application settings"), add:

| Name | Value |
|---|---|
| `Jwt__Key` | A long random secret (32+ bytes). Generate one with `openssl rand -base64 48`. **Never commit this to git.** |
| `Jwt__Issuer` | `PassCountApi` (or your own value — must match what the API validates) |
| `Jwt__Audience` | `PassCountClient` |
| `Database__Provider` | `SqlServer` |
| `ConnectionStrings__Default` | Your Azure SQL connection string (see below) |
| `Cors__AllowedOrigins__0` | The origin your deployed frontend is served from |
| `Cors__AllowedOrigins__1` | `capacitor://localhost` (for the Android/iOS app) |

(Double underscores `__` are how Azure App Settings map to nested
`appsettings.json` sections like `Jwt:Key`.)

### Database

You'll need a real database in Azure for production — SQLite's a local
file, which doesn't survive App Service restarts/scaling. Cheapest options:
an **Azure SQL Database (Basic/Serverless tier)** or **Azure Database for
PostgreSQL Flexible Server (Burstable)** if you'd rather switch providers
(would need swapping the `Microsoft.EntityFrameworkCore.SqlServer` package
for `Npgsql.EntityFrameworkCore.PostgreSQL` and `options.UseNpgsql(...)` in
`Program.cs` — ask me and I'll do that swap).

Once you have a connection string, set it as `ConnectionStrings__Default`
above. On first run, `Program.cs` calls `db.Database.Migrate()` automatically
to create the schema — you don't need to run migrations manually against
the production database, just make sure `dotnet ef migrations add
InitialCreate` has been run once locally so the migration files exist in
the repo.

### Deploying the code

From `backend/PassCount.Api`, the same folder shown as "Publish" in Visual
Studio, or via the Azure CLI:

```bash
dotnet publish -c Release -o ./publish
cd publish
zip -r ../publish.zip .
az webapp deploy --resource-group RSC-BuS-01 --name PassCount --src-path ../publish.zip
```

Or connect GitHub Actions / continuous deployment from your repo in the
App Service's **Deployment Center** — probably the easier path long-term.

## Security notes / what I deliberately kept simple

- **No email confirmation flow** — accounts are usable immediately after
  registering. Adding real email confirmation needs an email-sending
  service (SendGrid, Azure Communication Services, etc.); happy to wire
  that up if you want it, just say so.
- **No password reset flow yet** — same reason (needs email sending). Can
  add "forgot password" once you've picked an email provider.
- **Full-replace sync, not per-field merge** — simplest correct approach
  for a single-user-per-account app; the conflict prompt in the app only
  appears once, the first time you sign in with existing data both locally
  and in the cloud.
