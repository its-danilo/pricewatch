# Pricewatch

A price and stock monitoring SaaS. Paste a product URL, set a target price, and
get an email when it drops or comes back in stock. Free tier plus a paid Pro plan.

> Live demo: _add your Vercel URL here_

## Features
- Email magic-link and Google sign in (Supabase Auth)
- Add product monitors with an optional target price and CSS selector
- Background **Python worker** that scrapes prices on a schedule and stores history
- Email alerts on price drops and restocks (Resend)
- Monthly subscription with Stripe (Free: 3 monitors / daily, Pro: 30 / hourly)
- Per-user data isolation with Postgres Row-Level Security

## Architecture
- **Web app** (`/src`): Next.js (App Router, TypeScript) + Tailwind. Dashboard,
  auth and Stripe billing. Deployed on Vercel.
- **Worker** (`/worker`): Python job that does the scraping and alerting. It uses
  `httpx` + `BeautifulSoup`, with **Playwright** as a fallback for JavaScript
  pages, and a layered price parser (JSON-LD, then meta tags, then CSS selector).
  Scheduled by GitHub Actions (`.github/workflows/check-prices.yml`).
- **Supabase**: Postgres + Auth + RLS. The worker connects with the service-role
  key; the web app uses the anon key scoped by RLS.

## Getting started
See [SETUP.md](./SETUP.md). Short version:

```bash
cp .env.example .env.local   # fill in Supabase + Stripe
npm install
npm run dev                  # web app at http://localhost:3000

cd worker                    # the scraper
pip install -r requirements.txt
cp .env.example .env         # fill in Supabase (+ Resend for emails)
python check_prices.py
```
