# SAVRDH TV OS — Local Super Admin + Android apps

Repository: https://github.com/savrdhcapital-debug/savrdh-tv-os-new

This folder is the selected v1.1.0 PR2 local application. It includes the new TV Experience Studio, manual subscription operations, Android TV launcher source, Android phone remote source and first-install wizard.

## Run locally

Node.js 22+ is required. Keep your existing Supabase values in `.env.local` (never commit the file).

```sh
npm ci
npm test
npm run build
npm start -- --hostname 127.0.0.1 --port 3000
```

Open http://localhost:3000/modules/dashboard and use your existing active Supabase Super Admin account. Development: `npm run dev -- --hostname 127.0.0.1 --port 3000`.

The old **TV Launcher Studio** module and its CSS have been removed. Its old URL redirects to `/modules/tv-studio`, the new **TV Experience Studio**. There is one studio in navigation. Originals were backed up externally before replacement.

The original repository database foundation is preserved in `supabase/migrations/`. It has not been applied or synchronized automatically; review it before use against an existing project.

## Modules and storage

- App & OS Updates: bundled verified TV/phone testing APK downloads, SHA-256 checksums, previews and setup links at `/modules/updates`, followed by build and release controls.
- Dashboard: counts from saved operations; no seeded/fake customer metrics.
- Families / child profiles: validated family/profile records.
- Plans: INR prices, subscription duration and maximum TV devices.
- Subscriptions: assign a plan, activate, renew, suspend, cancel and enforce expiry for remote access.
- Payments: manual UPI/bank/cash references, duplicate-reference rejection, independent admin verification, immutable payment entries, reversal, printable receipts. No gateway/bank settlement is inferred.
- Devices: one-time enrollment codes, plan limits, enrolled status, revocation and re-enrollment.
- Parental controls: package launch restrictions within SAVRDH. Bedtime/daily limits are saved preferences, not OS-level enforcement.
- Screen-time: launcher foreground activity submitted by enrolled TVs; not streaming-app watch time.
- Content: package catalog and app approval/block status. No licensed streaming content is supplied.
- Family Shield: manually recorded incidents and investigation status, not automatic content scanning.
- Notifications: in-app notices delivered to connected TVs; no external email/SMS is sent.
- Support: family-linked tickets, priority, notes and resolution states.
- Reports: CSV exports of saved records, with spreadsheet formula injection protection.
- Security: append-only server audit events and CSV export.
- System settings: business identity/contact and receipt footer.
- TV Experience Studio: ten themes (four screenshot-inspired and six additional styles), reference comparison, remote simulator, theme publishing, build requests, platform-specific TV/phone releases and activity.
- Mobile Remote / Installation Setup: onboarding instructions and previews, with a phone APK link only after a real signed stable phone APK is published.
- Interface Preview keeps the existing Parent/Mobile mockups and uses the new shared TV simulator.
- Demo Data Manager retains its existing Supabase-based behavior. Demo records are isolated from new operational customer/financial records. Appearance Studio uses the unified settings described below.

New operational records are persisted atomically in `.tv-control/operations.json`; themes/releases are in `.tv-control/state.json`. Configure TV_CONTROL_DATA_DIR for persistent hosting. Run **one server process** and back up that directory. This is a local single-host operating version, not a deployed, multi-region SaaS database. Existing Supabase operational tables are not migrated or synchronized. Supabase is used to verify users and active `platform_admins` roles on every new admin API request. No new schema, roles or users were created in the live project.

## Manual subscription workflow

1. Add a family and an active plan.
2. Assign that plan in Subscriptions (pending).
3. Record a manual payment with its actual unique UTR/receipt reference and amount.
4. Verify the payment only after independently checking collection.
5. Activate the subscription. A verified, unused payment must match the selected plan's price.
6. Add a TV under Devices, within the plan's limit. Copy its one-time enrollment code; it expires after 30 minutes.
7. Repeat verified payment + Renew for renewals. Reversing a payment suspends the subscription currently linked to it. Expired/suspended service cannot issue phone remote commands.

Receipts are internal payment receipts, not a fully configured GST/tax invoicing system. Customer self-service checkout, automatic collection, tax calculation and automatic dunning are not implemented.

## TV installation and mobile remote

Android sources are in `android/app` (TV), `android/remote` (phone) and `android/shared` (HTTPS connection helper). Both apps require API 26+.

The TV first-run wizard opens Android Wi-Fi settings, checks connectivity, enrolls using the admin's HTTPS server and enrollment code, starts phone pairing, and opens Android default Home settings. Selecting the default launcher may be restricted by the TV manufacturer. Enrollment requires an active family subscription. Android handles Wi-Fi credentials; they are never stored by this service.

