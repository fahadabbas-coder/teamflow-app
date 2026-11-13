# TeamFlow

A kanban collaboration app for small teams. You create a project, add columns and tasks to the board, drag cards around, comment with @mentions, and everyone looking at the same board sees your changes within a second. Built with Express, Socket.IO, MongoDB, Redis, and a React (Vite) frontend.

## Repository structure

```
├── Backend/    # Express 5 + Socket.IO API (Node.js, CommonJS)
├── Frontend/   # React + Vite SPA (Tailwind CSS + Zustand)
├── docker-compose.yml  # Runs everything as containers
├── Dockerfile  # Single-image build (Backend + pre-built Frontend)
└── README.md
```

## Tech stack

| Layer        | Technologies |
|--------------|-------------|
| Backend      | Node.js, Express 5, Socket.IO, Mongoose (MongoDB), BullMQ (Redis queues) |
| Realtime     | Socket.IO with the `@socket.io/redis-adapter`, so multiple app instances share event fan-out |
| Auth         | JWT (access + refresh rotation), httpOnly cookies, OTP email verification |
| Validation   | Zod schemas + validate middleware. Requests are rejected before they reach a controller |
| Rate limit   | Redis fixed-window counter (a global API limit plus a strict auth limit) |
| Email        | Nodemailer (Gmail OAuth2) |
| Queues       | BullMQ workers for auth emails, notifications, reminders, and reindexing |
| Database     | MongoDB + Redis (caching, queues, token blacklist, rate limiting) |
| Frontend     | React 19 + Vite, Tailwind CSS, Zustand, React Router, Recharts |
| Board        | `@dnd-kit/core` + `@dnd-kit/sortable`, fractional position ordering |

## Features

### Authentication
- Register and login with email and password. New accounts get an emailed 6-digit OTP (valid 5 minutes, stored in Redis).
- Forgot password works the same way: you receive an OTP and set a new password.
- Access token lasts 15 minutes, refresh token 7 days, access token stored in broswer memory and refresh token stored as httpOnly cookies.
- Refresh tokens rotate on every use, and reusing an old token kills the whole session family. So a stolen refresh token is a one-shot problem, not a persistent backdoor.
- A sessions page lists your active sessions with a "logout everywhere" button.

### Projects and roles
- Four roles: owner, manager, member, viewer.
- Members are invited by email. Role changes and removals are limited to managers and owners.
- Settings include a danger zone with ownership transfer and project deletion. Deleted projects go to trash first, so mistakes are recoverable.

#### Who can do what

Roles are checked at two layers: `requireProjectRole` middleware on routes (minimum role level) and `requireTaskAccess` inside the task controller. Higher roles inherit everything below them.

| Action | Viewer | Member | Manager | Owner |
|---|:-:|:-:|:-:|:-:|
| View board, tasks, members, activity | ✓ | ✓ | ✓ | ✓ |
| Add a comment | ✓ | ✓ | ✓ | ✓ |
| Create a task | – | ✓ | ✓ | ✓ |
| Edit, move, delete, or restore a task | – | ✓ | ✓ | ✓ |
| Assign or unassign users on a task | – | ✓ | ✓ | ✓ |
| Edit own comment, delete own comment | ✓ | ✓ | ✓ | ✓ |
| Delete/restore someone else's comment | – | – | ✓ | ✓ |
| Update project name and description | – | – | ✓ | ✓ |
| Create, rename, reorder, delete columns | – | – | ✓ | ✓ |
| Invite members, remove members | – | – | ✓ | ✓ |
| Change a member's role | – | – | – | ✓ |
| Archive or delete the project | – | – | – | ✓ |
| Leave the project | ✓ | ✓ | ✓ | ✓ |

The hierarchy is strict: everyone assigned a role can view the project, but writing actions start at member, project administration at manager, and destructive actions (role change, archive, delete) are owner-only. Comments are the exception: any role can comment, enforced in the comment controller rather than the route middleware.

### Kanban board
- Columns on the left, task cards inside them. Both the column order and the card order are drag-and-drop.
- Card positions are fractional decimals: inserting a card between two others computes a mid-point, so a new card never shifts every other card's position.
- The task modal has a description, priority (low/medium/high/urgent), due dates, multiple assignees, labels, a checklist, and a cover image.
- Deleting a column asks where its tasks should go. Tasks deleted from the board stay in a trash view until you restore or purge them.
- The board can be filtered by text, priority, and assignee, and exported to CSV.

### Real-time sync
- Each client opens one socket and joins a personal room (`user:<id>`) plus one room per project they're in (`project:<id>`).
- Task and column changes emit `task:create`, `task:update`, `task:move`, `column:create` and similar events, so other members' boards update without a refresh.
- While someone is typing a comment or description, other members see a typing indicator.

### Comments and mentions
- Comments on a task support threaded replies. `@username` mentions are parsed out of the text and trigger a notification.

### Notifications
- The bell in the topbar shows an unread count and a dropdown of recent notifications.
- Email notifications are debounced to one email per 60 seconds per task, so a busy discussion doesn't flood your inbox. You can turn emails off per project in your member settings.
- Worker event types: `TASK_ASSIGNED`, `COMMENT_ADDED`, `MENTION`, `DUE_SOON`.

### Dashboard
- Per-project stats: task counts, a stacked open/done bar chart per assignee, a priority pie chart, a burndown line chart, and a throughput area chart (all Recharts).
- Aggregations are cached in Redis under `dash:<projectId>:...` keys and invalidated when relevant tasks change.

