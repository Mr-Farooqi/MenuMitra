# 🍽️ MenuMitra (मेनू मित्र)

> **The Smart Multi-Tenant Restaurant Growth Operating System.**
> Built with Next.js 14 (App Router), TypeScript, Tailwind CSS, Prisma ORM, and JWT authentication.

MenuMitra enables restaurant owners to digitize their dining experience, manage table QR codes, host a custom branded mini-site, receive real-time table orders on an interactive kitchen Kanban board, and turn happy diners into **5-star Google Reviews** through gamified scratch cards and atomic POS discount coupons.

---

## ⚡ Quick Start

### 1. Prerequisites
- **Node.js** 18.17+ or 20+
- **npm** or **pnpm**

### 2. Installation & Setup
```bash
# Clone or navigate to the project directory
cd "saas project"

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env

# Generate Prisma Client & push schema to SQLite DB
npm run prisma:push

# Seed the database with demo data (Admin, Demo Restaurant, 16 dishes, 8 tables, rules, coupons)
npm run db:seed

# Start development server
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🔑 Pre-Seeded Demo Credentials

| Role | Email | Password | Access / Capabilities |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@menumitra.com` | `Admin@123` | Root `/admin` portal: 7 enterprise control centers including MRR analytics, 1-Click Impersonation, Manual GST Invoicing, Promo Codes, Announcements, and Audit Logs |
| **Restaurant Owner** | *Registered Owner* | *Configured on Register* | Full `/dashboard`: Menu manager, QR Studio, Kitchen Kanban, Review Rewards, and Billing |
| **Customer** | *No login needed* | *N/A* | Public QR menu: `/m/[slug]?table=3`<br>Website: `/r/[slug]`<br>Review Reward: `/reward/[slug]` |

---

## 🏗️ Architecture & Tech Stack

- **Framework:** Next.js 14+ (App Router) + TypeScript
- **Styling & UI:** Tailwind CSS, Lucide React icons, Canvas Confetti, HTML5 Canvas scratch interaction
- **Database & ORM:** Prisma ORM + SQLite (100% PostgreSQL schema compatible)
- **Authentication:** Stateless JWT stored in `httpOnly`, `SameSite=Lax` cookies via `jose` and `bcryptjs`
- **Form & Payload Validation:** Zod schema enforcement on all API route handlers
- **Testing:** Vitest automated test suite covering feature gating, weighted odds distribution, duplicate screenshot detection, and atomic POS redemption

---

## 📦 Packages & Feature Gating Matrix

Feature gating is enforced **both client-side** (locked sidebar items with lock badges and upgrade modals) and **server-side** (`requireFeature()` helper returning `403 Forbidden` if forbidden):

| Feature Key | Capability | Basic (₹499/mo) | Standard (₹1,499/mo) | Premium (₹2,999/mo) |
| :--- | :--- | :---: | :---: | :---: |
| `menu` | Food categories & items management | ✅ | ✅ | ✅ |
| `qr` | Table & Menu QR Studio + Table tents | ✅ | ✅ | ✅ |
| `website` | Branded mini-site builder (3 templates) | 🔒 Locked | ✅ | ✅ |
| `orders` | Table ordering & Kitchen Kanban KOT | 🔒 Locked | ✅ | ✅ |
| `reviewReward` | Google Review Scratch Cards & POS Coupons | 🔒 Locked | 🔒 Locked | ✅ |

---

## ⚡ Enterprise Super Admin Portal Capabilities (`/admin`)

The Super Admin portal is equipped with 7 mission-critical operations centers:

1. **Regional Footprint & Financial Analytics:**
   - Real-time MRR, Gross Merchandise Value (GMV), total orders, scans, and active restaurants.
   - City-wise regional penetration breakdown showing top geographic clusters (Mumbai, Pune, Delhi, Bangalore, etc.).
2. **1-Click Restaurant Impersonation ("Login as Owner"):**
   - Seamlessly inspect and troubleshoot any restaurant's live dashboard without requesting their password.
   - Distinctive amber impersonation banner in dashboard header with a persistent **"Exit Impersonation ↗"** button that restores the Super Admin session instantly.
3. **Broadcast System Announcements:**
   - Publish targeted banners across all restaurant dashboards or specific subscription tiers (`BASIC`, `STANDARD`, `PREMIUM`).
   - Supports `INFO`, `PROMO`, and `WARNING` styling with expiry dates and session dismiss.
4. **SaaS Promo Codes Engine:**
   - Create marketing and festive discount codes (e.g. `FESTIVE50`) with percentage or flat rupee discounts, usage caps, and expiration limits.
   - Real-time verification and automatic deduction on the Billing checkout page (`/dashboard/billing`).
