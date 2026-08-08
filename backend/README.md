# PassCount API — Backend

Backend aplikacji **PassCount**, napisany w **ASP.NET Core Web API**.

API zapewnia opcjonalne konto użytkownika oraz synchronizację danych w chmurze. Aplikacja mobilna/webowa działa w pełni offline bez backendu — serwer jest potrzebny wyłącznie do funkcji **„Zaloguj się i synchronizuj”** dostępnej w ekranie konta.

> **Status projektu:** przed wdrożeniem produkcyjnym należy wykonać pełny `dotnet build`, przetestować migracje oraz przeprowadzić testy rejestracji, logowania, odświeżania tokenów i synchronizacji danych.

---

## Spis treści

* [Architektura](#architektura)
* [Funkcje](#funkcje)
* [Bezpieczeństwo](#bezpieczeństwo)
* [Struktura projektu](#struktura-projektu)
* [Wymagania](#wymagania)
* [Konfiguracja lokalna](#konfiguracja-lokalna)
* [Uruchomienie backendu lokalnie](#uruchomienie-backendu-lokalnie)
* [Konfiguracja frontendu](#konfiguracja-frontendu)
* [Testowanie API](#testowanie-api)
* [Baza danych](#baza-danych)
* [Migracje EF Core](#migracje-ef-core)
* [Deployment produkcyjny](#deployment-produkcyjny)
* [MySQL na VPS](#mysql-na-vps)
* [Zabezpieczenie MySQL](#zabezpieczenie-mysql)
* [Azure App Service](#azure-app-service)
* [Konfiguracja aplikacji w Azure](#konfiguracja-aplikacji-w-azure)
* [Deployment API](#deployment-api)
* [Konfiguracja frontendu produkcyjnego](#konfiguracja-frontendu-produkcyjnego)
* [Refresh tokeny](#refresh-tokeny)
* [Synchronizacja danych](#synchronizacja-danych)
* [Bezpieczeństwo produkcyjne](#bezpieczeństwo-produkcyjne)
* [Najczęstsze problemy](#najczęstsze-problemy)
* [Brakujące funkcje](#brakujące-funkcje)

---

# Architektura

PassCount jest aplikacją **offline-first**.

Dane użytkownika są przechowywane lokalnie na urządzeniu. Backend nie jest wymagany do podstawowego działania aplikacji.

Po zalogowaniu użytkownik może opcjonalnie synchronizować kompletny stan aplikacji z serwerem.

Architektura produkcyjna:

```text
┌──────────────────────────┐
│      PassCount App       │
│                          │
│  Web / Android / iOS     │
│                          │
│  Lokalny stan aplikacji  │
└────────────┬─────────────┘
             │
             │ HTTPS
             ▼
┌──────────────────────────┐
│     Azure App Service    │
│                          │
│   ASP.NET Core Web API   │
│      PassCount.Api       │
└────────────┬─────────────┘
             │
             │ MySQL / TLS
             ▼
┌──────────────────────────┐
│          VPS             │
│                          │
│      Docker Compose      │
│          MySQL 8         │
│                          │
│      Persistent volume   │
└──────────────────────────┘
```

Lokalnie baza danych może działać jako SQLite:

```text
PassCount frontend
       │
       │ HTTP
       ▼
ASP.NET Core API
       │
       ▼
SQLite
passcount.db
```

Dzięki temu lokalny development nie wymaga uruchamiania MySQL ani VPS.

---

# Funkcje

Backend udostępnia:

* rejestrację konta za pomocą adresu e-mail i hasła,
* logowanie,
* ASP.NET Core Identity,
* bezpieczne hashowanie haseł,
* krótkotrwałe tokeny JWT,
* rotowane refresh tokeny,
* wylogowanie,
* blokadę konta po nieudanych próbach logowania,
* rate limiting endpointów uwierzytelniania,
* synchronizację całego stanu aplikacji,
* izolację danych według użytkownika,
* obsługę SQLite lokalnie,
* obsługę MySQL produkcyjnie,
* migracje EF Core,
* Swagger w środowisku developerskim.

Główne endpointy:

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout

GET  /api/data
PUT  /api/data
```

---

# Bezpieczeństwo

## Hasła

Hasła użytkowników są obsługiwane przez **ASP.NET Core Identity**.

Hasła:

* nie są przechowywane w plaintext,
* są hashowane przez Identity,
* nie są zwracane przez API.

## JWT

Access token jest krótkotrwały.

Domyślny czas życia:

```text
30 minut
```

JWT zawiera identyfikator użytkownika, na podstawie którego backend ustala właściciela danych.

Klient nie powinien przesyłać własnego `userId` jako mechanizmu wyboru danych.

Backend powinien zawsze korzystać z identyfikatora użytkownika znajdującego się w uwierzytelnionych claims JWT.

## Refresh tokeny

Refresh token:

* jest przechowywany po stronie serwera wyłącznie jako hash SHA-256,
* jest jednorazowy,
* po użyciu jest zastępowany nowym tokenem,
* ma ograniczony czas życia,
* ponowne użycie wykorzystanego tokenu traktowane jest jako potencjalne przejęcie sesji.

W przypadku wykrycia reuse refresh tokenu sesja użytkownika jest unieważniana.

Domyślny czas życia refresh tokenu:

```text
30 dni
```

## Rate limiting

Endpointy związane z uwierzytelnianiem są ograniczone do:

```text
10 żądań / minutę / IP
```

Ma to ograniczyć brute-force oraz automatyczne próby logowania.

## Account lockout

Po:

```text
5 nieudanych próbach logowania
```

konto zostaje tymczasowo zablokowane na:

```text
15 minut
```

## Logowanie

Błąd logowania powinien mieć charakter ogólny:

```text
Nieprawidłowy e-mail lub hasło.
```

Nie należy informować klienta, czy podany adres e-mail istnieje w bazie.

Dzięki temu endpoint logowania nie staje się prostym mechanizmem do enumeracji kont.

---

# Struktura projektu

```text
backend/
└── PassCount.Api/
    ├── Program.cs
    │
    ├── Data/
    │   ├── ApplicationDbContext.cs
    │   ├── ApplicationUser.cs
    │   └── RefreshToken.cs
    │
    ├── Entities/
    │   ├── Counter.cs
    │   ├── LogEntry.cs
    │   ├── Training.cs
    │   ├── Equipment.cs
    │   └── ...
    │
    ├── Dtos/
    │   ├── Auth/
    │   ├── Data/
    │   └── ...
    │
    ├── Services/
    │   └── TokenService.cs
    │
    ├── Controllers/
    │   ├── AuthController.cs
    │   └── DataController.cs
    │
    ├── Migrations/
    │   └── ...
    │
    ├── Properties/
    │   └── launchSettings.json
    │
    ├── appsettings.json
    ├── appsettings.Development.json
    └── PassCount.Api.csproj
```

---

# Wymagania

Do uruchomienia backendu lokalnie potrzebujesz:

* .NET SDK zgodnego z wersją TargetFramework projektu,
* narzędzia `dotnet-ef`,
* Git.

Do uruchomienia frontendu dodatkowo:

* Node.js,
* npm.

Do deploymentu produkcyjnego:

* konto Azure,
* Azure App Service,
* VPS z dostępem SSH,
* Docker,
* Docker Compose,
* MySQL 8,
* domena jest opcjonalna, ale zalecana.

---

# Wersje .NET i EF Core

## Ważne

Przed rozpoczęciem instalacji sprawdź rzeczywiste wersje w:

```text
backend/PassCount.Api/PassCount.Api.csproj
```

oraz:

```bash
dotnet --version
```

Projekt może zawierać kombinację:

```text
.NET 10
EF Core 9.x
Pomelo 9.x
```

Nie należy automatycznie aktualizować wszystkich pakietów do najnowszych wersji bez sprawdzenia kompatybilności providera MySQL.

Szczególnie istotny jest:

```text
Pomelo.EntityFrameworkCore.MySql
```

ponieważ to właśnie provider bazy danych determinuje kompatybilność z wersją EF Core.

### Pierwszy krok

Zawsze zacznij od:

```bash
cd backend/PassCount.Api

dotnet restore
dotnet build
```

Jeżeli projekt się nie kompiluje, najpierw należy naprawić błędy kompilacji.

Nie przechodź do deploymentu produkcyjnego przed uzyskaniem poprawnego:

```text
Build succeeded.
```

---

# Konfiguracja lokalna

## 1. Sprawdź .NET SDK

```bash
dotnet --version
```

oraz:

```bash
dotnet --info
```

Jeżeli wymagany SDK nie jest zainstalowany, zainstaluj odpowiednią wersję .NET SDK.

---

## 2. Zainstaluj dotnet-ef

Jeżeli narzędzie nie jest zainstalowane:

```bash
dotnet tool install --global dotnet-ef
```

Jeżeli jest już zainstalowane:

```bash
dotnet tool update --global dotnet-ef
```

Sprawdź:

```bash
dotnet ef --version
```

Wersja narzędzia powinna być kompatybilna z używaną wersją EF Core.

---

# Uruchomienie backendu lokalnie

Przejdź do katalogu:

```bash
cd backend/PassCount.Api
```

Następnie:

```bash
dotnet restore
```

Potem:

```bash
dotnet build
```

Jeżeli build zakończy się powodzeniem, utwórz pierwszą migrację:

```bash
dotnet ef migrations add InitialCreate
```

Następnie uruchom aplikację:

```bash
dotnet run
```

Adres API zostanie wyświetlony w terminalu.

Przykładowo:

```text
Now listening on: http://localhost:5220
```

Port może być inny — zawsze korzystaj z adresu wyświetlonego przez aplikację.

---

# Lokalna baza SQLite

Środowisko developerskie używa SQLite, dzięki czemu nie trzeba instalować lokalnie MySQL.

Po uruchomieniu aplikacji `Program.cs` wykonuje migracje:

```csharp
db.Database.Migrate();
```

Dzięki temu baza:

```text
passcount.db
```

oraz jej struktura zostaną utworzone automatycznie, jeśli istnieją odpowiednie migracje.

Plik SQLite powinien być traktowany jako lokalny artefakt developerski i nie powinien być commitowany do repozytorium.

Dodaj go do `.gitignore`, jeśli nie znajduje się tam już:

```gitignore
passcount.db
passcount.db-shm
passcount.db-wal
```

---

# Swagger

W środowisku developerskim Swagger powinien być dostępny pod:

```text
http://localhost:5220/swagger
```

Port należy dostosować do adresu wyświetlonego przez `dotnet run`.

Swagger pozwala ręcznie testować endpointy API.

---

# Konfiguracja frontendu

W katalogu frontendu znajduje się:

```text
.env.local.example
```

Utwórz:

```text
.env.local
```

Przykładowo:

```bash
cp .env.local.example .env.local
```

Ustaw adres lokalnego API:

```env
NEXT_PUBLIC_API_URL=http://localhost:5220
```

Jeżeli backend działa na innym porcie, użyj tego portu.

Następnie:

```bash
npm install
npm run dev
```

Frontend powinien korzystać z lokalnego API.

---

# Test lokalny

Po uruchomieniu backendu i frontendu należy przetestować pełny przepływ:

1. otworzyć aplikację,
2. przejść do ekranu konta,
3. zarejestrować nowe konto,
4. zalogować się,
5. utworzyć dane lokalne,
6. wykonać synchronizację,
7. wylogować się,
8. zalogować ponownie,
9. wykonać synchronizację,
10. sprawdzić, czy dane zostały przywrócone.

Przed deploymentem produkcyjnym należy również sprawdzić:

* niepoprawne hasło,
* nieistniejący e-mail,
* wielokrotne nieudane logowania,
* wygasły access token,
* odświeżanie access tokenu,
* użycie refresh tokenu drugi raz,
* logout,
* dostęp do `/api/data` bez JWT,
* próby manipulacji identyfikatorem użytkownika,
* synchronizację pustego zestawu danych,
* duży zestaw danych.

---

# Migracje EF Core

Migracje powinny znajdować się w repozytorium.

Pierwsza migracja:

```bash
dotnet ef migrations add InitialCreate
```

Kolejna zmiana modelu:

```bash
dotnet ef migrations add NazwaZmiany
```

Przykład:

```bash
dotnet ef migrations add AddTrainingNotes
```

Migracje można zastosować lokalnie:

```bash
dotnet ef database update
```

W produkcji aplikacja może automatycznie wykonać:

```csharp
db.Database.Migrate();
```

podczas startu.

### Ważne

Przed deploymentem produkcyjnym należy upewnić się, że wszystkie wymagane migracje zostały wygenerowane i znajdują się w repozytorium.

Nie należy tworzyć migracji dopiero po wdrożeniu aplikacji.

---

# Baza danych

Backend obsługuje dwa środowiska.

## Development

```text
SQLite
```

Zalety:

* brak konieczności uruchamiania serwera,
* brak konfiguracji użytkowników,
* szybki development,
* łatwe testy lokalne.

## Production

```text
MySQL 8
```

MySQL działa na VPS w kontenerze Docker.

Architektura:

```text
Azure App Service
       │
       │ TCP 3306 + TLS
       ▼
VPS
       │
       ▼
Docker
       │
       ▼
MySQL 8
```

---

# Deployment produkcyjny

Docelowa konfiguracja produkcyjna:

```text
Frontend
   │
   │ HTTPS
   ▼
Azure App Service
   │
   │ MySQL/TLS
   ▼
VPS
   │
   ▼
Docker MySQL
```

Backend nie korzysta z Azure Database.

Baza danych znajduje się na własnym VPS.

Dzięki temu można wykorzystać zwykły Azure App Service bez wdrażania dodatkowej infrastruktury bazodanowej w Azure.

---

# MySQL na VPS

## 1. Połącz się z VPS

```bash
ssh youruser@YOUR_VPS_IP
```

---

## 2. Zainstaluj Docker

Jeżeli Docker nie jest zainstalowany:

```bash
curl -fsSL https://get.docker.com | sudo sh
```

Dodaj użytkownika do grupy Docker:

```bash
sudo usermod -aG docker $USER
```

Następnie wyloguj się i zaloguj ponownie.

Sprawdź:

```bash
docker --version
docker compose version
```

---

# 3. Skopiuj konfigurację Docker

Z lokalnego komputera skopiuj:

```text
backend/docker/
```

na VPS.

Przykład:

```bash
scp -r backend/docker youruser@YOUR_VPS_IP:~/passcount-docker
```

Następnie:

```bash
ssh youruser@YOUR_VPS_IP
cd ~/passcount-docker
```

---

# 4. Utwórz `.env`

```bash
cp .env.example .env
```

Edytuj:

```bash
nano .env
```

Ustaw długie, losowe hasła.

Nie commituj `.env`.

Powinien znajdować się w `.gitignore`.

---

# 5. Uruchom MySQL

```bash
docker compose up -d
```

Sprawdź:

```bash
docker compose ps
```

Kontener MySQL powinien mieć status:

```text
healthy
```

Logi:

```bash
docker compose logs -f
```

Aby zakończyć obserwowanie logów:

```text
Ctrl+C
```

---

# Trwałość danych MySQL

MySQL powinien korzystać z named volume zdefiniowanego w `docker-compose.yml`.

Dzięki temu:

```text
restart kontenera
```

nie powinien usuwać danych.

Jednak **persistent volume nie jest backupem**.

Produkcja powinna mieć osobny mechanizm backupów MySQL.

---

# Zabezpieczenie MySQL

Nie należy pozostawiać publicznie dostępnego:

```text
0.0.0.0:3306
```

bez ograniczenia źródeł ruchu.

Po utworzeniu Azure App Service należy sprawdzić jego:

* Outbound IP Addresses,
* Additional Outbound IP Addresses.

Azure może korzystać z więcej niż jednego adresu wychodzącego, dlatego należy uwzględnić cały zakres adresów podany przez App Service.

---

# Docker i UFW

Przy publikowanych portach Dockera zwykłe reguły UFW mogą nie zapewnić oczekiwanego filtrowania ruchu.

Docker manipuluje regułami iptables.

Dlatego dla ograniczenia dostępu do opublikowanego portu MySQL należy zastosować odpowiednią regułę w łańcuchu:

```text
DOCKER-USER
```

Przykładowy schemat:

```bash
sudo iptables -I DOCKER-USER -p tcp --dport 3306 -s <AZURE_IP_1> -j ACCEPT
sudo iptables -I DOCKER-USER -p tcp --dport 3306 -s <AZURE_IP_2> -j ACCEPT
```

Następnie odrzucić pozostały ruch:

```bash
sudo iptables -I DOCKER-USER -p tcp --dport 3306 -j DROP
```

Należy powtórzyć regułę `ACCEPT` dla wszystkich wymaganych adresów Azure.

### Uwaga

Przed zastosowaniem reguł należy zweryfikować:

* system operacyjny VPS,
* istniejące reguły iptables,
* sposób konfiguracji Dockera,
* dostęp SSH.

Błędna konfiguracja firewalla może odciąć dostęp do usług.

Reguły powinny również zostać zapisane, aby przetrwały restart VPS.

Na systemach Debian/Ubuntu można wykorzystać:

```bash
sudo apt install -y iptables-persistent
```

Następnie:

```bash
sudo netfilter-persistent save
```

---

# TLS dla MySQL

Po ograniczeniu dostępu sieciowego należy wymusić szyfrowane połączenia dla użytkownika aplikacji.

Przykład:

```bash
docker compose exec mysql mysql -uroot -p
```

Następnie:

```sql
ALTER USER 'passcount_api'@'%' REQUIRE SSL;
FLUSH PRIVILEGES;
```

Połączenie aplikacji powinno używać:

```text
SslMode=Required
```

w connection stringu.

### Ważne

Należy również zweryfikować, jak certyfikat serwera MySQL jest walidowany przez używanego providera i konfigurację środowiska produkcyjnego.

Samo `SslMode=Required` zapewnia szyfrowanie połączenia, ale nie powinno być automatycznie utożsamiane z pełną walidacją tożsamości serwera.

---

# Azure App Service

Utwórz zwykły:

```text
App Service / Web App
```

Nie wybieraj kreatora:

```text
Web App + Database
```

Backend nie potrzebuje zarządzanej bazy danych Azure.

Przykładowa konfiguracja:

```text
Resource Group:
RSC-BuS-01

Application name:
PassCount

Runtime:
.NET 10

Region:
Poland Central

Pricing:
F1 / Basic / inny odpowiedni plan
```

Dostępne opcje mogą się różnić zależnie od aktualnej oferty Azure i subskrypcji.

---

# Konfiguracja aplikacji w Azure

Przejdź do:

```text
Azure Portal
→ App Service
→ Configuration
→ Application settings
```

Dodaj wymagane ustawienia.

## JWT

```text
Jwt__Key
Jwt__Issuer
Jwt__Audience
```

Przykład:

```text
Jwt__Issuer = PassCountApi
Jwt__Audience = PassCountClient
```

Klucz:

```text
Jwt__Key = <LOSOWY DŁUGI SEKRET>
```

Wygeneruj go np.:

```bash
openssl rand -base64 48
```

Klucz produkcyjny:

* nie może być placeholderem,
* nie powinien znajdować się w repozytorium,
* nie powinien być zapisany w `appsettings.json`,
* nie powinien być udostępniany publicznie.

---

# Konfiguracja bazy

Ustaw:

```text
Database__Provider
```

na:

```text
MySql
```

Connection string:

```text
ConnectionStrings__Default
```

Przykład:

```text
Server=YOUR_VPS_IP;
Port=3306;
Database=passcountdb;
User=passcount_api;
Password=YOUR_PASSWORD;
SslMode=Required;
```

W Azure warto przechowywać connection string jako secret konfiguracji aplikacji, a nie w repozytorium.

---

# CORS

Dla webowego frontendu dodaj jego dokładny origin:

```text
Cors__AllowedOrigins__0
```

Przykład:

```text
https://app.example.com
```

Dla aplikacji Capacitor:

```text
Cors__AllowedOrigins__1
```

ustaw:

```text
capacitor://localhost
```

Nie należy używać:

```text
*
```

dla produkcyjnej aplikacji uwierzytelnianej.

Po zmianie konfiguracji Azure zrestartuje aplikację lub należy wykonać restart ręcznie.

---

# Deployment API

Najpierw lokalnie:

```bash
cd backend/PassCount.Api
```

Wykonaj:

```bash
dotnet restore
dotnet build
```

Następnie:

```bash
dotnet publish -c Release -o ./publish
```

Utwórz ZIP:

```bash
cd publish
zip -r ../publish.zip .
```

Następnie:

```bash
az webapp deploy \
  --resource-group RSC-BuS-01 \
  --name PassCount \
  --src-path ../publish.zip
```

Alternatywnie można skonfigurować GitHub Actions lub Deployment Center w Azure.

Dla długoterminowego projektu CI/CD jest zalecane.

---

# Migracja bazy podczas startu

Po uruchomieniu aplikacji produkcyjnej:

```csharp
db.Database.Migrate();
```

powinna zastosować dostępne migracje.

API połączy się z:

```text
VPS → MySQL
```

i utworzy/zmodyfikuje strukturę bazy.

Przed deploymentem upewnij się, że migracja:

```text
InitialCreate
```

oraz wszystkie kolejne migracje zostały wygenerowane i znajdują się w projekcie.

---

# Konfiguracja frontendu produkcyjnego

Frontend powinien wskazywać na Azure App Service.

Lokalnie:

```env
NEXT_PUBLIC_API_URL=http://localhost:5220
```

Produkcja:

```env
NEXT_PUBLIC_API_URL=https://YOUR-APP.azurewebsites.net
```

Jeżeli korzystasz z własnej domeny:

```env
NEXT_PUBLIC_API_URL=https://api.example.com
```

Frontend należy następnie przebudować i ponownie wdrożyć.

---

# Endpoint synchronizacji

Backend udostępnia:

```text
GET /api/data
PUT /api/data
```

Synchronizacja jest celowo realizowana jako **pełna wymiana stanu**.

Klient posiada lokalny kompletny stan aplikacji, np.:

```text
counters
logs
trainings
equipment
settings
```

Klient wysyła cały aktualny stan.

Backend nie wykonuje skomplikowanego merge per-field.

---

# Dlaczego pełny replace?

Dla PassCount jest to celowo prostszy model.

Backend nie musi rozwiązywać konfliktów na poziomie:

```text
counter A
log B
training C
```

Zamiast tego synchronizowany jest kompletny stan użytkownika.

Model:

```text
Client local state
       │
       │ PUT /api/data
       ▼
Server state
       │
       ▼
pełny stan użytkownika
```

Dzięki temu logika synchronizacji pozostaje głównie po stronie aplikacji.

---

# Izolacja danych użytkowników

Każde zapytanie dotyczące danych użytkownika musi być ograniczone do identyfikatora użytkownika wynikającego z JWT.

Nie należy robić:

```text
GET /api/data?userId=123
```

i ufać wartości przesłanej przez klienta.

Zamiast tego backend powinien pobierać ID z authenticated principal / JWT claims.

Schemat:

```text
JWT
 │
 └── User ID
       │
       ▼
DataController
       │
       ▼
WHERE UserId = authenticatedUserId
```

Dzięki temu użytkownik A nie może odczytać ani nadpisać danych użytkownika B przez zmianę parametru żądania.

---

# Refresh tokeny

Proces:

```text
LOGIN
  │
  ├── access token
  │      └── ważny ~30 min
  │
  └── refresh token
         └── ważny ~30 dni
```

Po wygaśnięciu access tokenu:

```text
Client
  │
  │ refresh token
  ▼
API
  │
  ├── sprawdza hash tokenu
  ├── sprawdza ważność
  ├── unieważnia stary token
  └── generuje nowy refresh token
```

Nowy refresh token powinien zostać zapisany po stronie serwera wyłącznie jako hash.

---

# Reuse refresh tokenu

Refresh token jest jednorazowy.

Jeżeli klient spróbuje ponownie użyć wcześniej wykorzystanego tokenu, należy traktować to jako potencjalne przejęcie sesji.

Mechanizm powinien:

1. wykryć reuse,
2. unieważnić odpowiednią sesję,
3. wymusić ponowne logowanie.

Jest to celowe zabezpieczenie przed kradzieżą refresh tokenu.

---

# Logout

Logout powinien unieważniać aktywny refresh token / sesję.

Access token JWT jest stateless, więc jego wcześniejsze unieważnienie wymagałoby dodatkowego mechanizmu blacklisty lub krótszego TTL.

Dlatego podstawowym mechanizmem kontroli sesji są refresh tokeny.

---

# Swagger w produkcji

Swagger powinien być dostępny przede wszystkim w środowisku developerskim.

Jeżeli zostanie włączony w produkcji, należy rozważyć ograniczenie dostępu.

Nie należy zakładać, że ukrycie Swaggera stanowi mechanizm bezpieczeństwa API.

Bezpieczeństwo powinno wynikać z:

* autoryzacji,
* walidacji,
* rate limiting,
* prawidłowej konfiguracji CORS,
* TLS,
* izolacji danych,
* bezpiecznego zarządzania sekretami.

---

# Sekrety

Nigdy nie commituj:

```text
.env
.env.local
production passwords
JWT keys
database passwords
private certificates
refresh tokens
```

W repozytorium powinny znajdować się jedynie przykładowe konfiguracje, np.:

```text
.env.example
appsettings.Development.json
```

Wartości produkcyjne powinny być przekazywane przez:

* Azure App Service Configuration,
* secret manager,
* zmienne środowiskowe,
* lub inny bezpieczny system zarządzania sekretami.

---

# Backup MySQL

Docker volume zapewnia trwałość danych przy restartach kontenera, ale:

> **persistent volume ≠ backup**

Produkcja powinna mieć regularne backupy MySQL.

Przykładowy backup:

```bash
mysqldump \
  -u passcount_api \
  -p \
  passcountdb \
  > passcountdb-backup.sql
```

Backup powinien być przechowywany poza samym VPS.

Zalecane jest również okresowe testowanie odtworzenia backupu.

---

# HTTPS

Frontend produkcyjny powinien komunikować się z API przez HTTPS:

```text
https://
```

Nie należy używać:

```text
http://
```

dla produkcyjnego API.

Dotyczy to szczególnie:

* access tokenów,
* refresh tokenów,
* haseł,
* danych użytkownika.

Azure App Service zapewnia HTTPS dla standardowego adresu App Service.

Jeżeli używana jest własna domena, należy poprawnie skonfigurować certyfikat i DNS.

---

# Najczęstsze problemy

## `dotnet build` nie działa

Uruchom:

```bash
dotnet --info
```

następnie:

```bash
dotnet restore
dotnet build
```

Sprawdź przede wszystkim:

```text
TargetFramework
Microsoft.EntityFrameworkCore
Microsoft.AspNetCore.Identity.EntityFrameworkCore
Pomelo.EntityFrameworkCore.MySql
Microsoft.EntityFrameworkCore.Sqlite
Microsoft.EntityFrameworkCore.Tools
```

Wersje EF Core oraz providerów muszą być ze sobą kompatybilne.

---

## `dotnet ef` nie działa

Sprawdź:

```bash
dotnet ef --version
```

Jeżeli brakuje narzędzia:

```bash
dotnet tool install --global dotnet-ef
```

Jeżeli jest nieaktualne:

```bash
dotnet tool update --global dotnet-ef
```

---

## Migracja nie działa

Sprawdź:

```bash
dotnet ef migrations list
```

oraz:

```bash
dotnet ef database update
```

Upewnij się, że backend korzysta z właściwego providera i connection stringa.

---

## API nie może połączyć się z MySQL

Sprawdź kolejno:

```text
1. Czy kontener MySQL działa?
2. Czy MySQL ma status healthy?
3. Czy VPS nasłuchuje na 3306?
4. Czy firewall dopuszcza Azure?
5. Czy Azure używa właściwego outbound IP?
6. Czy użytkownik MySQL istnieje?
7. Czy hasło jest poprawne?
8. Czy baza passcountdb istnieje?
9. Czy TLS jest poprawnie skonfigurowany?
10. Czy connection string ma SslMode=Required?
```

Na VPS:

```bash
docker compose ps
```

oraz:

```bash
docker compose logs mysql
```

---

## CORS error

Sprawdź dokładny origin frontendu.

Przykładowo:

```text
https://app.example.com
```

to nie to samo co:

```text
https://www.app.example.com
```

ani:

```text
http://localhost:3000
```

Origin musi odpowiadać rzeczywistemu adresowi, z którego ładowany jest frontend.

---

## Login zwraca 401

Sprawdź:

* e-mail,
* hasło,
* lockout,
* konfigurację Identity,
* JWT key,
* issuer,
* audience,
* zegar systemowy,
* expiration tokenu.

---

## Refresh zwraca 401

Sprawdź:

* czy refresh token nie wygasł,
* czy nie został już wykorzystany,
* czy hash znajduje się w bazie,
* czy sesja nie została unieważniona,
* czy klient nie próbuje ponownie użyć starego tokenu.

---

# Deployment checklist

Przed produkcją:

```text
[ ] dotnet restore działa
[ ] dotnet build działa
[ ] wszystkie migracje istnieją
[ ] lokalna baza tworzy się poprawnie
[ ] rejestracja działa
[ ] login działa
[ ] lockout działa
[ ] rate limiting działa
[ ] access token wygasa zgodnie z konfiguracją
[ ] refresh token działa
[ ] refresh token jest jednorazowy
[ ] reuse refresh tokenu unieważnia sesję
[ ] logout działa
[ ] GET /api/data działa
[ ] PUT /api/data działa
[ ] użytkownik nie może dostać danych innego użytkownika
[ ] MySQL działa na VPS
[ ] MySQL ma persistent volume
[ ] MySQL nie jest otwarty dla całego Internetu
[ ] firewall ogranicza port 3306
[ ] TLS MySQL jest skonfigurowany
[ ] backup MySQL jest skonfigurowany
[ ] Azure App Service działa
[ ] JWT secret nie jest w repozytorium
[ ] database password nie jest w repozytorium
[ ] connection string jest skonfigurowany w Azure
[ ] CORS zawiera właściwy frontend
[ ] frontend wskazuje na produkcyjne API
[ ] API działa przez HTTPS
[ ] produkcyjna synchronizacja została przetestowana
```

---

# Brakujące funkcje

Aktualna wersja backendu celowo nie implementuje kilku funkcji.

## Potwierdzenie adresu e-mail

Obecnie użytkownik może korzystać z konta bez potwierdzenia e-maila.

Dodanie tej funkcji wymaga:

```text
rejestracja
    ↓
wysłanie wiadomości e-mail
    ↓
link potwierdzający
    ↓
potwierdzenie konta
```

Potrzebny będzie dostawca wiadomości e-mail, np. usługa transakcyjnego e-mail.

---

# Reset hasła

Obecnie nie ma funkcji:

```text
Forgot password
```

Implementacja wymaga:

1. formularza resetowania,
2. wygenerowania jednorazowego tokenu,
3. wysłania wiadomości e-mail,
4. strony resetowania,
5. zmiany hasła przez Identity,
6. odpowiedniego unieważnienia aktywnych sesji, zależnie od przyjętej polityki.

---

# Synchronizacja — ograniczenia

Backend używa modelu:

```text
full state replacement
```

a nie:

```text
per-field merge
```

Oznacza to, że serwer nie rozwiązuje konfliktów pomiędzy pojedynczymi elementami danych.

Przykładowo:

```text
Telefon A:
counter = 10

Telefon B:
counter = 15
```

Backend nie próbuje automatycznie zdecydować, czy prawidłową wartością jest:

```text
10
15
25
```

Rozwiązywanie takich konfliktów należy do logiki aplikacji klienckiej.

Jest to świadoma decyzja projektowa wynikająca z charakteru PassCount jako aplikacji offline-first.

---

# Podsumowanie

PassCount API jest opcjonalnym backendem odpowiedzialnym za:

```text
                ┌──────────────────────┐
                │     PassCount App    │
                │                      │
                │  Offline-first       │
                └──────────┬───────────┘
                           │
                    opcjonalny login
                           │
                           ▼
                ┌──────────────────────┐
                │   PassCount.Api      │
                │                      │
                │ ASP.NET Core Web API │
                │ Identity + JWT       │
                │ Refresh tokens       │
                └──────────┬───────────┘
                           │
                           ▼
                ┌──────────────────────┐
                │       MySQL 8        │
                │      na VPS          │
                │       Docker         │
                └──────────────────────┘
```

Lokalny development:

```text
ASP.NET Core
     │
     ▼
SQLite
```

Produkcja:

```text
Azure App Service
     │
     ▼
MySQL 8 na VPS
```

Najważniejsza kolejność prac:

```text
1. Sprawdź wersje .NET / EF Core / Pomelo
2. dotnet restore
3. dotnet build
4. Utwórz migrację
5. Uruchom lokalnie
6. Przetestuj Swagger
7. Przetestuj frontend + login + sync
8. Przygotuj MySQL na VPS
9. Zabezpiecz port 3306
10. Utwórz Azure App Service
11. Skonfiguruj sekrety i connection string
12. Wdróż API
13. Skonfiguruj frontend produkcyjny
14. Wykonaj pełny test produkcyjny
15. Skonfiguruj backupy
```

**Nie należy przechodzić do deploymentu produkcyjnego, dopóki `dotnet build` oraz podstawowy przepływ rejestracji/logowania/synchronizacji nie działają lokalnie.**
