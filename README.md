<div align="center">

# ✈️ SkyJobs Marketplace

### **The freelance marketplace built on craft, not volume.**

*Post a brief. Get one focused bid per freelancer. Accept — and the contract is live in seconds.*  
*SkyJobs handles the full work lifecycle: delivery, revisions, extensions, disputes, and trust scores.*

<br/>

[![React](https://img.shields.io/badge/React-19-%2361DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-%23646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev)
[![Node.js](https://img.shields.io/badge/Node.js-18+-%23339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-5-%23000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-%234169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Knex](https://img.shields.io/badge/Knex.js-3-%23E16426?style=for-the-badge)](https://knexjs.org)
[![License](https://img.shields.io/badge/License-MIT-%2322c55e?style=for-the-badge)](LICENSE)

<br/>

[🚀 Live Demo](#) &nbsp;·&nbsp; [📖 API Docs](#api-reference) &nbsp;·&nbsp; [🐛 Report a Bug](../../issues) &nbsp;·&nbsp; [✨ Request Feature](../../issues)

</div>

---

## 📸 Preview

<div align="center">

> *A transparent marketplace where clients post briefs and freelancers compete on craft — not volume.*

</div>

| Landing | Dashboard | Order Detail |
|---|---|---|
| Browse open briefs, platform stats, how-it-works | Role-based overview — active orders, bids, earnings | Full order lifecycle with delivery, revision & dispute |

---

## ✨ Features

| | Feature | Description |
|---|---|---|
| 📋 | **Brief marketplace** | Clients post scoped briefs with budget range, deadline, and required skills |
| 🎯 | **One bid per freelancer** | No spam — each freelancer submits one focused proposal per brief |
| ⚡ | **Instant contracts** | Accepting a bid auto-generates a locked contract with agreed terms |
| 📦 | **Full order lifecycle** | Delivery → approval, revision requests, deadline extensions, cancellations |
| ⚖️ | **Dispute resolution** | Evidence submission, discussion thread, and admin-mediated resolution |
| 🌟 | **Trust score system** | Reputation scores adjust on reviews and dispute outcomes |
| 🤝 | **Counter-offer flow** | Clients can negotiate budget and timeline before accepting |
| 🔔 | **Real-time notifications** | In-app feed for every order event, bid update, and dispute action |
| 🛡️ | **Role-based access** | Separate dashboards for freelancers, clients, and admins |
| 🎛️ | **Admin control room** | User management, job moderation, dispute resolution, platform stats |
| 📱 | **Mobile-first UI** | Responsive layout — sidebar becomes a bottom nav on mobile |
| 🌙 | **Dark / light theme** | System-aware glassmorphic design with CSS oklch variables |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│                                                             │
│   React 19 + React Router 7                                 │
│   ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│   │  AuthContext │  │ ToastContext  │  │  ThemeContext     │  │
│   └─────────────┘  └──────────────┘  └──────────────────┘  │
│                                                             │
│   Axios  ·  JWT interceptor  ·  offline detection           │
└──────────────────────────┬──────────────────────────────────┘
                           │  HTTP / JSON
┌──────────────────────────▼──────────────────────────────────┐
│                    Express 5  API                           │
│                    /api/v1/...                              │
│                                                             │
│   helmet · cors · morgan · auth · role · joi validation     │
│                                                             │
│   auth   jobs   bids   orders   disputes   contracts        │
│   reviews   users   admin   notifications   stats           │
│                                                             │
│   Cron:  expire bids · expire cancellation requests         │
└──────────────────────────┬──────────────────────────────────┘
                           │  Knex.js query builder
┌──────────────────────────▼──────────────────────────────────┐
│                    PostgreSQL 15                            │
│                                                             │
│  users ──► jobs ──► bids ──► contracts ──► orders           │
│                                    │                        │
│                         deliveries · disputes · reviews     │
│                         notifications · audit_logs          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Order State Machine

```
  [awaiting_start]
        │
        │  freelancer starts work
        ▼
   [in_progress] ──────────────────────────────────────┐
        │                                              │
        │  freelancer submits delivery                 │
        ▼                                              │
    [delivered]                                        │
        │                                              │
        ├──── ✅ client approves ──────► [completed]   │
        │                                              │
        ├──── 🔁 client requests revision              │
        │            └──► [revision_requested]         │
        │                       └──────────────────────┘
        │
        └──── ⚖️  client raises dispute
                      └──► [in_dispute]
                                ├──► [resolved_for_client]
                                ├──► [resolved_for_freelancer]
                                └──► [withdrawn]

  Any active order ──► [cancellation_requested] ──► [cancelled / rejected]
```

---

## 📁 Project Structure

```
SkyJobs/
├── 📂 Backend/
│   ├── src/
│   │   ├── config/           # Knex database connection
│   │   ├── controllers/      # Business logic per resource
│   │   │   ├── auth.controller.js
│   │   │   ├── jobs.controller.js
│   │   │   ├── bids.controller.js
│   │   │   ├── orders.controller.js
│   │   │   ├── disputes.controller.js
│   │   │   └── ...
│   │   ├── db/
│   │   │   ├── migrations/   # 23 versioned schema migrations
│   │   │   └── seeds/        # Sample data
│   │   ├── jobs/             # Cron jobs (bid & cancellation expiry)
│   │   ├── middleware/        # auth · role · validate · error
│   │   ├── routes/           # Express routers, one per resource
│   │   ├── utils/            # JWT · response · pagination · trust · notify
│   │   └── validators/       # Joi request schemas
│   ├── server.js
│   ├── knexfile.js
│   ├── .env.example
│   └── package.json
│
└── 📂 Frontend/
    ├── public/
    │   ├── favicon.svg
    │   └── icons.svg          # SVG sprite sheet (all icons)
    ├── src/
    │   ├── api/               # Axios instance + per-resource modules
    │   ├── components/
    │   │   ├── common/        # Icon · Avatar · StatusPill · NotificationBell
    │   │   ├── charts/        # Lightweight SVG charts
    │   │   └── layout/        # TopBar · Sidebar
    │   ├── context/           # Auth · Toast · Theme
    │   ├── pages/
    │   │   ├── auth/          # Login · Register
    │   │   ├── dashboard/     # Client · Freelancer · Admin
    │   │   ├── jobs/          # JobListings · JobDetail
    │   │   ├── orders/        # Orders · OrderDetail
    │   │   ├── disputes/      # DisputeDetail
    │   │   ├── profile/       # Profile
    │   │   └── admin/         # AdminPanel
    │   ├── index.css          # Design system — variables, utilities, components
    │   ├── main.jsx           # Entry point — providers, error boundary
    │   └── App.jsx            # Route definitions
    ├── .env.example
    └── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18 or higher
- **PostgreSQL** 15 or higher
- **npm**

### 1 · Clone the repository

```bash
git clone https://github.com/your-username/skyjobs.git
cd skyjobs
```

### 2 · Configure the Backend

```bash
cd Backend
npm install
cp .env.example .env
# Open .env and fill in your database credentials + JWT secret
```

### 3 · Set up the database

```sql
-- Run in psql or pgAdmin
CREATE DATABASE skyjobs;
```

```bash
# Back in Backend/
npm run migrate    # creates all tables
npm run seed       # loads sample data
```

### 4 · Start the API

```bash
npm run dev        # nodemon — auto-restarts on change
```

> API running at **http://localhost:5000**

### 5 · Configure and start the Frontend

```bash
cd ../Frontend
npm install
cp .env.example .env   # already points to localhost:5000
npm run dev
```

> App running at **http://localhost:5173**

---

## ⚙️ Environment Variables

### `Backend/.env`

| Variable | Description | Default |
|---|---|---|
| `NODE_ENV` | `development` or `production` | `development` |
| `PORT` | API server port | `5000` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `skyjobs` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | — |
| `JWT_SECRET` | JWT signing secret **(min 32 chars)** | — |
| `JWT_EXPIRES_IN` | Token expiry | `7d` |
| `CLIENT_URL` | Frontend origin for CORS | `http://localhost:5173` |

### `Frontend/.env`

| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Backend base URL | `http://localhost:5000/api/v1` |

---

## 📡 API Reference

All routes are prefixed with `/api/v1`.

<details>
<summary><strong>🔐 Auth</strong></summary>

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | — | Create account |
| `POST` | `/auth/login` | — | Sign in → returns JWT |
| `GET` | `/auth/me` | Bearer | Get current user |

</details>

<details>
<summary><strong>💼 Jobs (Briefs)</strong></summary>

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/jobs` | Optional | List open briefs — filter, search, paginate |
| `POST` | `/jobs` | client | Create a brief |
| `GET` | `/jobs/:id` | Optional | Brief detail |
| `PUT` | `/jobs/:id` | client | Update |
| `DELETE` | `/jobs/:id` | client | Delete |
| `PATCH` | `/jobs/:id/close` | client | Close brief |
| `PATCH` | `/jobs/:id/reopen` | client | Reopen brief |
| `GET` | `/jobs/:id/bids` | client | List bids on a brief |

</details>

<details>
<summary><strong>🎯 Bids</strong></summary>

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/bids/jobs/:jobId` | freelancer | Submit a bid |
| `PATCH` | `/bids/:id/accept` | client | Accept bid → creates contract |
| `PATCH` | `/bids/:id/reject` | client | Reject bid |
| `PATCH` | `/bids/:id/withdraw` | freelancer | Withdraw bid |
| `POST` | `/bids/:id/counter` | client | Send counter-offer |
| `PATCH` | `/bids/:id/counter/respond` | freelancer | Accept / reject counter |

</details>

<details>
<summary><strong>📦 Orders</strong></summary>

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

</details>

<details>
<summary><strong>⚖️ Disputes</strong></summary>

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/disputes/orders/:orderId` | Bearer | Open a dispute |
| `GET` | `/disputes/:id` | Bearer | Dispute detail |
| `POST` | `/disputes/:id/respond` | Bearer | Respondent reply |
| `POST` | `/disputes/:id/evidence` | Bearer | Submit evidence |
| `POST` | `/disputes/:id/messages` | Bearer | Send message |
| `PATCH` | `/disputes/:id/withdraw` | Bearer | Withdraw dispute |
| `PATCH` | `/disputes/:id/resolve` | admin | Admin resolution |

</details>

<details>
<summary><strong>👤 Users, Stats & More</strong></summary>

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/users/:id` | Optional | Public profile |
| `PUT` | `/users/profile` | Bearer | Update profile |
| `GET` | `/categories` | — | Job categories |
| `GET` | `/stats` | — | Public platform stats |
| `GET` | `/notifications` | Bearer | Notification feed |
| `PATCH` | `/notifications/:id/read` | Bearer | Mark as read |

</details>

---

## 🗃️ Database Schema

| Table | Purpose |
|---|---|
| `users` | All accounts — freelancer / client / admin |
| `freelancer_profiles` | Extended skill, bio, and portfolio data |
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

## 🛠️ Scripts

### Backend

```bash
npm run dev              # Start with nodemon (development)
npm start                # Production start
npm run migrate          # Run pending migrations
npm run migrate:rollback # Rollback last migration batch
npm run seed             # Load seed data
npm run db:reset         # Full reset: rollback all → migrate → seed
```

### Frontend

```bash
npm run dev              # Vite dev server with HMR
npm run build            # Production build → dist/
npm run preview          # Preview production build locally
npm run lint             # ESLint
```

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Built with ☕ by **Group 02 — Web Engineering**

⭐ Star this repo if you find it useful!

</div>
