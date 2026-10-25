# AquaPure — Product Requirements Document (PRD)

**Project:** WaterPurifierCommerce  
**Product:** AquaPure Water Purifier Commerce Platform  
**Document version:** 1.0  
**Status:** Initial implementation baseline  
**Platforms:** Android mobile app + web admin panel  
**Primary objective:** Deliver a polished, functional demonstration while keeping service usage within available free tiers.

---

## 1. Product Overview

AquaPure is an e-commerce platform for water purifiers and related products. It consists of:

1. **Customer mobile experience** for browsing products, purchasing, tracking orders, managing a profile, requesting service, and receiving notifications.
2. **Dealer mobile experience** for approved dealers to purchase the same catalog at wholesale prices and place bulk orders.
3. **Web admin panel** for staff to manage orders, approve or reject dealer applications, and operate the service desk.

The Android app will be built with **React Native, Expo, and TypeScript**. The admin panel will use **React, Vite, and TypeScript**. Firebase will provide authentication, database services, and push-notification infrastructure. The admin panel must be deployed to a live Vercel URL.

This is an assignment/demo project. Mock catalog data is acceptable, but the user flows must be real and interconnected. The product images must match the product names and look clean and realistic.

## 2. Goals

- Provide a complete, coherent shopping flow for customers.
- Provide a separate, permission-controlled dealer flow with lower wholesale prices and bulk ordering.
- Allow administrators to manage orders, dealer approvals, and service requests from a web dashboard.
- Include Firebase Authentication, Cloud Firestore, and push notifications.
- Demonstrate Razorpay checkout in **test mode only**.
- Include a map/address experience using an appropriate free map option, with manual address entry as a fallback.
- Demonstrate email and SMS notification integration when credentials and delivery capacity are available.
- Match the approved Demo 2 visual design system across mobile and web.
- Deploy the admin web app to Vercel and document setup and limitations.
- Keep the demo at ₹0 in service charges where possible by using free tiers and staying within quotas. Zero cost is a target, not a guarantee: phone/SMS carrier charges, provider changes, and quota limits can still apply.

## 3. Non-Goals

- Processing real payments or storing real payment-card details.
- Production-scale inventory, logistics, tax, invoicing, or warehouse operations.
- Guaranteeing unlimited free usage or production-grade service availability.
- Building an iOS app unless required separately; Android is mandatory.
- Sending unsolicited marketing notifications.
- Using Firebase client configuration as a substitute for authorization or trusted server-side validation.

## 4. Users and Roles

### 4.1 Guest
- View the welcome/home screen and public product catalog where allowed.
- Search, browse categories, and inspect product details.
- Be prompted to sign in before placing an order, viewing private history, or booking a service.

### 4.2 Customer
- Register, sign in, sign out, and manage profile/address details.
- Browse and search a catalog of at least 50 products.
- View product images, descriptions, categories, prices, specifications, and availability.
- Add, update, and remove cart items.
- Submit checkout using Razorpay test mode.
- View order confirmation, order history, and order statuses.
- Create service bookings and view booking status.
- Receive relevant order/service notifications when notification permissions and integrations are configured.

### 4.3 Dealer
- Sign in through the dealer entry point using Firebase Authentication.
- Have dealer access restricted until approval is granted by an administrator.
- Browse the same product catalog with a lower wholesale price where a dealer price is configured.
- Change quantities and submit bulk orders.
- View their own dealer order history and status.
- Never access another dealer's private information or orders.

### 4.4 Administrator
- Sign in to the protected web dashboard.
- View and manage orders and update allowed order statuses.
- Review dealer applications and approve or reject them.
- View and manage service requests.
- View summary metrics and filter/search operational records.
- Only receive administrator permissions through a trusted setup/role-assignment process. A user must not be able to make themselves an administrator.

## 5. Platforms and Technology

