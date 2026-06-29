# PeopleFlow — full stack

PeopleFlow is an HR / HRMS marketing site plus a real auth backend.
This repo is a small monorepo with three deployable units:

| Folder                | Stack                            | Container port |
| --------------------- | -------------------------------- | -------------- |
| `hr_z&o_frontend/`    | Static HTML/CSS/JS + nginx       | `80`           |
| `hr_z&o_backend/`     | Node 20 + Express + PostgreSQL   | `4000`         |
| `(docker-compose)`    | + Postgres 16                    | `5432`         |

The frontend uses nginx to serve static files **and** reverse-proxies
`/api/*` to the backend, so the browser only ever talks to one origin.
No CORS gymnastics needed.

---

## 🚀 Quick start (one command)

You need **Docker Desktop** running. Then, from this folder:

```bash
docker compose up --build
```

That builds the two images and starts the three containers. Wait until you
see lines like `PeopleFlow backend listening on :4000` and `nginx/1.27.x`,
then open:

| URL                                   | What you get                                 |
| ------------------------------------- | -------------------------------------------- |
| <http://localhost:8080/>              | Marketing homepage                           |
| <http://localhost:8080/pages/signup.html> | Real signup that creates a row in Postgres |
| <http://localhost:8080/pages/login.html>  | Real login that returns a JWT             |
| <http://localhost:8080/api/health>    | Backend health check                         |
| <http://localhost:4000/api/health>    | Same, directly (bypassing nginx)             |
| `localhost:5432`                      | Postgres (user/pass below)                   |

Default Postgres credentials (override via `.env`):

```
host: localhost
port: 5432
db:   peopleflow
user: peopleflow
pass: peopleflow
```

### Stopping everything

```bash
docker compose down            # stop and remove containers
docker compose down -v         # also wipe the database volume
```

---

## 📁 Repo layout

```
Hr_Z-O/
├── docker-compose.yaml          ← orchestrates postgres + backend + frontend
├── .env.example                 ← copy to .env to override secrets
├── README.md                    ← you're here
│
├── hr_z&o_frontend/             ← the static site
│   ├── index.html
│   ├── peopleflow.html          ← original Lovable export (kept as backup)
│   ├── 404.html
│   ├── favicon.svg
│   ├── site.webmanifest
│   ├── robots.txt
│   ├── sitemap.xml
│   ├── nginx.conf               ← serves static + proxies /api → backend
│   ├── Dockerfile               ← nginx:alpine image
│   ├── .dockerignore
│   ├── serve.ps1                ← local dev (no Docker needed)
│   ├── assets/
│   │   ├── css/site.css         ← shared design system
│   │   └── js/
│   │       ├── site.js          ← nav, footer year, password toggle
│   │       └── auth.js          ← talks to /api/auth/*
│   └── pages/
│       ├── login.html, signup.html
│       ├── about.html, contact.html, careers.html
│       ├── blog.html, help.html
│       └── privacy.html, terms.html, security.html
│
└── hr_z&o_backend/              ← Node + Express API
    ├── Dockerfile               ← node:20-alpine image
    ├── .dockerignore
    ├── .env.example             ← copy to .env for standalone use
    ├── package.json
    ├── README.md
    └── src/
        ├── server.js            ← entry point
        ├── db.js                ← pg connection pool
        ├── auth.js              ← JWT sign/verify helpers
        ├── migrate.js           ← creates tables on boot
        └── routes/
            ├── auth.routes.js   ← /api/auth/signup|login|me
            └── contact.routes.js
```

---

## 🔌 API endpoints

| Method | Path                  | Body / headers                              | Notes                       |
| ------ | --------------------- | ------------------------------------------- | --------------------------- |
| GET    | `/api/health`         | —                                           | Liveness probe              |
| POST   | `/api/auth/signup`    | `{ firstName, lastName, email, password, company?, size?, phone? }` | Creates a user, returns `{ token, user }` |
| POST   | `/api/auth/login`     | `{ email, password }`                       | Returns `{ token, user }`   |
| GET    | `/api/auth/me`        | `Authorization: Bearer <token>`             | Returns the current user    |
| POST   | `/api/contact`        | `{ name, email, message, company?, topic? }` | Stores a contact request    |

Passwords are bcrypt-hashed (12 rounds). Tokens are JWTs signed with
`JWT_SECRET` and expire after `JWT_EXPIRES_IN` (default 7 days).

---

## 🧪 Try it without a browser

```bash
# Create an account
curl -X POST http://localhost:8080/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Demo","lastName":"User","email":"demo@peopleflow.in","password":"demopass123","company":"PeopleFlow"}'

# Log in
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@peopleflow.in","password":"demopass123"}'

# Use the returned token
curl http://localhost:8080/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🛠️ Local development (without Docker)

### Frontend only

```powershell
cd "hr_z&o_frontend"
powershell -ExecutionPolicy Bypass -File .\serve.ps1
```

Opens at <http://localhost:8080>. Forms will fail until you also run the
backend (because there's no `/api` proxy in this mode).

### Backend only

```bash
# In one shell — run Postgres in a container
docker run --rm -d --name pgdev \
  -e POSTGRES_USER=peopleflow \
  -e POSTGRES_PASSWORD=peopleflow \
  -e POSTGRES_DB=peopleflow \
  -p 5432:5432 postgres:16-alpine

# In another shell — run the API
cd hr_z&o_backend
cp .env.example .env
npm install
npm start                       # listens on :4000
```

---

## ⚠️ Before deploying to production

- [ ] Generate a strong `JWT_SECRET` (e.g. `openssl rand -hex 48`).
- [ ] Set a real Postgres password (do **not** ship the default).
- [ ] Put the stack behind HTTPS (Caddy, Cloudflare, or an Nginx
      reverse-proxy with Let's Encrypt).
- [ ] Disable the host port mapping on `postgres` (keep it internal-only)
      unless you actually need to connect from outside Docker.
- [ ] Add a daily backup of the `peopleflow-pgdata` volume.
- [ ] Update domain names in `sitemap.xml`, `robots.txt`, and OG meta tags.
