# NEXORA — Online Training Platform

Revenue-ready bilingual (JA default / EN) training service by **Sガンダム**.

## Stack

- Next.js 15 (App Router) + TypeScript
- SQLite (`better-sqlite3`) — lightweight, portable, production-capable for early stage
- JWT httpOnly sessions (`jose` + `bcryptjs`)
- Stripe Checkout (JPY) + webhook fulfillment
- Local checkout fallback for Japan ops before Stripe live keys are set
- Tailwind CSS — dark, high-contrast UI

## Features

- Course catalog, free previews, paid purchases
- Subscription plans (Personal / Pro / Team)
- Live workshop booking
- Learning progress + certificates
- Team lead capture (B2B)
- Admin revenue console
- JA/EN i18n

## Quick start

```bash
npm install
npm run db:seed
npm run dev
```

Open http://localhost:3000 (redirects to `/ja`).

### Accounts

| Role | Email | Notes |
|------|-------|-------|
| Super admin (Sガンダム) | set via `ADMIN_EMAIL` in `.env.local` | `npm run db:admin` |
| Demo learner | learner@nexora.jp | Password in seed output / `Learner!2026` |

## Security

- httpOnly JWT sessions (14-day), bcrypt password hashing
- Login/register rate limits + account lockout after failed attempts
- Same-origin checks on mutating APIs
- Strong password policy for registration
- Security headers (CSP, X-Frame-Options, nosniff, etc.)
- Role never accepted from client on register
- Probe path blocking in middleware

Rotate `AUTH_SECRET` and admin password before public launch.

## Deploy online with Vercel (standard Next.js flow)

Repo: https://github.com/kingenchiato/Trading-Study

This is the same flow most Next.js apps use:

1. Open **[vercel.com/new](https://vercel.com/new)**
2. Sign in with **GitHub**
3. Import **`kingenchiato/Trading-Study`**
4. Framework Preset: **Next.js** (auto-detected)
5. Add **Environment Variables** before deploy:

| Name | Value |
|------|--------|
| `AUTH_SECRET` | long random string (32+ chars) |
| `ADMIN_EMAIL` | `kingenchiato@gmail.com` |
| `ADMIN_PASSWORD` | your password |
| `ADMIN_NAME` | `Sガンダム` |
| `NEXT_PUBLIC_APP_URL` | leave blank first, or set after you get the `*.vercel.app` URL |
| `ALLOW_LOCAL_CHECKOUT` | `true` |

6. Click **Deploy**
7. After deploy succeeds, open the project → **Settings → Environment Variables** → set `NEXT_PUBLIC_APP_URL` to `https://YOUR-PROJECT.vercel.app` → **Redeploy**
8. Visit `https://YOUR-PROJECT.vercel.app/ja/login`

### CLI alternative (if you use it locally)

```bash
npm i -g vercel
cd "D:\Robort-AI trading"
vercel login
vercel
vercel --prod
vercel env add AUTH_SECRET
# ...add the other env vars, then redeploy
```

**Note:** On Vercel the SQLite file lives in `/tmp` (serverless). It is fine for viewing/demo; for long-term production data, move to a hosted DB (Turso/Neon) later.


## Business model (built-in)

1. **Course sales** — one-time JPY purchases  
2. **Subscriptions** — recurring Personal / Pro / Team  
3. **Live seats** — paid workshops  
4. **B2B leads** — team inquiry funnel for enterprise deals  
5. **Certificates** — completion credentials that reinforce paid completion
