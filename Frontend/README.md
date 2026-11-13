# TeamFlow Frontend

React SPA for TeamFlow, a kanban collaboration app. Talks to the Express + Socket.IO backend in `../Backend`.

## Tech stack

- React 19 + the Vite 8 dev server and build tool
- Tailwind CSS v4, with the theme colors declared in `src/index.css` (an `@theme` block defines the `primary` palette plus shared `.btn-primary` and `.input-field` classes)
- Zustand stores as client-side caches: `authStore`, `boardStore`, `notificationStore`, `projectStore`, `dashboardStore`
- React Hook Form for form state
- `@dnd-kit/core` + `@dnd-kit/sortable` for drag and drop
- Recharts for the dashboard charts (assignee / priority / burndown / throughput)
- socket.io-client for realtime events
- axios as the HTTP client, with an interceptor that refreshes the access token on 401s
- lucide-react icons and react-hot-toast

## Getting started

```bash
npm install
npm run dev
# http://localhost:5173
```

The backend has to be running first. Start it from `../Backend` with `npm run dev` (port 3000), then start the frontend.

### Environment

Copy `.env.example` to `.env`:

```
VITE_SOCKET_URL=http://localhost:3000
```

`VITE_SOCKET_URL` is the backend's Socket.IO URL. It's required in dev because the Vite server doesn't proxy any requests, and without it sockets stay disconnected. In production the built app is served by the backend itself (`Frontend/dist` is copied into `Backend/public`), so same-origin works without this variable.

## Scripts

| Script             | What it does |
|--------------------|-------------|
| `npm run dev`      | Vite dev server on port 5173 |
| `npm run build`    | Production build to `dist/` |
| `npm run lint`     | ESLint with React Compiler and react-hooks rules enabled |
| `npm run preview`  | Preview the production build |

## Routes

| Path                                  | Screen                | Notes |
|---------------------------------------|-----------------------|-------|
| `/login`                              | Login                 |        |
| `/register`                           | Register              | Email OTP verification comes next |
| `/verifyemail`                        | Verify email (OTP)    | 6-digit code, valid 5 minutes |
| `/forgetpassword`                     | Forgot password       |        |
| `/`                                   | Home                  |        |
| `/profile`                            | Profile               |        |
| `/projects`                           | Projects              | Cards + filters |
| `/projects/:id`                       | Kanban board          | `?task=<id>` in the URL opens the task modal, so links and the back button work |
| `/projects/:id/dashboard`             | Project dashboard     | Four Recharts panels |
| `/projects/:id/settings`              | Project settings      | Members, general, and danger-zone tabs (role-gated in the UI) |
| `/projects/:id/activity`              | Activity feed         | Cursor-paginated |
| `*`                                   | 404 fallback          |        |

The app routes sit inside a layout (topbar, sidebar, notification bell). If there's no session, protected routes redirect to `/login`.

## Project structure

```
src/
├── api/           # axios instance + per-resource API modules
│   ├── axios.js   # attaches the access token, auto-refreshes on 401
│   └── auth.js, projects.js, tasks.js, columns.js, members.js, ...
├── components/    # UI components grouped by feature
│   ├── board/     # Column, TaskCard, FilterBar, AddColumnModal, TrashModal, DeleteColumnModal
│   ├── task/      # TaskModal, AssigneePicker, CommentPanel
│   ├── dashboard/ # AssigneeChart, PriorityChart, BurndownChart, ThroughputChart
│   ├── layout/    # Topbar, Sidebar, SearchBox
│   ├── notifications/ # NotificationBell, NotificationDropdown
│   ├── projects/  # CreateProjectModal, ProjectCard
│   ├── settings/  # InviteMemberModal
│   └── ui/        # shared primitives
├── hooks/
│   ├── useAuth.js     # session bootstrap (fetches /auth/get-me)
│   └── useSocket.js   # one socket.io connection (auth + project rooms)
├── pages/         # top-level route components
├── stores/        # Zustand stores (auth, project, board, notification, dashboard)
├── utils/         # CSV export, mention parsing, task filters
├── App.jsx        # router
└── main.jsx
```