| Area | Selection | Notes |
|---|---|---|
| Android app | React Native + Expo + TypeScript | Use a development build when native notification/payment modules require it. |
| Mobile navigation | Expo Router if already configured; otherwise use the existing navigation setup | Avoid replacing working navigation without a reason. |
| State management | React Context/reducer or a small store such as Zustand | Keep cart state predictable; persist only what is necessary. |
| Admin panel | React + Vite + TypeScript | Must be deployed live on Vercel. |
| Authentication | Firebase Authentication | Email/password for demo unless another method is explicitly required. |
| Database | Cloud Firestore | Use explicit data models and restrictive Security Rules. |
| Push notifications | Firebase Cloud Messaging / compatible Expo notification setup | Verify Android delivery in a development build or supported setup. |
| Product images | Cloudinary or another approved free image host | Firebase Storage is not assumed to be free for this project. |
| Payments | Razorpay Test Mode | Never collect real funds or expose secret keys in client code. |
| Maps | OpenStreetMap-compatible integration | Respect tile provider policy and attribution; provide manual address entry. |
| Email | EmailJS or another suitable free-tier provider | Respect provider request quotas and protect any private credentials. |
| SMS | TextBee or another approved gateway | Depends on device/SIM, carrier plan, and provider limits. |
| Hosting | Vercel Hobby, if project use fits its terms | Confirm current free-tier terms before deployment. |

## 6. Functional Requirements

Requirements use IDs to support implementation and testing.

### 6.1 Authentication and Authorization

- **AUTH-01:** Customers can register, sign in, and sign out.
- **AUTH-02:** Dealers have a distinct entry point and are authenticated through Firebase Authentication.
- **AUTH-03:** A dealer begins as `pending` and cannot use approved-dealer functionality until an administrator approves the account.
- **AUTH-04:** Administrator access is assigned out-of-band or by trusted server-side setup; the client cannot self-assign roles.
- **AUTH-05:** Protected screens redirect or display an appropriate access-denied state when the session or role is invalid.
- **AUTH-06:** Firebase Security Rules enforce data access independently of the UI.

### 6.2 Product Catalog

- **PROD-01:** The catalog contains at least 50 distinct seed products before final submission.
- **PROD-02:** Products cover purifiers, dispensers, pumps, filters, membranes/cartridges, and spare parts.
- **PROD-03:** Each product has a stable ID, name, category, description, customer price, optional dealer price, image URL, stock/availability flag, and relevant specifications.
- **PROD-04:** Every visible product image must correspond to the item name/type. Broken or mismatched image URLs must have a clean fallback.
- **PROD-05:** Users can search products and filter by category. Sorting may include price and popularity.
- **PROD-06:** Product detail screens show price, key specifications, description, and add-to-cart controls.
- **PROD-07:** Mock/seed data must be identified in documentation and loaded through a maintainable data layer rather than hardcoded separately into every screen.

### 6.3 Cart and Checkout

- **CART-01:** Users can add items, adjust quantities, remove items, and see updated subtotals.
- **CART-02:** A cart must not allow invalid quantities or checkout with an empty cart.
- **CART-03:** Customer and approved-dealer pricing must be applied consistently. The client-provided total is never trusted for sensitive order/payment operations.
- **CART-04:** Checkout displays selected address, line items, subtotal, and final total before payment.
- **CART-05:** Razorpay Test Mode supports a demonstrable test checkout and visible success, failure, and cancellation states.
- **CART-06:** A trusted endpoint or approved backend mechanism creates/verifies payment orders/signatures. Secret keys must never be shipped in the mobile app or web bundle.
- **CART-07:** The order is marked paid only after trusted verification of the test payment result. An unverified client callback alone is insufficient.
- **CART-08:** If trusted payment verification cannot be configured, keep the checkout explicitly in demo/simulation mode and document the limitation; do not claim secure Razorpay verification is complete.

### 6.4 Orders

- **ORDER-01:** A successful checkout creates an order record with line-item snapshots, quantities, totals, user/dealer ID, address, payment status, order status, and timestamps.
- **ORDER-02:** Customers see only their own orders; dealers see only their own dealer orders.
- **ORDER-03:** The order-history screen includes useful status labels and an order-detail view.
- **ORDER-04:** The admin can list, filter, inspect, and update allowed order statuses.
- **ORDER-05:** Order records preserve purchased product names/prices even if the current catalog later changes.

### 6.5 Dealer Workflows

- **DEALER-01:** Dealers can register/request dealer access and see approval status.
- **DEALER-02:** Pending or rejected dealers cannot place dealer orders.
- **DEALER-03:** Approved dealers see lower wholesale prices for products with configured dealer pricing.
- **DEALER-04:** Dealers can place bulk orders with quantity controls.
- **DEALER-05:** Dealer-specific pricing and permission checks are enforced outside client-only presentation logic.
- **DEALER-06:** The admin can approve or reject a dealer application and record the decision timestamp/actor where appropriate.

