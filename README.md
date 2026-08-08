# PassCount

A pass/counter tracking app, rebuilt as **Next.js 14 (App Router) + Capacitor**
from the original React Native source. Same features, same look, now running
as a static web app wrapped natively for iOS/Android via Capacitor.

## What changed from the RN version

- React Native views (`View`, `Text`, `Pressable`, `FlatList`...) → plain HTML/CSS.
- React Navigation (stack + bottom tabs) → Next.js App Router pages
  (`/`, `/add/`, `/edit/?id=`, `/settings/`) + a custom `BottomNav`.
- `AsyncStorage` → `localStorage` (same JSON shape, same keys' purpose).
- `Alert.alert` action menus → a custom `ActionSheet` component.
- Long-press-to-open-menu → a pointer-based long-press (works with touch
  *and* mouse; right-click also opens it on desktop).
- The Android home-screen widget code (`widgetBridge.ts` /
  `PassCountWidgetModule`) was **removed** — it referenced a native module
  that didn't actually exist in the project, and Capacitor doesn't do
  Android home-screen widgets the same way. Everything else is intact.
- Haptics: uses the Capacitor Haptics plugin on native iOS/Android, and
  falls back to the Web Vibration API in the browser.
- `icon.svg` you sent is wired in as the app icon (PWA manifest +
  `resources/icon.png` + `resources/splash.png` for `@capacitor/assets`).

## 1. Install dependencies

This sandbox has no network access, so dependencies were never installed
here — do this on your machine:

```bash
npm install
```

## 2. Run it as a normal web app (fastest way to check it works)

```bash
npm run dev
```

Open http://localhost:3000 — the app is fully usable in a browser
(counters persist via localStorage).

## 3. Add the native platforms

```bash
npx cap add android
npx cap add ios      # macOS + Xcode only
```

This creates `android/` and `ios/` folders (gitignored — generated, not
hand-edited).

## 4. Generate native icons + splash screens

A source icon/splash pair is already prepared in `resources/`
(`resources/icon.png`, `resources/splash.png`), built from the `icon.svg`
you provided:

```bash
npx capacitor-assets generate
```

This fills in all the mipmap/asset-catalog sizes Android and iOS need.

## 5. Build the web app and sync into the native projects

```bash
npm run cap:sync
```

(equivalent to `next build` then `npx cap sync` — do this every time you
change web code before testing/building native.)

## 6. Open in Android Studio / Xcode

```bash
npm run cap:android   # opens Android Studio
npm run cap:ios        # opens Xcode (macOS only)
```

From there, run on a simulator/device or build a release APK/IPA as usual.

## Optional account + cloud sync

The app now has an **optional** account system (Settings → Account) backed
by a separate ASP.NET Core API in `backend/`. Signing in is entirely
optional — everything still works fully offline with local storage, exactly
as before, if you never create an account.

When signed in, counters, logs, trainings, equipment lists and settings
sync to the cloud automatically in the background, so they carry over to a
new device or a reinstall.

To use it:
1. Set up and deploy the backend — see `backend/README.md` for full
   instructions (local dev, Azure deployment, required app settings).
2. Copy `.env.local.example` to `.env.local` and point `NEXT_PUBLIC_API_URL`
   at your running API. Rebuild the app afterwards (it's baked in at build
   time).

```
app/account/          Sign in / create account UI
lib/api.ts             Typed API client + token storage (Capacitor Preferences)
lib/AuthContext.tsx     Auth state (login/register/logout)
lib/useSyncEngine.ts    Pull-on-login, debounced push-on-change, conflict prompt
backend/PassCount.Api/  ASP.NET Core 8 Web API (Identity, JWT, EF Core)
```

## Project structure

```
app/               Next.js App Router pages (static-exported)
components/        CounterCard, ColorPicker, FAB, BottomNav, ActionSheet...
lib/                CounterContext (localStorage-backed), types, haptics
public/             manifest.json, generated icons, the source SVG
resources/          master icon.png + splash.png for @capacitor/assets
capacitor.config.ts Capacitor config (webDir: "out")
next.config.js      output: "export" — required for Capacitor
```

## Notes

- `next.config.js` uses `output: 'export'` (static HTML export) because
  Capacitor needs a self-contained static bundle in `out/` — there's no
  Node server on a phone. This means no server components/actions/API
  routes; everything here is a client component, which matches the
  original RN app being fully client-side anyway.
- The Edit screen uses a query param (`/edit/?id=...`) rather than a
  dynamic route segment (`/edit/[id]`) so it works cleanly with static
  export without needing `generateStaticParams`.


IM TO LAZY SO I GENERATED README USING CHATPGPT
