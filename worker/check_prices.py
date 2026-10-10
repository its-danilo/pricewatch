"""Pricewatch worker.

Runs on a schedule (GitHub Actions), checks every active monitor that is due,
stores a price snapshot and emails the owner on a price drop or a restock.

Talks to Supabase through the REST API with the service-role key (bypasses RLS).
"""

from __future__ import annotations

import os
import time
from datetime import datetime, timedelta, timezone

import httpx
from dotenv import load_dotenv

from price_parser import extract

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
ALERT_FROM = os.getenv("ALERT_FROM_EMAIL", "Pricewatch <onboarding@resend.dev>")

UA = "Mozilla/5.0 (compatible; PricewatchBot/1.0; +https://github.com/its-danilo/pricewatch)"
FREE_INTERVAL = timedelta(hours=24)
PRO_INTERVAL = timedelta(hours=1)
# Accounts with these emails are checked on the Pro schedule without a subscription.
OWNER_EMAILS = {e.strip().lower() for e in os.getenv("OWNER_EMAILS", "").split(",") if e.strip()}

rest = httpx.Client(
    base_url=f"{SUPABASE_URL}/rest/v1",
    headers={
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
    },
    timeout=20,
)


# --- Supabase helpers -------------------------------------------------------

def get_active_monitors() -> list[dict]:
    r = rest.get("/monitors", params={"active": "eq.true", "select": "*"})
    r.raise_for_status()
    return r.json()


def get_plans() -> dict[str, str]:
    r = rest.get("/accounts", params={"select": "id,plan"})
    r.raise_for_status()
    return {a["id"]: a.get("plan", "free") for a in r.json()}


def update_monitor(monitor_id: str, fields: dict) -> None:
    rest.patch("/monitors", params={"id": f"eq.{monitor_id}"}, json=fields).raise_for_status()


def insert_history(monitor_id: str, price: float | None, in_stock: bool) -> None:
    rest.post(
        "/price_history",
        json={"monitor_id": monitor_id, "price": price, "in_stock": in_stock},
    ).raise_for_status()


def insert_alert(monitor_id: str, alert_type: str, price: float | None) -> None:
    rest.post(
        "/alerts",
        json={"monitor_id": monitor_id, "type": alert_type, "price": price, "channel": "email"},
    ).raise_for_status()


def get_user_email(user_id: str) -> str | None:
    r = httpx.get(
        f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}",
        headers={"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}"},
        timeout=20,
    )
    return r.json().get("email") if r.status_code == 200 else None


# --- Fetching ---------------------------------------------------------------

def fetch_html(url: str) -> str | None:
    try:
        r = httpx.get(url, headers={"User-Agent": UA}, follow_redirects=True, timeout=25)
        if r.status_code == 200 and len(r.text) > 500:
            return r.text
    except httpx.HTTPError:
        pass
    return None


def fetch_html_rendered(url: str) -> str | None:
    """Playwright fallback for JavaScript-rendered pages (optional dependency)."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return None
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page(user_agent=UA)
            page.goto(url, wait_until="domcontentloaded", timeout=30000)
            page.wait_for_timeout(1500)
            html = page.content()
            browser.close()
            return html
    except Exception:
        return None


# --- Email ------------------------------------------------------------------

def alert_html(label: str, url: str, price: float | None, reason: str) -> str:
    return (
        f'<div style="font-family:sans-serif;max-width:480px">'
        f"<h2 style=\"margin:0 0 8px\">{label}</h2>"
        f"<p style=\"color:#475569\">Your monitored product {reason}.</p>"
        f'<p style="font-size:22px;font-weight:700;margin:12px 0">Current price: {price}</p>'
        f'<p><a href="{url}" style="color:#059669">View product</a></p>'
        f"</div>"
    )


def send_email(to: str | None, subject: str, html: str) -> None:
    if not RESEND_API_KEY or not to:
        return
    httpx.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
        json={"from": ALERT_FROM, "to": [to], "subject": subject, "html": html},
        timeout=20,
    )


# --- Core -------------------------------------------------------------------

def is_due(monitor: dict, plan: str) -> bool:
    last = monitor.get("last_checked")
    if not last:
        return True
    interval = PRO_INTERVAL if plan == "pro" else FREE_INTERVAL
    last_dt = datetime.fromisoformat(last.replace("Z", "+00:00"))
    return datetime.now(timezone.utc) - last_dt >= interval


def as_float(value) -> float | None:
    return float(value) if value is not None else None


def process(monitor: dict) -> None:
    monitor_id = monitor["id"]
    url = monitor["url"]

    html = fetch_html(url)
    result = extract(html, monitor.get("selector")) if html else None
    if result is None or result.price is None:
        rendered = fetch_html_rendered(url)
        if rendered:
            result = extract(rendered, monitor.get("selector"))

    now = datetime.now(timezone.utc).isoformat()

    if result is None or result.price is None:
        update_monitor(monitor_id, {"last_checked": now, "last_status": "error"})
        print(f"  ! {url} -> price not found")
        return

    prev_price = as_float(monitor.get("last_price"))
    prev_status = monitor.get("last_status")
    status = "in_stock" if result.in_stock else "out_of_stock"

    insert_history(monitor_id, result.price, result.in_stock)
    update_monitor(
        monitor_id,
        {"last_checked": now, "last_price": result.price, "last_status": status},
    )
    print(f"  ok {url} -> {result.price} ({status})")

    label = monitor.get("label") or url
    target = as_float(monitor.get("target_price"))
    email: str | None = None

    if target is not None and result.price <= target and (prev_price is None or prev_price > target):
        email = get_user_email(monitor["user_id"])
        insert_alert(monitor_id, "drop", result.price)
        send_email(email, f"Price drop: {label}", alert_html(label, url, result.price, "dropped to or below your target"))
        print("    -> drop alert sent")

    if result.in_stock and prev_status == "out_of_stock":
        email = email or get_user_email(monitor["user_id"])
        insert_alert(monitor_id, "restock", result.price)
        send_email(email, f"Back in stock: {label}", alert_html(label, url, result.price, "is back in stock"))
        print("    -> restock alert sent")


def main() -> None:
    monitors = get_active_monitors()
    plans = get_plans()
    if OWNER_EMAILS:
        for user_id in {m["user_id"] for m in monitors}:
            if plans.get(user_id) != "pro" and (get_user_email(user_id) or "").lower() in OWNER_EMAILS:
                plans[user_id] = "pro"
    print(f"{len(monitors)} active monitor(s)")

    checked = 0
    for monitor in monitors:
        plan = plans.get(monitor["user_id"], "free")
        if not is_due(monitor, plan):
            continue
        checked += 1
        try:
            process(monitor)
        except Exception as exc:  # keep going even if one monitor fails
            print(f"  ! error on {monitor.get('url')}: {exc}")
        time.sleep(1)  # be polite between requests

    print(f"done: checked {checked} of {len(monitors)}")


if __name__ == "__main__":
    main()
