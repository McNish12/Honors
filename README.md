# Own Ops CRM

A minimal, production-friendly setup for managing jobs across calendar, kanban, and Gmail.

## Stack Overview

- **/api** – Node/Express service backed by Postgres.
- **/db** – SQL schema for companies, contacts, jobs, activities, and related records.
- **/scripts** – Google Apps Script that bridges starred Gmail threads into the API.
- **/web** – Vite + React dashboard with a calendar, kanban board, and job detail panel.

## Getting Started

### Database

1. Create a Postgres database (local Docker or managed).
2. Run the schema script:

   ```sh
   psql "$DATABASE_URL" -f db/schema.sql
   ```

### API

1. Install dependencies and copy the environment template:

   ```sh
   cd api
   npm install
   cp .env.example .env
   ```

2. Update `.env` with your Postgres connection information and API key.
3. Start the service:

   ```sh
   npm start
   ```

   The API listens on `http://localhost:8787` by default. All requests must include the `x-api-key` header.

### Gmail Bridge

The script in `scripts/apps_script/bridge.gs` can be pasted into Apps Script. Set the `API_BASE` and `API_KEY` values, then add a time-driven trigger (for example, every 10 minutes). Starred emails containing `[J:#####]` in the subject or `#12345` in the body will be ingested as activities.

### Web App

1. Install the frontend dependencies:

   ```sh
   cd web
   npm install
   ```

2. Add environment variables as needed (`VITE_API_BASE`, `VITE_API_KEY`, `VITE_CURRENT_USER`).
3. Run locally:

   ```sh
   npm run dev
   ```

4. Build for production:

   ```sh
   npm run build
   ```

## Navigation

- `/` – Dashboard (protected).
- `/jobs` – Jobs (protected; coming soon).
- `/onboarding` – Onboarding (protected; shown when a profile is incomplete).

Both `/jobs` and `/onboarding` reuse the Supabase-authenticated guard so they are only accessible after signing in.

### Deployment

GitHub Actions (`.github/workflows/pages.yml`) builds the React app and publishes the static bundle to the `gh-pages` branch whenever `main` is updated.

## Phase 1 — Auth & Roles

The web dashboard now requires authentication backed by Supabase. Follow these steps to configure a new environment:

1. **Create a Supabase project**
   - Enable **Email** authentication under **Authentication → Providers**.
   - Under **Authentication → URL Configuration**, add your GitHub Pages deployment URL (e.g. `https://mcnish12.github.io/Honors/`).

2. **Configure environment variables**
   - Copy `web/.env.example` to `web/.env` and populate:

     ```env
     VITE_SUPABASE_URL=your-project-url
     VITE_SUPABASE_ANON_KEY=your-public-anon-key
     VITE_APP_BASE=/Honors/
     VITE_API_BASE=optional-api-base
     VITE_API_KEY=optional-api-key
     ```

   - Add the same values to the GitHub Pages build pipeline secrets if you deploy from CI.

3. **Create the app_users table and policies**
   - In Supabase SQL Editor, run [`db/supabase/app_users.sql`](db/supabase/app_users.sql). This script creates:
     - The `user_role` enum (`admin`, `staff`, `viewer`).
     - The `app_users` table keyed by the auth user id.
     - Row Level Security policies so users can read/insert their own profile and admins can manage all profiles.

4. **Seed your initial admin**
   - After inviting your first user (via email/password), run the update at the bottom of the SQL script with their email:

     ```sql
     update public.app_users
     set role = 'admin'
     where email = 'admin@example.com';
     ```

5. **Local development**
   - With the `.env` file populated, start the app via `npm run dev` inside `web/` and sign in with your Supabase credentials.

6. **Deployment considerations**
   - Vite reads `VITE_APP_BASE` to ensure routes work from the `/Honors/` subpath on GitHub Pages.
   - The login flow persists sessions via Supabase and automatically provisions a default `staff` profile the first time a user signs in.
   - If Supabase is unreachable the UI will show a retry option inside the guard.

## Folder Helper Endpoint

The frontend expects a lightweight helper listening on `http://localhost:5210/open` that opens Windows network folders. The helper should accept a `path` query parameter (UNC path) and open it locally.

## API Routes

- `GET /health` – health check.
- `GET /jobs?status=` – list up to 200 jobs, optionally filtered by status.
- `POST /jobs` – create a new job.
- `PATCH /jobs/:id` – update job status and/or in-hands date.
- `POST /activities/ingest` – upsert a job and attach an activity from Gmail.

All routes require the `x-api-key` header.
