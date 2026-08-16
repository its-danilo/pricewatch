# Pricewatch worker

Python job that checks every active monitor and sends alerts. Runs on a schedule
via GitHub Actions (`.github/workflows/check-prices.yml`), and can be run locally.

## How it works
1. Reads active monitors from Supabase (REST, service-role key).
2. For each monitor that is **due** (Free: daily, Pro: hourly), fetches the page
   with `httpx`, falling back to **Playwright** for JavaScript-rendered pages.
3. Extracts the price with a layered strategy (`price_parser.py`): JSON-LD
   `Product`/`Offer` first, then meta tags, then an optional CSS selector.
4. Writes a `price_history` snapshot, updates the monitor, and emails the owner
   (via Resend) on a price drop below target or a restock.

## Run locally
```bash
cd worker
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m playwright install chromium      # optional, for JS pages
cp .env.example .env                        # then fill in
python check_prices.py
```

## Notes on scraping
Be a good citizen: the worker sends a descriptive User-Agent, spaces requests
out, and runs at low frequency. Some sites block bots (Cloudflare and similar);
Playwright helps but cannot guarantee access. Only public product pages are
supported.