5. **Manual Subscription Activation & GST Invoicing:**
   - Register offline bank transfers, cash payments, and UPI settlements for annual enterprise deals directly from the admin dashboard.
   - Automatically issues official GST-compliant Invoice records with custom transaction references.
6. **Security & Immutable Audit Trail:**
   - Records every sensitive admin action (`IMPERSONATION_STARTED`, `IMPERSONATION_ENDED`, `MANUAL_PAYMENT_ACTIVATED`, `PROMO_CODE_CREATED`, `ANNOUNCEMENT_CREATED`, `RESTAURANT_STATUS_CHANGED`, `PACKAGE_UPDATED`).
   - Captures actor email, target entity, timestamp, and IP addresses.
7. **Support Desk & Live Plan Entitlements Editor:**
   - Reply to and resolve restaurant owner help tickets.
   - Live modify monthly subscription pricing and feature permissions across all plans.

---

## 🎁 Gamified Google Review Reward Flow

1. **Dining Experience:** A customer scans the table QR (`/m/[slug]?table=X`) or visits `/reward/[slug]`.
2. **Review Prompt:** After a configurable delay (default: 6s), a non-intrusive popup appears: *"Enjoyed your meal? Share your feedback on Google and win a scratch card reward 🎁"*.
3. **Google Review Action:** The customer taps "Review on Google", opening the restaurant's direct Google Maps review page in a new tab.
4. **Screenshot Upload:** The customer takes a screenshot of their posted review and uploads it at `/reward/[slug]`.
5. **Anti-Abuse Verification (Backend):**
   - **Phone Cooldown:** Enforces 1 reward per mobile number per configurable period (default: 30 days).
   - **Duplicate Image Hash:** Generates a SHA-256 binary hash of the uploaded image; rejects identical screenshots.
   - **Instant or Manual:** If `autoApprove` is enabled, approves instantly. Otherwise, holds in owner review queue with real-time polling.
6. **Weighted Random Selection:** The backend independently selects an outcome from the active `RewardRules` using weighted odds.
7. **Scratch Card Experience:** HTML5 Canvas interactive scratch card reveals the reward with confetti and issues a unique coupon code (e.g. `MITRA-8A4F`).
8. **Digital Pass (`/coupon/[code]`):** Displays reward details, terms, expiry countdown, and a scannable QR code.
9. **Atomic Staff POS Redemption:** Staff enter the coupon code and table bill at `/dashboard/reviews` (POS Tab). The system validates minimum bill, computes the discount, and atomically marks the coupon `REDEEMED` to prevent double-spending.

---

## 📁 Project Structure

```
├── app/
│   ├── (auth)/
│   │   ├── login/               # Owner & Admin login
│   │   ├── register/            # 3-step restaurant onboarding wizard
│   │   └── forgot-password/     # Password reset token flow
│   ├── admin/                   # Super Admin portal (MRR, restaurants, packages, support)
│   ├── api/
│   │   ├── admin/               # Super Admin endpoints
│   │   ├── auth/                # Login, demo-login, register, logout, me
│   │   ├── billing/             # Subscription plan upgrade & invoice history
│   │   ├── coupons/             # Coupon lookup & atomic POS redemption
│   │   ├── menu/                # Category & Item CRUD, drag reordering
│   │   ├── orders/              # Order lifecycle & Kitchen Kanban updates
│   │   ├── public/              # Unauthenticated customer APIs
│   │   ├── qr/                  # Table QR generation & metadata
│   │   ├── reviews/             # Settings, rules, and screenshot submissions
│   │   ├── scans/               # QR scan telemetry logging
│   │   ├── settings/            # Restaurant profile, staff, and password
│   │   ├── upload/              # File upload handler with 5MB validation
│   │   └── website/             # Website builder config
│   ├── coupon/[code]/           # Public customer mobile pass
│   ├── dashboard/
│   │   ├── page.tsx             # Owner dashboard home (scans, revenue, orders)
│   │   ├── billing/             # Plans and invoice history
│   │   ├── menu/                # Menu catalog manager
│   │   ├── orders/              # Live Kitchen Kanban KOT board
│   │   ├── qr/                  # QR Code Studio & printable table tents
│   │   ├── reviews/             # Review submissions, POS counter, reward pool
│   │   ├── settings/            # Restaurant info, staff accounts, security
│   │   └── website/             # Website builder with live preview
│   ├── m/[slug]/                # Public mobile-first digital restaurant menu
│   ├── order/[id]/              # Customer real-time order status tracking
│   ├── r/[slug]/                # Public restaurant website
│   ├── reward/[slug]/           # Customer Google Review upload & scratch card
│   ├── page.tsx                 # SaaS Landing Page
│   └── layout.tsx               # Root layout & font loading
├── components/
│   ├── dashboard/               # Sidebar, header, overview charts
│   ├── reward/                  # Canvas Scratch Card component
│   └── ui/                      # Button, modal, feature-gate, upgrade-modal
├── lib/
│   ├── auth.ts                  # JWT token sign & verify, cookie management
│   ├── feature-gate.ts          # Central feature gating & requireFeature() helper
│   ├── hash.ts                  # SHA-256 duplicate image detection
│   ├── payments.ts              # Mock subscription payment gateway
│   ├── prisma.ts                # Prisma singleton instance
│   ├── rewards.ts               # Weighted random selector & coupon code generator
│   ├── storage.ts               # Local file storage abstraction (swappable with S3)
│   └── utils.ts                 # Formatting & class merging helpers
├── prisma/
│   ├── schema.prisma            # 16 database models
│   └── seed.ts                  # Realistic Indian restaurant seed script
├── tests/
│   ├── coupon-redeem.test.ts    # Discount calculations & duplicate block tests
│   ├── duplicate-image.test.ts  # SHA-256 hash collision detection tests
│   ├── feature-gate.test.ts     # Package permission & gating tests
│   └── rewards.test.ts          # Weighted odds distribution tests
└── public/uploads/              # Stored restaurant assets & proof screenshots
```

