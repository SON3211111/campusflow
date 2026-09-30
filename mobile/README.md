# CampusFlow Mobile

React Native app built with Expo. Open this `mobile` folder in IntelliJ IDEA.

## Run on Android

1. Install Node.js 22.13 or newer.
2. In IntelliJ's terminal, run `npm install` from this folder.
3. Start an Android emulator from Android Studio's Device Manager, or connect an Android phone with USB debugging enabled.
4. Run `npm run android`.

## Run on iPhone

- Install Expo Go from the App Store and connect the iPhone and development PC to the same reachable network.
- On Windows, run `npx expo start --lan` in IntelliJ's terminal, then scan the QR code with the iPhone Camera app and open it in Expo Go. If the phone cannot reach the PC over LAN, try `npx expo start --tunnel`.
- Sign in to Expo Go and the Expo CLI with the same Expo account if prompted.
- The `npm run ios` simulator command requires macOS and Xcode. An iOS native build also requires macOS/Xcode or a cloud iOS build service.

The midterm demo flow is: generate task suggestions with AI, review and add them to the task board, update task status, assign due dates, and see those due tasks in the next-seven-days schedule. Task board and schedule changes are held in memory and reset when the app restarts.

## AI backend connection

- Start the CampusFlow backend on port `8080` and make sure the AI service is available.
- The Android Studio emulator uses `http://10.0.2.2:8080/api` by default to reach the host PC.
- On a physical phone, copy `.env.example` to `.env`, replace the sample IP with the PC's LAN IPv4 address, then restart Expo. The phone and PC must be able to reach each other, and the backend port must be allowed through the PC firewall.
- The same LAN backend URL works from an iPhone; allow local network access if iOS asks.
- AI suggestions are reviewed in the app before they are added to the local board. The board itself is still in-memory demo data and resets when the app restarts.
