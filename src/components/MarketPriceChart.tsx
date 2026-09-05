"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { Activity, RefreshCw } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/lib/locale";
import {
  formatAxisPrice,
  formatMarketPrice,
  formatPct,
  MARKET_COINS,
  MARKET_QUOTES,
  MARKET_RANGES,
  MARKET_REFRESH_SEC,
  type MarketSnapshot,
} from "@/lib/market";
import { cn } from "@/lib/cn";

type Props = {
  locale: Locale;
  t: Dictionary;
};

const W = 960;
const H = 360;
const PAD = { top: 24, right: 72, bottom: 36, left: 16 };
const VOL_H = 48;

function buildAreaPath(
  prices: { t: number; v: number }[],
  xOf: (t: number) => number,
  yOf: (v: number) => number,
  baselineY: number,
  mode: "above" | "below",
): string {
  if (prices.length < 2) return "";
  const parts: string[] = [];
  let drawing = false;

  for (let i = 0; i < prices.length - 1; i++) {
    const a = prices[i]!;
    const b = prices[i + 1]!;
    const aAbove = a.v >= prices[0]!.v;
    const bAbove = b.v >= prices[0]!.v;
    const want = mode === "above";

    if (aAbove === want && bAbove === want) {
      if (!drawing) {
        parts.push(`M ${xOf(a.t)} ${baselineY} L ${xOf(a.t)} ${yOf(a.v)}`);
        drawing = true;
      }
      parts.push(`L ${xOf(b.t)} ${yOf(b.v)}`);
    } else if (aAbove === want || bAbove === want) {
      const baseline = prices[0]!.v;
      const denom = b.v - a.v || 1e-9;
      const ratio = (baseline - a.v) / denom;
      const cx = a.t + (b.t - a.t) * ratio;
      const cy = baseline;

      if (aAbove === want) {
        if (!drawing) {
          parts.push(`M ${xOf(a.t)} ${baselineY} L ${xOf(a.t)} ${yOf(a.v)}`);
          drawing = true;
        }
        parts.push(`L ${xOf(cx)} ${yOf(cy)} L ${xOf(cx)} ${baselineY} Z`);
        drawing = false;
      } else {
        parts.push(`M ${xOf(cx)} ${baselineY} L ${xOf(cx)} ${yOf(cy)} L ${xOf(b.t)} ${yOf(b.v)}`);
        drawing = true;
      }
    } else if (drawing) {
      parts.push(`L ${xOf(a.t)} ${baselineY} Z`);
      drawing = false;
    }
  }

  if (drawing) {
    const last = prices[prices.length - 1]!;
    parts.push(`L ${xOf(last.t)} ${baselineY} Z`);
  }

  return parts.join(" ");
}

