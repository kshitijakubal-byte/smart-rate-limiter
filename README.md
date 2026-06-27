# Smart Rate Limiter with AI-based Abuse Detection

A backend project to build a production-style **rate limiter** that goes beyond simple request counting — combining **heuristic-based abuse detection** with **AI-based detection as a fallback** for ambiguous traffic patterns.

This repo is being built in **phases**. Phase 1 focuses purely on project scaffolding — no rate limiting, no Redis, no AI logic yet.

---

## Table of Contents

- [Project Vision](#project-vision)
- [Architecture Approach](#architecture-approach)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Services](#services)
  - [Authentication Service](#1-authentication-service)
  - [OTP Notification Service](#2-otp-notification-service)
- [Database](#database)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Running Migrations](#running-migrations)
- [Roadmap / Phases](#roadmap--phases)
- [Design Decisions & Notes](#design-decisions--notes)

---

## Project Vision

Most rate limiters just count requests in a time window and block once a threshold is hit. This project aims to go further:

1. **Tier 1 — Basic Rate Limiting**: Standard request-count limiting per key (user/IP) per route.
2. **Tier 2 — Heuristic Abuse Detection**: Cheap, deterministic rules (velocity spikes, repeated payloads, suspicious patterns) that assign a suspicion score to each request.
3. **Tier 3 — AI-based Abuse Detection**: Only triggered when heuristics produce an **ambiguous score** (i.e., not clearly safe or clearly abusive). The AI layer analyzes a compact feature summary of the request pattern and returns a verdict.

The core philosophy: **heuristics are fast and cheap and run on every request; AI is slow and costly and only runs on the gray-zone cases.** This keeps the system performant while still catching nuanced abuse patterns that static rules would miss.

This hybrid approach is being tested against a real-world-style **OTP Notification Service**, since OTP/SMS abuse (toll fraud, SMS bombing, OTP brute-forcing) is one of the most common and well-understood rate-limiting problems in the industry.

---

## Architecture Approach

- **Layered structure per module**: Each service/module (`auth`, `otp`) has its own `controller`, `service`, `routes`, and `schema` files — keeping HTTP handling, business logic, and validation cleanly separated.
- **Shared infrastructure** (DB config, middlewares, utils) lives outside individual modules so it can be reused across services.
- **Validation-first**: Every route validates its payload using `zod` schemas before it reaches business logic.
- **Manual migrations**: Plain `.sql` files run via a custom lightweight script — no migration framework, kept simple and explicit.

---

## Tech Stack

| Concern              | Choice                          |
|-----------------------|----------------------------------|
| Language              | TypeScript                      |
| Runtime               | Node.js                         |
| Dev/Run               | `tsx`                            |
| Package Manager       | Yarn Classic                    |
| Web Framework         | Express                         |
| Database              | PostgreSQL (`pg`)               |
| Validation            | `zod`                            |
| Auth                  | `bcrypt` (hashing), `jsonwebtoken` (tokens) |
| Env Management        | `dotenv`                         |

> **Note:** No rate-limiting libraries, Redis, or AI SDKs are included yet — these will be added manually in later phases as the project evolves.

---

## Project Structure

```
src/
  config/
    db.ts                 # PostgreSQL pool setup
    env.ts                 # zod-validated environment config
  db/
    migrations/
      001_create_users.sql
      002_create_otp_requests.sql
    migrate.ts              # runs all .sql migration files in order
  modules/
    auth/
      auth.controller.ts
      auth.service.ts
      auth.routes.ts
      auth.schema.ts
    otp/
      otp.controller.ts
      otp.service.ts
      otp.routes.ts
      otp.schema.ts
  middlewares/
    errorHandler.ts
    authenticate.ts         # JWT verification middleware
  utils/
    logger.ts
    asyncHandler.ts          # wraps async controllers for error handling
  app.ts                     # Express app setup, mounts routers
  server.ts                  # Entry point
.env.example
tsconfig.json
package.json
```

---

## Services

### 1. Authentication Service

Handles user registration and login. Other services (like OTP) will eventually depend on this for identifying request ownership.

| Method | Route             | Description                          |
|--------|-------------------|---------------------------------------|
| POST   | `/auth/register`  | Register a new user                  |
| POST   | `/auth/login`      | Authenticate user, returns a JWT      |

### 2. OTP Notification Service

Simulates a real-world OTP delivery system. This is the primary service that will eventually carry the rate-limiting and abuse-detection logic, since OTP endpoints are classic targets for abuse (SMS bombing, brute-forcing, enumeration).

| Method | Route                  | Description                                                   | Abuse Risk |
|--------|-------------------------|-----------------------------------------------------------------|------------|
| POST   | `/otp/send`             | Generate and "send" an OTP (logged to console, no real SMS)     | **High** — primary target for SMS bombing |
| GET    | `/otp/status/:id`        | Check status of an OTP request                                  | Medium — enumeration risk if IDs are guessable |
| PATCH  | `/otp/resend`            | Resend/regenerate an OTP for an existing request                 | **High** — same risk profile as `send`, should share the same rate-limit bucket |
| DELETE | `/otp/cancel/:id`         | Cancel a pending OTP request                                      | Low (cost-wise), but needs an ownership check (not yet implemented) |

> No real SMS provider is integrated. OTP codes are logged to the console for now.

---

## Database

Two tables for Phase 1:

**`users`**
| Column         | Type        |
|----------------|-------------|
| id             | UUID / SERIAL |
| name           | TEXT        |
| email          | TEXT (unique) |
| password_hash  | TEXT        |
| created_at     | TIMESTAMP   |

**`otp_requests`**
| Column         | Type        |
|----------------|-------------|
| id             | UUID / SERIAL |
| phone_number   | TEXT        |
| code           | TEXT        |
| status         | TEXT (`pending` / `verified` / `expired` / `cancelled`) |
| attempt_count  | INTEGER     |
| created_at     | TIMESTAMP   |
| expires_at     | TIMESTAMP   |

> Postgres handles durable records here. Future rate-limiting counters (request-per-window tracking) will live in **Redis**, not Postgres — Postgres is for "what happened," Redis will be for "how many, how fast."

---

## Getting Started

```bash
# Install dependencies
yarn install

# Copy env file and fill in values
cp .env.example .env

# Run database migrations manually
yarn tsx src/db/migrate.ts

# Start the dev server
yarn tsx src/server.ts
```

---

## Environment Variables

See `.env.example` for the full list. At minimum, you'll need:

```
PORT=
DATABASE_URL=
JWT_SECRET=
```

---

## Running Migrations

Migrations are plain `.sql` files under `src/db/migrations/`, numbered in execution order. There is **no migration framework** — `migrate.ts` simply reads and executes each file against the database in sequence.

```bash
yarn tsx src/db/migrate.ts
```

Migrations are run **manually** whenever the schema changes — there's no auto-run on server start.

---

## Roadmap / Phases

- [x] **Phase 1** — Project scaffolding: Auth + OTP services, DB setup, manual migrations
- [ ] **Phase 2** — Basic rate limiting (Tier 1): sliding window counter via Redis, per-route configs
- [ ] **Phase 3** — Heuristic abuse detection engine (Tier 2): suspicion scoring rules
- [ ] **Phase 4** — Escalation logic + AI-based detection (Tier 3): AI fallback for ambiguous scores
- [ ] **Phase 5** — Observability: structured logging of every rate-limit decision, tier, and score

---

## Design Decisions & Notes

- **Why OTP service over a Cart/Bank service?** OTP abuse (SMS bombing, brute-forcing, enumeration) is one of the most realistic, well-documented rate-limiting problems in the industry — and it naturally produces routes with *different* abuse sensitivity (`send`/`resend` are high-risk, `status` is medium, `cancel` is low-risk-but-needs-authz), which gives the eventual heuristic/AI scoring engine real signal variety to work with.
- **Why TypeScript?** Strong typing pairs naturally with `zod` validation (types can be derived directly from schemas), and catches mistakes early — especially valuable once rate-limit threshold logic and AI response parsing get more complex in later phases.
- **No rate-limiting packages yet** — intentionally excluded from Phase 1 scaffolding. These will be added manually as Phase 2 begins, to keep the learning process hands-on rather than dependency-driven.
- **`resend` shares risk profile with `send`** — these two endpoints should eventually share the same rate-limit bucket (keyed by phone number), not be treated as independently-limited routes.
- **Ownership check on `cancel`** is intentionally left as a TODO in Phase 1 — it's an authorization concern, not a rate-limiting one, but it's flagged here so it isn't forgotten.
