# Honors Web App

This Vite + React project powers the Honors Ops dashboard. It now supports Supabase authentication with role-based access control.

## Development

```sh
npm install
npm run dev
```

The dev server expects the environment variables from `.env` (see below). The router automatically respects `import.meta.env.BASE_URL`, so when hosting at `/Honors/` make sure `VITE_APP_BASE=/Honors/` is defined.

## Environment Variables

Copy `.env.example` to `.env` and supply the following:

- `VITE_SUPABASE_URL` – Supabase project URL.
- `VITE_SUPABASE_ANON_KEY` – public anon key for client-side access.
- `VITE_APP_BASE` – optional base path override (set to `/Honors/` for GitHub Pages).
- `VITE_API_BASE`, `VITE_API_KEY` – optional API integration settings preserved from the mock data workflow.

## Authentication Setup

1. Create a Supabase project and enable Email authentication.
2. Run [`../db/supabase/app_users.sql`](../db/supabase/app_users.sql) in the Supabase SQL editor to create the `app_users` table, enum, and RLS policies.
3. After inviting your first user, mark them as an admin:

   ```sql
   update public.app_users
   set role = 'admin'
   where email = 'admin@example.com';
   ```

When a new authenticated user signs in, the app will automatically create a default `staff` profile record if one does not already exist.

## Build & Deploy

```sh
npm run build
```

The static output under `dist/` can be published to GitHub Pages. Ensure the Supabase environment variables are configured in the Pages workflow before deploying.

GitHub Pages needs a fallback page so route refreshes keep working on `https://mcnish12.github.io/Honors/`. The repo includes `public/404.html`, which implements the [spa-github-pages](https://github.com/rafrex/spa-github-pages) redirect with `pathSegmentsToKeep = 1`. Vite copies this file to `dist/404.html` during `npm run build`, so deploy both `index.html` and `404.html` together.
