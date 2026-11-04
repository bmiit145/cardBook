# CardScan AI - Mobile Client (React Native + Expo)

Cross-platform mobile application for Android, iOS, and Web preview designed with complete visual, layout, and UX parity to the React + Vite web application.

---

## Features

- **Exact Web Design System Parity**:
  - Color palette, typography, radii, and elevated card shadows matching `client/src/styles/global.css`.
  - Responsive **Slide-Out Sidebar Navigation Drawer** matching `client/src/components/Sidebar.jsx` (Brand header, Scan button, nav links with active blue pill highlights, admin profile with logout).
  - Sticky **Top Navigation Bar** matching `client/src/components/Header.jsx` with hamburger drawer trigger, screen title, and green `🛡️ Admin Active` badge.
  - Quick bottom tab navigation for mobile ergonomics.
- **Admin Authentication**:
  - Dark-slate theme login matching web `Login.jsx` (`#0F172A`).
  - Seamless dual auth: Bearer JWT in mobile secure storage / local storage.
- **Admin Control Center (Dashboard)**:
  - 4 KPI StatCards: Total Contacts (blue), Companies (purple), Cards Scanned Today (green), Failed Scans/OCR (amber).
  - Dark gradient Google Sheets action banner with live sync metrics.
  - Recent Saved Contacts list with Google Sheets status badges (`SYNCED`, `PENDING`, `FAILED`).
  - Recent Scans list with OCR status (`SUCCESS`, `FAILED`).
- **Business Card Scanner**:
  - Single-Sided vs Double-Sided card toggle.
  - **Trained Cards Testing Suite**: One-tap sample selector for 78 Real Examples and 50 Benchmark Suite cards.
  - Camera capture and photo gallery picker via `expo-image-picker`.
  - Instant offline multi-PSM Tesseract OCR processing with CLAHE contrast enhancement.
- **Extracted Contact Review**:
  - Manual review alert banner if OCR confidence < 60% with specific reason bullets.
  - Original Card photo preview with "Full View" zoom modal.
  - Collapsible Raw OCR Text recognized box.
  - Sectioned form fields matching web `ContactForm.jsx` (Identity, Communication, Address & Location, Notes).
  - Detected Name, Phone, and Email suggestion pills.
  - Duplicate contact check modal before saving.
  - Native Phone Address Book sync via `expo-contacts`.
- **Contact Directory**:
  - Search by name, company, email, or phone.
  - Filter by Google Sheets status (`SYNCED`, `PENDING`, `FAILED`).
  - One-tap quick action buttons for calling (`tel:`), messaging, and email (`mailto:`).
  - Soft-delete confirmation dialog.
  - Pagination controls.
- **Contact Details**:
  - Original card photo with full-view modal.
  - Google Sheets synchronization status box with on-demand manual sync button.
  - Full editable contact details view.
- **Company Directory**:
  - Search companies.
  - Add Company modal with Name, Website, Address, City, State.
  - Contact count badge and direct filter link.
- **Integrations & System Settings**:
  - Primary Database (PostgreSQL & Prisma) operational status.
  - Google Cloud Vision / Local Tesseract OCR engine status.
  - Cloudinary original card vault status.
  - Google Sheets sync retry button.
  - Mobile custom API Base URL configurator (for testing on real Android phones via Wi-Fi).
  - Admin Password change settings.

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run on Web Preview
```bash
npm run web
```
Opens in your browser at `http://localhost:8081`.

### 3. Run on Android Device / Emulator
```bash
npm run android
```
Or scan the Metro QR code using the **Expo Go** app on your Android phone (ensure the phone is connected to the same Wi-Fi network as your computer).

---

## Default Admin Credentials

- **Email**: `admin@businesscards.com`
- **Password**: `Admin@12345`
