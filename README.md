# MenuMitra — All-in-One Restaurant Growth & Operations SaaS
## Complete Master Architecture & Project Documentation

> **Version:** 2.0.0 (Production Ready)  
> **Repository:** `MenuMitra`  
> **Last Updated:** November 2026

---

## 1. Executive Summary & Platform Overview

### 1.1 What is MenuMitra?
**MenuMitra** is a cloud-native, multi-tenant B2B SaaS platform engineered specifically for modern restaurants, cafes, food trucks, and cloud kitchens. It bridges the gap between **dine-in floor management**, **contactless QR ordering**, **gamified customer retention (Google Review Rewards)**, and **SaaS subscription monetization**.

### 1.2 Core Problems Solved
1. **Third-Party Commission Dependency:** Traditional delivery platforms charge 20% to 35% commission per order. MenuMitra empowers restaurants with their own direct QR ordering and public website with **0% commission**.
2. **Slow Table Turnover & Waiter Bottlenecks:** Customers can browse high-resolution digital menus, place orders directly from their table, and track live kitchen cooking progress in real time.
3. **Low Organic Google Reviews:** Restaurants struggle to get genuine Google Maps 5-star reviews. MenuMitra automates this through gamified **Scratch Cards and Discount Coupons** with rigorous anti-fraud image verification.
4. **Staff Chaos on Billing & Service:** Waiters have a dedicated mobile floor station (protected by dynamic PINs) where they can manage table orders, collect cash or instant UPI QR payments, and apply customer scratch-card discounts on the fly.
5. **Kitchen Communication Gaps:** Replaces lost handwritten paper orders with live interactive Kitchen Kanban boards and thermal KOT (Kitchen Order Ticket) printing.

---

## 2. Technology Stack & Architecture

MenuMitra utilizes a modern, serverless-ready full-stack architecture built on Next.js 14 App Router and Neon Cloud PostgreSQL.

```mermaid
flowchart TD
    subgraph Client ["Client Devices & Browsers"]
        C1["Customer Smartphone<br/>(/m/[slug], /reward, /order)"]
        W1["Waiter Mobile Phone<br/>(/waiter/[slug])"]
        O1["Restaurant Owner PC/Tablet<br/>(/dashboard/*)"]
        A1["Super Admin<br/>(/admin)"]
    end

    subgraph AppLayer ["Next.js 14 App Router & Route Handlers"]
        API_PUB["Public APIs<br/>(/api/public/*)"]
        API_ORD["Orders & Kitchen APIs<br/>(/api/orders/*)"]
        API_WTR["Waiter Station APIs<br/>(/api/waiter/*)"]
        API_REW["Reviews & Coupons APIs<br/>(/api/reviews/*, /api/coupons/*)"]
        API_ADM["Super Admin APIs<br/>(/api/admin/*)"]
        API_BIL["Billing & UTR APIs<br/>(/api/billing/*)"]
    end

    subgraph Security ["Security & Auth Middleware"]
        JWT["jose JWT Verification"]
        BCRYPT["bcryptjs Hashing"]
        PIN["Dynamic Waiter PIN Validation"]
        GATE["Feature Gate Layer (Package Rules)"]
        HASH["SHA-256 Image Duplicate Detection"]
    end

    subgraph Database ["Persistent Cloud Storage"]
        NEON[("Neon Cloud PostgreSQL<br/>(Prisma ORM 5.22.0)")]
        FS[("File Storage<br/>(/public/uploads/)")]
    end

    C1 --> API_PUB
    C1 --> API_ORD
    C1 --> API_REW
    W1 --> API_WTR
    O1 --> API_ORD
    O1 --> API_WTR
    O1 --> API_REW
    O1 --> API_BIL
    A1 --> API_ADM

    API_PUB & API_ORD & API_WTR & API_REW & API_ADM & API_BIL --> Security
    Security --> NEON
    Security --> FS
```

