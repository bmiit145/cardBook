# Business Card Scanner & Contact Management System

A high-performance, browser-based **Business Card Scanner and Contact CRM** built for desktop, tablet, and mobile browsers.

The system scans visiting cards (single or double-sided), preprocesses card images with Sharp, extracts contact details using **Google Cloud Vision OCR** combined with a multilingual heuristic extraction engine, stores original images securely in **Cloudinary**, saves structured contacts with transactional safety in **PostgreSQL (Prisma ORM)**, and asynchronously synchronizes contact registers to **Google Sheets** with automatic retry capabilities.

---

## 1. System Architecture & Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + Vite, React Router v6, Lucide Icons |
| **Styling** | Modern Responsive CSS with Design Tokens |
| **Backend** | Node.js + Express.js (`/api/v1` routes) |
| **Database** | PostgreSQL with **Prisma ORM** (with resilient local storage fallback) |
| **OCR** | Google Cloud Vision API (`@google-cloud/vision` documentTextDetection) |
| **Image Processing** | Sharp (auto-rotation, dynamic resize, contrast normalization, grayscale OCR buffer) |
| **Cloud Storage** | Cloudinary (`business-card-scanner/original-cards/front/` and `/back/`) |
| **Spreadsheet Sync** | Google Sheets API v4 (`googleapis` background worker with exponential backoff) |
| **Authentication** | Admin JWT in secure HttpOnly cookies + Bearer auth & bcrypt hashing |
| **Validation** | Zod schemas |
| **Phone Parsing** | `libphonenumber-js` (international E.164 and national normalization) |

---

## 2. Key Modules & Screens

1. **Admin Control Center (Dashboard)**
   - KPIs: Total Contacts, Registered Companies, Cards Scanned Today, Failed OCR Count.
   - Google Sheets synchronization live status breakdown (Synced, Pending, Failed).
   - Recent Scans log and recently added contacts.
   - Quick export and scan shortcuts.

2. **Card Scanner (`/scanner`)**
   - Single-sided and Double-sided business card support.
   - Live browser camera viewfinder with card alignment guide box.
   - Camera switching (Front/Rear on Android and desktop).
   - Gallery image file upload fallback with `capture="environment"`.
   - Built-in interactive HTML5 Canvas Cropper & Rotator (90° rotation, zoom, aspect ratio fitting).

3. **Extracted Contact Review (`/review`)**
   - Side-by-side view: Original card photo on the left (with front/back switcher and high-res zoom modal).
   - Fully editable structured contact fields on the right.
   - Raw OCR text inspector with character count.
   - Real-time duplicate detection on Phone, Email, and Name+Company before saving.
   - Duplicate warning modal with diff preview and "Save Anyway" override.

4. **Contact Directory (`/contacts`)**
   - Responsive contacts data table with search across name, company, email, and phone.
   - Filter by Google Sheets sync status (`SYNCED`, `PENDING`, `FAILED`).
   - One-click **Export CSV** (spreadsheets) and **Export VCF** (vCard 3.0 for phone/Google Contacts).
   - Individual contact view, edit, and soft-delete.

5. **Contact Details (`/contacts/:id`)**
   - High-resolution front and back card viewer with zoom.
   - Google Sheets sync inspection (sheet row reference, last attempt timestamp, error log).
   - "Sync to Google Sheets Now" manual trigger button.
   - Edit mode and soft-deletion options.

6. **Company Management (`/companies`)**
   - Company directory with contact counts.
   - Drill-down to view all contacts associated with a specific company.
   - Create and update company records.

7. **Integrations & Settings (`/settings`)**
   - Live health monitors for Google Cloud Vision, Cloudinary, Google Sheets API, and PostgreSQL.
   - One-click "Retry Failed Sheets Rows" queue processing.
   - Admin Change Password security manager.

---

## 3. Project Directory Structure

