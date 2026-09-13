# Crewboard

A dispatch board for a field-service company: see every technician, the jobs each one holds and how loaded they are, then assign or unassign jobs. All data lives in Postgres and is seeded with realistic fake technicians and jobs.

| Light | Dark |
|---|---|
| ![Dispatch board in the light theme](docs/screenshots/dispatch-board-light.png) | ![Dispatch board in the dark theme](docs/screenshots/dispatch-board-dark.png) |

## Stack

| Layer | Tech |
|---|---|
| Web | React 19, TypeScript, Vite, TanStack Query, TanStack Table |
| Design system | Tailwind CSS v4 with semantic light/dark tokens, shadcn/ui-style components on Radix, lucide icons, Inter, sonner toasts |
| API | Node, Express 5, TypeScript, Zod |
| Database | Postgres 17 (Docker Compose), Prisma 7 |
| Tests | Jest, Testing Library, Supertest against a real test database; GitHub Actions CI |

## Getting started

Prerequisites: Node.js 22+ (see `.nvmrc`) and Docker.

```bash
npm install
cp apps/api/.env.example apps/api/.env
npm run setup   # start Postgres, generate the Prisma client, migrate, seed
npm run dev     # API and web app with hot reload
```

Open http://localhost:5176. The API listens on http://localhost:8003 and the web dev server proxies `/api` to it.

### Ports

Crewboard avoids the usual defaults so it can run next to other local stacks.

| Service | Default | Override |
|---|---|---|
| Postgres (host) | 5435 | `POSTGRES_PORT=5440 npm run db:up`, then update both URLs in `apps/api/.env` |
| API | 8003 | `PORT` in `apps/api/.env` |
| Web | 5176 | `API_PROXY_TARGET` points the dev proxy at a different API URL |

## Scripts

Run from the repository root.

| Command | What it does |
|---|---|
| `npm run dev` | Run the API and web app together |
| `npm run setup` | `db:up`, generate the Prisma client, `db:migrate`, `db:seed` |
| `npm run db:up` / `db:down` | Start / stop the Postgres container |
| `npm run db:migrate` | Apply migrations to `DATABASE_URL` |
| `npm run db:seed` | Wipe and re-seed technicians and jobs (deterministic) |
| `npm run db:reset` | Drop everything, re-apply migrations, re-seed |
| `npm run typecheck` | Type-check both apps |
| `npm test` | API integration tests and web component tests |
| `npm run build` | Production build of the web app |

## How it works

### Data model

- **skill_categories**: name (unique), e.g. Appliance Repair
- **skills**: a specialty within a category, e.g. Appliance Repair › Refrigerators; name (globally unique), `category_id`
- **technicians**: name, email (unique), phone, designation, region; specialties through **technician_skills** (`technician_id`, `skill_id`)
- **jobs**: title, description, customer, address, required specialty (`skill_id`), priority (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), scheduled date, nullable `technician_id`, `assigned_at`

A technician has many jobs and a job has at most one technician, so the foreign key lives on `jobs`; `technician_id = NULL` means unassigned. A technician's load is the number of jobs they hold.

The seed creates 7 skill categories with 30 specialties, 12 technicians with a deliberately uneven workload and 2–5 specialties from one or two categories each, and 40 jobs (24 assigned, 16 unassigned). Assigned jobs always require a specialty the technician has.

Technicians include `specialties: { id, name, category: { id, name } }[]` (sorted by category, then specialty) and jobs include `skill: { id, name, category: { id, name } }`. The older `skills` (specialty names) and `requiredSkill` (specialty name) fields are still returned.

### API

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/health` | API and database health |
| GET | `/api/technicians` | Technicians with `assignedJobCount`, sorted by name |
| GET | `/api/jobs` | All jobs, by scheduled date, then priority |
| GET | `/api/jobs?unassigned=true` | Jobs with no technician |
| GET | `/api/jobs?technicianId=<uuid>` | Jobs held by one technician |
| PATCH | `/api/jobs/:id/assignment` | `{ "technicianId": "<uuid>" }` assigns, `{ "technicianId": null }` unassigns |

Errors always use `{ "error": { "code", "message" } }`: `400 VALIDATION_ERROR` / `BAD_REQUEST`, `404 JOB_NOT_FOUND` / `TECHNICIAN_NOT_FOUND`, `409 JOB_ALREADY_ASSIGNED`.

Assignment is a conditional update on `technician_id IS NULL`, so when two dispatchers assign the same job at once exactly one wins and the other gets `409`. Unassigning is idempotent.

### Web app

- **Dispatch board**: stat cards (technicians and how many are free, assigned jobs, unassigned jobs with the urgent count, technicians at a heavy workload) above a searchable, sortable technicians table with a workload meter per person.
- **Assign job** opens a dialog of unassigned jobs, with jobs matching the technician's skills ranked first, then by priority and date.
- **View jobs** opens a side sheet with the technician's details and assigned jobs, each with **Unassign**.
- After every change the table, stats, sheet and dialog refetch; a job someone else just took shows the conflict inside the dialog.

Workload levels: 0 jobs Available, 1–2 Light, 3–4 Steady, 5+ Heavy.

### Frontend architecture

- **Tokens** (`apps/web/src/index.css`): semantic OKLCH colors for light (`:root`) and dark (`.dark`), mapped into Tailwind. Components only use tokens such as `bg-card` or `text-muted-foreground`, which is what makes both themes work. Contrast is checked against WCAG AA.
- **Theming**: `ThemeProvider` follows the OS or a saved Light/Dark/System choice; a small script in `index.html` applies it before first paint so there is no flash.
- **Components**, in layers: `components/ui` (owned primitives on Radix and class-variance-authority) → `components/dashboard` (domain components with explicit props) → `DispatchBoard`, which owns state and data.
- **Data**: `lib/api.ts` (typed client, `ApiError`) and `lib/queries.ts` (TanStack Query hooks; mutations invalidate technicians and jobs on settle).

## Testing

- **API**: Jest + Supertest against a real Postgres database. `TEST_DATABASE_URL` is migrated once per run and reset to a small known fixture before every test, including a concurrent-assignment race.
- **Web**: Jest + Testing Library, querying by role and accessible name. `App.test.tsx` drives the whole board against an in-memory API.
- **CI**: every pull request runs type-checking, both test suites against a Postgres service, and the web build.

## Project structure

```
apps/
  api/
    prisma/            schema, migrations, seed
    src/routes/        health, technicians, jobs
    test/              integration tests and fixtures
  web/
    src/components/    ui, dashboard, layout, theme
    src/lib/           api client, queries, formatting, workload
docker-compose.yml     Postgres
docker/postgres/init/  creates the test database on first start
.github/workflows/     CI
```

## Out of scope

Authentication, creating or editing technicians and jobs, reassigning a job in one step, capacity or hours-based load, and scheduling.
