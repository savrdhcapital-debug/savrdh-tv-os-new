# SAVRDH TV OS — Super Admin

Next.js local-first admin dashboard. Supabase email/password authentication and `public.platform_admins` role verification. All dashboard metrics are **illustrative demo data**, and module CRUD/Appearance Studio publish persist in this browser (not cloud or TVs).

## Run on Mac
```bash
cp .env.example .env.local
npm install
npm run dev -- --port 3000
```
Open http://localhost:3000/login and sign in as `admin@savrdhtvos.com` using your existing Supabase Auth password. Do not commit `.env.local`.

## Roadmap
Replace local demo records with server-authenticated Supabase CRUD + audit and role-based RLS; implement real charts and TV device publishing before production. Never use `service_role` in browser code.