function buildLinePath(
  prices: { t: number; v: number }[],
  xOf: (t: number) => number,
  yOf: (v: number) => number,
): string {
  if (!prices.length) return "";
  return prices
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xOf(p.t)} ${yOf(p.v)}`)
    .join(" ");
}

function formatAxisTime(ts: number, days: number, locale: Locale): string {
  const d = new Date(ts);
  const loc = locale === "ja" ? "ja-JP" : "en-US";
  if (days <= 1) {
    return d.toLocaleTimeString(loc, { hour: "numeric", minute: "2-digit" });
  }
  if (days <= 7) {
    return d.toLocaleString(loc, { month: "short", day: "numeric", hour: "numeric" });
  }
  return d.toLocaleDateString(loc, { month: "short", day: "numeric" });
}

export function MarketPriceChart({ locale, t }: Props) {
  const [coinId, setCoinId] = useState("ripple");
  const [quoteId, setQuoteId] = useState("jpy");
  const [days, setDays] = useState(7);
  const [data, setData] = useState<(MarketSnapshot & { stale?: boolean }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(MARKET_REFRESH_SEC);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/market?coin=${encodeURIComponent(coinId)}&quote=${encodeURIComponent(quoteId)}&days=${days}`,
        { signal: ac.signal, cache: "no-store" },
      );
      const json = (await res.json()) as MarketSnapshot & { error?: string; stale?: boolean };
      if (!res.ok) throw new Error(json.error || t.marketError);
      setData(json);
      setError(null);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError(err instanceof Error ? err.message : t.marketError);
    } finally {
      if (!ac.signal.aborted) {
        setLoading(false);
        setCountdown(MARKET_REFRESH_SEC);
      }
    }
  }, [coinId, quoteId, days, t.marketError]);

  useEffect(() => {
    void load();
    return () => abortRef.current?.abort();
  }, [load]);

  useEffect(() => {
    const tick = window.setInterval(() => {
      setCountdown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    if (countdown === 0) {
      void load();
    }
  }, [countdown, load]);

  const chart = useMemo(() => {
    const prices = data?.prices ?? [];
    if (prices.length < 2) return null;

    const plotW = W - PAD.left - PAD.right;
    const plotH = H - PAD.top - PAD.bottom - VOL_H;
    const tMin = prices[0]!.t;
    const tMax = prices[prices.length - 1]!.t;
    const vals = prices.map((p) => p.v);
    const vMin = Math.min(...vals);
    const vMax = Math.max(...vals);
    const pad = (vMax - vMin) * 0.08 || vMax * 0.02 || 1;
    const yMin = vMin - pad;
    const yMax = vMax + pad;
    const baseline = prices[0]!.v;
    const last = prices[prices.length - 1]!;
    const up = last.v >= baseline;

    const xOf = (t: number) => PAD.left + ((t - tMin) / (tMax - tMin || 1)) * plotW;
    const yOf = (v: number) => PAD.top + ((yMax - v) / (yMax - yMin || 1)) * plotH;
    const baselineY = yOf(baseline);

    const volumes = data?.volumes ?? [];
    const maxVol = Math.max(...volumes.map((v) => v.v), 1);

    const xTicks = 6;
    const yTicks = 5;
    const xLabels = Array.from({ length: xTicks }, (_, i) => {
      const t = tMin + ((tMax - tMin) * i) / (xTicks - 1);
      return { t, x: xOf(t), label: formatAxisTime(t, days, locale) };
    });
    const yLabels = Array.from({ length: yTicks }, (_, i) => {
      const v = yMax - ((yMax - yMin) * i) / (yTicks - 1);
      return { v, y: yOf(v) };
    });

    return {
      prices,
      volumes,
      maxVol,
      xOf,
      yOf,
      baselineY,
      baseline,
      last,
      up,
      plotH,
      xLabels,
      yLabels,
      abovePath: buildAreaPath(prices, xOf, yOf, baselineY, "above"),
      belowPath: buildAreaPath(prices, xOf, yOf, baselineY, "below"),
      linePath: buildLinePath(prices, xOf, yOf),
    };
  }, [data, days, locale]);

  const displayPrice = hoverIdx != null && data?.prices[hoverIdx] ? data.prices[hoverIdx]!.v : data?.price;
  const change = data?.changePeriod ?? data?.change24h ?? null;
  const positive = (change ?? 0) >= 0;
  const coin = data?.coin ?? MARKET_COINS.find((c) => c.id === coinId)!;
  const quote = data?.quote ?? MARKET_QUOTES.find((q) => q.id === quoteId)!;

  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    if (!chart || !data) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    let bestDist = Infinity;
    chart.prices.forEach((p, i) => {
      const dist = Math.abs(chart.xOf(p.t) - x);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    setHoverIdx(best);
  };

  return (
    <section className="animate-fade-up space-y-4" style={{ animationDelay: "80ms" }}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-signal/30 bg-signal/10 px-3 py-1 text-xs font-medium text-signal">
            <Activity className="h-3.5 w-3.5" />
            {t.marketLiveBadge}
          </div>
          <h2 className="font-display text-2xl text-white md:text-3xl">{t.marketTitle}</h2>
          <p className="mt-1 max-w-2xl text-sm text-mist-muted">{t.marketSub}</p>
        </div>
      </div>

      <div className="surface overflow-hidden p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="market-coin">
            {t.marketCrypto}
          </label>
          <select
            id="market-coin"
            className="input !w-auto !py-2 !text-sm"
            value={coinId}
            onChange={(e) => setCoinId(e.target.value)}
          >
            {MARKET_COINS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.symbol} · {c.name}
              </option>
            ))}
          </select>

          <span className="text-mist-muted">/</span>

          <label className="sr-only" htmlFor="market-quote">
            {t.marketQuote}
          </label>
          <select
            id="market-quote"
            className="input !w-auto !py-2 !text-sm"
            value={quoteId}
            onChange={(e) => setQuoteId(e.target.value)}
          >
            {MARKET_QUOTES.map((q) => (
              <option key={q.id} value={q.id}>
                {q.label}
              </option>
            ))}
          </select>

          <div className="ml-auto flex flex-wrap gap-1">
            {MARKET_RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setDays(r.days)}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-xs font-semibold transition",
                  days === r.days
                    ? "bg-signal/15 text-signal"
                    : "text-mist-muted hover:bg-white/5 hover:text-white",
                )}
              >
                {t[r.labelKey]}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-baseline gap-3">
          <div className="font-display text-3xl font-semibold text-white md:text-4xl">
            {displayPrice != null ? formatMarketPrice(displayPrice, quote.id, locale) : "—"}
          </div>
          <div
            className={cn(
              "rounded-lg px-2 py-1 text-sm font-semibold",
              positive ? "bg-[#16c784]/15 text-[#16c784]" : "bg-[#ea3943]/15 text-[#ea3943]",
            )}
          >
            {formatPct(change, locale)}
          </div>
          <div className="text-sm text-mist-muted">
            {coin.symbol} / {quote.label}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-white/5 bg-ink-950/60">
          {loading && !data ? (
            <div className="flex h-[280px] items-center justify-center text-sm text-mist-muted md:h-[360px]">
              {t.marketLoading}
            </div>
          ) : error && !data ? (
            <div className="flex h-[280px] flex-col items-center justify-center gap-3 text-sm text-ember-soft md:h-[360px]">
              <p>{error}</p>
              <button type="button" className="btn-ghost !py-1.5 !text-xs" onClick={() => void load()}>
                {t.marketRetry}
              </button>
            </div>
          ) : chart ? (
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="h-auto w-full touch-pan-y"
              role="img"
              aria-label={`${coin.symbol} ${quote.label} ${t.marketTitle}`}
              onMouseMove={onMove}
              onMouseLeave={() => setHoverIdx(null)}
            >
              <defs>
                <linearGradient id="volFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8796b0" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#8796b0" stopOpacity="0.05" />
                </linearGradient>
              </defs>

              {chart.yLabels.map((tick) => (
                <g key={tick.v}>
                  <line
                    x1={PAD.left}
                    x2={W - PAD.right}
                    y1={tick.y}
                    y2={tick.y}
                    stroke="rgba(255,255,255,0.06)"
                  />
                  <text
                    x={W - PAD.right + 8}
                    y={tick.y + 4}
                    fill="#8796b0"
                    fontSize="11"
                    fontFamily="var(--font-mono)"
                  >
                    {formatAxisPrice(tick.v, quote.id, locale)}
                  </text>
                </g>
              ))}

              {chart.volumes.map((v, i) => {
                const x = chart.xOf(v.t);
                const next = chart.volumes[i + 1];
                const width = next ? Math.max(1, chart.xOf(next.t) - x - 1) : 3;
                const h = (v.v / chart.maxVol) * VOL_H;
                const y = H - PAD.bottom - h;
                return <rect key={v.t} x={x} y={y} width={width} height={h} fill="url(#volFill)" />;
              })}

              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={chart.baselineY}
                y2={chart.baselineY}
                stroke="rgba(200,212,232,0.35)"
                strokeDasharray="4 4"
              />

              <path d={chart.abovePath} fill="rgba(22,199,132,0.28)" />
              <path d={chart.belowPath} fill="rgba(234,57,67,0.28)" />
              <path
                d={chart.linePath}
                fill="none"
                stroke={chart.up ? "#16c784" : "#ea3943"}
                strokeWidth="2.2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              {chart.xLabels.map((tick) => (
                <text
                  key={tick.t}
                  x={tick.x}
                  y={H - 10}
                  textAnchor="middle"
                  fill="#8796b0"
                  fontSize="11"
                >
                  {tick.label}
                </text>
              ))}

              <rect
                x={W - PAD.right - 4}
                y={chart.yOf(chart.last.v) - 11}
                width={68}
                height={22}
                rx="4"
                fill={chart.up ? "#16c784" : "#ea3943"}
              />
              <text
                x={W - PAD.right + 30}
                y={chart.yOf(chart.last.v) + 4}
                textAnchor="middle"
                fill="#05070c"
                fontSize="11"
                fontWeight="700"
                fontFamily="var(--font-mono)"
              >
                {formatAxisPrice(chart.last.v, quote.id, locale)}
              </text>

              {hoverIdx != null && data?.prices[hoverIdx] && (
                <>
                  <line
                    x1={chart.xOf(data.prices[hoverIdx]!.t)}
                    x2={chart.xOf(data.prices[hoverIdx]!.t)}
                    y1={PAD.top}
                    y2={H - PAD.bottom}
                    stroke="rgba(255,255,255,0.25)"
                    strokeDasharray="3 3"
                  />
                  <circle
                    cx={chart.xOf(data.prices[hoverIdx]!.t)}
                    cy={chart.yOf(data.prices[hoverIdx]!.v)}
                    r="4.5"
                    fill={chart.up ? "#16c784" : "#ea3943"}
                    stroke="#05070c"
                    strokeWidth="2"
                  />
                </>
              )}
            </svg>
          ) : null}

          <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-ink-900/90 text-xs font-mono text-mist"
              aria-hidden
            >
              {countdown}
            </div>
            <button
              type="button"
              className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-ink-900/90 text-mist hover:text-signal"
              onClick={() => void load()}
              aria-label={t.marketRetry}
              title={t.marketRetry}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            </button>
          </div>
        </div>

        <div className="mt-5 border-t border-white/10 pt-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-lg text-white">
              {t.marketDataHeading
                .replace("{symbol}", coin.symbol)
                .replace("{quote}", quote.label)}
            </h3>
            <div className="flex items-center gap-2 text-xs">
              {data?.stale || (error && data) ? (
                <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-mist-muted">
                  {t.marketStale}
                </span>
              ) : data ? (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-signal/25 bg-signal/10 px-2 py-1 text-signal">
                  <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-signal" />
                  {t.marketLiveStatus}
                </span>
              ) : null}
            </div>
          </div>

          {data ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/8 bg-ink-950/40 px-4 py-3">
                <div className="text-[11px] uppercase tracking-wider text-mist-muted">
                  {t.marketRateLabel}
                </div>
                <div className="mt-1 font-display text-xl text-white">
                  {formatMarketPrice(data.price, quote.id, locale)}
                </div>
              </div>
              <div className="rounded-xl border border-white/8 bg-ink-950/40 px-4 py-3">
                <div className="text-[11px] uppercase tracking-wider text-mist-muted">
                  {t.marketChangeLabel.replace(
                    "{range}",
                    t[MARKET_RANGES.find((r) => r.days === days)?.labelKey ?? "marketRange7d"],
                  )}
                </div>
                <div
                  className={cn(
                    "mt-1 font-display text-xl",
                    positive ? "text-[#16c784]" : "text-[#ea3943]",
                  )}
                >
                  {formatPct(change, locale)}
                </div>
              </div>
              <div className="rounded-xl border border-white/8 bg-ink-950/40 px-4 py-3">
                <div className="text-[11px] uppercase tracking-wider text-mist-muted">
                  {t.marketUpdatedLabel}
                </div>
                <div className="mt-1 font-mono text-sm text-mist">
                  {new Date(data.updatedAt).toLocaleString(locale === "ja" ? "ja-JP" : "en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </div>
              </div>
            </div>
          ) : null}

          {!data && error ? <p className="mt-2 text-sm text-ember-soft">{error}</p> : null}
        </div>
      </div>
    </section>
  );
}
