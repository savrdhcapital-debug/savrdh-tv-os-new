# SAVRDH TV OS

Android TV launcher, four visual themes, super admin, browser TV simulator and a signed-APK update flow.

## Run super admin and simulator

Requires Node.js 22 or newer. No npm dependencies or installation step.

```sh
export ADMIN_PASSWORD='choose-a-long-unique-password'
npm start
```

Open **http://localhost:4173**. Theme Studio works without login for preview. Login is required to publish themes, request builds, read activity or publish releases. Choose Neon Horizon, Aurora Glass, Family Together or Signature Gold. Interactive mode is the actual TV interface; Reference image mode shows the four original supplied screenshots. Use the on-screen remote, or open `/tv.html` and use arrow keys, Enter and Back/Escape.

Local state is saved atomically under `data/state.json` (ignored by Git). Back up this directory and run one server process. Sessions expire after eight hours and are cleared on server restart. Set `DATA_DIR` for persistent hosting. This is a single-operator admin implementation; organizational SSO/MFA is not implemented.

For a hosted server, configure `PUBLIC_URL=https://your-domain`, `HOST=0.0.0.0` and put it behind an HTTPS reverse proxy. The proxy must preserve Host/Origin. Do not expose plain HTTP admin on the internet. `.env.example` documents variables; export them in your host environment (the app does not automatically load `.env`).

## Build and install Android TV

Open `android/` in Android Studio with JDK 17 and Android SDK 35. Or use Gradle 8.11.1:

```sh
cd android
CONFIG_URL=https://your-domain VERSION_NAME=1.0.0 VERSION_CODE=1 gradle :app:assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

The app supports Android TV 8.0+ (API 26), landscape, Leanback launcher and optional Home selection. It opens YouTube, Netflix and Prime Video when installed, and opens a compatible system TV provider. The shared HTML/CSS/JS interface is bundled locally; no server is needed to display it. All external WebView navigation is blocked, and the JavaScript bridge is available only to bundled app assets.

In TV Settings, enter the HTTPS super admin address (or provide CONFIG_URL at build time). The published theme syncs every 60 seconds and is cached for offline use. Open Settings → Check for update to check the **stable** channel. The app downloads an APK over HTTPS, verifies its SHA-256, then requests Android installation with the user's confirmation. Android also verifies APK signing identity. Some managed TVs restrict sideloading. Silent OTA installation is not supported.

## Build from super admin / GitHub Actions

The `Android TV APK` workflow runs server tests, builds debug and release APKs, and runs Android lint on pushes and pull requests. Download APKs and `APK-SHA256.txt` from its artifact. Without signing secrets, the release APK is unsigned and **cannot be installed**; the debug APK can be used for testing. Never use the debug signing key for production or expect independently generated CI debug builds to update each other.

Configure these GitHub Actions secrets for a consistently signed production APK:

- `ANDROID_KEYSTORE_BASE64`: base64-encoded private keystore
- `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`

Keep the same production key for every update. Protect the key outside the repository and back it up securely.

To request a build from super admin, set server-only `GITHUB_TOKEN` with Actions write permission on this repository. Set `GITHUB_REPOSITORY` and `GITHUB_REF` to the branch containing `android.yml`. GitHub requires a workflow_dispatch workflow to exist on the repository's default branch before dispatching it; merge the PR first and set GITHUB_REF=main. The button only queues the build; it does not claim the APK is ready.

After a successful build, host the signed APK at a public HTTPS URL ending in `.apk`. Publish its version, increasing version code, channel, SHA-256 and notes from **App Releases**. Only authenticated super admin can publish. Internal/beta metadata is supported for staged bookkeeping; the TV client currently reads stable only. Publishing metadata does not upload an APK or create a GitHub release automatically.

## Existing Supabase foundation

The original migration for Supabase project `ldfbrwcdebwoypthdqko` is preserved unchanged. The new app does **not** connect to or modify that live project. Current admin settings/releases use the local server store. Cloud device pairing, multi-family account management, billing, real watch history and system-wide Family Shield enforcement are **not implemented**. Family Shield, screen-time values, kids collection and content cards are explicitly labeled previews. Launcher controls cannot enforce restrictions inside third-party streaming apps.

## Validation

```sh
npm test
```

Tests cover authenticated publishing, denied anonymous/cross-origin writes, invalid release metadata, monotonically increasing versions, channel isolation, logout, static assets and private data isolation. APK build and Android lint run in GitHub Actions. An Android TV emulator/device smoke test is still required for physical remote behavior, installed streaming apps, Home selection and sideload installation.

The four supplied screenshots are included as reference images. Clean hero imagery is generated separately; product names identify installed apps, and no third-party playback/content rights are bundled.
