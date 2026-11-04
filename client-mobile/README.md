# CardScan AI - Mobile Application (React Native + Expo)

Android-first, iOS-compatible mobile business card scanner powered by our centralized Node.js Express backend and PostgreSQL database.

---

## 1. Features

- **Centralized Authentication**: Shared admin identity using `admin@businesscards.com`. Tokens stored in hardware-encrypted storage via `expo-secure-store`.
- **Card Camera & Gallery Scan**: Photograph or upload business cards (front and optional back).
- **High-Accuracy Local OCR**: Automatically uploads to `/api/v1/scans/ocr`, utilizing OpenCV 5 deskewing, Sharp CLAHE/polarity inversion, and official `tessdata_best` models (English, Gujarati, Hindi).
- **Field Review & Edit**: Real-time review screen with OCR confidence rating, needs-review flags, and raw OCR inspection.
- **Native Address Book Integration**: 1-tap "Save to Device Contacts" via `expo-contacts` writes directly into the Android/phone contact list.
- **Quick Communication Actions**: 1-tap Phone Call (`tel:`), 1-tap WhatsApp (`wa.me`), and 1-tap Email (`mailto:`).
- **Instant Synchronization**: Every saved or edited contact is immediately accessible on the web dashboard (`http://localhost:5173`) and queued for Google Sheets sync.

---

## 2. Project Structure

```
client-mobile/
├── app.json                  # Expo metadata, Android package, permissions
├── App.js                    # Main Navigation (Stack + Bottom Tabs)
├── package.json
└── src/
    ├── context/
    │   └── AuthContext.js    # Auth state with SecureStore persistence
    ├── screens/
    │   ├── LoginScreen.js    # Admin sign-in & server IP configuration
    │   ├── DashboardScreen.js# Live metrics & Google Sheets sync
    │   ├── ScanScreen.js     # Camera card capture & AI OCR trigger
    │   ├── ReviewScreen.js   # Extracted contact review & save
    │   ├── ContactsScreen.js # Searchable contacts list & quick actions
    │   └── SettingsScreen.js # Server URL config & admin profile
    └── services/
        ├── api.js            # Axios client with Bearer token injection
        ├── authService.js    # Login, logout, SecureStore management
        ├── scanService.js    # Multipart/form-data upload to /scans/ocr
        ├── contactService.js # Contacts CRUD & expo-contacts device saving
        └── dashboardService.js# Metrics & Google Sheets sync triggers
```

---

## 3. Getting Started

### Prerequisites
Make sure your shared backend server is running on port 5000:
```bash
# In project root
npm run server
```

### Running on Android Emulator
```bash
# In project root
npm run android
# Or inside client-mobile:
cd client-mobile
npm run android
```
*Note: The app automatically detects Android Emulator and routes API calls to `http://10.0.2.2:5000/api/v1`.*

### Running on a Physical Android Phone (Expo Go)
1. Install **Expo Go** from the Google Play Store on your phone.
2. Ensure your phone and development PC are connected to the same Wi-Fi network.
3. Start the mobile app:
   ```bash
   npm run mobile
   ```
4. Scan the QR code displayed in the terminal with the Expo Go app.
5. In the app login screen, tap **"⚙️ Configure Server IP / URL"** and set:
   `http://<YOUR_PC_LOCAL_IP>:5000/api/v1` (e.g. `http://192.168.1.15:5000/api/v1`).

---

## 4. Default Admin Credentials

- **Email**: `admin@businesscards.com`
- **Password**: `Admin@123456`
