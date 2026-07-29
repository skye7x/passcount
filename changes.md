# passcount - Session Changes

## Build for Android

- Next.js project with static export (`output: 'export'`) + Capacitor
- Build commands:
  - `npm run cap:sync` — builds Next.js and syncs web assets to Android/iOS native project
  - `npm run cap:android` — builds, syncs, and opens Android Studio
  - `npx cap run android` — builds and runs APK directly
  - First-time setup: `npx cap add android`

## Android platform was not added

- Ran: `npx cap add android && npx cap sync android && npx cap open android`

## App icon

- Source icons in `resources/` (`icon.png` 1024×1024, `splash.png`)
- Generate platform assets: `npx capacitor-assets generate`
- Icon scaling issues (Android adaptive icon mask):
  - Use `npx capacitor-assets generate --iconBackgroundColor '#000000'` to add background color matching the icon
  - Or create `icon-foreground.png` + `icon-background.png` in `resources/` for proper adaptive icon layers
  - Icon content should stay within center ~72% safe zone to avoid being cut off by the mask