### 2.1 Technology Breakdown
* **Framework:** Next.js 14 (App Router, Server Components & Dynamic Route Handlers)
* **Language:** TypeScript 5 (Strict Type Checking with zero `any` leaks)
* **Styling & UI:** Tailwind CSS, Lucide React Icons, Canvas Confetti
* **Database & ORM:** PostgreSQL hosted on Neon Serverless Cloud, managed via Prisma ORM 5.22.0
* **Authentication & Authorization:** Stateless JWT via `jose`, password encryption via `bcryptjs`, and dynamic numeric PIN verification
* **QR Generation:** Node `qrcode` library rendering vector and PNG Data URLs
* **Validation:** Zod schemas for rigorous API payload validation
* **File Storage:** High-performance local / cloud upload handlers with multi-part parsing

---

## 3. Database Schema & Data Models

The database schema is defined in `prisma/schema.prisma` and consists of 15 core entities:

```mermaid
erDiagram
    Package ||--o{ Restaurant : "subscribes"
    Restaurant ||--o{ User : "employs"
    Restaurant ||--o{ MenuCategory : "categorizes"
    Restaurant ||--o{ MenuItem : "serves"
    Restaurant ||--o{ Table : "manages"
    Restaurant ||--o{ Order : "receives"
    Restaurant ||--o{ RewardRule : "configures"
    Restaurant ||--o{ ReviewSubmission : "reviews"
    Restaurant ||--o{ Coupon : "issues"
    Restaurant ||--o| WebsiteConfig : "hosts"
    Restaurant ||--o| ReviewSettings : "governs"
    Restaurant ||--o{ SubscriptionPayment : "pays"
    MenuCategory ||--o{ MenuItem : "contains"
    Order ||--o{ OrderItem : "contains"
    ReviewSubmission ||--o| Coupon : "unlocks"
    RewardRule ||--o{ Coupon : "defines"
```

### 3.1 Entity Breakdown

| Model | Primary Purpose | Key Fields |
| :--- | :--- | :--- |
| **`User`** | Platform accounts | `id`, `name`, `email`, `passwordHash`, `role` (`SUPER_ADMIN`, `OWNER`, `STAFF`), `restaurantId` |
| **`Package`** | Subscription tiers | `id`, `name` (`BASIC`, `STANDARD`, `PREMIUM`), `slug`, `price`, `features` (JSON string array), `active` |
| **`Restaurant`** | Tenant profile | `id`, `name`, `slug`, `logo`, `cover`, `phone`, `timings`, `waiterPin`, `waiterPinUpdatedAt`, `status`, `packageId` |
| **`MenuCategory`**| Menu groupings | `id`, `restaurantId`, `name`, `order`, `active` |
| **`MenuItem`** | Dishes and items | `id`, `restaurantId`, `categoryId`, `name`, `price`, `image`, `isVeg`, `isAvailable`, `tags` |
| **`Table`** | Physical dine-in tables | `id`, `restaurantId`, `number` |
| **`Order`** | Dine-in table orders | `id`, `restaurantId`, `tableNumber`, `customerName`, `phone`, `notes`, `subtotal`, `discount`, `couponCode`, `total`, `status`, `paymentMode`, `paymentStatus` |
| **`OrderItem`** | Ordered dish items | `id`, `orderId`, `menuItemId`, `name`, `price`, `quantity`, `notes` |
| **`WebsiteConfig`**| Restaurant public web | `id`, `restaurantId`, `template` (`MODERN`, `TRADITIONAL`, `MINIMAL`), `sections` (JSON), `published` |
| **`ReviewSettings`**| Review rules engine | `id`, `restaurantId`, `popupEnabled`, `popupDelaySeconds`, `autoApprove`, `cooldownDays`, `minBill`, `googleReviewLink` |
| **`RewardRule`** | Discount probabilities | `id`, `restaurantId`, `label`, `type` (`PERCENT`, `FLAT`, `FREE_ITEM`), `value`, `weight`, `expiryDays`, `active` |
| **`ReviewSubmission`**| Google review records | `id`, `restaurantId`, `name`, `phone`, `screenshotUrl`, `imageHash`, `status` (`PENDING`, `APPROVED`, `REJECTED`), `reason` |
| **`Coupon`** | Scratch card vouchers | `id`, `restaurantId`, `rewardRuleId`, `submissionId`, `code`, `status` (`ACTIVE`, `REDEEMED`, `EXPIRED`), `expiresAt`, `redeemedAt`, `billAmount`, `discountApplied` |
| **`SubscriptionPayment`**| Offline UPI UTR records| `id`, `restaurantId`, `packageId`, `amount`, `utrReference`, `status` (`PENDING`, `APPROVED`, `REJECTED`), `approvedAt` |
| **`Invoice`** | Official bills | `id`, `restaurantId`, `packageId`, `invoiceNumber`, `amount`, `tax`, `total`, `status` |

