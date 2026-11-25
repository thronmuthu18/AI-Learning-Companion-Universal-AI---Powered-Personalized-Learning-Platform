# Build, Packaging & Deployment Runbook

## 1. Web Application & PWA
```bash
npm install
npm run web:build
# Output emitted to apps/web/dist/ (index.html, manifest.webmanifest, sw.js, assets/)
```
To test locally and verify offline PWA + WebGPU WebLLM:
```bash
npm run web:preview
```
1. Open the preview URL in Chrome or Edge (WebGPU enabled).
2. Complete onboarding -> Offline Model Settings -> **Initialize Llama 3.2 1B (q4f16_1)**.
3. Once cached (`state = ready`), open Chrome DevTools -> **Network -> Offline** (or disable Wi-Fi).
4. Reload the page (served by `sw.js` Service Worker) and query **AI Assistant (Llama)** to verify true offline WebGPU inference.

## 2. Android Application (Expo Prebuild + ExecuTorch 1.5.1)
Requires JDK 21 and Android SDK (`ANDROID_HOME` configured, Android SDK Platform 35, Build-Tools 35.0.0, NDK).
```bash
cd apps/mobile
npx expo prebuild --platform android --clean
cd android
./gradlew assembleDebug    # Debug APK: android/app/build/outputs/apk/debug/app-debug.apk
./gradlew assembleRelease  # Release APK (requires signing keystore for Play Store)
```
On device/emulator:
1. Export `llama-3.2-1b-instruct.pte` and `tokenizer.model` via `ai/conversion/export_llama_executorch.py`.
2. Push or pick files on device in **Settings -> Offline Llama 3.2 Model Management**.
3. Verify SHA-256 digest and tap **Load Model into ExecuTorch**.

## 3. iOS Application (Expo Prebuild + ExecuTorch Swift)
**Requires macOS with Xcode 15+ and CocoaPods** (currently blocked on Windows host — see `BLOCKERS.md` BLK-01):
```bash
cd apps/mobile
npx expo prebuild --platform ios --clean
cd ios
pod install
open AILearningCompanion.xcworkspace
```
In Xcode:
1. Confirm Swift Package dependency `https://github.com/pytorch/executorch` (`executorch`, `executorch_llm`, `backend_xnnpack`) is linked to the app target.
2. Connect a physical iPhone (with developer signing), build & run (`Cmd+R`), and load `.pte` + `tokenizer.model` in **Settings**.
