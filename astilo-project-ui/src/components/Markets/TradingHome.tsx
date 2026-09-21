import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Landmark, PieChart, Search, TrendingDown, TrendingUp, Wallet } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { AppInput, useConfirm } from "../shared";
import { searchMarkets, fetchTopCrypto, type AssetType, type MarketSearchResult } from "../../lib/marketsApi";
import {
  depositTradingFunds,
  fetchTradingAccount,
  fetchTradingInsights,
  fetchTradingOrders,
  placeTradingOrder,
  suggestionForHolding,
} from "../../lib/tradingApi";
import { cardCvc, cardExpiry, cardNumber as validateCardNumber, required } from "../../lib/validators";
import "./Markets.scss";
import "./Trading.scss";

const formatCardNumber = (v: string) => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
const formatExpiry = (v: string) => {
  const digits = v.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};
const money = (n: number | null | undefined, decimals = 2) =>
  n == null ? "—" : n.toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: decimals, maximumFractionDigits: decimals });

type CardBrand = "visa" | "mastercard" | "amex" | "discover" | null;

const detectBrand = (digits: string): CardBrand => {
  if (/^4/.test(digits)) return "visa";
  if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return "mastercard";
  if (/^3[47]/.test(digits)) return "amex";
  if (/^6(?:011|5)/.test(digits)) return "discover";
  return null;
};

const ChipIcon = () => (
  <div className="relative h-8 w-11 overflow-hidden rounded-md bg-gradient-to-br from-yellow-200 via-yellow-400 to-yellow-600 shadow-inner">
    <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 gap-px p-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-[2px] border border-yellow-700/40 bg-yellow-300/40" />
      ))}
    </div>
    <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-yellow-700/30" />
  </div>
);

const ContactlessIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" className="text-white/70">
    <path d="M8 5a10 10 0 0 1 0 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M5 8a6 6 0 0 1 0 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.75" />
    <path d="M11 2a14 14 0 0 1 0 20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.5" />
  </svg>
);

const VisaMark = ({ className = "" }: { className?: string }) => (
  <span className={`font-display italic tracking-tight text-white ${className}`}>
    VISA<span className="text-[#f7b600]">.</span>
  </span>
);

const MastercardMark = ({ className = "" }: { className?: string }) => (
  <div className={`relative flex items-center ${className}`}>
    <div className="h-7 w-7 rounded-full bg-[#eb001b]" />
    <div className="-ml-3.5 h-7 w-7 rounded-full bg-[#f79e1b] mix-blend-screen" />
  </div>
);

const AmexMark = ({ className = "" }: { className?: string }) => (
  <div className={`rounded-[3px] bg-[#2557a7] px-2 py-1 ${className}`}>
    <span className="text-[11px] font-extrabold tracking-tight text-white">AMEX</span>
  </div>
);

const DiscoverMark = ({ className = "" }: { className?: string }) => (
  <div className={`flex items-center gap-1 ${className}`}>
    <span className="font-display font-extrabold italic tracking-tight text-white">Discover</span>
    <span className="h-3 w-3 rounded-full bg-[#f68121]" />
  </div>
);

const AcceptedNetworks = () => (
  <div className="flex items-center gap-3 opacity-40">
    <VisaMark className="text-sm" />
    <MastercardMark className="scale-[0.55]" />
    <AmexMark className="scale-90" />
    <DiscoverMark className="text-xs" />
  </div>
);

const BrandLogo = ({ brand }: { brand: CardBrand }) => {
  if (brand === "visa") return <VisaMark className="text-2xl" />;
  if (brand === "mastercard") return <MastercardMark />;
  if (brand === "amex") return <AmexMark />;
  if (brand === "discover") return <DiscoverMark className="text-base" />;
  return <AcceptedNetworks />;
};