---

## 4. Platform Modules & Complete Functional Workflows

---

### Module 1: Customer Digital QR Menu & Table Ordering (`/m/[slug]`)
1. **Access via QR Scan:**  
   The customer scans the table QR code (e.g. `https://menumitra.com/m/rajwada-restorent?table=1`).
2. **Menu Discovery:**  
   * Search dishes with real-time fuzzy filtering.
   * Veg-only toggle for strict vegetarian diners.
   * Visual dish badges: Veg/Non-Veg icons, Bestseller tags, spicy level.
3. **Cart Drawer & Checkout:**  
   * **Touch-Friendly Drawer:** Pinned header (Table number, items count), momentum-scrollable body, and sticky bottom footer showing Grand Total and the **"Confirm & Place Order"** button.
   * **Guest Details:** Customer name, phone number, and special cooking notes (*"Less spicy, extra onions"*).
   * **Scratch Card Coupon Voucher Section:** Customer can enter an approved discount code (e.g. `RAJW-DBE23`). Validates minimum bill threshold (`minBill`), checks expiration, and applies instant discount.
   * **Payment Mode Selection:**
     1. 💳 **Pay at Counter:** Cash or Card after finishing meal.
     2. 📱 **Instant UPI QR:** Dynamically renders on-screen UPI QR code with direct link to launch Google Pay, PhonePe, Paytm, or BHIM.
     3. 💵 **Cash on Table:** Waiter collects cash directly at the table.
4. **Active Order Live Tracking Banner:**  
   If customer returns to the menu after ordering, a floating pulsating banner remains visible:  
   👉 `Active Order #XXXX • Kitchen: Currently Cooking • Track Live →`  
   Auto-polls every 8 seconds so the customer always knows their meal's status.

---

### Module 2: Kitchen Kanban & KOT Print Station (`/dashboard/orders`)
1. **Real-time Order Kanban:**  
   Grouped into 4 visual status columns:
   * **New Orders (Incoming):** Yellow/Amber card with sound chime.
   * **Cooking / In Progress:** Blue card with timer.
   * **Ready for Serving:** Green card indicating chef has completed preparation.
   * **Served / Archive:** Order completed.
2. **Printable Kitchen Order Ticket (KOT):**  
   1-click print output formatted for 58mm and 80mm thermal receipt printers:
   * Header: Table Number, Guest Name, Order ID, and Timestamp.
   * Items list with quantities and kitchen cooking notes.
   * Payment mode and applied coupon reward details.

---

