# Honors Web App

This Vite + React + TypeScript single-page application powers the Honors dashboard and relies on Supabase for authentication. The client exchanges Supabase auth codes for sessions, persists those sessions, and keeps the `public.app_users` record in sync for each signed-in user.

## Development

```sh
npm install
npm run dev
```

The dev server runs on `http://localhost:5173/Honors/` because the Vite base path is fixed to `/Honors/`. Provide the environment variables listed below (via `.env` or your shell) before starting the dev server so Supabase requests succeed.

## Environment Variables

| Variable | Description |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL. |
| `VITE_SUPABASE_ANON_KEY` | Public anon key used by the browser client. |

## Supabase setup

1. Enable email (magic link) authentication in Supabase.
2. Run [`../db/supabase/app_users.sql`](../db/supabase/app_users.sql) to create the `public.app_users` table, trigger, and row-level security policies.
3. Add the production URL (`https://mcnish12.github.io/Honors/`) to the list of allowed redirect URLs in Supabase Auth settings.

When a user signs in, the app exchanges the `code` parameter for a session (even when Supabase redirects to `/#/?code=...` on GitHub Pages). After authenticating it fetches the caller’s `app_users` row and inserts one if it is missing.

## Build & Deploy

```sh
npm run build
```

The static output in `dist/` can be published to GitHub Pages. The GitHub Actions workflow already injects the Supabase environment variables during the build and deploy steps.

GitHub Pages requires a fallback page so hash-based routing keeps working on `https://mcnish12.github.io/Honors/`. The repo includes `public/404.html`, which Vite copies during `npm run build`.

## Test plan

1. Clear browser storage, load `https://mcnish12.github.io/Honors/`, and confirm the app redirects to `/#/login`.
2. Enter your email and request a magic link. After following the email link, ensure the code is exchanged, the URL is cleaned, and the dashboard renders without getting stuck on the session spinner.
3. Verify the dashboard shows the `app_users` email, display name, created timestamp, and ID. First-time users should see a record automatically created.
4. Refresh the page to confirm the persisted session loads without re-entering credentials.
5. Click **Sign out** and confirm the app returns to the login screen.
