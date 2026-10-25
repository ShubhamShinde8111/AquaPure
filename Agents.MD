# Agent Instructions — WaterPurifierCommerce

These instructions govern AI coding agents and developers working in this repository. Read `PRD.md` and `Design.md` before making implementation changes.

## 1. Mission

Build AquaPure, a polished water-purifier e-commerce demo with:

- `mobile/`: React Native + Expo + TypeScript Android app for customers and dealers.
- `admin/`: React + Vite + TypeScript web admin panel, deployed to Vercel.
- Firebase Authentication and Cloud Firestore for identity/data, with a configured Firebase Cloud Messaging-compatible push path.
- Free-tier-conscious integrations for images, Razorpay Test Mode, maps, email, and SMS.

The supplied PRD is the source of truth for scope. `Design.md` is the source of truth for visual decisions. If instructions conflict, preserve security and existing working behavior, then explain the conflict before changing scope.

## 2. Operating Principles

1. **Inspect before editing.** Review the directory tree, package manifests, current navigation, scripts, existing components, and environment files before changing code.
2. **Preserve working code.** Do not scaffold over an existing app, delete files, replace configurations, or perform destructive migrations without a clear reason and explicit user approval.
3. **Work in small phases.** Finish and verify a coherent vertical slice before starting the next major feature.
4. **No fake completion.** Never claim that a feature, test, notification, payment, build, or deployment succeeded unless you actually verified it.
5. **No silent paid services.** Do not activate billing or introduce a paid dependency/service without explicit approval. Document free-tier quotas and provider constraints.
6. **Security is not UI-only.** Hiding a button or route does not enforce authorization. Use Firestore Security Rules and trusted server-side validation for sensitive operations.
7. **Keep the design consistent.** Use tokens from `Design.md`; avoid introducing unrelated colors, typography, or component styles.
8. **Explain decisions.** For material architectural or dependency choices, state the reason and relevant trade-offs.

## 3. Required Reading and Planning

Before each phase:

- Read the relevant portions of `PRD.md` and `Design.md`.
- Inspect the existing implementation and commands in `package.json`.
- Identify dependencies, environment variables, platform requirements, and risks.
- Provide a concise implementation plan and list files expected to change.
- Do not ask for details already defined in the documents. For missing credentials, create placeholders and explain what the user must configure.

## 4. Repository and Architecture Expectations

Adapt to the actual workspace; do not force this layout if a working equivalent already exists.

```text
WaterPurifierCommerce/
├── PRD.md
├── Agents.MD
├── Design.md
├── README.md
├── .gitignore
├── mobile/
│   ├── app/ or src/                 # Existing Expo routing convention
│   ├── src/components/              # Shared mobile UI components, if using src layout
│   ├── src/features/                # auth, catalog, cart, checkout, orders, dealer, service
│   ├── src/services/                # Firebase, payments, notifications, maps integrations
│   ├── src/theme/                   # Color, spacing, typography, component tokens
│   ├── src/types/                   # Domain types
│   ├── assets/                      # Local assets and fallbacks
│   └── .env.example
└── admin/
    ├── src/components/
    ├── src/features/                # dashboard, orders, dealers, service desk
    ├── src/services/                # Firebase/data-access code
    ├── src/theme/                   # CSS variables and design tokens
    ├── src/types/
    └── .env.example
```

### Architecture rules

- Use TypeScript for both applications and avoid `any`. When an external type is unavailable, define a narrow safe type or explain the limitation.
- Separate UI, domain logic, data access, and provider integration. Screens should not contain all Firestore, pricing, and payment logic inline.
- Use typed models for products, users, dealers, orders, addresses, service bookings, and notification records.
- Create reusable buttons, text fields, cards, status badges, loaders, error states, and empty states.
- Keep mobile and admin interfaces separate. Do not assume React Native components can be reused directly in the web application.
- Do not introduce a monorepo/shared package unless the existing project already uses one or there is a clear benefit that outweighs added setup complexity.
- Reuse existing dependencies and patterns where reasonable. Add a dependency only when it solves a clear requirement.
- Keep product seed data centralized and maintainable. Do not copy product objects into multiple screens.

## 5. Code Style

- Use descriptive names and small, single-purpose components/functions.
- Prefer `const`; handle nullable values explicitly.
- Validate external data and form input at boundaries.
- Keep formatting and lint configuration consistent with the current project.
- Avoid giant files, deeply nested conditional rendering, duplicated business logic, and untyped Firestore snapshots.
- Use accessible labels for icon-only buttons and sensible keyboard/focus behavior in the admin web app.
- Do not hardcode colors in screen components; reference the token system in `Design.md`.
- Do not display real-looking sample order/payment statuses as verified unless backed by data or explicitly labelled demo state.
- Use mock data only when clearly marked; make transition to the real data source deliberate.

## 6. Security Requirements — Mandatory

### Authentication and roles

- Firebase Authentication proves identity; it does not, by itself, prove that a user is a dealer or administrator.
- Do not allow client code to write its own privileged `role`, `dealerStatus`, or admin flags.
- Assign administrator privileges through trusted setup/administrative tooling. Document the approved setup process.
- Pending/rejected dealers must be blocked from dealer-only order operations.
- Protect Firestore documents using least-privilege Security Rules and test rules for unauthorized access.

### Data isolation