### Module 3: Floor Operations & Waiter Station (`/dashboard/waiters` & `/waiter/[slug]`)

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Restaurant Owner (Dashboard)
    actor Waiter as Floor Waiter / Captain
    actor Customer as Dine-in Customer
    participant Server as MenuMitra Core API
    participant DB as Neon Database

    Owner->>Server: Open /dashboard/waiters
    Server->>DB: Fetch Active Waiter PIN (e.g. 4892)
    Server-->>Owner: Display Station QR & PIN 4892

    Waiter->>Owner: Scan Station QR on phone camera
    Waiter->>Server: Navigate to /waiter/rajwada-restorent
    Server-->>Waiter: Display Touch Keypad PIN Unlock Screen
    Waiter->>Server: Enter PIN 4892
    Server->>DB: Validate PIN against restaurant.waiterPin
    Server-->>Waiter: Issue 24h JWT Token (Restricted Floor Access)

    Customer->>Server: Place Table 3 Order (Subtotal: ₹500, Payment: PENDING)
    Server-->>Waiter: Live Orders auto-sync (Table 3 appears)

    Note over Waiter: Attempt to serve before payment
    Waiter->>Server: Click "Mark as Served"
    Server-->>Waiter: 400 ERROR: "Payment required before serving!"

    Customer->>Waiter: Show Google Review Scratch Card (RAJW-DBE23)
    Waiter->>Server: Click "Apply Coupon" -> Enter RAJW-DBE23
    Server->>DB: Validate & Redeem Coupon atomically
    Server-->>Waiter: Discount ₹75 Applied! New Total: ₹425

    Customer->>Waiter: Pay ₹425 Cash on Table
    Waiter->>Server: Click "Collect Cash (₹425)"
    Server->>DB: Update order.paymentStatus = 'PAID'
    Server-->>Waiter: Status turns PAID ✓ (Serve Button Unlocks Green)

    Waiter->>Server: Click "Payment Done ✓ Mark as Served"
    Server->>DB: Update order.status = 'COMPLETED'
    Server-->>Waiter: Confetti! Order completed successfully.
```

#### Key Capabilities of the Waiter Station:
1. **Dynamic Shift Security PIN:**  
   * In the owner's dashboard (`/dashboard/waiters`), the owner sees the current 4-digit PIN.
   * Owner can click **"Regenerate PIN 🔄"** at any time. When rotated, all previously authenticated waiter sessions are immediately revoked.
2. **Zero Access to Restaurant Financials:**  
   Waiters can only view table orders and floor operations. They cannot access revenue charts, settings, invoices, or billing.
3. **Payment-Gated Food Serving Rule:**  
   An order **cannot** be marked as "Served" or "Completed" while payment is `PENDING`. Waiters must record cash collection or verify UPI payment before food delivery is marked complete.
4. **Table-Side Scratch Card Coupon Application:**  
   Waiters can enter or scan a customer's review reward code at table-side. The bill is instantly updated and recalculated.

---

### Module 4: Google Review Rewards & Scratch Card Engine (`/reward/[slug]`)

```mermaid
flowchart TD
    A["Customer Visits /reward/[slug]"] --> B["Step 1: Open Google Maps & Post 5-Star Review"]
    B --> C["Step 2: Take Screenshot & Upload on MenuMitra"]
    C --> D["Server Computes SHA-256 Image Hash & Checks Cooldown"]
    D -- "Duplicate Screenshot Detected" --> D_ERR["400 Error: Screenshot Already Used!"]
    D -- "Phone in 30-Day Cooldown" --> C_ERR["400 Error: Phone Already Rewarded!"]
    D -- "Valid Submission" --> E["Saved as PENDING in Owner Review Queue"]
    
    E --> F["Customer Screen Polls /api/reviews/submissions/[id] Every 3s"]
    
    subgraph OwnerAction ["Owner Action in /dashboard/reviews"]
        E --> G["Owner Inspects Screenshot in Full-Size"]
        G -- "Invalid / Fake Screenshot" --> H["Click 'Reject Submission'<br/>Provide Rejection Reason"]
        G -- "Valid 5-Star Google Review" --> I["Click 'Approve & Issue Reward'"]
    end
    
    H --> J["Customer Receives Rejection Reason<br/>Prompted to Upload Valid Screenshot"]
    I --> K["Server Generates Unique Coupon (e.g. RAJW-D2B3)<br/>Status Changes to APPROVED"]
    K --> L["Customer Polling Detects Approval!"]
    L --> M["Interactive Canvas Scratch Card Revealed!"]
    M --> N["Customer Scratches Silver Layer<br/>Unlocks Secret Discount Code"]
    N --> O["Used in Online Cart or Offline via Waiter Station"]