const DepositModal = ({ onClose }: { onClose: () => void }) => {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("1000");
  const [name, setName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [touched, setTouched] = useState(false);

  const depositMutation = useMutation({
    mutationFn: async () => {
      await new Promise((r) => setTimeout(r, 1200)); // simulated gateway round-trip
      return depositTradingFunds({ amount: Number(amount), name, cardNumber: cardNumber.replace(/\s/g, ""), expiry, cvv });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trading", "account"] });
      toast.success(`Deposited ${money(Number(amount))} (simulated) to your trading account.`);
      onClose();
    },
    onError: () => toast.error("Payment declined (simulated) — please try again."),
  });

  const amountNum = Number(amount);
  const digits = cardNumber.replace(/\s/g, "");
  const brand = detectBrand(digits);
  const errors = {
    amount: !amountNum || amountNum <= 0 ? "Enter an amount" : null,
    name: required(name, "Name on card"),
    cardNumber: validateCardNumber(digits),
    expiry: cardExpiry(expiry),
    cvv: cardCvc(cvv),
  };
  const isValid = Object.values(errors).every((e) => !e);

  return (
    <div className="trading-modal-overlay" onClick={onClose}>
      <div className="trading-modal trading-modal--payment glass-card" onClick={(e) => e.stopPropagation()}>
        <h3>Deposit simulated funds</h3>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setTouched(true);
            if (!isValid) return;
            depositMutation.mutate();
          }}
        >
          {/* Card preview */}
          <div className="relative aspect-[2.1/1] w-full overflow-hidden rounded-2xl bg-gradient-to-br from-[#251a38] via-[#2e2048] to-[#171223] p-5 text-white shadow-[0_20px_45px_-15px_rgba(0,0,0,0.6)] ring-1 ring-white/10 sm:p-6">
            <div className="pointer-events-none absolute -inset-x-10 -top-24 h-40 rotate-[20deg] bg-gradient-to-b from-white/15 to-transparent blur-md" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.08),transparent_45%)]" />

            <div className="relative flex h-full flex-col justify-between">
              <div className="flex items-start justify-between">
                <ChipIcon />
                <div className="flex items-center gap-2">
                  <ContactlessIcon />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Astilo Pay</span>
                </div>
              </div>

              <p className="font-mono text-2xl tracking-[0.2em] [text-shadow:0_1px_1px_rgba(0,0,0,0.4)] sm:text-3xl">
                {cardNumber || "•••• •••• •••• ••••"}
              </p>

              <div className="flex items-end justify-between gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] font-semibold uppercase tracking-widest text-white/40">Card holder</span>
                  <span className="max-w-[12rem] truncate text-sm font-semibold uppercase tracking-wide">{name || "CARDHOLDER NAME"}</span>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className="text-[9px] font-semibold uppercase tracking-widest text-white/40">Expires</span>
                  <span className="text-sm font-semibold tracking-wide">{expiry || "MM/YY"}</span>
                </div>
                <div className="flex items-center">
                  <BrandLogo brand={brand} />
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-ink/50">
            🔒 This is a simulated payment form — no real card is charged and no card data leaves your browser
            except to our own mock gateway. About 1 in 10 attempts is randomly declined to mimic a real processor.
          </p>

          <AppInput
            label="Amount (USD)"
            type="number"
            value={amount}
            onValueChange={setAmount}
            isRequired
            isInvalid={touched && Boolean(errors.amount)}
            errorMessage={errors.amount}
          />
          <AppInput
            label="Name on card"
            value={name}
            onValueChange={setName}
            placeholder="Card holder name"
            isRequired
            isInvalid={touched && Boolean(errors.name)}
            errorMessage={errors.name}
          />
          <AppInput
            label="Card number"
            value={cardNumber}
            onValueChange={(v) => setCardNumber(formatCardNumber(v))}
            placeholder="1234 5678 9012 3456"
            inputMode="numeric"
            isRequired
            isInvalid={touched && Boolean(errors.cardNumber)}
            errorMessage={errors.cardNumber}
          />
          <div className="grid grid-cols-2 gap-4">
            <AppInput
              label="Expiry"
              value={expiry}
              onValueChange={(v) => setExpiry(formatExpiry(v))}
              placeholder="MM/YY"
              inputMode="numeric"
              isRequired
              isInvalid={touched && Boolean(errors.expiry)}
              errorMessage={errors.expiry}
            />
            <AppInput
              label="CVV"
              value={cvv}
              onValueChange={(v) => setCvv(v.replace(/\D/g, "").slice(0, 4))}
              placeholder="123"
              type="password"
              inputMode="numeric"
              isRequired
              isInvalid={touched && Boolean(errors.cvv)}
              errorMessage={errors.cvv}
            />
          </div>

          <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.2rem" }}>
            <button type="submit" className="markets-chip active" disabled={depositMutation.isPending}>
              {depositMutation.isPending ? "Processing…" : `Deposit ${money(amountNum || 0, 0)}`}
            </button>
            <button type="button" className="markets-chip" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const TradingHome = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [showDeposit, setShowDeposit] = useState(false);
  const [assetType, setAssetType] = useState<AssetType>("stock");
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [selected, setSelected] = useState<{ symbol: string; name: string } | null>(null);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("1");

  const accountQuery = useQuery({ queryKey: ["trading", "account"], queryFn: fetchTradingAccount, refetchInterval: 30_000 });
  const ordersQuery = useQuery({ queryKey: ["trading", "orders"], queryFn: fetchTradingOrders });
  const cryptoQuery = useQuery({ queryKey: ["markets", "top", "crypto"], queryFn: () => fetchTopCrypto(8), staleTime: 60_000 });
  const searchQuery = useQuery({
    queryKey: ["trading", "search", submitted, assetType],
    queryFn: () => searchMarkets(submitted, assetType),
    enabled: !!submitted,
    retry: false,
  });
  const insightsQuery = useQuery({
    queryKey: ["trading", "insights", selected?.symbol, assetType],
    queryFn: () => fetchTradingInsights(selected!.symbol, assetType),
    enabled: !!selected,
    retry: false,
  });

  const portfolio = accountQuery.data;
  const holding = portfolio?.holdings.find((h) => h.symbol === selected?.symbol && h.assetType === assetType);

  const orderMutation = useMutation({
    mutationFn: () => placeTradingOrder({ symbol: selected!.symbol, assetType, side, quantity: Number(quantity) }),
    onSuccess: (result) => {
      queryClient.setQueryData(["trading", "account"], result);
      queryClient.invalidateQueries({ queryKey: ["trading", "orders"] });
      toast.success(`${side === "buy" ? "Bought" : "Sold"} ${quantity} ${selected!.symbol} @ ${money(result.transaction.price)} (simulated).`);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || "Order failed.");
    },
  });

  const sellFromHolding = async (h: NonNullable<typeof holding>) => {
    const ok = await confirm({
      title: "Sell entire position?",
      message: `Sell all ${h.quantity} ${h.symbol} at the current live price?`,
      confirmLabel: "Sell",
    });
    if (!ok) return;
    setSelected({ symbol: h.symbol, name: h.name ?? h.symbol });
    setSide("sell");
    setQuantity(String(h.quantity));
    placeTradingOrder({ symbol: h.symbol, assetType: h.assetType, side: "sell", quantity: h.quantity }).then((result) => {
      queryClient.setQueryData(["trading", "account"], result);
      queryClient.invalidateQueries({ queryKey: ["trading", "orders"] });
      toast.success(`Sold ${h.quantity} ${h.symbol} @ ${money(result.transaction.price)} (simulated).`);
    });
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(query.trim());
  };

  const results = searchQuery.data?.data.results ?? [];

  return (
    <div className="markets-page">
      <button type="button" className="markets-chip mb-4 inline-flex items-center gap-1" onClick={() => navigate(AppRoute.markets)}>
        <ArrowLeft size={12} /> Markets Home
      </button>

      <p className="markets-eyebrow">✦ Astilo Markets</p>
      <h1 className="markets-title">
        <Landmark size={26} style={{ display: "inline", verticalAlign: "-4px", marginRight: 8 }} />
        Simulated trading
      </h1>
      <p className="markets-tagline">
        Practice buying/selling stocks and crypto at real, live market prices with fake money — a flat
        simulated starting balance, a simulated payment gateway, no real trades and no real charges anywhere.
      </p>

      <div className="trading-summary-row">
        <div className="trading-summary-card">
          <span className="trading-summary-label">
            <Wallet size={12} /> Simulated cash
          </span>
          <span className="trading-summary-value">{money(portfolio?.account.cashBalance, 2)}</span>
          <button type="button" className="markets-chip" style={{ marginTop: "0.5rem" }} onClick={() => setShowDeposit(true)}>
            Deposit funds
          </button>
        </div>
        <div className="trading-summary-card">
          <span className="trading-summary-label">Holdings value</span>
          <span className="trading-summary-value">{money(portfolio?.holdingsValue, 2)}</span>
        </div>
        <div className="trading-summary-card">
          <span className="trading-summary-label">Total portfolio value</span>
          <span className="trading-summary-value">{money(portfolio?.totalValue, 2)}</span>
        </div>
      </div>

      <div className="trading-columns">
        <div>
          <h2 className="markets-section-title">Trade</h2>
          <div className="markets-type-toggle" style={{ marginBottom: "0.6rem" }}>
            <button type="button" className={assetType === "stock" ? "active" : ""} onClick={() => setAssetType("stock")}>
              Stocks
            </button>
            <button type="button" className={assetType === "crypto" ? "active" : ""} onClick={() => setAssetType("crypto")}>
              Crypto
            </button>
          </div>

          <form onSubmit={submitSearch} className="markets-search-row">
            <input
              className="markets-search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={assetType === "stock" ? "Search a stock — AAPL, Tesla…" : "Search crypto — Bitcoin, Ethereum…"}
            />
            <button type="submit" className="markets-chip">
              <Search size={12} />
            </button>
          </form>

          {assetType === "crypto" && !submitted && (
            <div className="trading-quickpick-row">
              {cryptoQuery.data?.data.results.slice(0, 8).map((c) => (
                <button key={c.symbol} type="button" className="markets-chip" onClick={() => setSelected({ symbol: c.symbol, name: c.name })}>
                  {c.ticker}
                </button>
              ))}
            </div>
          )}

          {submitted && (
            <div className="markets-search-results" style={{ marginBottom: "1rem" }}>
              {results.map((r: MarketSearchResult) => (
                <button key={r.symbol} type="button" className="markets-search-result-row" onClick={() => setSelected({ symbol: r.symbol, name: r.name })}>
                  <span className="markets-result-left">
                    <span className="markets-result-name">{r.name}</span> <span className="markets-result-meta">{r.symbol}</span>
                  </span>
                  <span className="markets-result-meta">{r.exchange ?? r.quoteType}</span>
                </button>
              ))}
              {!searchQuery.isLoading && results.length === 0 && <p className="markets-unavailable">No matches for "{submitted}".</p>}
            </div>
          )}

          {selected && (
            <div className="trading-order-panel">
              <p className="markets-quote-name">
                {selected.name} <span className="markets-result-meta">{selected.symbol}</span>
              </p>

              {insightsQuery.data && !insightsQuery.data.insufficientData && (
                <div className="trading-insights">
                  <span className={insightsQuery.data.trendDirection === "up" ? "positive" : "negative"}>
                    {insightsQuery.data.trendDirection === "up" ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{" "}
                    {insightsQuery.data.periodChangePct != null ? `${insightsQuery.data.periodChangePct >= 0 ? "+" : ""}${insightsQuery.data.periodChangePct.toFixed(2)}%` : ""} over 1mo
                  </span>
                  <span className="markets-result-meta">Volatility: {insightsQuery.data.volatilityPct?.toFixed(2)}%/period</span>
                  <span className="markets-result-meta">Current: {money(insightsQuery.data.currentPrice)}</span>
                  <p className="markets-unavailable" style={{ marginTop: "0.3rem" }}>{insightsQuery.data.disclaimer}</p>
                </div>
              )}

              {holding && (
                <>
                  <p className="markets-unavailable" style={{ marginTop: "0.3rem" }}>
                    You hold {holding.quantity} @ avg {money(holding.avgCost)} ({money(holding.unrealizedPnl)} unrealized)
                  </p>
                  {insightsQuery.data && (
                    <div className="trading-suggestion-card" style={{ marginTop: "0.4rem" }}>
                      <p className="markets-unavailable">
                        <strong style={{ color: "rgb(var(--ink-rgb) / 0.8)" }}>{suggestionForHolding(holding, insightsQuery.data).label}</strong>
                      </p>
                      <p className="trading-suggestion-meaning">{suggestionForHolding(holding, insightsQuery.data).meaning}</p>
                      <p className="markets-unavailable">{suggestionForHolding(holding, insightsQuery.data).description}</p>
                    </div>
                  )}
                </>
              )}

              <div className="markets-type-toggle" style={{ margin: "0.6rem 0" }}>
                <button type="button" className={side === "buy" ? "active" : ""} onClick={() => setSide("buy")}>
                  Buy
                </button>
                <button type="button" className={side === "sell" ? "active" : ""} onClick={() => setSide("sell")} disabled={!holding}>
                  Sell
                </button>
              </div>

              <label className="trading-field">
                <span>Quantity</span>
                <input type="number" min={0.0001} step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </label>

              <button
                type="button"
                className="markets-chip"
                style={{ marginTop: "0.6rem" }}
                disabled={orderMutation.isPending || !Number(quantity)}
                onClick={() => orderMutation.mutate()}
              >
                {orderMutation.isPending ? "Placing order…" : `${side === "buy" ? "Buy" : "Sell"} ${selected.symbol} (simulated)`}
              </button>
            </div>
          )}
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 className="markets-section-title" style={{ margin: 0 }}>
              Holdings
            </h2>
            <button type="button" className="markets-chip inline-flex items-center gap-1" onClick={() => navigate(AppRoute.tradingPortfolio)}>
              <PieChart size={12} /> Full portfolio <ArrowRight size={11} />
            </button>
          </div>
          {(portfolio?.holdings.length ?? 0) === 0 && <p className="markets-unavailable" style={{ marginTop: "0.6rem" }}>No holdings yet — place a simulated trade to get started.</p>}
          <div className="trading-holdings-list">
            {portfolio?.holdings.slice(0, 6).map((h) => (
              <div key={h.id} className="markets-quote-card" style={{ cursor: "default" }}>
                <div className="markets-quote-card-head">
                  <span className="markets-quote-symbol">{h.symbol}</span>
                </div>
                <span className="markets-quote-name">{h.name}</span>
                <span className="markets-quote-price">{money(h.marketValue)}</span>
                <span className="markets-result-meta">
                  {h.quantity} @ avg {money(h.avgCost)}
                </span>
                {h.unrealizedPnl != null && (
                  <span className={`markets-quote-change ${h.unrealizedPnl >= 0 ? "positive" : "negative"}`}>
                    {h.unrealizedPnl >= 0 ? "+" : ""}
                    {money(h.unrealizedPnl)} ({h.unrealizedPnlPercent?.toFixed(1)}%)
                  </span>
                )}
                <button type="button" className="markets-chip" style={{ marginTop: "0.5rem", alignSelf: "flex-start" }} onClick={() => sellFromHolding(h)}>
                  Sell all
                </button>
              </div>
            ))}
          </div>

          <h2 className="markets-section-title">Recent orders</h2>
          {(ordersQuery.data?.length ?? 0) === 0 && <p className="markets-unavailable">No simulated trades yet.</p>}
          <div className="trading-history-list">
            {ordersQuery.data?.slice(0, 8).map((t) => (
              <div key={t.id} className="trading-history-row">
                <span className={t.side === "buy" ? "positive" : "negative"}>{t.side.toUpperCase()}</span>
                <span>
                  {t.quantity} {t.symbol}
                </span>
                <span className="markets-result-meta">@ {money(t.price)}</span>
                <span className="markets-result-meta">{t.createdAt ? new Date(t.createdAt).toLocaleString() : ""}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showDeposit && <DepositModal onClose={() => setShowDeposit(false)} />}
    </div>
  );
};

export default TradingHome;
