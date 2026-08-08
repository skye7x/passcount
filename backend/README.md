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
`dotnet build`**. I wrote it using standard, well-established ASP.NET Core
patterns, but please run a build before deploying and send me any compiler
errors — I'll fix them.

This project deliberately mixes versions: it targets **.NET 10**, but the
EF Core-related packages (Identity's EF store, SQLite, MySQL/Pomelo,
migrations tooling) are pinned to **9.0.x** rather than 10.0.x, because the
MySQL provider (Pomelo) hasn't shipped EF Core 10 support at the time of
writing. EF Core 9 packages run fine on the .NET 10 runtime — that
combination is explicitly supported — but if you hit a build error here,
this mismatch is the first thing to check.

```bash
cd backend/PassCount.Api
dotnet build
```

If `dotnet build` complains about specific package versions not being
found, run (without a version number) to grab whatever's actually
published, then update the `.csproj` to match and send me the result:
```bash
dotnet add package Pomelo.EntityFrameworkCore.MySql
```

## Local setup

1. Install the [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
   if you don't have it.
2. Install the EF Core CLI tool (one-time):
   ```bash
   dotnet tool install --global dotnet-ef
   ```
3. From `backend/PassCount.Api`, create the initial migration and database
   (uses SQLite locally — zero setup, no MySQL server needed for dev):
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

## Deployment: API on Azure, database on your VPS (Docker)

This is the setup this project is documented for. The database runs in
Docker on your own VPS (files in `backend/docker/`); the API runs on a
**plain Azure App Service** — just the Web App, no bundled database, no
VNet — which sidesteps the regional-policy restrictions the combined
"Web App + Database" wizard kept hitting on the Azure for Students
subscription.

### Step 1 — MySQL on your VPS, via Docker

SSH into your VPS. Install Docker if you don't have it:
```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER   # log out/in after this
```

Copy `backend/docker/` from this repo onto the VPS (`scp -r backend/docker
youruser@your-vps:~/passcount-docker`), then:
```bash
cd passcount-docker
cp .env.example .env
nano .env   # fill in real, long, random passwords
docker compose up -d
```
This starts MySQL 8 in a container with a persistent volume (survives
container restarts/updates) and creates the `passcountdb` database plus a
scoped `passcount_api` user automatically from your `.env` values — the
app never needs the root password.

Check it's healthy:
```bash
docker compose ps          # should show "healthy"
docker compose logs -f     # Ctrl+C to stop watching
```

### Step 2 — Lock the database down

Your VPS is now listening on port 3306 to the whole internet, which needs
tightening before you put real data behind it.

**Get Azure's outbound IP addresses first**, so you know what to allow:
in the Azure Portal, go to your (soon-to-be-created) App Service →
**Settings → Networking → Outbound traffic → Outbound IP addresses**, and
also check **"Additional Outbound IP Addresses"** on the same page — Azure
can use any of that larger set, not just the current ones, especially if
the plan scales. Allow all of them.

**Important Docker + ufw gotcha:** if you use `ufw`, plain `ufw allow`
rules usually **don't** apply to Docker's published ports — Docker
manipulates `iptables` directly and inserts rules that bypass ufw's normal
filtering. Use the `DOCKER-USER` iptables chain instead, which Docker
respects:

```bash
# Replace with each real Azure outbound IP (repeat -I for each one)
sudo iptables -I DOCKER-USER -p tcp --dport 3306 -s <azure-outbound-ip-1> -j ACCEPT
sudo iptables -I DOCKER-USER -p tcp --dport 3306 -s <azure-outbound-ip-2> -j ACCEPT
# then drop everything else on that port
sudo iptables -I DOCKER-USER -p tcp --dport 3306 -j DROP

# make it survive a reboot
sudo apt install -y iptables-persistent
sudo netfilter-persistent save
```

Also require encrypted connections for the app's database user (MySQL 8
auto-generates a self-signed TLS cert out of the box, no extra setup
needed for this to work):
```bash
docker compose exec mysql mysql -uroot -p -e \
  "ALTER USER 'passcount_api'@'%' REQUIRE SSL; FLUSH PRIVILEGES;"
```

### Step 3 — Create the plain Azure App Service

In the Portal: **App Services → + Create → "Aplikacja internetowa"** (the
first option — *not* "Aplikacja internetowa i baza danych", that's the one
that kept failing). This is the same simple wizard that already worked for
you earlier.

- **Resource group:** `RSC-BuS-01` (reuse your existing one)
- **Runtime stack:** **.NET 10 (LTS)**
- **Region:** whatever worked before (Poland Central was fine for the
  plain Web App — the regional restriction only hit the VNet/managed
  database resources in the combined wizard)
- **Pricing plan:** Free (F1) or Basic — either is fine now, since you're
  not paying for a managed database anymore

### Step 4 — Configure app settings

App Service → **Configuration → Application settings** → add:

| Name | Value |
|---|---|
| `Jwt__Key` | A long random secret. Generate with `openssl rand -base64 48`. **Never commit this.** |
| `Jwt__Issuer` | `PassCountApi` |
| `Jwt__Audience` | `PassCountClient` |
| `Database__Provider` | `MySql` |
| `ConnectionStrings__Default` | `Server=<your-vps-ip-or-domain>;Port=3306;Database=passcountdb;User=passcount_api;Password=<the password from your .env>;SslMode=Required;` |
| `Cors__AllowedOrigins__0` | The origin your deployed frontend is served from |
| `Cors__AllowedOrigins__1` | `capacitor://localhost` (for the Android/iOS app) |

(Double underscores `__` are how Azure App Settings map to nested
`appsettings.json` sections like `Jwt:Key`.) Click **Save**, then
**Continue** to restart the app with the new settings.

On first startup, `Program.cs` calls `db.Database.Migrate()`, which
connects out to your VPS over the internet and creates the schema
automatically — nothing to run manually on the VPS side. Just make sure
`dotnet ef migrations add InitialCreate` (Local setup, step 3 above) has
been run once so the migration files exist in the repo before you deploy.

### Step 5 — Deploy the code

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