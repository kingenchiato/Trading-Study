import { NextRequest, NextResponse } from "next/server";
import {
  getCoin,
  getQuote,
  type MarketPoint,
  type MarketSnapshot,
  MARKET_COINS,
  MARKET_QUOTES,
} from "@/lib/market";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CacheEntry = { expires: number; softExpires: number; data: MarketSnapshot };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 45_000;
const SOFT_TTL_MS = 15_000;

function downsample(points: MarketPoint[], maxPoints: number): MarketPoint[] {
  if (points.length <= maxPoints) return points;
  const step = (points.length - 1) / (maxPoints - 1);
  const out: MarketPoint[] = [];
  for (let i = 0; i < maxPoints; i++) {
    out.push(points[Math.round(i * step)]!);
  }
  return out;
}

function toPoints(raw: unknown): MarketPoint[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (!Array.isArray(row) || row.length < 2) return null;
      const t = Number(row[0]);
      const v = Number(row[1]);
      if (!Number.isFinite(t) || !Number.isFinite(v)) return null;
      return { t, v };
    })
    .filter((p): p is MarketPoint => p != null);
}

function periodChange(prices: MarketPoint[]): number | null {
  if (prices.length < 2) return null;
  const first = prices[0]!.v;
  const last = prices[prices.length - 1]!.v;
  if (!first) return null;
  return ((last - first) / first) * 100;
}

async function fetchCoinGecko(coinId: string, vs: string, days: number) {
  const chartUrl = new URL(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart`);
  chartUrl.searchParams.set("vs_currency", vs);
  chartUrl.searchParams.set("days", String(days));

  const chartRes = await fetch(chartUrl.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "NEXORA-MarketChart/1.0",
    },
    cache: "no-store",
  });

  if (!chartRes.ok) {
    throw new Error(`Market chart upstream error (${chartRes.status})`);
  }

  const chartJson = (await chartRes.json()) as {
    prices?: unknown;
    total_volumes?: unknown;
  };

  const prices = downsample(toPoints(chartJson.prices), 180);
  const volumes = downsample(toPoints(chartJson.total_volumes), 180);
  const last = prices.at(-1)?.v ?? 0;
  const change = periodChange(prices);

  return {
    prices,
    volumes,
    price: last,
    change24h: days <= 1 ? change : null,
    changePeriod: change,
  };
}

export async function GET(req: NextRequest) {
  const coinId = req.nextUrl.searchParams.get("coin") || "bitcoin";
  const quoteId = req.nextUrl.searchParams.get("quote") || "jpy";
  const daysRaw = Number(req.nextUrl.searchParams.get("days") || "7");
  const days = [1, 7, 30, 90, 365].includes(daysRaw) ? daysRaw : 7;

  const coin = getCoin(coinId);
  const quote = getQuote(quoteId);
  if (!coin || !quote) {
    return NextResponse.json(
      { error: "Invalid coin or quote", coins: MARKET_COINS, quotes: MARKET_QUOTES },
      { status: 400 },
    );
  }

  const cacheKey = `${coin.id}:${quote.id}:${days}`;
  const hit = cache.get(cacheKey);
  const now = Date.now();

  if (hit && hit.softExpires > now) {
    return NextResponse.json(hit.data, {
      headers: { "Cache-Control": "public, max-age=15, stale-while-revalidate=45" },
    });
  }

  try {
    const live = await fetchCoinGecko(coin.id, quote.vs, days);
    const data: MarketSnapshot = {
      coin,
      quote,
      days,
      price: live.price,
      change24h: live.change24h,
      changePeriod: live.changePeriod,
      prices: live.prices,
      volumes: live.volumes,
      updatedAt: new Date().toISOString(),
    };
    cache.set(cacheKey, {
      expires: now + CACHE_TTL_MS,
      softExpires: now + SOFT_TTL_MS,
      data,
    });
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=15, stale-while-revalidate=45" },
    });
  } catch (err) {
    if (hit && hit.expires > now) {
      return NextResponse.json(
        { ...hit.data, stale: true },
        { headers: { "Cache-Control": "public, max-age=10" } },
      );
    }
    const message = err instanceof Error ? err.message : "Market data unavailable";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
