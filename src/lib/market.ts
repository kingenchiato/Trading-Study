export type MarketCoin = {
  id: string;
  symbol: string;
  name: string;
};

export type MarketQuote = {
  id: string;
  label: string;
  /** CoinGecko `vs_currency` parameter */
  vs: string;
};

export const MARKET_COINS: MarketCoin[] = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "ripple", symbol: "XRP", name: "XRP" },
  { id: "solana", symbol: "SOL", name: "Solana" },
  { id: "binancecoin", symbol: "BNB", name: "BNB" },
  { id: "cardano", symbol: "ADA", name: "Cardano" },
  { id: "dogecoin", symbol: "DOGE", name: "Dogecoin" },
  { id: "avalanche-2", symbol: "AVAX", name: "Avalanche" },
  { id: "polkadot", symbol: "DOT", name: "Polkadot" },
  { id: "chainlink", symbol: "LINK", name: "Chainlink" },
];

export const MARKET_QUOTES: MarketQuote[] = [
  { id: "jpy", label: "JPY", vs: "jpy" },
  { id: "usd", label: "USD", vs: "usd" },
  { id: "usdt", label: "USDT", vs: "usd" },
  { id: "eur", label: "EUR", vs: "eur" },
  { id: "gbp", label: "GBP", vs: "gbp" },
  { id: "krw", label: "KRW", vs: "krw" },
];

export const MARKET_RANGES = [
  { id: "1", days: 1, labelKey: "marketRange1d" as const },
  { id: "7", days: 7, labelKey: "marketRange7d" as const },
  { id: "30", days: 30, labelKey: "marketRange30d" as const },
  { id: "90", days: 90, labelKey: "marketRange90d" as const },
  { id: "365", days: 365, labelKey: "marketRange1y" as const },
] as const;

export type MarketPoint = { t: number; v: number };

export type MarketSnapshot = {
  coin: MarketCoin;
  quote: MarketQuote;
  days: number;
  price: number;
  change24h: number | null;
  changePeriod: number | null;
  prices: MarketPoint[];
  volumes: MarketPoint[];
  updatedAt: string;
};

export const MARKET_REFRESH_SEC = 60;

export function getCoin(id: string): MarketCoin | undefined {
  return MARKET_COINS.find((c) => c.id === id);
}

export function getQuote(id: string): MarketQuote | undefined {
  return MARKET_QUOTES.find((q) => q.id === id);
}

export function formatMarketPrice(value: number, quoteId: string, locale: string): string {
  const abs = Math.abs(value);
  let maximumFractionDigits = 2;
  let minimumFractionDigits = 2;

  if (quoteId === "jpy" || quoteId === "krw") {
    maximumFractionDigits = abs >= 100 ? 0 : abs >= 1 ? 2 : 4;
    minimumFractionDigits = abs >= 100 ? 0 : 2;
  } else if (abs >= 1000) {
    maximumFractionDigits = 2;
  } else if (abs >= 1) {
    maximumFractionDigits = 4;
    minimumFractionDigits = 2;
  } else {
    maximumFractionDigits = 6;
    minimumFractionDigits = 4;
  }

  const currency =
    quoteId === "usdt"
      ? "USD"
      : quoteId === "jpy"
        ? "JPY"
        : quoteId === "eur"
          ? "EUR"
          : quoteId === "gbp"
            ? "GBP"
            : quoteId === "krw"
              ? "KRW"
              : "USD";

  try {
    const formatted = new Intl.NumberFormat(locale === "ja" ? "ja-JP" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits,
      minimumFractionDigits,
    }).format(value);
    return quoteId === "usdt" ? formatted.replace(/US\$|\$/, "USDT ") : formatted;
  } catch {
    return `${value.toFixed(maximumFractionDigits)} ${quoteId.toUpperCase()}`;
  }
}

/** Compact numeric label for chart axes (no currency symbol). */
export function formatAxisPrice(value: number, quoteId: string, locale: string): string {
  const abs = Math.abs(value);
  const loc = locale === "ja" ? "ja-JP" : "en-US";

  if (abs >= 1_000_000) {
    return new Intl.NumberFormat(loc, {
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(value);
  }

  let maximumFractionDigits = 2;
  if (quoteId === "jpy" || quoteId === "krw") {
    maximumFractionDigits = abs >= 100 ? 0 : abs >= 1 ? 1 : 3;
  } else if (abs >= 1000) {
    maximumFractionDigits = 0;
  } else if (abs >= 1) {
    maximumFractionDigits = 2;
  } else if (abs >= 0.01) {
    maximumFractionDigits = 4;
  } else {
    maximumFractionDigits = 6;
  }
  return new Intl.NumberFormat(loc, {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(value);
}

export function formatPct(value: number | null, locale: string): string {
  if (value == null || Number.isNaN(value)) return "—";
  const formatted = new Intl.NumberFormat(locale === "ja" ? "ja-JP" : "en-US", {
    signDisplay: "exceptZero",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
  return `${formatted}%`;
}
