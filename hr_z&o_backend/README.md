# PeopleFlow — Backend

Tiny Node.js + Express + PostgreSQL service that backs the PeopleFlow
frontend. Currently exposes:

| Method | Path                  | Notes                                     |
| ------ | --------------------- | ----------------------------------------- |
| GET    | `/api/health`         | Liveness / readiness probe                |
| POST   | `/api/auth/signup`    | Create account → `{ token, user }`        |
| POST   | `/api/auth/login`     | Email + password → `{ token, user }`      |
| GET    | `/api/auth/me`        | Returns the logged-in user (JWT required) |
| POST   | `/api/contact`        | Stores a contact-form submission          |

Passwords are hashed with bcrypt (12 rounds). Sessions are issued as JWTs
signed with `JWT_SECRET` and expire after `JWT_EXPIRES_IN` (default 7 days).

## Run via docker-compose (recommended)

From the repository root:

```bash
docker compose up --build
```

That brings up `postgres`, `backend`, and `frontend` together. The backend
applies its schema on boot (`src/migrate.js`).

## Run standalone

```bash
cd hr_z&o_backend
cp .env.example .env       # then edit DATABASE_URL etc.
npm install
npm run migrate            # creates tables (idempotent)
npm start                  # boots on http://localhost:5000
```

## Schema

See `src/migrate.js`. Two tables:

- `users` — id, first/last name, email (unique), company, size, phone,
  password_hash, timestamps.
- `contact_messages` — id, name, email, company, topic, message, created_at.