The Android phone app bundles `public/tv-studio/remote.html`, CSS and JavaScript locally. Enter the HTTPS server address and eight-digit code shown on TV. Pairing expires after five minutes and requires explicit approval on the TV. Approved phones can send D-pad/touchpad navigation, OK, Back, Home, volume and mute to the SAVRDH app. Device revocation also revokes its paired phones. Tokens are random, stored as hashes on the server, and never placed in query strings. Commands have bounded queues/expiry and acknowledgments.

The launcher must be open on the TV for navigation. Commands do not control playback inside third-party apps, TV power, HDMI inputs or system-wide settings. Native app launch checks active entitlement and blocked-package rules; cached entitlement has a maximum 24-hour verification window and cannot extend past subscription expiry. Launcher statistics are self-reported and must not be treated as trusted billing evidence.

This implementation uses an **HTTPS server relay** accessible to both phone and TV over Wi-Fi/internet. Automatic LAN discovery, direct offline LAN control, QR camera scanning, Bluetooth and IR are not implemented. `localhost` on a phone/TV refers to that device, not this Mac. For native testing provide a real HTTPS origin; do not disable certificate validation. Browser remote preview works against this local server for isolated testing. On HTTPS it can also be installed as a small PWA; APIs are never cached by its service worker.

## APK builds and releases

Requires JDK 17, Gradle 8.11.1 and Android SDK 35:

```sh
cd android
CONFIG_URL=https://your-server VERSION_NAME=1.0.0 VERSION_CODE=1 gradle :app:assembleDebug :remote:assembleDebug
```

The GitHub Actions workflow builds and lints **both APKs** and uploads checksums/artifacts. Production signing requires ANDROID_KEYSTORE_BASE64, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS and ANDROID_KEY_PASSWORD in Actions secrets. Preserve the signing identity for every update. Without signing configuration the release APK is unsigned; debug APKs are only for testing.

Optional server-only GITHUB_TOKEN (Actions write), GITHUB_REPOSITORY and GITHUB_REF enable build dispatch. The workflow must exist on the repository's default branch before GitHub permits workflow_dispatch. Set TV_CONTROL_PUBLIC_URL to the exact public HTTPS origin when hosted. Use the same origin as the native CONFIG_URL. Configure your reverse proxy to replace spoofed forwarding headers; pairing rate limits include both client and overall budgets.

Host signed APKs at HTTPS `.apk` URLs and publish their SHA-256/version in App & OS Updates. Select Android TV or Android phone remote separately. TVs check stable TV releases, verify the downloaded checksum and request Android installation with user confirmation. The Mobile Remote module exposes only a published signed phone APK URL. No APK is automatically uploaded or released merely by this local setup.

## Verification and remaining deployment work

`npm test` uses the actual operational and remote domain code against temporary files: verified-payment activation, duplicate reference protection, renewal payments, device limits, one-time enrollment, TV-approved phone pairing, command restrictions/acknowledgments, app-block rules, launcher telemetry, reversal suspension, revocation, stale-update protection, hashed tokens and audit persistence.

Web TypeScript, domain tests, syntax checks and Next.js production build are verified. Android TV and mobile remote debug/release APK compilation and release lint passed in the new repository on 2026-10-26 (Actions run 40257272841). Debug APKs use a testing key; release APKs remain unsigned until production signing secrets are configured. Real TV/phone installation is still unverified. HTTPS hosting with durable storage, production signing, backups, physical-device testing and a production security review are required before paid customer rollout.


## Unified Appearance Studio

One `/modules/appearance` editor now replaces the previous independent appearance editor. Ten presets include the four reference styles plus Apple Glass, Matrix Hacker, Violet Orbit, Rose Cinema, Arctic Minimal and Ember Lounge. Each preset defines background/card/accent/text colors, font stack, card radius, glow, logo/text animation, background motion and motion speed.

Choose Android TV, Mobile Remote, Parent, Super Admin or All Applications. Save Draft does not update applications. Publish writes one server-controlled appearance map, increments revision, records history and updates all selected surfaces. TV Studio preset buttons use the same publisher for TV-only changes. Parent appearance tokens are stored for future parent-client integration; the current parent screen remains a visual preview.

TV and native mobile apps fetch their appearance from the same service and cache it for offline use. Super Admin refreshes immediately after publishing and every 30 seconds; connected TV/mobile apps refresh within 60 seconds. Background presets include aurora, float, matrix rain, spotlight and Ken Burns. Logo effects include shimmer/pulse/float; text effects include fade/slide, reveal and shimmer. All respect prefers-reduced-motion.

The Apple System/Apple Rounded font options use SF Pro/SF Pro Rounded where installed on Apple devices; other systems use system fallbacks. No proprietary Apple font files are distributed. Drafts, published tokens and the last 30 published appearance snapshots are stored in `.tv-control/state.json`, alongside existing theme/release settings. Existing Supabase appearance records remain intact but are no longer the live appearance source.
