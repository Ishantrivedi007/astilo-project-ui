import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Landmark, Search, TrendingDown, TrendingUp, Wallet } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { useConfirm } from "../shared";
import { searchMarkets, fetchTopCrypto, type AssetType, type MarketSearchResult } from "../../lib/marketsApi";
import {
  depositTradingFunds,
  fetchTradingAccount,
  fetchTradingInsights,
  fetchTradingOrders,
  placeTradingOrder,
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
  const errors = {
    amount: !amountNum || amountNum <= 0 ? "Enter an amount" : null,
    name: required(name, "Name on card"),
    cardNumber: validateCardNumber(cardNumber.replace(/\s/g, "")),
    expiry: cardExpiry(expiry),
    cvv: cardCvc(cvv),
  };
  const isValid = Object.values(errors).every((e) => !e);

  return (
    <div className="trading-modal-overlay" onClick={onClose}>
      <div className="trading-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Deposit simulated funds</h3>
        <p className="markets-unavailable" style={{ marginBottom: "0.8rem" }}>
          🔒 A simulated payment form — no real card is charged, nothing leaves the browser except to our own
          mock gateway. About 1 in 10 attempts is randomly declined to mimic a real processor.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setTouched(true);
            if (!isValid) return;
            depositMutation.mutate();
          }}
        >
          <label className="trading-field">
            <span>Amount (USD)</span>
            <input type="number" min={1} max={1000000} value={amount} onChange={(e) => setAmount(e.target.value)} />
            {touched && errors.amount && <span className="trading-field-error">{errors.amount}</span>}
          </label>
          <label className="trading-field">
            <span>Name on card</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Card holder name" />
            {touched && errors.name && <span className="trading-field-error">{errors.name}</span>}
          </label>
          <label className="trading-field">
            <span>Card number</span>
            <input value={cardNumber} onChange={(e) => setCardNumber(formatCardNumber(e.target.value))} placeholder="1234 5678 9012 3456" inputMode="numeric" />
            {touched && errors.cardNumber && <span className="trading-field-error">{errors.cardNumber}</span>}
          </label>
          <div className="trading-field-row">
            <label className="trading-field">
              <span>Expiry</span>
              <input value={expiry} onChange={(e) => setExpiry(formatExpiry(e.target.value))} placeholder="MM/YY" inputMode="numeric" />
              {touched && errors.expiry && <span className="trading-field-error">{errors.expiry}</span>}
            </label>
            <label className="trading-field">
              <span>CVV</span>
              <input value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="123" type="password" inputMode="numeric" />
              {touched && errors.cvv && <span className="trading-field-error">{errors.cvv}</span>}
            </label>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.8rem" }}>
            <button type="submit" className="markets-chip" disabled={depositMutation.isPending}>
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
                <p className="markets-unavailable" style={{ marginTop: "0.3rem" }}>
                  You hold {holding.quantity} @ avg {money(holding.avgCost)} ({money(holding.unrealizedPnl)} unrealized)
                </p>
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
          <h2 className="markets-section-title">Holdings</h2>
          {(portfolio?.holdings.length ?? 0) === 0 && <p className="markets-unavailable">No holdings yet — place a simulated trade to get started.</p>}
          <div className="trading-holdings-list">
            {portfolio?.holdings.map((h) => (
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
            {ordersQuery.data?.slice(0, 15).map((t) => (
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
