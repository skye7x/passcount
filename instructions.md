# PassCount - Android Setup

## Requirements

Install:

- Node.js >= 18
- npm
- Java JDK 17
- Android Studio
- Android SDK
- Android SDK Platform Tools

Check your installation:

```bash
node -v
npm -v
java -version
```

Make sure Android Studio can open Android projects.

---

# Setup after cloning

## 1. Clone repository

```bash
git clone <repository-url>
cd passcount
```

---

## 2. Install dependencies

Install all Node.js packages:

```bash
npm install
```

---

## 3. Build the web application

Capacitor uses the production web build.

Run:

```bash
npm run build
```

This generates:

```
out/
```

---

## 4. Sync Capacitor

Copy the web application into the Android project:

```bash
npx cap sync android
```

This updates the native Android project.

---

## 5. Open Android Studio

Open the Android project:

```bash
npx cap open android
```

Android Studio will open:

```
android/
```

Wait until:

- Gradle sync finishes
- Android SDK components are installed
- Dependencies finish downloading

---

## 6. Run the application

### Physical Android device

1. Enable Developer Options
2. Enable USB Debugging
3. Connect your phone
4. Select the device in Android Studio
5. Press:

```
Run ▶
```

---

### Android Emulator

1. Open Android Studio
2. Go to:

```
Device Manager
```

3. Create or start an emulator
4. Press:

```
Run ▶
```

---

# Development workflow

After changing Next.js code:

```bash
npm run build
npx cap sync android
```

Then run the application again from Android Studio.

---

# App Icons and Splash Screens

PassCount uses Capacitor native assets.

## Install Capacitor Assets

Install globally:

```bash
npm install -g @capacitor/assets
```

or use npx:

```bash
npx @capacitor/assets
```

---

## Prepare icon files

Create:

```
assets/
```

Add:

```
assets/
├── icon.png
└── splash.png
```

---

## Icon requirements

File:

```
assets/icon.png
```

Requirements:

- PNG format
- 1024x1024 px minimum
- Square image
- No rounded corners
- Transparent background recommended

Example:

```
1024x1024 PNG
```

---

## Splash screen requirements

File:

```
assets/splash.png
```

Recommended:

- PNG format
- High resolution
- Centered logo
- Transparent background recommended

Example:

```
2732x2732 PNG
```

---

## Generate Android icons

Run:

```bash
npx @capacitor/assets generate
```

This generates:

```
android/app/src/main/res/
```

including:

- launcher icons
- adaptive icons
- splash screens
- Android density versions

---

## After generating assets

Sync Capacitor:

```bash
npx cap sync android
```

Open Android Studio:

```bash
npx cap open android
```

Rebuild the application.

---

## Updating icons later

Replace:

```
assets/icon.png
```

or:

```
assets/splash.png
```

Then run:

```bash
npx @capacitor/assets generate
```

Sync:

```bash
npx cap sync android
```

Rebuild from Android Studio.

---

# Useful Capacitor commands

## Check Capacitor setup

```bash
npx cap doctor
```

---

## Sync all platforms

```bash
npx cap sync
```

---

## Sync Android only

```bash
npx cap sync android
```

---

## Open Android Studio

```bash
npx cap open android
```

---

# Android Studio path (Linux)

If Capacitor cannot find Android Studio:

Find installation:

```bash
readlink -f /usr/bin/android-studio
```

Example:

```
/opt/android-studio/bin/studio
```

Set permanently.

For zsh:

```bash
echo 'export CAPACITOR_ANDROID_STUDIO_PATH=/opt/android-studio/bin/studio' >> ~/.zshrc
source ~/.zshrc
```

For bash:

```bash
echo 'export CAPACITOR_ANDROID_STUDIO_PATH=/opt/android-studio/bin/studio' >> ~/.bashrc
source ~/.bashrc
```

Check:

```bash
echo $CAPACITOR_ANDROID_STUDIO_PATH
```

---

# Troubleshooting

## Gradle problems

Clean Android build:

```bash
cd android
./gradlew clean
cd ..
```

Then:

```bash
npm run build
npx cap sync android
```

---

## Reinstall dependencies

If npm dependencies are broken:

```bash
rm -rf node_modules
rm package-lock.json

npm install
npm run build
npx cap sync android
```

---

# Creating a release APK

In Android Studio:

```
Build
 └── Generate Signed Bundle / APK
      └── APK
```

Choose:

- Create new keystore (first release)
- Release build

APK output:

```
android/app/build/outputs/apk/release/
```

---

# Project structure

```
passcount/
│
├── app/                    # Next.js application
├── public/                 # Static files
├── assets/                 # App icons and splash images
├── android/                # Android Studio project
├── capacitor.config.ts     # Capacitor configuration
├── package.json
└── package-lock.json
```

---

# Quick start

After cloning:

```bash
git clone <repository-url>
cd passcount

npm install

npm run build

npx cap sync android

npx cap open android
```

The project is ready to run in Android Studio.