### 6.6 Profile and Address

- **PROFILE-01:** Users can view/edit permitted profile fields.
- **PROFILE-02:** Users can save and select delivery/service addresses.
- **PROFILE-03:** Address entry supports manual address details even when location permission, map tiles, or geocoding service is unavailable.
- **PROFILE-04:** Private profile data is readable/writable only by its owner and appropriately authorized administrators.

### 6.7 Service Booking and Service Desk

- **SERVICE-01:** Customers can choose a service type, select a saved/manual address, provide contact details, and choose a preferred date/time.
- **SERVICE-02:** A booking stores requester ID, address, service type, preferred slot, notes, status, and timestamps.
- **SERVICE-03:** Customers can see their own service bookings and status.
- **SERVICE-04:** Admins can view and update service request status from the service desk.
- **SERVICE-05:** Booking states should include at least `requested`, `confirmed`, `in_progress`, `completed`, and `cancelled` where appropriate.

### 6.8 Notifications

- **NOTIF-01:** Implement the configured Android push-notification path and verify delivery on a real device or supported development build.
- **NOTIF-02:** Relevant events include order confirmation/status changes and service booking updates.
- **NOTIF-03:** Email notifications use a configured provider and clearly handle provider errors/quotas.
- **NOTIF-04:** SMS integration is attempted only when the provider/device/SIM and permissions are configured.
- **NOTIF-05:** Critical shopping actions must still succeed when an optional notification provider is unavailable.
- **NOTIF-06:** Keep API secrets and privileged notification credentials on trusted server-side infrastructure.

### 6.9 Admin Dashboard

- **ADMIN-01:** The admin dashboard is protected by a trusted admin role.
- **ADMIN-02:** The dashboard includes an overview of orders, dealer applications, and service requests.
- **ADMIN-03:** Admins can view order details and update permitted statuses.
- **ADMIN-04:** Admins can approve/reject dealers.
- **ADMIN-05:** Admins can review/update service bookings.
- **ADMIN-06:** Lists support useful loading/error/empty states and basic search/filtering.
- **ADMIN-07:** The deployed admin panel is live on Vercel and its URL is recorded in the README/submission notes.

## 7. Data Model Baseline

Use typed models and validate data at the boundary. Exact fields may evolve, but access patterns and authorization rules must remain explicit.

### `users/{uid}`
- `uid`, `displayName`, `email`, `phone` (optional), `role` (`customer`, `dealer`, `admin`), `dealerStatus` (optional: `pending`, `approved`, `rejected`), `addresses` or address references, `createdAt`, `updatedAt`.
- Role assignment and dealer approval must not be writable by the account owner.

### `products/{productId}`
- `name`, `slug`, `categoryId`, `description`, `customerPrice`, `dealerPrice` (optional), `imageUrl`, `gallery` (optional), `specifications`, `stockStatus`, `active`, `createdAt`, `updatedAt`.
- If the client can read this collection publicly, ensure no private/provider credentials are stored in product documents.

### `orders/{orderId}`
- `customerId` or `dealerId`, `orderType`, `items` (snapshot of product ID/name/image/price/quantity), `subtotal`, `total`, `shippingAddress`, `paymentProvider`, `paymentStatus`, `paymentReference` (non-secret), `orderStatus`, `createdAt`, `updatedAt`.
- Trusted logic must validate prices/role-specific rates and payment status.

### `serviceBookings/{bookingId}`
- `userId`, `serviceType`, `address`, `preferredDate`, `preferredTime`, `notes`, `status`, `createdAt`, `updatedAt`.

### `notifications/{notificationId}` (optional in-app history)
- `userId`, `type`, `title`, `body`, `readAt` (optional), `createdAt`, and non-sensitive related entity ID.

## 8. Non-Functional Requirements

