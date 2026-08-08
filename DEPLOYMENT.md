# PassCount — Deployment Setup

End-to-end setup guide for the production architecture:

```text
┌──────────────────────────┐
│      PassCount App       │
│   (Android / web / iOS)  │
└────────────┬─────────────┘
             │ HTTPS
             ▼
┌──────────────────────────┐
│  Azure App Service       │
│  PassCount.Api (.NET 10) │
└────────────┬─────────────┘
             │ MySQL / TCP 3306 / TLS
             ▼
┌──────────────────────────┐
│         VPS              │
│  Docker Compose → MySQL 8│
│  (persistent volume)     │
└──────────────────────────┘
```

- **Database:** MySQL 8 in Docker on your own VPS (`backend/docker/`).
- **API:** ASP.NET Core 10 Web API hosted on **Azure App Service**.
- **Frontend:** static Next.js export wrapped in a **Capacitor Android** app
  (and iOS if you have a Mac). Works fully offline; the API is only needed
  for optional account + cloud sync.

The detailed backend documentation (in Polish) is in `backend/README.md`.
This file is the practical, ordered setup guide.

---

## Table of contents

1. [Prerequisites](#prerequisites)
2. [Local development](#local-development)
3. [VPS — MySQL in Docker](#vps--mysql-in-docker)
4. [Azure App Service — API](#azure-app-service--api)
5. [Android — frontend](#android--frontend)
6. [End-to-end verification](#end-to-end-verification)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

| Component | Requirement |
|---|---|
| .NET SDK | 10.x (project targets `net10.0`) |
| `dotnet-ef` | `dotnet tool install --global dotnet-ef` |
| Node.js / npm | Node >= 18, npm 10+ |
| Docker + Compose | only needed where MySQL runs (local or VPS) |
| Java (JDK) | 21 LTS for the Android Gradle build (Gradle 8.11.1 does **not** support Java 26) |
| Android SDK | installed locally for APK builds |
| Azure | subscription + App Service |
| VPS | Linux with SSH access, 1–2 GB RAM is enough for MySQL |

---

## Local development

### 1. Run MySQL in Docker (optional but matches production)

```powershell
cd backend\docker
Copy-Item .env.example .env   # edit passwords
docker compose up -d
docker compose ps             # wait until status = healthy
```

Connection string for local dev:

```
Server=localhost;Port=3306;Database=passcountdb;User=passcount_api;Password=<your-pass>;AllowPublicKeyRetrieval=true
```

> `AllowPublicKeyRetrieval=true` is only needed for plain-TCP local dev
> (MySQL 8 caching_sha2_password). Over TLS (`SslMode=Required`) it is not.

### 2. Run the API

```powershell
cd backend\PassCount.Api
$env:Database__Provider = "MySql"
$env:ConnectionStrings__Default = "Server=localhost;Port=3306;Database=passcountdb;User=passcount_api;Password=<your-pass>;AllowPublicKeyRetrieval=true"
$env:Jwt__Key = "dev-only-key-at-least-32-chars-long-0000"
dotnet run
```

- Schema is created automatically on startup (`db.Database.Migrate()`).
- Swagger: `http://localhost:5220/swagger`.
- No env vars + `ASPNETCORE_ENVIRONMENT=Development` → falls back to the
  zero-setup **SQLite** database in `appsettings.Development.json`.

### 3. Run the frontend (web dev)

```powershell
Copy-Item .env.local.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:5220
npm install
npm run dev                                # http://localhost:3000
```

---

## VPS — MySQL in Docker

### 1. Install Docker on the VPS

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# log out and back in
docker --version && docker compose version
```

### 2. Copy the Docker project

From your machine:

```bash
scp -r backend/docker you@YOUR_VPS_IP:~/passcount-docker
```

On the VPS:

```bash
cd ~/passcount-docker
cp .env.example .env
nano .env     # set long random passwords, bind 0.0.0.0, port 3306
```

### 3. Start MySQL

```bash
docker compose up -d
docker compose ps      # mysql should be healthy
docker compose logs -f # Ctrl+C to exit
```

The volume `mysql_data` keeps data across container restarts. **A volume is
not a backup** — schedule regular dumps (see [Backups](#backups)).

### 4. Verify the DB is reachable

```bash
docker compose exec mysql mysql -upasscount_api -p -e "SELECT 1"
```

### 5. Lock down port 3306

Azure App Service egress comes from a set of IPs (App Service →
Properties → *Outbound IP Addresses* + *Additional Outbound IP Addresses*).
Docker bypasses normal UFW rules via iptables, so restrict traffic in the
`DOCKER-USER` chain:

```bash
sudo iptables -I DOCKER-USER -p tcp --dport 3306 -s <AZURE_IP_1> -j ACCEPT
sudo iptables -I DOCKER-USER -p tcp --dport 3306 -s <AZURE_IP_2> -j ACCEPT
sudo iptables -I DOCKER-USER -p tcp --dport 3306 -j DROP

sudo apt install -y iptables-persistent
sudo netfilter-persistent save   # survive reboot
```

Repeat `ACCEPT` for every Azure outbound IP. If you also want local
connections, add your own IP too. **Verify SSH still works after applying.**

### 6. Require TLS for the app user

MySQL 8.4 ships auto-generated server certificates, so `SslMode=Required`
works without extra setup. Force the app user to use TLS:

```bash
docker compose exec mysql mysql -uroot -p
```

```sql
ALTER USER 'passcount_api'@'%' REQUIRE SSL;
FLUSH PRIVILEGES;
```

The API connection string then must use `SslMode=Required`.

### Backups

```bash
docker compose exec mysql mysqldump -upasscount_api -p passcountdb > passcountdb-backup.sql
```

Store backups **off the VPS** and test a restore periodically.

---

## Azure App Service — API

### 1. Create the Web App

- Create a plain **App Service → Web App** (not "Web App + Database").
- Runtime stack: **.NET 10**.
- Free tier (F1) is fine to start.

### 2. Set application settings

Portal → your Web App → **Configuration → Application settings** (or `az
webapp config appsettings set`). Keys use `__` for nesting.

| Name | Value |
|---|---|
| `Database__Provider` | `MySql` |
| `ConnectionStrings__Default` | `Server=YOUR_VPS_IP;Port=3306;Database=passcountdb;User=passcount_api;Password=<your-pass>;SslMode=Required` |
| `Jwt__Key` | random key, >= 32 chars (`openssl rand -base64 48`) |
| `Jwt__Issuer` | `PassCountApi` |
| `Jwt__Audience` | `PassCountClient` |
| `Cors__AllowedOrigins__0` | `https://localhost` (Capacitor Android WebView origin) |
| `Cors__AllowedOrigins__1` | your web origin if you host the PWA, e.g. `https://app.example.com` |
| `ASPNETCORE_ENVIRONMENT` | `Production` |

> `Cors__AllowedOrigins__0` must be `https://localhost` for the Android app
> because `capacitor.config.ts` uses `androidScheme: 'https'`. Keep the
> list explicit — never use `*` for an authenticated API.

### 3. Publish the API

**Option A — Visual Studio (2026 Insiders):**
Right-click `PassCount.Api` → **Publish…** → **Azure App Service** → pick the
web app → publish. Make sure "Development" environment is not selected.

**Option B — CLI:**

```powershell
cd backend\PassCount.Api
dotnet publish -c Release -o C:\Users\barto\AppData\Local\Temp\opencode\api-publish
cd C:\Users\barto\AppData\Local\Temp\opencode\api-publish
Compress-Archive -Path * -DestinationPath api.zip
az webapp deploy --resource-group <rg> --name <app-name> --src-path api.zip --type zip
```

On startup the API connects to your VPS MySQL and applies the EF Core
migrations automatically.

### 4. Smoke-test the deployed API

```powershell
$r = Invoke-RestMethod -Method Post -Uri "https://<app-name>.azurewebsites.net/api/auth/register" -ContentType "application/json" -Body '{"email":"test@example.com","password":"TestPass123"}'
$r.expiresIn   # expect 1800
```

---

## Android — frontend

The API URL is baked into the static export at build time via
`NEXT_PUBLIC_API_URL`. Rebuild whenever it changes.

### 1. Point the app at the deployed API

```powershell
$env:NEXT_PUBLIC_API_URL = "https://<app-name>.azurewebsites.net"
```

or write it to `.env.local` so `npm run cap:sync` picks it up consistently.

### 2. Build web export + sync + build APK

```powershell
cmd /c "node_modules\.bin\next.cmd build"   # -> out/
npx cap sync android                         # copies out/ + plugins into android/

cd android
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.12.8-hotspot"
$env:Path = "$env:JAVA_HOME\bin;" + $env:Path
.\gradlew.bat :app:assembleDebug
```

Debug APK: `android\app\build\outputs\apk\debug\app-debug.apk`.

### 3. Release build (Play Store / sideload)

Generate a keystore once (keep it safe — it signs all future releases):

```powershell
keytool -genkey -v -keystore passcount.keystore -alias passcount -keyalg RSA -keysize 2048 -validity 10000
```

Sign the unsigned release APK:

```powershell
cd android
.\gradlew.bat :app:assembleRelease
& "$env:JAVA_HOME\bin\apksigner.bat" sign --ks passcount.keystore --out passcount-release.apk app\build\outputs\apk\release\app-release-unsigned.apk
```

For repeatable builds add a `signingConfigs` block to
`android\app\build.gradle` (store passwords in `android\local.properties` or
`keystore.properties`, never in git).

### 4. Local testing on a device/emulator

The Android WebView origin is `https://localhost`, so against a local API:

- **Emulator:** `NEXT_PUBLIC_API_URL=http://10.0.2.2:5220` (host loopback).
- **Physical device:** `NEXT_PUBLIC_API_URL=http://<your-LAN-IP>:5220`.

Plain `http://` is blocked by Android 9+ by default — for **dev only** add to
`android\app\src\main\AndroidManifest.xml`:

```xml
<application android:usesCleartextTraffic="true" ...>
```

and add the matching origin to `Cors:AllowedOrigins` in
`appsettings.Development.json`.

---

## End-to-end verification

```text
[ ] MySQL container healthy on the VPS
[ ] port 3306 reachable from Azure only (DOCKER-USER rules saved)
[ ] app DB user requires SSL
[ ] Azure App Service (.NET 10) created, not "Web App + Database"
[ ] Jwt__Key, ConnectionStrings__Default set in Azure (not in git)
[ ] Cors__AllowedOrigins contains https://localhost
[ ] dotnet publish succeeds; zip deploy / VS publish succeeds
[ ] GET https://<app>.azurewebsites.net/swagger is 404 (dev-only) — or accept
[ ] /api/auth/register returns 200 + expiresIn
[ ] wrong password -> 401, duplicate register -> 400
[ ] /api/data returns 401 without token
[ ] register -> PUT /api/data -> GET /api/data round-trips
[ ] frontend built with NEXT_PUBLIC_API_URL=https://<app>...
[ ] cap sync android done; debug APK installs and syncs to the API
[ ] MySQL backup scheduled and restore tested
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| API can't reach MySQL | `docker compose ps` on VPS; confirm firewall DOCKER-USER `ACCEPT` rules include **all** Azure outbound IPs; verify connection string + `SslMode=Required` |
| `Server does not support secure connections` | remove `SslMode=Required` temporarily to check, then fix TLS on MySQL |
| CORS error in the app | the origin must match exactly (`https://localhost` for Android; no trailing slash) — restart the App Service after changing `Cors__AllowedOrigins__*` |
| Gradle fails with `Unsupported class file major version` | JAVA_HOME points at JDK 26; switch to JDK 21 |
| `next build` EPERM on `.next` | stop any `next dev`, delete `.next\` and `out\`, rebuild |
| `/api/data` 401 after logout | expected — access JWT is stateless; session control is via refresh tokens |
| MySQL data gone after restart | volume not mounted — data is in the named volume `mysql_data`; that still isn't a backup |