```text
business-card-scanner/
├── client/
│   ├── public/
│   │   ├── logo.svg
│   │   └── favicon.ico
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Header.jsx
│   │   │   ├── StatCard.jsx
│   │   │   ├── DataTable.jsx
│   │   │   ├── CameraScanner.jsx
│   │   │   ├── ImageCropper.jsx
│   │   │   ├── ContactForm.jsx
│   │   │   ├── CardPreview.jsx
│   │   │   └── DuplicateWarning.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Scanner.jsx
│   │   │   ├── ContactReview.jsx
│   │   │   ├── Contacts.jsx
│   │   │   ├── ContactDetails.jsx
│   │   │   ├── Companies.jsx
│   │   │   └── Settings.jsx
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   ├── authService.js
│   │   │   ├── scanService.js
│   │   │   ├── contactService.js
│   │   │   └── companyService.js
│   │   ├── hooks/
│   │   │   └── useCamera.js
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── utils/
│   │   │   ├── validators.js
│   │   │   └── formatters.js
│   │   ├── styles/
│   │   │   ├── global.css
│   │   │   ├── dashboard.css
│   │   │   └── scanner.css
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env
│   ├── vite.config.js
│   └── package.json
├── server/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.js
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js
│   │   │   ├── cloudinary.js
│   │   │   ├── googleVision.js
│   │   │   └── googleSheets.js
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── scanController.js
│   │   │   ├── contactController.js
│   │   │   ├── companyController.js
│   │   │   ├── dashboardController.js
│   │   │   └── integrationController.js
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── scanRoutes.js
│   │   │   ├── contactRoutes.js
│   │   │   ├── companyRoutes.js
│   │   │   ├── dashboardRoutes.js
│   │   │   └── integrationRoutes.js
│   │   ├── services/
│   │   │   ├── ocrService.js
│   │   │   ├── extractionService.js
│   │   │   ├── imageService.js
│   │   │   ├── cloudinaryService.js
│   │   │   ├── contactService.js
│   │   │   ├── duplicateService.js
│   │   │   └── sheetsSyncService.js
│   │   ├── jobs/
│   │   │   └── sheetsSyncWorker.js
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js
│   │   │   ├── uploadMiddleware.js
│   │   │   ├── errorMiddleware.js
│   │   │   └── validateMiddleware.js
│   │   ├── validators/
│   │   │   ├── authValidator.js
│   │   │   ├── contactValidator.js
│   │   │   └── scanValidator.js
│   │   ├── utils/
│   │   │   ├── response.js
│   │   │   └── logger.js
│   │   ├── app.js
│   │   └── server.js
│   ├── .env
│   ├── .env.example
│   └── package.json
├── package.json
├── .gitignore
└── README.md
```

---

## 4. Quick Start & Running the Project

### Prerequisites
- Node.js >= 18 (Tested on Node v20.19)
- npm >= 9

### Step 1: Install Dependencies
From the root directory:
```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### Step 2: Start the Backend Server
```bash
cd server
npm run dev
```
The server will start on port `5000` (`http://localhost:5000/api/v1`).
> **Note:** The server includes an intelligent persistent fallback store. If a live PostgreSQL database is not connected immediately on `localhost:5432`, the server runs seamlessly so you can test admin login, card scanning, OCR, review, duplicate checking, and exports right away without setup errors.