- **Usability:** Primary actions are easy to locate; forms explain validation errors.
- **Accessibility:** Touch targets should be comfortably usable; do not rely on color alone for status; provide labels for icon-only controls.
- **Performance:** Use appropriately sized/compressed images, pagination or limited queries where useful, and avoid unnecessary Firestore listeners.
- **Reliability:** Handle offline/network errors and missing environment configuration gracefully.
- **Maintainability:** Feature-based modules, reusable components, typed data models, and documented setup steps.
- **Security:** Least-privilege rules, server-side checks for sensitive operations, no secrets in client bundles, and no self-assigned admin access.
- **Compatibility:** Verify the app on an Android device or emulator and verify the admin panel in a desktop browser.
- **Deployment:** Admin web app must work from the deployed Vercel URL, not only localhost.

## 9. Free-Tier and Cost Requirements

- Prefer Firebase Spark-compatible services and remain within currently available free quotas.
- Use Cloudinary or another approved free image host instead of assuming Firebase Storage is free.
- Use Razorpay **Test Mode** only; no real charge is part of this assignment.
- Choose a free-tier-compatible trusted endpoint for payment verification and privileged operations. Confirm provider limits and terms before depending on it.
- OpenStreetMap data does not imply unlimited free use of every public tile/geocoding server; follow the selected provider policy and attribution requirements.
- Email/SMS free allowances are limited. SMS may incur carrier charges depending on the SIM plan.
- Vercel Hobby is suitable only when the use complies with its current terms. Confirm this before deployment.
- Do not upgrade to a paid service, enable billing, or use a paid API without explicit approval.
- Document any feature that cannot be fully exercised without a credential, provider account, compatible device, or available free quota.

## 10. Evaluation Alignment and Acceptance Criteria

The mobile-app rubric is weighted toward the following areas:

| Rubric area | Weight | Acceptance evidence |
|---|---:|---|
| Customer/dealer/admin core functionality | 30 | Demonstrate separate customer and approved-dealer journeys plus admin management flows. |
| UI polish and relevant product imagery | 15 | Consistent design, no broken images, product photos match names, polished empty/loading/error states. |
| Code structure and architecture | 10 | Typed feature-based modules, reusable components, clear service/data layers, no giant monolithic screens. |
| Firebase Auth, Firestore, FCM | 8 | Auth works, data is persisted/restricted, and configured push delivery is demonstrated. |
| Razorpay checkout (test mode) | 5 | Test checkout has clear success/failure/cancel behavior and no exposed secret. |
| Maps/address integration | 4 | Working map/address experience or approved free map option plus reliable manual-entry fallback. |
| Email and SMS notifications | 3 | Configured test message(s) can be demonstrated; provider requirements/limits are documented. |

The original task separately requires the admin panel to be deployed live on Vercel. Treat this as a release blocker regardless of any rubric subtotal.

### Definition of Done

A feature is done only when:
1. Its UI and data behavior are implemented.
2. Relevant loading, empty, error, and success states exist.
3. Permissions are enforced in the data/backend layer, not just hidden in the UI.
4. The feature has been manually exercised or automated-tested as practical.
5. No fake success is shown when a provider operation fails.
6. Configuration requirements and known limitations are documented.

## 11. Delivery Plan

1. **Foundation:** inspect workspace, confirm mobile/admin apps run, implement shared visual direction and architecture.
2. **Catalog:** seed 50+ accurate products, image URLs, categories, search, product details.
3. **Authentication and roles:** customer, dealer approval state, admin access, Firestore rules.
4. **Shopping:** cart, price validation, checkout, test payment, orders and history.
5. **Dealer workflows:** wholesale prices, bulk ordering, history.
6. **Service and notifications:** service bookings, admin service desk, push, email, SMS configuration.
7. **Admin dashboard:** orders, dealer approvals, service management, live deployment.
8. **Verification:** security review, Android test, end-to-end smoke test, deployment check, README and submission evidence.

## 12. Open Configuration Items

Keep these as documented configuration tasks rather than inventing values:

- Firebase project configuration and authorized domains.
- Admin UID/role assignment process.
- Cloudinary cloud name and upload strategy/preset where needed.
- Razorpay test key ID and trusted server-side secret configuration.
- Free-tier trusted endpoint hosting configuration.
- FCM/Expo Android credentials and development-build setup.
- EmailJS service/template/public configuration.
- TextBee gateway, paired Android device, and SMS availability.
- Vercel project and deployment URL.

Never commit private values into source control.
