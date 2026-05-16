<div align="center">

<img src="https://img.shields.io/badge/✈-SkyJobs-0f172a?style=for-the-badge&logoColor=white" height="60" />

### The freelance marketplace built on craft, not volume.

Post a brief · Receive one focused bid per freelancer · Accept and the contract is live in seconds

<br/>

![React](https://img.shields.io/badge/React_19-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite_8-1a1a2e?style=flat-square&logo=vite&logoColor=646CFF)
![Node.js](https://img.shields.io/badge/Node.js_18+-1a1a2e?style=flat-square&logo=node.js&logoColor=4ADE80)
![Express](https://img.shields.io/badge/Express_5-1a1a2e?style=flat-square&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL_15+-1a1a2e?style=flat-square&logo=postgresql&logoColor=4169E1)
![Knex](https://img.shields.io/badge/Knex.js_3-1a1a2e?style=flat-square&logo=knex.js&logoColor=E16426)
![MIT](https://img.shields.io/badge/License_MIT-1a1a2e?style=flat-square&logoColor=white)

<br/>

[![Live Demo](https://img.shields.io/badge/Live_Demo-0ea5e9?style=for-the-badge&logo=vercel&logoColor=white)](#)
[![API Reference](https://img.shields.io/badge/API_Reference-6366f1?style=for-the-badge&logo=swagger&logoColor=white)](#api-reference)
[![Report Bug](https://img.shields.io/badge/Report_Bug-ef4444?style=for-the-badge&logo=github&logoColor=white)](../../issues)
[![Request Feature](https://img.shields.io/badge/Request_Feature-10b981?style=for-the-badge&logo=github&logoColor=white)](../../issues)

</div>

---

## Features

| Feature | Description |
|---|---|
| **Brief marketplace** | Clients post scoped briefs with budget range, deadline, and required skills |
| **One bid per freelancer** | No spam — each freelancer submits one focused proposal per brief |
| **Instant contracts** | Accepting a bid auto-generates a locked contract with agreed terms |
| **Full order lifecycle** | Delivery, approval, revision requests, deadline extensions, and cancellations |
| **Dispute resolution** | Evidence submission, discussion thread, and admin-mediated resolution |
| **Trust score system** | Reputation scores adjust on reviews and dispute outcomes |
| **Counter-offer flow** | Clients can negotiate budget and timeline before accepting a bid |
| **Real-time notifications** | In-app feed for every order event, bid update, and dispute action |
| **Role-based access** | Separate dashboards and permissions for freelancers, clients, and admins |
| **Admin control room** | User management, job moderation, dispute resolution, and platform stats |
| **Mobile-first UI** | Responsive layout — sidebar becomes a bottom nav on mobile |
| **Dark / light theme** | System-aware glassmorphic design using CSS oklch variables |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                             │
│                                                             │
│   React 19  +  React Router 7                               │
│   ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│   │  AuthContext │  │ ToastContext  │  │  ThemeContext     │  │
│   └─────────────┘  └──────────────┘  └──────────────────┘  │
│                                                             │
│   Axios  ·  JWT interceptor  ·  offline detection           │
└──────────────────────────┬──────────────────────────────────┘
                           │  HTTP / JSON
┌──────────────────────────▼──────────────────────────────────┐
│                    Express 5  API  —  /api/v1               │
│                                                             │
│   helmet  ·  cors  ·  morgan  ·  auth  ·  role  ·  joi      │
│                                                             │
│   auth  ·  jobs  ·  bids  ·  orders  ·  disputes            │
│   contracts  ·  reviews  ·  users  ·  admin  ·  stats       │
│                                                             │
│   Cron:  expire bids  ·  expire cancellation requests       │
└──────────────────────────┬──────────────────────────────────┘
                           │  Knex.js
┌──────────────────────────▼──────────────────────────────────┐
│                    PostgreSQL 15                            │
│                                                             │
│  users  ──►  jobs  ──►  bids  ──►  contracts  ──►  orders   │
│                                         │                   │
│                          deliveries  ·  disputes            │
│                          reviews  ·  notifications          │
│                          audit_logs  ·  escrow              │
└─────────────────────────────────────────────────────────────┘
```

---

## Order State Machine

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
        ├── client approves ──────► [completed]        │
        │                                              │
        ├── client requests revision                   │
        │        └──► [revision_requested] ────────────┘
        │
        └── client raises dispute
                  └──► [in_dispute]
                            ├──► [resolved_for_client]
                            ├──► [resolved_for_freelancer]
                            └──► [withdrawn]

  Any active order  ──►  [cancellation_requested]  ──►  [cancelled / rejected]
```

---

## Project Structure

```
SkyJobs/
├── Backend/
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
└── Frontend/
    ├── public/
    │   ├── favicon.svg
    │   └── icons.svg          # SVG sprite sheet for all icons
    ├── src/
    │   ├── api/               # Axios instance + per-resource modules
    │   ├── components/
    │   │   ├── common/        # Icon · Avatar · StatusPill · NotificationBell
    │   │   ├── charts/        # Lightweight SVG chart components
    │   │   └── layout/        # TopBar · Sidebar
    │   ├── context/           # Auth · Toast · Theme contexts
    │   ├── pages/
    │   │   ├── auth/          # Login · Register
    │   │   ├── dashboard/     # Client · Freelancer · Admin
    │   │   ├── jobs/          # JobListings · JobDetail
    │   │   ├── orders/        # Orders · OrderDetail
    │   │   ├── disputes/      # DisputeDetail
    │   │   ├── profile/       # Profile
    │   │   └── admin/         # AdminPanel
    │   ├── index.css          # Design system — variables, utilities, components
    │   ├── main.jsx           # Entry — providers, error boundary, network events
    │   └── App.jsx            # Route definitions
    ├── .env.example
    └── package.json
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+
- **PostgreSQL** 15+

### 1 — Clone

```bash
git clone https://github.com/your-username/skyjobs.git
cd skyjobs
```

### 2 — Configure the Backend

```bash
cd Backend
npm install
cp .env.example .env
# Fill in DB credentials and a strong JWT_SECRET (min 32 chars)
```

### 3 — Set up the Database

```sql
-- Run in psql or pgAdmin
CREATE DATABASE skyjobs;
```

```bash
# From Backend/
npm run migrate    # create all tables
npm run seed       # load sample data
```

### 4 — Start the API

```bash
npm run dev
# API available at http://localhost:5000
```

### 5 — Start the Frontend

```bash
cd ../Frontend
npm install
cp .env.example .env   # already points to localhost:5000
npm run dev
# App available at http://localhost:5173
```

---

## Environment Variables

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
| `JWT_SECRET` | Signing secret — **min 32 chars** | — |
| `JWT_EXPIRES_IN` | Token lifetime | `7d` |
| `CLIENT_URL` | Frontend origin for CORS | `http://localhost:5173` |

### `Frontend/.env`

| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Backend API base URL | `http://localhost:5000/api/v1` |

---

## API Reference

All endpoints are prefixed with `/api/v1`.

<details>
<summary><strong>Auth</strong></summary>
<br/>

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | — | Create account |
| `POST` | `/auth/login` | — | Sign in, returns JWT |
| `GET` | `/auth/me` | Bearer | Get current user |

</details>

<details>
<summary><strong>Jobs (Briefs)</strong></summary>
<br/>

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
<summary><strong>Bids</strong></summary>
<br/>

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/bids/jobs/:jobId` | freelancer | Submit a bid |
| `PATCH` | `/bids/:id/accept` | client | Accept bid — creates contract |
| `PATCH` | `/bids/:id/reject` | client | Reject bid |
| `PATCH` | `/bids/:id/withdraw` | freelancer | Withdraw bid |
| `POST` | `/bids/:id/counter` | client | Send counter-offer |
| `PATCH` | `/bids/:id/counter/respond` | freelancer | Accept / reject counter |

</details>

<details>
<summary><strong>Orders</strong></summary>
<br/>

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
<summary><strong>Disputes</strong></summary>
<br/>

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
<summary><strong>Users, Notifications & Stats</strong></summary>
<br/>

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

## Database Schema

| Table | Purpose |
|---|---|
| `users` | All accounts — freelancer / client / admin |
| `freelancer_profiles` | Extended skill, bio, and portfolio data |
| `categories` | Job category taxonomy |
| `jobs` | Client-posted project briefs |
| `bids` | Freelancer proposals and counter-offers |
| `contracts` | Auto-generated on bid acceptance |
| `orders` | Active work items |
| `deliveries` | Work submissions with file attachments |
| `reviews` | Blind mutual post-completion ratings |
| `disputes` | Dispute cases with evidence and messages |
| `cancellation_requests` | Client-initiated cancellation flow |
| `deadline_extensions` | Freelancer extension requests |
| `notifications` | In-app notification feed |
| `escrow_transactions` | Payment escrow records |
| `audit_logs` | Immutable action trail |

---

## Scripts

### Backend

```bash
npm run dev              # Start with nodemon (watch mode)
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

## Deployment

### Backend — Render

**1. Create a PostgreSQL database on Render**

- Go to [render.com](https://render.com) → New → **PostgreSQL**
- Name it `skyjobs-db`, choose the free tier
- Copy the **Internal Database URL** — you'll need it in step 3

**2. Create a Web Service on Render**

- New → **Web Service** → connect your GitHub repo
- Set **Root Directory** to `Backend`
- Set **Build Command** to:
  ```
  npm install && npm run migrate
  ```
- Set **Start Command** to:
  ```
  npm start
  ```
- Set **Environment** to `Node`

**3. Add environment variables in Render**

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | *(paste the Internal Database URL from step 1)* |
| `JWT_SECRET` | *(generate a random 32+ char string)* |
| `JWT_EXPIRES_IN` | `7d` |
| `CLIENT_URL` | *(your Vercel frontend URL — add after deploying frontend)* |

> Render auto-assigns `PORT`, so do not set it manually.

**4. Deploy** — Render will build, migrate, and start the API. Copy the service URL (e.g. `https://skyjobs-api.onrender.com`).

---

### Frontend — Vercel

**1. Import the project**

- Go to [vercel.com](https://vercel.com) → New Project → import your GitHub repo
- Set **Root Directory** to `Frontend`
- Vercel auto-detects Vite — no build command changes needed

**2. Add environment variable**

| Key | Value |
|---|---|
| `VITE_API_URL` | `https://skyjobs-api.onrender.com/api/v1` *(your Render URL)* |

**3. Deploy** — Vercel builds and deploys. Copy the live URL.

**4. Update CORS on Render**

Go back to your Render service → Environment → update `CLIENT_URL` to your Vercel URL (e.g. `https://skyjobs.vercel.app`), then redeploy.

---

### Deployment Checklist

- [ ] Render PostgreSQL created and `DATABASE_URL` copied
- [ ] Render Web Service created with `Root Directory = Backend`
- [ ] All environment variables set on Render
- [ ] Migrations ran successfully on first deploy (check Render logs)
- [ ] Vercel project created with `Root Directory = Frontend`
- [ ] `VITE_API_URL` set to Render service URL
- [ ] `CLIENT_URL` on Render updated to Vercel URL
- [ ] Frontend loads and can reach the API (check browser Network tab)

---

## Contributing

1. Fork the repository
2. Create a feature branch — `git checkout -b feature/your-feature`
3. Commit your changes — `git commit -m "feat: add your feature"`
4. Push to the branch — `git push origin feature/your-feature`
5. Open a Pull Request

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---