```

---

### Module 5: Customer Coupon Pass Page (`/coupon/[code]`)
* Accessible via URL or after scratching a card.
* Displays restaurant branding, discount title, active badge, and expiry date.
* **Auto-Generated High-Resolution QR Code:** Generated via `QRCode.toDataURL` for 100% reliable rendering.
* **Staff Phone Camera Scan & Direct Confirmation:**
  * When a waiter or cashier scans the QR code with their mobile camera, it opens `/coupon/[code]`.
  * If the staff member is logged in, an interactive **Staff POS Confirmation Panel** opens directly on the phone.
  * Staff enters the customer's food bill amount (e.g. ₹500).
  * The system computes the discount (e.g. 15% = -₹75), final payable amount (₹425), and allows 1-tap confirmation.
  * Triggers celebratory confetti and marks the coupon as `REDEEMED`, permanently preventing duplicate usage.

---

### Module 6: SaaS Packages & Subscription Management (`/dashboard/billing` & `/admin`)
1. **Tiered Feature Gating:**
   * **BASIC (₹499/mo):** Digital QR Menu, Menu Manager, Table QR generation.
   * **STANDARD (₹1,499/mo):** Basic features + Website Builder + Kitchen Kanban & KOT Printing + Waiter Station.
   * **PREMIUM (₹2,999/mo):** Standard features + Google Review Scratch Card Rewards Engine + Analytics + Multi-Staff.
2. **Offline Zero-Gateway UPI Payments:**
   * Subscriptions can be paid directly through UPI (no payment gateway transaction fees).
   * Restaurant owner scans the platform UPI QR and inputs their 12-digit UPI Reference / UTR Number.
   * Super Admin approves or rejects the payment in `/admin`. Upon approval, package features unlock automatically.

---

## 5. Security & Anti-Fraud Architecture

1. **Anti-Fraud Duplicate Image Protection:**  
   Every uploaded screenshot is hashed using SHA-256 (`computeFileHash(buffer)`). If a customer tries to submit the same screenshot twice or shares it with friends, the system detects the identical hash and rejects the upload.
2. **30-Day Customer Phone Cooldown:**  
   Ensures that a single phone number cannot repeatedly claim review discounts within the restaurant's configured cooldown window (default: 30 days).
3. **Mandatory Manual Screenshot Approval:**  
   Auto-approval is disabled by default (`autoApprove: false`). Restaurant owners must visually inspect uploaded Google reviews before a discount coupon is minted.
4. **Server-Side Pricing & Cart Verification:**  
   Item prices sent from the client are never trusted. The order creation route (`/api/orders`) fetches active item prices directly from the database to compute the final bill, subtotal, and tax.
5. **Atomic Database Transactions:**  
   Coupon redemptions and order updates execute within Prisma transactions (`prisma.$transaction`). This prevents race conditions where a customer might attempt to use the same coupon code across two simultaneous orders.
6. **Strict Role-Based Access Control (RBAC):**  
   * `SUPER_ADMIN`: Global platform control, revenue metrics, plan overrides, and account impersonation.
   * `OWNER`: Full restaurant configuration, staff management, financials, and menu editing.
   * `STAFF / WAITER`: Strictly confined to floor operations, table orders, and coupon redemption. No access to financial overview or restaurant settings.

---

## 6. Complete API Route Catalog

### 6.1 Public APIs
* `GET /api/public/menu/[slug]` — Fetch restaurant public menu, categories, items, and review popup settings.
* `GET /api/public/coupon/[code]` — Verify customer coupon code, check expiry, validate restaurant ownership, and calculate bill discounts.
* `GET /api/public/website/[slug]` — Fetch published website configurations, templates, and branding.
* `GET /api/public/packages` — List available SaaS subscription tiers and features.

### 6.2 Order & Kitchen APIs
* `POST /api/orders` — Customer places a table order with items, cooking notes, payment mode, and optional coupon code.
* `GET /api/orders` — Owner/Kitchen fetches orders list, filterable by status (`NEW`, `PREPARING`, `READY`, `COMPLETED`).
* `PUT /api/orders` — Update order cooking status or payment status. Strictly blocks `COMPLETED` if payment is not `PAID`.
* `GET /api/orders/[id]` — Real-time tracking endpoint for customer live order status page.

### 6.3 Waiter & Captain Station APIs
* `POST /api/waiter/auth` — Authenticate waiter with restaurant slug and 4-digit security PIN. Returns 24h JWT.
* `GET /api/waiter/orders` — Fetch active floor orders and table lists for authenticated waiter.
* `POST /api/waiter/action` — Execute floor actions:
  * `action: "SERVE"` — Mark order served (enforces `paymentStatus === "PAID"`).
  * `action: "PAYMENT"` — Record cash collection or verify UPI QR payment.
  * `action: "APPLY_COUPON"` — Apply customer review coupon and deduct discount from bill.
* `GET /api/waiter/pin` — Owner retrieves active 4-digit waiter PIN.
* `POST /api/waiter/pin` — Owner regenerates a new random 4-digit PIN (invalidates old waiter sessions).

### 6.4 Reviews & Rewards APIs
* `POST /api/reviews/submissions` — Customer submits Google review screenshot for verification.
* `GET /api/reviews/submissions` — Owner fetches pending review submissions list.
* `GET /api/reviews/submissions/[id]` — Customer polls approval status of their submitted review.
* `PUT /api/reviews/submissions/[id]` — Owner approves or rejects review screenshot.
* `POST /api/coupons/redeem` — POS redemption endpoint for manual coupon validation and bill deduction.
* `GET /api/reviews/rules` & `POST /api/reviews/rules` — Manage reward probability rules.
* `GET /api/reviews/settings` & `PUT /api/reviews/settings` — Update review cooldown, min bill, and Google review link.

### 6.5 Billing & SaaS Management APIs
* `POST /api/billing/payment-request` — Submit subscription renewal or upgrade with 12-digit UPI UTR.
* `POST /api/billing/validate-promo` — Validate SaaS promo discount voucher for restaurant onboarding.
* `GET /api/admin/payments` — Super Admin views pending subscription payments.
* `POST /api/admin/payments/action` — Super Admin approves or rejects restaurant subscription UTR.

---

## 7. Installation, Setup & Deployment Guide

### 7.1 Local Environment Setup
1. **Clone the repository:**
   ```bash
   git clone https://github.com/Mr-Farooqi/MenuMitra.git
   cd MenuMitra
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Configure Environment Variables (`.env`):**
   ```env
   # Database connection (Neon PostgreSQL)
   DATABASE_URL="postgresql://user:password@ep-host.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
   DIRECT_URL="postgresql://user:password@ep-host.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

   # Security & Authentication
   JWT_SECRET="your-ultra-secure-random-jwt-secret-string-at-least-32-chars"

   # Node Environment
   NODE_ENV="development"
   ```
