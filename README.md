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

## Go live (revenue)

1. Create a [Stripe](https://stripe.com) Japan account
2. Put live keys in `.env.local`
3. Set `ALLOW_LOCAL_CHECKOUT=false`
4. Point webhook to `https://your-domain/api/stripe/webhook`
5. Deploy (`npm run build && npm start`) behind HTTPS

## Business model (built-in)

1. **Course sales** — one-time JPY purchases  
2. **Subscriptions** — recurring Personal / Pro / Team  
3. **Live seats** — paid workshops  
4. **B2B leads** — team inquiry funnel for enterprise deals  
5. **Certificates** — completion credentials that reinforce paid completion
