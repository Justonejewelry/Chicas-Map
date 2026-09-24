# Alamo Atlas — Android app

Thin WebView around the live desk:

https://justonejewelry.github.io/Chicas-Map/atlas/

Not a Play Store listing. Not SAPD. Same honesty rules as the web desk.

## Fastest Android install (no Studio)

On the phone, Chrome:

1. Open the URL above.
2. Menu → **Add to Home screen** / **Install app**.
3. Icon launches standalone (Atlas PWA manifest).

## Build an APK

Needs Android Studio (Ladybug+) or command-line SDK.

```bash
cd android/alamo-atlas
./gradlew assembleDebug
```

APK:
`app/build/outputs/apk/debug/app-debug.apk`

Sideload with:

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Or Android Studio → Open `android/alamo-atlas` → Run on a device.

## What the APK is

- `INTERNET` only
- Loads the GitHub Pages desk
- JS on, DOM storage on (ZIP memory)
- External links (911, magistrate, Open Data) open in the system browser / dialer
- Back button = WebView back, then exit

No local crime database. If Open Data SA is blocked on the network, tiles stay empty — same as the website.
