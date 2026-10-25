# AquaPure — Water Purifier Commerce & Service Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-007ACC?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React Native / Expo](https://img.shields.io/badge/Expo-SDK_53-black?style=flat-square&logo=expo&logoColor=white)](https://expo.dev/)
[![React / Vite](https://img.shields.io/badge/React_19-Vite-61DAFB?style=flat-square&logo=react&logoColor=black)](https://vitejs.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-13.x-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com/)

**AquaPure** is a modern, full-stack e-commerce and after-sales service management platform for water purifiers, commercial dispensers, booster pumps, RO membranes, and spare parts. Built with a dual-pricing model serving both **Retail Customers** and **Approved Wholesale Dealers**, AquaPure combines a cross-platform React Native Android app with a React-based web administration dashboard and a serverless Firebase backend.

---

## 📑 Table of Contents

- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Key Features](#-key-features)
  - [1. Mobile App (Customers & Dealers)](#1-mobile-app-customers--dealers)
  - [2. Dual-Pricing Wholesale System](#2-dual-pricing-wholesale-system)
  - [3. Service Desk & Maintenance](#3-service-desk--maintenance)
  - [4. Web Admin Dashboard](#4-web-admin-dashboard)
  - [5. Transactional Email & Notifications](#5-transactional-email--notifications)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
- [Running Locally](#-running-locally)
  - [1. Web Admin Panel](#1-web-admin-panel)
  - [2. Mobile Application](#2-mobile-application)
  - [3. Transactional Mail Server](#3-transactional-mail-server)
  - [4. Firebase Emulators](#4-firebase-emulators)
- [Admin User Setup](#-admin-user-setup)
- [Catalog & Database Management](#-catalog--database-management)
- [Firestore Security Rules](#-firestore-security-rules)
- [Testing & Verification](#-testing--verification)
- [Security & Production Readiness](#-security--production-readiness)

---

## 🛠 Architecture & Tech Stack

```
                                  ┌─────────────────────────────┐
                                  │      Firebase Services      │
                                  │  • Authentication (Identity)│
                                  │  • Cloud Firestore (NoSQL)  │
                                  │                             │
                                  │  • Cloud Functions (Backend)│
                                  └──────────────▲──────────────┘
                                                 │
                   ┌─────────────────────────────┴─────────────────────────────┐
                   │                                                           │
     ┌─────────────┴─────────────┐                               ┌─────────────┴─────────────┐
     │     Android Mobile App    │                               │       Admin Dashboard     │
     │      (React Native)       │                               │       (React + Vite)      │
     │ • Expo SDK 53             │                               │ • React 19 + TypeScript   │
     │ • Expo Router (v5)        │                               │ • Vite Build Tooling      │
     │ • Zustand State Store     │                               │ • Lucide Icons            │
     │ • Reanimated & Glass UI   │                               │ • Role-Gated Admin Desk   │
     │ • Razorpay Test Gateway   │                               │ • Real-Time Firestore KPIs│
     └───────────────────────────┘                               └───────────────────────────┘
```

| Component | Technology | Description |
|---|---|---|
| **Mobile App** | React Native, Expo SDK 53, Expo Router, TypeScript | Cross-platform mobile client for customers & dealers with tab navigation and gestures |
| **Admin Panel** | React 19, Vite, TypeScript, Lucide Icons | Responsive single-page web dashboard for order fulfillment, dealer approval, and ticketing |
| **State Management**| Zustand | Lightweight, decoupled stores for authentication, cart, and dealer state |
| **Backend & Database** | Firebase Authentication, Cloud Firestore | Managed NoSQL document store with strict role-based security rules |
| **Serverless Functions** | Node.js 20, Firebase Cloud Functions v6 | Server-authoritative pricing calculations, Razorpay HMAC-SHA256 signature verification |
| **Transactional Email** | Nodemailer, Express/HTTP, Gmail SMTP | Multi-channel dispatch server generating HTML invoices for orders and service status changes |
| **Payments** | Razorpay Node SDK & Mobile Web Checkout | Test-mode payment workflow with server signature verification and offline fallback simulation |

---

## 🚀 Key Features

### 1. Mobile App (Customers & Dealers)
- **Extensive Catalog**: 50+ pre-seeded products across 6 categories (Purifiers, Dispensers, Booster Pumps, Sediment/Carbon Filters, RO Membranes, and Spare Parts).
- **Search & Filtering**: Instant name/keyword search, category filter pills, and price/popularity sorting.
- **Dynamic Cart & Delivery Tiering**: Real-time quantity adjustment with free delivery thresholds (orders ≥ ₹999 qualify for free delivery; ₹99 flat rate otherwise).
- **Secure Checkout**: Shipping address management, pin-code validation, payment mode selection (Razorpay Test Mode or Cash on Delivery).
- **Visual Order Timeline**: Status tracking through real-time Firestore listeners (`placed` ➔ `confirmed` ➔ `processing` ➔ `shipped` ➔ `delivered`).

### 2. Dual-Pricing Wholesale System
- **Dealer Registration Gate**: Retail customers can submit wholesale applications with Business Name, GST Number, and Shop Address.
- **Verification Workflow**: Accounts remain in `pending` status until verified by an administrator.
- **Price discount**: Approved wholesale dealers automatically unlock wholesale pricing (15% to 35% discount across the entire catalog).
- **Bulk Ordering**: Dedicated wholesale ordering with batch volume calculations and customized wholesale invoice emails.

### 3. Service Desk & Maintenance
- **Ticket Booking**: Request professional installation, scheduled maintenance, filter replacements, or emergency repairs.
- **Slot Selection**: Choose preferred date and time slots with contact information and custom issue notes.
- **Status Lifecycle**: Track service progress from `requested` ➔ `confirmed` ➔ `in_progress` ➔ `completed`.

### 4. Web Admin Dashboard
- **Role-Based Gatekeeper**: Only users with verified `role: 'admin'` in Cloud Firestore can access management routes.
- **Live KPI Overview**: Real-time metrics tracking total orders, revenue, active dealer applications, and unresolved service tickets.
- **Order Fulfillment Desk**: Filter orders by status, inspect itemized lists, and advance order state with automatic customer notifications.
- **Dealer Verification Console**:approve or reject in one click.
- **Service Dispatch Desk**: Assign technicians, update status, and log diagnostic notes on service tickets.
- **One-Click Catalog Seeding**: Populate or synchronize Firestore with the full 50+ product catalog directly from the web interface.

### 5. Transactional Email & Notifications
- **Automated Invoices**: High-fidelity HTML emails dispatched upon order placement and delivery for both retail customers and dealers.
- **Multi-Mode Support**: Standalone local mail server (`functions/mailServer.js`) or serverless Cloud Function trigger.
- **Fail-Safe Design**: Payment and order creation succeed gracefully even if downstream mail transport is temporarily unavailable.

---

## 📁 Project Structure

```
WaterPurifierCommerce/
├── admin/                        # Web Admin Panel (React 19 + Vite + TypeScript)
│   ├── src/
│   │   ├── components/           # Shell layout, navbar, cards, status badges
│   │   ├── features/             # Dashboard, Orders, Dealers, Service Desk, Products
│   │   ├── services/             # Firebase SDK client, auth context
│   │   └── types/                # Admin domain interfaces
│   ├── scripts/                  # Admin creation helper (create-admin.mjs)
│   ├── .env.example              # Admin environment template
│   ├── package.json
│   └── vite.config.ts
├── mobile/                       # Cross-Platform Mobile Client (Expo SDK 53)
│   ├── src/
│   │   ├── app/                  # File-based routing (tabs, auth, checkout, product, orders)
│   │   ├── components/           # Reusable UI library (Button, Input, Card, ProductCard)
│   │   ├── data/                 # Catalog seed definition (50+ products)
│   │   ├── services/             # Firebase client, PaymentService, NotificationService
│   │   ├── stores/               # Zustand state stores (authStore, cartStore)
│   │   └── theme/                # Design tokens (colors, typography, spacing)
│   ├── google-services.json.example # Firebase Android configuration template
│   ├── .env.example              # Mobile environment template
│   ├── app.json                  # Expo application manifest
│   └── package.json
├── functions/                    # Backend Services & Cloud Functions (Node.js 20)
│   ├── services/
│   │   ├── pricingService.js     # Authoritative server-side pricing engine
│   │   ├── razorpayService.js    # Razorpay order creator & signature verification
│   │   └── pushNotificationService.js # Notification dispatcher
│   ├── test/                     # Functions unit tests
│   ├── catalogData.json          # Canonical product catalog dataset
│   ├── index.js                  # Cloud Function triggers & callable endpoints
│   ├── mailServer.js             # Standalone transactional email server (Port 5055)
│   ├── .env.example              # Functions environment template
│   └── package.json
├── tests/                        # Comprehensive Domain & Integration Test Suite
│   ├── catalog_and_cart.test.mjs # Catalog specs, category coverage, dual-pricing
│   ├── checkout_flow_and_cart_separation.test.mjs # Checkout flows & cart isolation
│   ├── razorpay_payment.test.mjs # HMAC-SHA256 signature verification & security
│   ├── email_notifications.test.mjs # Order placed & delivered email generation
│   └── firestore-rules.test.mjs  # Local Firestore rules unit test suite
├── scripts/                      # Workspace utility scripts
│   └── syncCatalog.mjs           # Catalog synchronization utility
├── firestore.rules               # Production-grade Firestore security rules
├── firestore.indexes.json        # Composite query index definitions
├── firebase.json                 # Firebase configuration & emulator setup
├── start-mail-server.bat         # Quick launcher for local mail server
├── package.json                  # Root monorepo workspace configuration
└── README.md                     # Platform documentation
```

---

## 🏁 Getting Started

### Prerequisites

- **Node.js**: `v20.x` or higher (LTS recommended)
- **npm**: `v10.x` or higher
- **Expo Go App** (optional, for running on a physical Android device)
- **Firebase CLI** (optional, for running emulators or deploying rules): `npm install -g firebase-tools`

### Installation

Clone the repository and install dependencies for the root workspace, mobile app, admin panel, and cloud functions:

```bash
# Clone the repository
git clone https://github.com/your-username/WaterPurifierCommerce.git
cd WaterPurifierCommerce

# Install root dependencies
npm install

# Install admin dependencies
npm install --prefix admin

# Install mobile dependencies
npm install --prefix mobile

# Install functions dependencies
npm install --prefix functions
```

### Environment Variables

Copy the `.env.example` templates to `.env` in each respective directory and configure your credentials:

#### 1. Admin Panel (`admin/.env`)
```bash
cp admin/.env.example admin/.env
```
Fill in your Firebase web app credentials:
```ini
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id

# Transactional Mail Server
VITE_GMAIL_SENDER=your-email@gmail.com
VITE_MAIL_API_URL=http://localhost:5055/api/send-email
```

#### 2. Mobile App (`mobile/.env`)
```bash
cp mobile/.env.example mobile/.env
```
Fill in your Firebase credentials and Razorpay test Key ID:
```ini
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key-here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id

# Razorpay (Test Mode Only)
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_test_your_key_id

# Transactional Mail Server
EXPO_PUBLIC_GMAIL_SENDER=your-email@gmail.com
EXPO_PUBLIC_MAIL_API_URL=http://localhost:5055/api/send-email
```

#### 3. Cloud Functions & Mail Server (`functions/.env`)
```bash
cp functions/.env.example functions/.env
```
Configure your Razorpay test credentials and Gmail SMTP settings:
```ini
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_test_secret_here
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here

# Gmail SMTP Configuration for Order & Service Email Notifications
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your_16_character_app_password
MAIL_SERVER_PORT=5055
```

> **Note on Gmail SMTP**: To send live emails using Gmail, generate a 16-character **Google App Password** from [Google Account Security](https://myaccount.google.com/apppasswords). Never use your regular Google account password.

---

## 🏃 Running Locally

### 1. Web Admin Panel
```bash
cd admin
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

### 2. Mobile Application
```bash
cd mobile
npx expo start
```
- Press `a` to launch on a connected Android device or Android Studio emulator.
- Scan the displayed QR code with the **Expo Go** app on your physical Android phone.
- Press `w` to run on web (browser preview).

### 3. Transactional Mail Server
To send live transactional emails locally:
```bash
# From workspace root
npm run start:mail

# Or on Windows, double-click:
start-mail-server.bat
```
The server will start listening on `http://localhost:5055/api/send-email`.

### 4. Firebase Emulators (Optional)
To run local Firestore and Cloud Functions emulators:
```bash
npm run serve:functions
```

---

## 🔑 Admin User Setup

To promote or create an administrator account for the web dashboard:

```bash
# Syntax: node admin/scripts/create-admin.mjs [email] [password]
node admin/scripts/create-admin.mjs admin@aquapure.com Admin@123456
```

This script:
1. Authenticates or creates the user in Firebase Authentication.
2. Creates or updates the user's document in Firestore (`users/{uid}`) with `{ role: 'admin' }`.
3. Displays a success confirmation with login credentials for the admin dashboard.

---

## 📦 Catalog & Database Management

AquaPure includes a comprehensive catalog of **50+ products** with realistic specifications, images, and dual customer/dealer pricing.

To sync or seed the catalog to Cloud Firestore:
```bash
# Seed via CLI script
npm run catalog:sync
```
Alternatively, log in to the Web Admin Panel, navigate to **Products**, and click **"Seed Firestore Catalog"**.

---

## 🔒 Firestore Security Rules

Database security is enforced at the database level in `firestore.rules`:

- **Users (`/users/{userId}`)**:
  - Authenticated users can read and write only their own profile.
  - Regular users cannot self-assign the `admin` role or modify `dealerStatus`.
  - Dealers must initialize with `dealerStatus: 'pending'`.
- **Products (`/products/{productId}`)**:
  - Public read access for active catalog browsing.
  - Creation, updating, and deletion strictly restricted to administrators.
- **Orders (`/orders/{orderId}`)**:
  - Customers can read only their own orders (`customerId == request.auth.uid`).
  - Order creation requires matching authenticated UID.
  - Status progression and fulfillment updates restricted to administrators.
- **Service Bookings (`/service_bookings/{bookingId}`)**:
  - Users can create bookings and view their own tickets.
  - Status updates and technician assignments restricted to administrators.

---

## 🧪 Testing & Verification

The project includes an automated test suite covering catalog integrity, dual-pricing math, cart operations, Razorpay HMAC signatures, and email templating:

```bash
# Run all automated tests
npm test

# Run individual test suites
npm run test:payment      # Razorpay payment & signature verification tests
npm run test:email        # Customer & dealer transactional email tests
npm run test:functions    # Serverless pricing & function logic tests

# Typecheck the mobile TypeScript codebase
npm run typecheck:mobile

# Build the admin panel for production
npm run build:admin
```

All 31+ automated tests execute with 0 failures using the native Node.js test runner.

---

## 🛡️ Security & Production Readiness

Before pushing to production or GitHub, this repository has been sanitized:
- **No Hardcoded Secrets**: All Razorpay keys, Firebase private configs, and SMTP credentials load strictly from environment variables.
- **Excluded Build Binaries**: APK files, Metro bundle dumps, and build caches are excluded via `.gitignore`.
- **Safe Example Templates**: Included `.env.example` and `google-services.json.example` files for zero-friction setup without leaking credentials.
- **Strict Data Access**: Cloud Firestore Security Rules block unauthorized writes, privilege escalation, and cross-customer data leakage.
