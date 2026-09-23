import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calculator } from "lucide-react";

import type { AssetType } from "../../lib/marketsApi";
import { fetchWhatIf } from "../../lib/tradingApi";
import "./Markets.scss";
import "./Trading.scss";

const money = (n: number | null | undefined, decimals = 2) =>
  n == null ? "—" : n.toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/** "What if I invested $X, N years ago?" — a real, computed historical
 * what-if using actual past prices (never a forward-looking prediction). */
const WhatIfCalculator = ({ symbol, assetType }: { symbol: string; assetType: AssetType }) => {
  const [amount, setAmount] = useState("10000");
  const [years, setYears] = useState("5");
  const [submittedAmount, setSubmittedAmount] = useState<number | null>(null);
  const [submittedYears, setSubmittedYears] = useState<number | null>(null);

  const whatIfQuery = useQuery({
    queryKey: ["trading", "what-if", symbol, assetType, submittedAmount, submittedYears],
    queryFn: () => fetchWhatIf(symbol, assetType, submittedAmount!, submittedYears!),
    enabled: submittedAmount != null && submittedYears != null,
    retry: false,
  });

  const result = whatIfQuery.data;

  const calculate = () => {
    setSubmittedAmount(Number(amount) || 10000);
    setSubmittedYears(Number(years) || 5);
  };

  return (
    <div style={{ marginTop: "1.5rem" }}>
      <h2 className="markets-section-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Calculator size={16} /> What if I invested?
      </h2>
      <p className="markets-unavailable" style={{ marginBottom: "0.6rem" }}>
        A real historical what-if for {symbol}, computed from actual past prices — not a projection of the future.
      </p>

      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "flex-end" }}>
        <label className="trading-field">
          <span>Amount (USD)</span>
          <input type="number" min={1} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label className="trading-field">
          <span>Years ago</span>
          <input type="number" min={0.1} step="any" value={years} onChange={(e) => setYears(e.target.value)} />
        </label>
        <button type="button" className="markets-chip" disabled={whatIfQuery.isFetching} onClick={calculate}>
          {whatIfQuery.isFetching ? "Calculating…" : "Calculate"}
        </button>
      </div>

      {result && (
        <div style={{ marginTop: "0.9rem" }}>
          {result.insufficientData ? (
            <p className="markets-unavailable">Not enough price history for {symbol} to compute this.</p>
          ) : (
            <>
              <p className="markets-unavailable" style={{ marginBottom: "0.6rem" }}>
                Invested {money(result.amountInvested)} on {result.investedAtDate ? new Date(result.investedAtDate).toLocaleDateString() : "—"} at{" "}
                {money(result.investedAtPrice)}/share ({result.sharesBought?.toFixed(4)} shares) — now worth {money(result.currentValue)}.
              </p>
              <dl className="markets-stats-grid">
                <div className="markets-stat">
                  <dt>Total return</dt>
                  <dd style={{ color: (result.totalReturn ?? 0) >= 0 ? "#4ade80" : "#f87171" }}>
                    {(result.totalReturn ?? 0) >= 0 ? "+" : ""}
                    {money(result.totalReturn)} ({(result.totalReturnPct ?? 0) >= 0 ? "+" : ""}
                    {result.totalReturnPct?.toFixed(2)}%)
                  </dd>
                </div>
                <div className="markets-stat">
                  <dt>CAGR</dt>
                  <dd>{result.cagr != null ? `${result.cagr >= 0 ? "+" : ""}${result.cagr.toFixed(2)}%` : "Data unavailable"}</dd>
                </div>
                <div className="markets-stat">
                  <dt>Actual period</dt>
                  <dd>{result.actualYears != null ? `${result.actualYears.toFixed(1)} yrs` : "—"}</dd>
                </div>
              </dl>
            </>
          )}
          {result.disclaimer && <p className="markets-unavailable" style={{ marginTop: "0.4rem" }}>{result.disclaimer}</p>}
        </div>
      )}
      {whatIfQuery.isError && <p className="markets-unavailable">Couldn't compute this right now.</p>}
    </div>
  );
};

export default WhatIfCalculator;