---

## 🧪 Automated Testing

Run the Vitest test suite:
```bash
npm test
```

### Test Coverage Highlights:
- **`tests/feature-gate.test.ts`**: Verifies exact feature permissions across Basic, Standard, and Premium tiers.
- **`tests/rewards.test.ts`**: Verifies weighted odds probability distribution across 1,000 iterations and ensures coupon codes avoid ambiguous characters (`0`, `O`, `1`, `I`).
- **`tests/duplicate-image.test.ts`**: Confirms identical binary screenshots generate matching SHA-256 hashes for fraud prevention.
- **`tests/coupon-redeem.test.ts`**: Confirms percentage/flat discount calculations, minimum bill barriers, and atomic prevention of duplicate redemptions.

---

## 🛡️ API Reference Summary

### Authentication
- `POST /api/auth/login`: Email & password sign-in (sets httpOnly cookie).
- `POST /api/auth/demo-login`: 1-click login as Demo Restaurant Owner.
- `POST /api/auth/register`: 3-step restaurant registration & onboarding.
- `POST /api/auth/logout`: Clears session cookie.
- `GET  /api/auth/me`: Fetches authenticated user & restaurant session details.

### Menu Management
- `GET  /api/menu/categories`: List categories for logged in restaurant.
- `POST /api/menu/categories`: Create category.
- `GET  /api/menu/items`: List menu items with veg, availability, and tags.
- `POST /api/menu/items`: Create menu item with image.
- `PATCH /api/menu/items`: Bulk toggle availability.
- `PUT  /api/menu/reorder`: Reorder category display sequence.

### Kitchen Orders & KOT
- `GET  /api/orders`: List orders (with status filter).
- `POST /api/orders`: Place new order from table (public customer).
- `PUT  /api/orders`: Update order status (`NEW` &rarr; `PREPARING` &rarr; `READY` &rarr; `COMPLETED` / `CANCELLED`).
- `GET  /api/orders/[id]`: Live polling status tracking for diners.

### Reviews & Rewards
- `GET  /api/reviews/settings`: Get Google review link and popup delay settings.
- `PUT  /api/reviews/settings`: Update settings (popup on/off, delay, cooldown).
- `GET  /api/reviews/rules`: List reward pool rules with odds weights.
- `POST /api/reviews/rules`: Create new reward rule.
- `GET  /api/reviews/submissions`: Owner verification queue for screenshots.
- `POST /api/reviews/submissions`: Customer review proof submission.
- `POST /api/coupons/redeem`: POS counter discount calculation & atomic redemption.

### Super Admin
- `GET  /api/admin/stats`: Platform KPI metrics, MRR, GMV, total scans, and orders.
- `GET  /api/admin/restaurants`: Full restaurant directory with search and status filters.
- `PUT  /api/admin/restaurants`: Activate or suspend restaurant, change package.
- `GET  /api/admin/packages`: Pricing and feature configurations.
- `PUT  /api/admin/packages`: Update package monthly price and feature entitlements.
- `GET  /api/admin/tickets`: Support inquiries desk.
- `PUT  /api/admin/tickets`: Reply to ticket and mark resolved.

---

## 📄 License
MIT License. Built for restaurants everywhere with ❤️.
