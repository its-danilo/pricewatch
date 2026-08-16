"""Price extraction from a product page.

Strategy, most robust first:
  1. JSON-LD (schema.org Product/Offer) -> price + availability
  2. Meta tags (og:price / product:price / itemprop=price)
  3. A user-supplied CSS selector
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass

from bs4 import BeautifulSoup


@dataclass
class Extraction:
    price: float | None
    in_stock: bool


def parse_price(text: str | None) -> float | None:
    """Turn '$1,299.00' or '1.299,90' into a float."""
    if not text:
        return None
    cleaned = re.sub(r"[^\d.,]", "", str(text))
    if not cleaned:
        return None
    # If both separators exist, the last one is the decimal separator.
    if "," in cleaned and "." in cleaned:
        if cleaned.rfind(",") > cleaned.rfind("."):
            cleaned = cleaned.replace(".", "").replace(",", ".")
        else:
            cleaned = cleaned.replace(",", "")
    elif "," in cleaned:
        # Treat comma as decimal only when it looks like one (2 trailing digits).
        cleaned = (
            cleaned.replace(",", ".")
            if re.search(r",\d{2}$", cleaned)
            else cleaned.replace(",", "")
        )
    try:
        return round(float(cleaned), 2)
    except ValueError:
        return None


def _iter_json_ld(soup: BeautifulSoup):
    for tag in soup.find_all("script", type="application/ld+json"):
        raw = tag.string or tag.get_text()
        if not raw:
            continue
        try:
            data = json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            continue
        if isinstance(data, list):
            yield from data
        elif isinstance(data, dict):
            if "@graph" in data and isinstance(data["@graph"], list):
                yield from data["@graph"]
            else:
                yield data


def _from_json_ld(soup: BeautifulSoup) -> Extraction | None:
    for node in _iter_json_ld(soup):
        if not isinstance(node, dict):
            continue
        offers = node.get("offers")
        if not offers:
            continue
        offer = offers[0] if isinstance(offers, list) else offers
        if not isinstance(offer, dict):
            continue
        price = parse_price(offer.get("price") or offer.get("lowPrice"))
        if price is None:
            continue
        availability = str(offer.get("availability", "")).lower()
        in_stock = "outofstock" not in availability and "soldout" not in availability
        return Extraction(price=price, in_stock=in_stock)
    return None


def _from_meta(soup: BeautifulSoup) -> Extraction | None:
    selectors = [
        ("meta", {"property": "product:price:amount"}),
        ("meta", {"property": "og:price:amount"}),
        ("meta", {"itemprop": "price"}),
    ]
    for name, attrs in selectors:
        tag = soup.find(name, attrs=attrs)
        if tag and tag.get("content"):
            price = parse_price(tag["content"])
            if price is not None:
                return Extraction(price=price, in_stock=True)
    return None


def _from_selector(soup: BeautifulSoup, selector: str | None) -> Extraction | None:
    if not selector:
        return None
    el = soup.select_one(selector)
    if el:
        price = parse_price(el.get_text())
        if price is not None:
            return Extraction(price=price, in_stock=True)
    return None


def extract(html: str, selector: str | None = None) -> Extraction:
    soup = BeautifulSoup(html, "html.parser")
    for strategy in (
        lambda: _from_json_ld(soup),
        lambda: _from_selector(soup, selector),
        lambda: _from_meta(soup),
    ):
        result = strategy()
        if result is not None:
            return result
    return Extraction(price=None, in_stock=True)
