/**
 * The HugFab backend this app talks to, committed.
 *
 * Two values and a base URL, all three public by construction:
 *
 * - **The API base URL** is the website everyone already visits.
 * - **The Supabase project URL** is in every request the website's own browser
 *   bundle makes.
 * - **The Supabase anon key** is shipped to every browser that loads
 *   hugfab.com, and `EXPO_PUBLIC_*` is inlined into the JS bundle anyway — an
 *   APK is a zip, so a key in an app is a published key whether it is committed
 *   or not. RLS is what constrains it, not obscurity.
 *
 * So these are defaults in the repository rather than values somebody has to
 * know and set. A fresh clone, an Expo Go run and an EAS build all reach the
 * right project without a `.env` nobody shared.
 *
 * `EXPO_PUBLIC_*` still wins where it is set (`src/lib/env.ts`), which is how
 * you point the app at a local `next dev` or a staging project.
 *
 * **The anon key is the only Supabase key that may ever appear here.**
 * `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS entirely; a client that needs it is
 * a design error, not a configuration problem.
 *
 * The project is `hugfabAI`, ref `ysozrdmjtguwawywkgsj` — the same project
 * HUGFAB-AI reads as `NEXT_PUBLIC_SUPABASE_URL` and
 * `NEXT_PUBLIC_SUPABASE_ANON_KEY`, because the API validates the bearer token
 * this app sends against that project's auth server (HUGFAB-AI
 * `src/lib/supabase/server.ts`, `createBearerSupabase`). A token from any other
 * project is simply not a user there.
 *
 * The anon key is the legacy JWT form, which is what the web app's env
 * documents. The project also has a modern `sb_publishable_…` key and
 * supabase-js accepts either; if the project rotates to it, this one value
 * changes and nothing else does.
 */
export const publicConfig = {
  apiBaseUrl: 'https://hugfab.com',
  supabaseUrl: 'https://ysozrdmjtguwawywkgsj.supabase.co',
  supabaseAnonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlzb3pyZG1qdGd1d2F3eXdrZ3NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0ODYyNDcsImV4cCI6MjEwNTA2MjI0N30.E7EiJQTPvveLA2s6OagjEreEcfQfcBwp54g7OHTTlxE',
} as const;