4. **Synchronize Database Schema:**
   ```bash
   npx prisma db push
   ```
5. **Start Local Development Server:**
   ```bash
   npm run dev
   ```
   * Platform runs at: `http://localhost:3000`
   * Super Admin Portal: `http://localhost:3000/admin`
   * Owner Dashboard: `http://localhost:3000/dashboard`

### 7.2 Production Build & Verification
Always verify clean builds prior to pushing to production:
```bash
# 1. Type Check
npx tsc --noEmit

# 2. Production Build
npm run build
```

---

## 8. Summary of Key User Roles & Paths

| Role | Primary Entry URL | Key Responsibilities | Access Restrictions |
| :--- | :--- | :--- | :--- |
| **Dine-in Customer** | `/m/[slug]?table=X` | Browse menu, order food, choose payment option, track live cooking, submit Google review, scratch reward card. | No access to kitchen, waiter tools, or owner dashboard. |
| **Floor Waiter / Captain** | `/waiter/[slug]` | Unlock via 4-digit PIN, view table orders, collect cash, show UPI QR, apply coupons, mark orders as served. | Strictly restricted to floor operations. Cannot view revenue, settings, or bills. |
| **Restaurant Owner** | `/dashboard` | Manage menu, tables, QR codes, KOT kanban, review approval queue, waiter station PINs, public website, staff logins. | Restricted to their own restaurant data. |
| **Super Admin** | `/admin` | Manage all registered restaurants, approve subscription UTRs, manage pricing packages, audit logs, impersonate accounts. | Full system-wide access. |

---

*MenuMitra — Empowering Restaurants with Smarter Menus, Loyal Customers, and Zero-Commission Growth.*