- Customers may access only their own private profile, orders, addresses, and service requests, subject to documented admin permissions.
- Dealers may access only their own dealer orders and authorized wholesale data.
- Admin-only reads/writes must be enforced by rules and/or trusted server-side handlers.
- Never rely only on client navigation, hidden controls, local storage, or a `role` value supplied by the client.

### Payments

- Razorpay is **test mode only** for this assignment.
- Never put a Razorpay secret key, Firebase Admin credential, service-account key, or other privileged secret in mobile code, Vite environment variables exposed to the client, committed files, logs, or screenshots.
- Use a trusted backend endpoint to create payment orders and verify signatures/results before marking an order paid.
- The client may display a payment result but must not be the authority for payment verification.
- If a trusted free-tier-compatible backend is not configured, label the flow as a simulation and state that verification is incomplete; do not claim secure integration.

### Secrets and environment configuration

- Commit `.env.example` files with placeholder names only, never actual secrets.
- Ensure real `.env` files and private credential files are ignored by Git.
- Do not print environment values to logs or expose them in UI/error reports.
- Treat client-visible Firebase configuration as public project configuration, not as an authorization mechanism; rules remain mandatory.

## 7. Free-Tier Guardrails

- Prefer Firebase Spark-compatible usage, Cloudinary or another approved free image host, Razorpay Test Mode, a compliant free-tier endpoint, and free map alternatives.
- Do not assume Firebase Storage, serverless functions, geocoding, SMS, or email are unlimited or free for all use cases.
- Check current provider requirements before implementing a feature that depends on billing or an account tier.
- Respect OSM tile and geocoding policies, including attribution and rate limits.
- Email/SMS provider failures must not silently corrupt orders or service bookings.
- SMS may cause SIM/carrier charges. Do not send bulk test messages.
- Vercel Hobby eligibility and use restrictions must be checked before deployment.
- Ask before enabling billing or choosing a service with a likely charge.

## 8. Product Data and Imagery

- The seeded catalog must contain at least 50 distinct, plausibly named products across the required categories.
- Every product's image must reasonably match its name and product type.
- Use stable hosted image URLs and correct dimensions/aspect ratios; avoid hotlinking unreliable pages or using search-result thumbnails as production assets.
- Provide a graceful placeholder when an image fails to load.
- Do not use one unrelated image for many products merely to hit the count requirement.
- Do not invent product certification, filtration performance, warranty, health, or safety claims. Label illustrative product specifications/prices as sample/demo data unless verified.

## 9. Implementation Sequence

Follow the phases below unless the user explicitly reprioritizes:

1. **Workspace foundation:** inspect and run existing projects; document actual commands and environment requirements.
2. **Design system:** implement `Design.md` tokens, shared components, home-screen structure, product card, and admin shell.
3. **Catalog:** typed seed data for 50+ products, accurate imagery, categories, search, filters, product detail.
4. **Identity and rules:** authentication, customer/dealer access, dealer approval lifecycle, admin role setup, Firestore Security Rules.
5. **Shopping:** cart, quantity handling, pricing validation, addresses, checkout, test payments, orders/history.
6. **Dealer:** wholesale price display, bulk order submission, dealer history.
7. **Service:** booking creation/history and admin service desk.
8. **Notifications/maps:** FCM-compatible Android push, EmailJS, TextBee if configured, map/address support.
9. **Admin release:** order and dealer operations, responsive polish, Vercel deployment.
10. **QA and handoff:** smoke tests, rules review, docs, screenshots/evidence if requested.

Do not build all phases in a single enormous change. Review the output after each phase.

## 10. Verification Before Declaring a Phase Complete

- Run scripts that exist in each app's `package.json` (lint, typecheck, test, build where configured).
- If scripts are missing, report that fact rather than inventing a passing result.
- Launch Expo and verify the changed mobile screens on an available device/emulator or clearly state what could not be tested.
- Run the admin production build and verify key flows locally before deployment.
- Check invalid input, no-network/provider failure, empty records, unauthorized roles, and successful flows.
- Inspect Firestore rules and test cross-user access scenarios for private data.
- Verify that secrets are not included in client bundles or Git changes.
- Confirm the deployed Vercel URL directly before reporting deployment success.
- Fix errors introduced by the current change before moving on.

### Minimum smoke-test flows

1. Customer signs in and views the catalog.
2. Customer adds a product to cart and sees a correct total.
3. Customer performs a test/simulated checkout and sees the correct order state.
4. Customer can see their own order; another customer cannot access it.
5. Pending dealer is blocked; approved dealer can see wholesale pricing and submit a bulk order.
6. Admin approves/rejects a dealer and manages an order.
7. Customer submits a service booking and admin updates its status.
8. At least one supported push/email/SMS test is demonstrated when credentials and devices are available; otherwise the missing setup is clearly documented.
9. Product images load and match product names.
10. The admin panel builds and is available at the configured Vercel URL.

## 11. Agent Response Format

At the end of each work phase, report:

- **Completed:** what was actually implemented.
- **Files changed:** concise list of important files.
- **Verification:** exact commands run and their outcomes.
- **Configuration needed:** missing Firebase/provider/env values, if any.
- **Limitations/risks:** incomplete integrations, tier constraints, or untested platform behavior.
- **Next phase:** the next small, logical task; do not start it until the current phase is reviewable.

Be direct and factual. Never state “everything works” based only on code generation.
