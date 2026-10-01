# VGD E-Learning Hub

## Run locally

Install dependencies and start Vite:

```sh
npm install
npm run dev
```

The project uses seeded browser data when Supabase credentials are absent.

## Connect Supabase

The local `.env.local` file contains this project's URL and publishable key. For another machine, copy `.env.example` to `.env.local` and set:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Restart Vite after changing environment values. The legacy `VITE_SUPABASE_ANON_KEY` name is also supported. Publishable keys are intended for browser apps; never put a service-role key in a `VITE_` variable. Database access is controlled by the Row Level Security policies in the schema.

In the Supabase Dashboard, open **SQL Editor** and run `supabase/schema.sql`, followed by `supabase/seed.sql`. The seed supplies demo users, including `sammymalik@admin.edu.ph` with password `admin123`, which can be used to approve teacher applications in **Users**. Replace demo credentials and remove demo records before production use.

Students and teachers can register after any required email confirmation. Both account types remain inactive until an administrator approves the application from **Users**. Apply the updated schema before enabling sign-up so the profile trigger and approval protections are installed.

## Checks

```sh
npm run build
npm run lint
```