### Search
- One search box that returns tasks, projects, and comments from projects you belong to.

## Getting started (local dev)

### Prerequisites
- Node.js 20 or newer
- MongoDB (local or Atlas)
- Redis (local, or a cloud provider such as Upstash)

### Backend

```bash
cd Backend
npm install
cp .env.example .env         # fill all the values
npm run dev                  # API + Socket.IO on http://localhost:3000
```

#### Backend env variables (see `Backend/.env.example`)

| Variable             | Purpose |
|----------------------|---------|
| `MONGO_URI`          | MongoDB connection string |
| `JWT_REFRESH_SECRET` | Secret used to sign refresh tokens |
| `JWT_ACCESS_SECRET`  | Secret used to sign access tokens |
| `JWT_RESET_SECRET`   | Secret for password-reset tokens |
| `REDIS_URL`          | Redis connection (Socket.IO adapter + BullMQ + cache) |
| `CLIENT_ID`, `CLIENT_SECRET`, `REFRESH_TOKEN`, `EMAIL_USER` | Gmail OAuth2 credentials for Nodemailer (system emails) |
| `NODE_ENV`           | `development` / `production` |
| `CLIENT_URL`         | Frontend URL (CORS + email links) |
| `PORT`               | Server port (default `3000`) |

#### Background workers

Email delivery, reminders, and reindexing run as separate processes, not inside the API server. In production `docker-compose.yml` gives each worker its own container:

```bash
npm run worker:authEmail      # OTP + auth email deliveries
npm run worker:notification   # in-app notification fan-out + debounced emails
npm run worker:reminder       # due-date reminders
npm run worker:reindex        # dashboard re-aggregation
```

### Frontend

```bash
cd Frontend
npm install
cp .env.example .env         # set VITE_SOCKET_URL=http://localhost:3000
npm run dev                  # http://localhost:5173
```

The API runs on port 3000 and the Vite dev server on 5173, and the Vite server doesn't proxy requests, so `VITE_SOCKET_URL` is required in dev. The axios client calls relative `/api` routes; in production both apps are served from the same host (see the Docker section).

Start the Backend first (it needs the DB and Redis ready), then the Frontend.

## Running everything with Docker

`docker-compose.yml` builds a single image that:

1. Builds the Frontend (`npm run build` → `Frontend/dist`)
2. Copies that output into `Backend/public`, so Express serves the SPA on the same host and port
3. Runs the API + Socket.IO and the four workers, each in its own container

```bash
docker compose up --build
```

> Compose also provides MongoDB and Redis. Set `.env` values as environment entries in `docker-compose.yml` or via an env file.

## API overview

Base URL: `/api` (mounted in `Backend/src/app.js`)

- `/auth`     → register, verify OTP, login, refresh (cookie), logout, forgot / reset, sessions
- `/projects` → CRUD, members, roles, invites, trash / restore
- `/projects/:projectId/board` → columns + full board fetch
- `/projects/:projectId/columns` → column CRUD (position-aware)
- `/tasks` → CRUD, assign, comments (threaded, @mentions), labels, activity
- `/tasks/:id/activity`, `/projects/:projectId/activity` → activity feed (membership-checked, cursor-paginated)
- `/notifications` → list (cursor pagination, limit clamped), mark-as-read, opt-out settings
- `/dashboard` → per-project aggregations (Redis-cached)
- `/search` → global search across projects / tasks / comments

The Socket.IO server runs at the root (`/socket.io`). Clients connect with `auth: { token: <accessToken> }`.

### Input validation (zod)

Every `POST` and `PATCH` endpoint runs its body through a zod schema before the controller (`Backend/src/schemas/*.schema.js` and `src/middleware/validate.middleware.js`). Invalid requests get a `400` with `{ message: "Validation failed", errors: [...] }` and the controller is never called. The schemas also clean inputs: they trim strings, uppercase the project key, and require 24-hex Mongo ids for anything that references a document. Since the payload shape is checked here, the backend doesn't have to trust whatever the frontend sends.

### Rate limiting (Redis)

`Backend/src/middleware/rateLimit.middleware.js` counts requests in a Redis fixed window (`INCR` + `EXPIRE`):

- Global API limit: 100 requests per minute per user (or per IP for unauthenticated requests).
- Auth routes (login, register, OTP, reset): 20 requests per 10 minutes per IP, which keeps brute-force and OTP spam from running unattended.
- If Redis is down, the limiter fails open and the API keeps working; the error is just logged.
- Going over a limit returns `429 Too many requests`.

### Pagination

List endpoints clamp the `limit` and `page` values clients send instead of trusting them (helpers in `src/utils/pagination.js`):

| Endpoint            | Strategy |
|---------------------|----------|
| `GET /tasks` (list) | Page/limit with a `pagination` meta object, limit clamped to 200 per page |
| Task comments       | Latest 300 comments per task (threaded; orphan replies become roots), plus `pagination: { total, returned, truncated }` |
| Activity feed       | Cursor-based (`_id` cursor), limit clamped to 100 |
| Notifications       | Cursor-based, limit clamped to 50 |
| Search              | Each result section clamped to 50 |
| Board (`/board`)    | Full fetch by design, since the kanban needs every column and task |


## Contributing

1. Branch off with `git checkout -b feature/<name>`
2. Run `npm run lint` in `Frontend` before pushing. Zero errors expected; a few library-related warnings are fine
3. Keep the brand name consistent: TeamFlow
