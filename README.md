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

## Deploy online (from this GitHub repo)

Repo: https://github.com/kingenchiato/Trading-Study

### Recommended: Render (connect GitHub → public HTTPS URL)

1. Open [https://dashboard.render.com/select-repo?type=web](https://dashboard.render.com/select-repo?type=web)
2. Sign in with GitHub and select **`kingenchiato/Trading-Study`**
3. Settings:
   - **Build Command:** `npm ci && npm run build`
   - **Start Command:** `npm run start:online`
   - **Instance:** Free
4. Environment variables:

| Key | Value |
|-----|--------|
| `AUTH_SECRET` | long random string (32+ chars) |
| `ADMIN_EMAIL` | `kingenchiato@gmail.com` |
| `ADMIN_PASSWORD` | your admin password |
| `ADMIN_NAME` | `Sガンダム` |
| `NEXT_PUBLIC_APP_URL` | your Render URL, e.g. `https://nexora-xxxx.onrender.com` |
| `ALLOW_LOCAL_CHECKOUT` | `true` (until Stripe is configured) |

5. Deploy → open the Render URL → `/ja/login`

Note: Free Render sleeps after idle and may reset the SQLite file on redeploy unless you add a paid disk. Re-seed happens automatically via `start:online` when the DB is missing.

### Docker (VPS / Railway)

```bash
docker build -t nexora .
docker run -p 3000:3000 --env-file .env.local -v nexora-data:/app/data nexora
```


## Business model (built-in)

1. **Course sales** — one-time JPY purchases  
2. **Subscriptions** — recurring Personal / Pro / Team  
3. **Live seats** — paid workshops  
4. **B2B leads** — team inquiry funnel for enterprise deals  
5. **Certificates** — completion credentials that reinforce paid completion
