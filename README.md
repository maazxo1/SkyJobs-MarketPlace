# SkyJobs

**The freelance marketplace built on craft, not volume.**

Post a scoped brief. Receive one focused bid per freelancer. Accept — and the contract is live in seconds. SkyJobs handles the full work lifecycle: delivery, revisions, extensions, disputes, and trust scores — all in one place.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169E1?logo=postgresql&logoColor=white)
![Knex](https://img.shields.io/badge/Knex.js-3-E16426)
![License](https://img.shields.io/badge/License-MIT-green)

---

## Features

| Feature | Description |
|---|---|
| **Brief marketplace** | Clients post scoped briefs with budget range, deadline, and required skills |
| **One bid per freelancer** | No spam proposals — each freelancer submits one focused bid per brief |
| **Instant contracts** | Accepting a bid auto-generates a locked contract with agreed terms |
| **Full order lifecycle** | Delivery → approval, revision requests, deadline extensions, and cancellations |
| **Dispute resolution** | Evidence submission, discussion thread, and admin-mediated resolution |
| **Trust score system** | Reputation scores adjust automatically on reviews and dispute outcomes |
| **Counter-offer flow** | Clients can negotiate budget and timeline before accepting a bid |
| **Real-time notifications** | In-app feed for every order event, bid update, and dispute action |
| **Role-based access** | Separate dashboards and permissions for freelancers, clients, and admins |
| **Admin control room** | User management, job moderation, dispute resolution, and platform stats |
| **Mobile-first UI** | Responsive layout — sidebar becomes a bottom nav on mobile |
| **Dark / light theme** | System-aware glassmorphic design system using CSS oklch variables |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│                                                             │
│   React 19 + React Router 7                                 │
│   ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│   │  AuthContext │  │ ToastContext  │  │  ThemeContext     │  │
│   └─────────────┘  └──────────────┘  └──────────────────┘  │
│                                                             │
│   Axios (JWT interceptor · timeout · offline detection)     │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP / JSON
┌──────────────────────────▼──────────────────────────────────┐
│                   Express 5 API                             │
│                   /api/v1/...                               │
│                                                             │
│   Middleware: helmet · cors · morgan · auth · role · joi    │
│                                                             │
│   Controllers: auth  jobs  bids  orders  disputes           │
│                contracts  reviews  users  admin  stats      │
│                                                             │
│   Cron jobs: expire bids · expire cancellations             │
└──────────────────────────┬──────────────────────────────────┘
                           │ Knex.js
┌──────────────────────────▼──────────────────────────────────┐
│                     PostgreSQL 15                           │
│                                                             │
│  users  ──►  jobs  ──►  bids  ──►  contracts  ──►  orders   │
│                                         │                   │
│                              deliveries · disputes          │
│                              reviews · notifications        │
│                              audit_logs · escrow            │
└─────────────────────────────────────────────────────────────┘
```

---

## Order State Machine

```
  [awaiting_start]
        │
        │  freelancer starts work
        ▼
   [in_progress] ────────────────────────────────────┐
        │                                            │
        │  freelancer delivers                       │
        ▼                                            │
   [delivered]                                       │
        │                                            │
        ├──── client approves ──────► [completed]   │
        │                                            │
        ├──── client requests revision              │
        │            └──► [revision_requested]      │
        │                       └──► [in_progress] ─┘
        │
        └──── client raises dispute
                     └──► [in_dispute]
                               ├──► [resolved_for_client]
                               ├──► [resolved_for_freelancer]
                               └──► [withdrawn]

  Any active order: ──► [cancellation_requested] ──► [cancelled / rejected]
```

---

## Project Structure

```
SkyJobs/
├── Backend/
│   ├── src/
│   │   ├── config/          # Database connection (Knex)
│   │   ├── controllers/     # Business logic per resource
│   │   ├── db/
│   │   │   ├── migrations/  # 23 versioned schema migrations
│   │   │   └── seeds/       # Sample data
│   │   ├── jobs/            # Cron jobs (bid expiry, cancellation expiry)
│   │   ├── middleware/       # auth · role · validate · error
│   │   ├── routes/          # Express routers (one file per resource)
│   │   ├── utils/           # JWT · response · pagination · trust · notify
│   │   ├── validators/      # Joi request schemas
│   │   └── app.js
│   ├── server.js
│   ├── knexfile.js
│   ├── .env.example
│   └── package.json
│
└── Frontend/
    ├── public/
    │   ├── favicon.svg
    │   └── icons.svg        # SVG sprite (all icons in one file)
    ├── src/
    │   ├── api/             # Axios instance + per-resource modules
    │   ├── components/
    │   │   ├── common/      # Icon · Avatar · StatusPill · NotificationBell · ErrorBoundary
    │   │   ├── charts/      # Lightweight SVG chart components
    │   │   └── layout/      # TopBar · Sidebar
    │   ├── context/         # AuthContext · ToastContext · ThemeContext
    │   ├── pages/
    │   │   ├── auth/        # Login · Register
    │   │   ├── dashboard/   # Client · Freelancer · Admin
    │   │   ├── jobs/        # JobListings · JobDetail
    │   │   ├── freelancers/ # FreelancerListings
    │   │   ├── orders/      # Orders · OrderDetail
    │   │   ├── disputes/    # DisputeDetail
    │   │   ├── profile/     # Profile
    │   │   ├── admin/       # AdminPanel
    │   │   ├── Landing.jsx
    │   │   └── NotFound.jsx
    │   ├── index.css        # Design system — variables · utilities · components
    │   ├── main.jsx         # Entry — providers · error boundary · network events
    │   └── App.jsx          # Route definitions
    ├── .env.example
    └── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+

### 1. Clone

```bash
git clone https://github.com/your-username/skyjobs.git
cd skyjobs
```

### 2. Backend setup

```bash
cd Backend
npm install
cp .env.example .env
# Fill in your DB credentials and a strong JWT_SECRET (min 32 chars)
```

### 3. Database setup

```bash
# In psql or pgAdmin
CREATE DATABASE skyjobs;

# Back in Backend/
npm run migrate   # create all tables
npm run seed      # load sample data
```

### 4. Start the API

```bash
npm run dev       # nodemon, watches for changes
```
API available at `http://localhost:5000`

### 5. Frontend setup

```bash
cd ../Frontend
npm install
cp .env.example .env   # already points to localhost:5000
npm run dev
```
App available at `http://localhost:5173`

---

## Environment Variables

### `Backend/.env`

| Variable | Description | Example |
|---|---|---|
| `NODE_ENV` | Runtime environment | `development` |
| `PORT` | API port | `5000` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `skyjobs` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | `yourpassword` |
| `JWT_SECRET` | Signing secret — min 32 chars | `a-long-random-string` |
| `JWT_EXPIRES_IN` | Token lifetime | `7d` |
| `CLIENT_URL` | Frontend origin for CORS | `http://localhost:5173` |

### `Frontend/.env`

| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | Backend base URL | `http://localhost:5000/api/v1` |

---

## API Reference

All endpoints are prefixed with `/api/v1`.

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | — | Create account |
| `POST` | `/auth/login` | — | Sign in → JWT |
| `GET` | `/auth/me` | Bearer | Current user |

### Jobs
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/jobs` | Optional | List briefs (filter, search, paginate) |
| `POST` | `/jobs` | client | Create a brief |
| `GET` | `/jobs/:id` | Optional | Brief detail |
| `PUT` | `/jobs/:id` | client | Update |
| `DELETE` | `/jobs/:id` | client | Delete |
| `PATCH` | `/jobs/:id/close` | client | Close |
| `PATCH` | `/jobs/:id/reopen` | client | Reopen |
| `GET` | `/jobs/:id/bids` | client | List bids |

### Bids
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/bids/jobs/:jobId` | freelancer | Submit bid |
| `PATCH` | `/bids/:id/accept` | client | Accept bid |
| `PATCH` | `/bids/:id/reject` | client | Reject bid |
| `PATCH` | `/bids/:id/withdraw` | freelancer | Withdraw |
| `POST` | `/bids/:id/counter` | client | Counter-offer |
| `PATCH` | `/bids/:id/counter/respond` | freelancer | Accept / reject counter |

### Orders
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/orders` | Bearer | List own orders |
| `GET` | `/orders/:id` | Bearer | Order detail |
| `POST` | `/orders/:id/deliver` | freelancer | Submit delivery |
| `PATCH` | `/orders/:id/approve` | client | Approve delivery |
| `PATCH` | `/orders/:id/revision` | client | Request revision |
| `POST` | `/orders/:id/extension` | freelancer | Request deadline extension |
| `PATCH` | `/orders/:id/extension/respond` | client | Respond to extension |
| `POST` | `/orders/:id/cancel` | client | Request cancellation |
| `PATCH` | `/orders/:id/cancel/respond` | freelancer | Respond to cancellation |

### Disputes
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/disputes/orders/:orderId` | Bearer | Open dispute |
| `GET` | `/disputes/:id` | Bearer | Dispute detail |
| `POST` | `/disputes/:id/respond` | Bearer | Respondent reply |
| `POST` | `/disputes/:id/evidence` | Bearer | Submit evidence |
| `POST` | `/disputes/:id/messages` | Bearer | Send message |
| `PATCH` | `/disputes/:id/withdraw` | Bearer | Withdraw |
| `PATCH` | `/disputes/:id/resolve` | admin | Admin resolve |

### Other
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/users/:id` | Optional | Public profile |
| `PUT` | `/users/profile` | Bearer | Update profile |
| `GET` | `/categories` | — | Job categories |
| `GET` | `/stats` | — | Platform stats |

---

## Database Schema

| Table | Purpose |
|---|---|
| `users` | All accounts — freelancer / client / admin |
| `freelancer_profiles` | Extended skill and bio data |
| `categories` | Job category taxonomy |
| `jobs` | Client-posted briefs |
| `bids` | Freelancer proposals + counter-offers |
| `contracts` | Auto-generated on bid acceptance |
| `orders` | Active work items |
| `deliveries` | Work submissions with attachments |
| `reviews` | Blind mutual post-completion ratings |
| `disputes` | Dispute cases with evidence and messages |
| `cancellation_requests` | Client cancellation flow |
| `deadline_extensions` | Freelancer extension requests |
| `notifications` | In-app notification feed |
| `escrow_transactions` | Payment escrow records |
| `audit_logs` | Immutable action trail |

---

## Scripts

### Backend

```bash
npm run dev              # Start with nodemon
npm start                # Production start
npm run migrate          # Run pending migrations
npm run migrate:rollback # Rollback last batch
npm run seed             # Load seed data
npm run db:reset         # Rollback all → migrate → seed
```

### Frontend

```bash
npm run dev              # Vite dev server
npm run build            # Production build → dist/
npm run preview          # Preview production build
npm run lint             # ESLint
```

---

## License

MIT