### Step 3: Start the React Frontend
In a separate terminal window:
```bash
cd client
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 5. Default Admin Credentials

- **Email:** `admin@businesscards.com`
- **Password:** `Admin@12345`

*Note: You can change the password at any time from the Integrations & Settings page.*

---

## 6. PostgreSQL Database Setup with Prisma

When connecting to your local or hosted PostgreSQL instance (e.g., Supabase, Neon, Railway, or local Postgres):

1. Set your `DATABASE_URL` in `server/.env`:
   ```env
   DATABASE_URL="postgresql://postgres:password@localhost:5432/business_cards?schema=public"
   ```
2. Run database migrations:
   ```bash
   cd server
   npx prisma migrate dev --name init
   ```
3. Generate the Prisma Client and seed the initial admin:
   ```bash
   npx prisma generate
   npm run prisma:seed
   ```

---

## 7. Cloud Integrations Setup

### A. Google Cloud Vision API (OCR)
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project.
3. Enable the **Cloud Vision API**.
4. Go to **IAM & Admin > Service Accounts** and create a service account with the **Cloud Vision API User** role.
5. Create and download a JSON key.
6. Place the JSON file in `server/credentials/google-service-account.json`.
7. Set in `server/.env`:
   ```env
   GOOGLE_CLOUD_PROJECT_ID=your-project-id
   GOOGLE_APPLICATION_CREDENTIALS=./credentials/google-service-account.json
   ```

### B. Google Sheets API (Contact Register)
1. In the same Google Cloud Console project, enable the **Google Sheets API**.
2. Create a new Google Spreadsheet named **`Business Card Contact Database`**.
3. Copy the Spreadsheet ID from the URL (`https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit`).
4. Click **Share** on your spreadsheet and invite your service account email (`your-service-account@...iam.gserviceaccount.com`) as an **Editor**.
5. Set in `server/.env`:
   ```env
   GOOGLE_SHEET_ID=your_spreadsheet_id
   GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@...iam.gserviceaccount.com
   ```

### C. Cloudinary (Authenticated Image Vault)
1. Sign up or log into [Cloudinary](https://cloudinary.com/).
2. Copy your Cloud Name, API Key, and API Secret from your dashboard.
3. Set in `server/.env`:
   ```env
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

---

## 8. Backend API Reference (`/api/v1`)

### Authentication
- `POST /api/v1/auth/login`: Admin login (issues JWT in HttpOnly cookie and Bearer payload)
- `POST /api/v1/auth/logout`: Clears auth cookie
- `GET /api/v1/auth/me`: Current admin profile
- `POST /api/v1/auth/change-password`: Change admin password

### Scanning & OCR
- `POST /api/v1/scans/ocr`: Upload card front/back images, preprocess with Sharp, run Vision OCR, parse fields
- `POST /api/v1/scans/extract`: Re-extract structured fields from a raw text payload
- `GET /api/v1/scans/history`: Fetch recent scans
- `GET /api/v1/scans/:id`: Get scan record
- `DELETE /api/v1/scans/:id`: Delete scan record

### Contacts Management
- `POST /api/v1/contacts`: Save verified contact with images and queue Google Sheets sync
- `GET /api/v1/contacts`: List contacts with search (`?q=`), filter (`?syncStatus=`), and pagination (`?page=`)
- `GET /api/v1/contacts/:id`: Retrieve single contact with card images and sync status
- `PUT /api/v1/contacts/:id`: Update contact details (updates existing row in Google Sheets)
- `DELETE /api/v1/contacts/:id`: Soft-delete contact
- `POST /api/v1/contacts/check-duplicate`: Check if contact matches existing records
- `GET /api/v1/contacts/export`: Export contacts as CSV (`?format=csv`) or vCard 3.0 (`?format=vcf`)

### Companies
- `GET /api/v1/companies`: List companies with associated contact counts
- `POST /api/v1/companies`: Create company profile
- `PUT /api/v1/companies/:id`: Update company details
- `GET /api/v1/companies/:id/contacts`: Get all contacts belonging to a company

### Integrations & Dashboard
- `GET /api/v1/dashboard/stats`: Dashboard statistics (total contacts, companies, scans today, failed OCR, sync breakdown)
- `GET /api/v1/integrations/status`: Health of Database, Vision API, Cloudinary, and Google Sheets
- `POST /api/v1/integrations/sheets/retry`: Retry all failed Google Sheets synchronization jobs
- `POST /api/v1/integrations/sheets/sync/:id`: Manually trigger synchronization for a specific contact

---

## 9. Automated Testing
Run the automated e2e verification suite:
```bash
node server/test-e2e.js
```
The test verifies:
- Database connectivity & admin seeding
- English business card OCR extraction (Name, Company, Designation, Phone, Email, Address, PIN, State)
- Multilingual Gujarati and Hindi card extraction
- Duplicate contact detection (phone, email, name+company)
- CSV and VCF (vCard 3.0) file generation
- Soft deletion preservation

