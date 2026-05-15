# SkyJobs

A full-stack freelance marketplace where clients post project briefs and freelancers compete on craft — not volume. One focused bid per freelancer, instant contract generation on acceptance, and a complete order lifecycle from delivery to dispute resolution.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [API Reference](#api-reference)
- [Order State Machine](#order-state-machine)
- [Scripts](#scripts)

---

## Overview

SkyJobs is a transparent freelance platform built around three principles:

1. **Post a brief** — Clients write a scoped brief with budget range and deadline.
2. **Bid on craft** — Freelancers submit one focused proposal each. No spam, no race to the bottom.
3. **Sign instantly** — Accepting a bid auto-generates a contract with locked terms.

The platform handles the full order lifecycle: delivery, revision requests, deadline extensions, cancellation, dispute resolution, and trust-score tracking.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, React Router 7 |
| Styling | Custom CSS design system (oklch, CSS variables, glassmorphism) |
| Backend | Node.js, Express 5 |
| Database | PostgreSQL 15+ via Knex.js |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Validation | Joi |
| HTTP Client | Axios |
| Scheduling | node-cron |

---

## Features

### For Freelancers
- Browse and search open briefs by category, budget, skills, and location
- Submit a single focused bid per brief
- Counter-offer negotiation flow
- Deliver work with file attachments
- Request deadline extensions
- Raise and respond to disputes
- Trust score and review system

### For Clients
- Post project briefs with scope, budget range, deadline, and required skills
- Review bids and freelancer profiles
- Accept bids — contract generated instantly
- Request revisions or approve delivery
- Raise disputes with evidence submission
- Cancellation request flow

### For Admins
- Full user management (ban/unban, role management)
- Job moderation (feature, close, reopen)
- Dispute resolution with trust score adjustments
- Platform-wide statistics dashboard

### Platform
- Real-time notifications
- Glassmorphic dark/light theme
- Mobile-responsive layout (bottom nav on mobile)
- Error boundaries and network error detection
- Full audit log trail

---

## Project Structure

```
SkyJobs/
├── Backend/
│   ├── src/
│   │   ├── config/          # Knex database config
│   │   ├── controllers/     # Route handler logic
│   │   │   ├── auth.controller.js
│   │   │   ├── jobs.controller.js
│   │   │   ├── bids.controller.js
│   │   │   ├── orders.controller.js
│   │   │   ├── disputes.controller.js
│   │   │   ├── contracts.controller.js
│   │   │   ├── reviews.controller.js
│   │   │   ├── users.controller.js
│   │   │   ├── admin.controller.js
│   │   │   ├── notifications.controller.js
│   │   │   └── stats.controller.js
│   │   ├── db/
│   │   │   ├── migrations/  # Knex migration files
│   │   │   └── seeds/       # Seed data
│   │   ├── jobs/            # Cron job definitions
│   │   ├── middleware/       # Auth, role, validate, error
│   │   ├── routes/          # Express routers
│   │   ├── utils/           # JWT, response helpers, pagination, trust
│   │   ├── validators/      # Joi schemas
│   │   └── app.js           # Express app setup
│   ├── server.js            # Entry point
│   ├── knexfile.js
│   ├── .env.example
│   └── package.json
│
└── Frontend/
    ├── public/
    │   ├── favicon.svg
    │   └── icons.svg        # Sprite sheet for all icons
    ├── src/
    │   ├── api/             # Axios instance + per-resource API modules
    │   ├── components/
    │   │   ├── common/      # Icon, Avatar, StatusPill, NotificationBell, ErrorBoundary
    │   │   ├── charts/      # Lightweight SVG chart components
    │   │   └── layout/      # TopBar, Sidebar
    │   ├── context/         # AuthContext, ToastContext, ThemeContext
    │   ├── pages/
    │   │   ├── auth/        # Login, Register
    │   │   ├── dashboard/   # Client, Freelancer, Admin dashboards
    │   │   ├── jobs/        # JobListings, JobDetail
    │   │   ├── freelancers/ # FreelancerListings
    │   │   ├── orders/      # Orders, OrderDetail
    │   │   ├── disputes/    # DisputeDetail
    │   │   ├── profile/     # Profile
    │   │   ├── admin/       # AdminPanel
    │   │   ├── Landing.jsx
    │   │   └── NotFound.jsx
    │   ├── index.css        # Design system (variables, utilities, components)
    │   ├── main.jsx         # App entry — providers, error boundary, network events
    │   └── App.jsx          # Router configuration
    ├── .env.example
    └── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- npm

### 1. Clone the repository

```bash
git clone https://github.com/your-username/skyjobs.git
cd skyjobs
```

### 2. Set up the Backend

```bash
cd Backend
npm install
cp .env.example .env
# Edit .env with your database credentials and JWT secret
```

### 3. Set up the database

Create the database in PostgreSQL, then run migrations and seeds:

```bash
# Create the database (run in psql or pgAdmin)
CREATE DATABASE skyjobs;

# Run from Backend/
npm run migrate
npm run seed
```

### 4. Start the Backend

```bash
npm run dev     # development (nodemon)
# or
npm start       # production
```

The API will be available at `http://localhost:5000`.

### 5. Set up the Frontend

```bash
cd ../Frontend
npm install
cp .env.example .env
# .env is pre-filled with the correct local API URL
```

### 6. Start the Frontend

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Environment Variables

### Backend — `Backend/.env`

| Variable | Description | Default |
|---|---|---|
| `NODE_ENV` | `development` or `production` | `development` |
| `PORT` | Port the API listens on | `5000` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `skyjobs` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | — |
| `JWT_SECRET` | Secret for signing JWTs (min 32 chars) | — |
| `JWT_EXPIRES_IN` | JWT expiry | `7d` |
| `CLIENT_URL` | Frontend origin for CORS | `http://localhost:5173` |

### Frontend — `Frontend/.env`

| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Backend API base URL | `http://localhost:5000/api/v1` |

---

## Database

The schema is managed entirely through Knex migrations. Key tables:

| Table | Purpose |
|---|---|
| `users` | All user accounts (freelancer / client / admin) |
| `freelancer_profiles` | Extended profile data for freelancers |
| `categories` | Job categories |
| `jobs` | Project briefs posted by clients |
| `bids` | Freelancer proposals on jobs |
| `contracts` | Auto-generated on bid acceptance |
| `orders` | Active work items derived from contracts |
| `deliveries` | Work submission records with attachments |
| `reviews` | Mutual post-completion ratings |
| `disputes` | Dispute cases with evidence and messages |
| `cancellation_requests` | Client-initiated cancellation flow |
| `deadline_extensions` | Freelancer-requested deadline changes |
| `notifications` | In-app notification feed |
| `audit_logs` | Immutable action trail |
| `escrow_transactions` | Payment escrow records |

### Useful commands

```bash
# Run all pending migrations
npm run migrate

# Rollback the last batch
npm run migrate:rollback

# Run seed files
npm run seed

# Full reset (rollback all → migrate → seed)
npm run db:reset
```

---

## API Reference

All routes are prefixed with `/api/v1`.

### Auth
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Create account |
| POST | `/auth/login` | — | Sign in, returns JWT |
| GET | `/auth/me` | Bearer | Get current user |

### Jobs
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/jobs` | Optional | List open briefs (filter, paginate, search) |
| POST | `/jobs` | client | Create a brief |
| GET | `/jobs/:id` | Optional | Get brief detail |
| PUT | `/jobs/:id` | client | Update a brief |
| DELETE | `/jobs/:id` | client | Delete a brief |
| PATCH | `/jobs/:id/close` | client | Close a brief |
| PATCH | `/jobs/:id/reopen` | client | Reopen a brief |
| GET | `/jobs/:id/bids` | client | List bids on a brief |

### Bids
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/bids/jobs/:jobId` | freelancer | Submit a bid |
| PATCH | `/bids/:id/accept` | client | Accept a bid |
| PATCH | `/bids/:id/reject` | client | Reject a bid |
| PATCH | `/bids/:id/withdraw` | freelancer | Withdraw own bid |
| POST | `/bids/:id/counter` | client | Send counter-offer |
| PATCH | `/bids/:id/counter/respond` | freelancer | Accept/reject counter |

### Orders
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/orders` | Bearer | List own orders |
| GET | `/orders/:id` | Bearer | Order detail |
| POST | `/orders/:id/deliver` | freelancer | Submit delivery |
| PATCH | `/orders/:id/approve` | client | Approve delivery |
| PATCH | `/orders/:id/revision` | client | Request revision |
| POST | `/orders/:id/extension` | freelancer | Request deadline extension |
| PATCH | `/orders/:id/extension/respond` | client | Respond to extension |
| POST | `/orders/:id/cancel` | client | Request cancellation |
| PATCH | `/orders/:id/cancel/respond` | freelancer | Respond to cancellation |

### Disputes
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/disputes/orders/:orderId` | Bearer | Open a dispute |
| GET | `/disputes/:id` | Bearer | Get dispute detail |
| POST | `/disputes/:id/respond` | Bearer | Submit respondent reply |
| POST | `/disputes/:id/evidence` | Bearer | Submit evidence |
| POST | `/disputes/:id/messages` | Bearer | Send a message |
| PATCH | `/disputes/:id/withdraw` | Bearer | Withdraw dispute |
| PATCH | `/disputes/:id/resolve` | admin | Admin resolution |

### Users & Profiles
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/users/:id` | Optional | Public profile |
| PUT | `/users/profile` | Bearer | Update profile |
| GET | `/categories` | — | List job categories |
| GET | `/stats` | — | Public platform stats |

---

## Order State Machine

```
awaiting_start
      │
      ▼ (freelancer delivers)
  in_progress ──────────────────────────────────┐
      │                                          │
      ▼ (freelancer delivers)                    │
   delivered                                     │
      │                                          │
      ├─── client approves ──────► completed     │
      │                                          │
      ├─── client requests revision ──► revision_requested ─► (back to in_progress)
      │                                          │
      └─── client raises dispute ──► in_dispute  │
                │                                │
                ├── resolved_for_client ◄────────┘
                ├── resolved_for_freelancer
                └── withdrawn

  Any non-completed state: cancellation_requested ──► cancelled / rejected
```

---

## Scripts

### Backend

```bash
npm run dev              # Start with nodemon (watch mode)
npm start                # Start for production
npm run migrate          # Run pending migrations
npm run migrate:rollback # Rollback last migration batch
npm run seed             # Run seed files
npm run db:reset         # Full DB reset (rollback + migrate + seed)
```

### Frontend

```bash
npm run dev              # Start Vite dev server
npm run build            # Production build → dist/
npm run preview          # Preview production build locally
npm run lint             # ESLint
```

---

## License

MIT
