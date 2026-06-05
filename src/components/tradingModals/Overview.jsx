import React, { useEffect, useState } from "react";
import { Spinner } from "./Spinner";
import socket from "../../services/socket";

// ── helpers ──────────────────────────────────────────────────────────────────
const fmt = (v, digits = 2) =>
  v == null
    ? "--"
    : Number(v).toLocaleString("en-IN", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });

const pct = (v) =>
  v == null ? "--" : `${v > 0 ? "+" : ""}${Number(v).toFixed(2)}%`;

function RangeBar({ low, high, current, label }) {
  const clampedPct = Math.min(
    100,
    Math.max(0, ((current - low) / (high - low)) * 100),
  );
  return (
    <div style={{ flex: 1 }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--text-primary)",
          marginBottom: 10,
        }}
      >
        {label}
      </div>
      <div
        style={{
          position: "relative",
          height: 6,
          borderRadius: 4,
          background: "linear-gradient(to right,var(--danger-color),var(--success-color))",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: `${clampedPct}%`,
            transform: "translate(-50%,-50%)",
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 0 0 2px var(--bg-primary), 0 0 0 3px var(--text-secondary)",
            zIndex: 1,
          }}
        />
        {/* triangle pointer */}
        <div
          style={{
            position: "absolute",
            top: -10,
            left: `${clampedPct}%`,
            transform: "translateX(-50%)",
            width: 0,
            height: 0,
            borderLeft: "5px solid transparent",
            borderRight: "5px solid transparent",
            borderTop: "6px solid var(--text-secondary)",
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          color: "var(--text-secondary)",
        }}
      >
        <span>
          <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
            {fmt(low, 2)}
          </span>
          <br />
          <span>Low</span>
        </span>
        <span style={{ textAlign: "right" }}>
          <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
            {fmt(high, 2)}
          </span>
          <br />
          <span>High</span>
        </span>
      </div>
    </div>
  );
}

function StatItem({ label, value, color }) {
  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 90 }}
    >
      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{label}</span>
      <span
        style={{ fontSize: 14, fontWeight: 600, color: color || "var(--text-primary)" }}
      >
        {value}
      </span>
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-color)",
        borderRadius: 10,
        padding: "16px 20px",
        marginBottom: 16,
      }}
    >
      {title && (
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: 14,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

// ── static analyst / fundamental data (not in API) ──────────────────────────
const STATIC_ANALYST = {
  targetPrice: 6183.33,
  expectedProfit: -15.62,
  analystCount: 6,
  buy: 33,
  hold: 50,
  sell: 16,
};

const STATIC_FUNDAMENTALS = {
  valuation: { peRatio: 90.06, pbv: 19.84, pegRatio: null, roe: 21.3 },
  growth: {
    revenueGrowth: 18.4,
    earningsGrowth: 22.1,
    salesGrowth: 15.6,
    profitGrowth: 24.3,
  },
  financial: {
    debtToEquity: 0.02,
    currentRatio: 1.8,
    netMargin: 8.4,
    operatingMargin: 11.2,
  },
  dividend: {
    dividendYield: 0.35,
    dividendPayout: 31.5,
    dividendPerShare: 25.5,
  },
};

const STATIC_PERFORMANCE = {
  sectorRank: 6,
  cap: "LARGE CAP",
  sector: "ELECTRIC EQUIPMENT",
  shortTerm: "Mildly Positive",
  longTerm: "Mildly Positive",
  marketCap: "1,52,754",
  oneYearReturn: 35.14,
  sectorReturn: 48.13,
  marketReturn: -1.37,
  quality: {
    label: "EXCELLENT",
    score: "5/5",
    capitalStructure: "Excellent",
    growth: "Excellent",
    managementRisk: "Good",
  },
  valuation: { label: "EXPENSIVE", score: "2/5" },
  financial: { label: "EXPENSIVE", score: "2/5" },
  insights: [
    "Excellent quality company basis long term financial performance.",
    "Largest company in Electric Equipment sector",
  ],
};

// ── RatingBar ────────────────────────────────────────────────────────────────
function RatingBar({ label, pct: p, color }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 4,
        }}
      >
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
          {p}%
        </span>
      </div>
      <div
        style={{
          height: 5,
          borderRadius: 3,
          background: "var(--border-color)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${p}%`,
            height: "100%",
            background: color,
            borderRadius: 3,
            transition: "width 0.6s ease",
          }}
        />
      </div>
    </div>
  );
}

// ── FundamentalRatios ────────────────────────────────────────────────────────
const TABS = ["Valuation Ratio", "Growth", "Financial", "Dividend"];

function FundamentalRatios() {
  const [activeTab, setActiveTab] = useState(0);

  const tabData = [
    [
      { label: "PE Ratio", value: fmt(STATIC_FUNDAMENTALS.valuation.peRatio) },
      {
        label: "Price to Book Value",
        value: fmt(STATIC_FUNDAMENTALS.valuation.pbv),
      },
      {
        label: "PEG Ratio",
        value: STATIC_FUNDAMENTALS.valuation.pegRatio ?? "-",
      },
      { label: "ROE (Latest)", value: `${STATIC_FUNDAMENTALS.valuation.roe}%` },
    ],
    [
      {
        label: "Revenue Growth (YoY)",
        value: `${STATIC_FUNDAMENTALS.growth.revenueGrowth}%`,
      },
      {
        label: "Earnings Growth (YoY)",
        value: `${STATIC_FUNDAMENTALS.growth.earningsGrowth}%`,
      },
      {
        label: "Sales Growth (YoY)",
        value: `${STATIC_FUNDAMENTALS.growth.salesGrowth}%`,
      },
      {
        label: "Profit Growth (YoY)",
        value: `${STATIC_FUNDAMENTALS.growth.profitGrowth}%`,
      },
    ],
    [
      {
        label: "Debt to Equity",
        value: fmt(STATIC_FUNDAMENTALS.financial.debtToEquity),
      },
      {
        label: "Current Ratio",
        value: fmt(STATIC_FUNDAMENTALS.financial.currentRatio),
      },
      {
        label: "Net Margin",
        value: `${STATIC_FUNDAMENTALS.financial.netMargin}%`,
      },
      {
        label: "Operating Margin",
        value: `${STATIC_FUNDAMENTALS.financial.operatingMargin}%`,
      },
    ],
    [
      {
        label: "Dividend Yield",
        value: `${STATIC_FUNDAMENTALS.dividend.dividendYield}%`,
      },
      {
        label: "Dividend Payout",
        value: `${STATIC_FUNDAMENTALS.dividend.dividendPayout}%`,
      },
      {
        label: "Dividend Per Share",
        value: `₹${STATIC_FUNDAMENTALS.dividend.dividendPerShare}`,
      },
    ],
  ];

  return (
    <div style={{ flex: 1 }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: "var(--text-primary)",
          marginBottom: 14,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        Fundamental Ratios
      </div>
      <div
        style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}
      >
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setActiveTab(i)}
            style={{
              padding: "5px 12px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              border: "none",
              background: activeTab === i ? "var(--accent-color)" : "var(--border-color)",
              color: activeTab === i ? "#fff" : "var(--text-secondary)",
              transition: "all 0.2s",
            }}
          >
            {t}
          </button>
        ))}
      </div>
      <div
        style={{
          background: "var(--bg-primary)",
          borderRadius: 8,
          padding: "14px 16px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "14px 20px",
        }}
      >
        {tabData[activeTab].map(({ label, value }) => (
          <div key={label}>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 3 }}>
              {label}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
              {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── ScoreBadge ───────────────────────────────────────────────────────────────
function ScoreBadge({ label, score, color }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        marginBottom: 4,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          padding: "2px 8px",
          borderRadius: 4,
          background: color + "22",
          color: color,
          border: `1px solid ${color}44`,
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{score}</span>
    </div>
  );
}

// ── MarketDepth ──────────────────────────────────────────────────────────────
function MarketDepth({ buy = [], sell = [] }) {
  const maxQty = Math.max(...[...buy, ...sell].map((o) => o.quantity), 1);
  return (
    <div>
      <div style={{ display: "flex", gap: 12 }}>
        {/* Buy side */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              padding: "0 4px 6px",
              borderBottom: "1px solid var(--border-color)",
              marginBottom: 4,
            }}
          >
            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>ORDERS</span>
            <span
              style={{ fontSize: 11, color: "var(--text-secondary)", textAlign: "right" }}
            >
              QTY
            </span>
            <span
              style={{ fontSize: 11, color: "var(--success-color)", textAlign: "right" }}
            >
              BID
            </span>
          </div>
          {buy.map((b, i) => (
            <div key={i} style={{ position: "relative", marginBottom: 2 }}>
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: `${(b.quantity / maxQty) * 100}%`,
                  background: "var(--success-color)20",
                  borderRadius: 3,
                }}
              />
              <div
                style={{
                  position: "relative",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  padding: "4px",
                }}
              >
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  {b.orders}
                </span>
                <span
                  style={{ fontSize: 12, color: "var(--text-primary)", textAlign: "right" }}
                >
                  {b.quantity}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--success-color)",
                    textAlign: "right",
                    fontWeight: 600,
                  }}
                >
                  {fmt(b.price)}
                </span>
              </div>
            </div>
          ))}
          <div
            style={{
              borderTop: "1px solid var(--border-color)",
              marginTop: 4,
              paddingTop: 4,
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
            }}
          >
            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Total</span>
            <span
              style={{
                fontSize: 11,
                color: "var(--success-color)",
                textAlign: "right",
                fontWeight: 600,
              }}
            >
              {buy.reduce((s, b) => s + b.quantity, 0)}
            </span>
            <span />
          </div>
        </div>

        {/* Sell side */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              padding: "0 4px 6px",
              borderBottom: "1px solid var(--border-color)",
              marginBottom: 4,
            }}
          >
            <span style={{ fontSize: 11, color: "var(--danger-color)", textAlign: "left" }}>
              ASK
            </span>
            <span
              style={{ fontSize: 11, color: "var(--text-secondary)", textAlign: "right" }}
            >
              QTY
            </span>
            <span
              style={{ fontSize: 11, color: "var(--text-secondary)", textAlign: "right" }}
            >
              ORDERS
            </span>
          </div>
          {sell.map((s, i) => (
            <div key={i} style={{ position: "relative", marginBottom: 2 }}>
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${(s.quantity / maxQty) * 100}%`,
                  background: "var(--danger-color)20",
                  borderRadius: 3,
                }}
              />
              <div
                style={{
                  position: "relative",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  padding: "4px",
                }}
              >
                <span
                  style={{ fontSize: 12, color: "var(--danger-color)", fontWeight: 600 }}
                >
                  {fmt(s.price)}
                </span>
                <span
                  style={{ fontSize: 12, color: "var(--text-primary)", textAlign: "right" }}
                >
                  {s.quantity}
                </span>
                <span
                  style={{ fontSize: 12, color: "var(--text-secondary)", textAlign: "right" }}
                >
                  {s.orders}
                </span>
              </div>
            </div>
          ))}
          <div
            style={{
              borderTop: "1px solid var(--border-color)",
              marginTop: 4,
              paddingTop: 4,
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
            }}
          >
            <span />
            <span
              style={{
                fontSize: 11,
                color: "var(--danger-color)",
                textAlign: "right",
                fontWeight: 600,
              }}
            >
              {sell.reduce((s, b) => s + b.quantity, 0)}
            </span>
            <span
              style={{ fontSize: 11, color: "var(--text-secondary)", textAlign: "right" }}
            >
              Total
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
const Overview = ({ selectedCurrency }) => {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!selectedCurrency?.token) return;

    setLoading(true);

    socket.emit("getAllStocks");

    /*
    INITIAL STOCK LIST
  */
    socket.on("stocks", (data) => {
      const stocks = Array.isArray(data) ? data : data?.stocks || [];

      const selectedStock = stocks.find(
        (s) => String(s.token) === String(selectedCurrency.token),
      );

      if (selectedStock) {
        setOverview(selectedStock);
        setLoading(false);
      }
    });

    /*
    STOCK UPDATE
    -> LTP / CHANGE / %
  */
    socket.on("stockUpdate", (stock) => {
      // console.log("STOCK UPDATE =", stock);

      if (String(stock.token) !== String(selectedCurrency.token)) {
        return;
      }

      setOverview((prev) => ({
        ...prev,

        ltp: Number(stock.ltp),

        change: Number(stock.change),

        percent_change: Number(stock.percent_change),

        sentiment: stock.sentiment,
      }));
    });

    /*
    LIVE TICK
    -> OHLC
  */
    socket.on("liveTick", (tick) => {
      // console.log("LIVE TICK =", tick);

      if (String(tick.token) !== String(selectedCurrency.token)) {
        return;
      }

      setOverview((prev) => ({
        ...prev,

        open: tick?.data?.open,
        high: tick?.data?.high,
        low: tick?.data?.low,
        close: tick?.data?.close,

        volume: tick?.data?.volume,
        time: tick?.data?.time,
      }));
    });

    return () => {
      socket.off("stocks");
      socket.off("stockUpdate");
      socket.off("liveTick");
    };
  }, [selectedCurrency]);

  const centered = {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--bg-primary)",
  };

  if (!selectedCurrency)
    return (
      <div style={centered} className="text-muted">
        Select a stock to view its overview
      </div>
    );
  if (loading)
    return (
      <div style={centered}>
        <Spinner />
      </div>
    );
  if (error)
    return <div style={{ ...centered, color: "var(--danger-color)" }}>{error}</div>;
  if (!overview)
    return (
      <div style={centered} className="text-muted">
        No overview data available.
      </div>
    );

  // ── derived values ───────────────────────────────────────────────────────
  const ltp = overview?.ltp ?? overview?.close;

const netChange = overview?.change;

const pctChange = overview?.percent_change;

const isPositive = Number(netChange) >= 0;

const changeColor = isPositive ? "var(--success-color)" : "var(--danger-color)";

  return (
    <div
      style={{
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
        height: "100%",
        overflowY: "auto",
        padding: "20px 20px 32px",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: "var(--text-primary)",
                letterSpacing: "-0.02em",
              }}
            >
              {overview.symbol || selectedCurrency.name}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 4,
                background: "var(--border-color)",
                color: "var(--text-secondary)",
                letterSpacing: "0.05em",
              }}
            >
              {overview.exchange || selectedCurrency.segment}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 3 }}>
            {selectedCurrency.fullName || ""}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: changeColor,
              letterSpacing: "-0.02em",
            }}
          >
            {fmt(ltp)}
          </div>
          <div
            style={{
              fontSize: 13,
              color: changeColor,
              fontWeight: 600,
              marginTop: 2,
            }}
          >
            {netChange != null ? (netChange > 0 ? "▲" : "▼") : ""}{" "}
            {fmt(Math.abs(netChange ?? 0))} ({pct(pctChange)})
          </div>
        </div>
      </div>

      {/* ── Activity + Price Details ── */}
      <SectionCard>
        <div style={{ display: "flex", gap: 0, flexWrap: "wrap" }}>
          {/* Activity */}
          <div
            style={{
              flex: "1 1 200px",
              paddingRight: 24,
              borderRight: "1px solid var(--border-color)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 12,
              }}
            >
              Activity
            </div>
            <div style={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <StatItem label="Open" value={fmt(overview?.open)} />
              <StatItem
                label="High"
                value={fmt(overview?.high)}
                color="var(--success-color)"
              />
              <StatItem
                label="Low"
                value={fmt(overview?.low)}
                color="var(--danger-color)"
              />
              <StatItem label="Close" value={fmt(overview?.close)} />
            </div>
          </div>
          {/* Price Details */}
          <div style={{ flex: "1 1 280px", paddingLeft: 24 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 12,
              }}
            >
              Price Details
            </div>
            {/* <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              <StatItem
                label="Average Price"
                value={fmt(priceDetails?.averagePrice)}
              />
              <StatItem
                label="Volume"
                value={
                  priceDetails?.volume != null
                    ? Number(priceDetails.volume).toLocaleString("en-IN")
                    : "--"
                }
              />
              <StatItem
                label="Open Interest"
                value={
                  priceDetails?.openInterest != null
                    ? Number(priceDetails.openInterest).toLocaleString("en-IN")
                    : "--"
                }
              />
              <StatItem
                label="Bid / Ask"
                value={`${fmt(priceDetails?.bid)} / ${fmt(priceDetails?.ask)}`}
              />
            </div> */}
          </div>
        </div>
      </SectionCard>

      {/* ── Circuit + 52W ── */}
      {/* <SectionCard>
        <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
          {circuitLimits && (
            <RangeBar
              low={circuitLimits.lower}
              high={circuitLimits.upper}
              current={ltp}
              label="Lower Circuit / Upper Circuit"
            />
          )}
          {fiftyTwoWeek && (
            <RangeBar
              low={fiftyTwoWeek.low}
              high={fiftyTwoWeek.high}
              current={ltp}
              label="52 Week Low / High"
            />
          )}
        </div>
      </SectionCard> */}

      {/* ── Analyst + Fundamentals (side by side) ── */}
      <div
        style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}
      >
        {/* Analyst Ratings */}
        <div
          style={{
            flex: "1 1 240px",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: 10,
            padding: "16px 20px",
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--text-primary)",
              marginBottom: 4,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Analyst Ratings
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 14 }}>
            *Based on the review of {STATIC_ANALYST.analystCount} analyst(s) in
            the last 1 year(s)
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>
                {fmt(STATIC_ANALYST.targetPrice)}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>Target Price</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color:
                    STATIC_ANALYST.expectedProfit >= 0 ? "var(--success-color)" : "var(--danger-color)",
                }}
              >
                {pct(STATIC_ANALYST.expectedProfit)}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                Expected Profit
              </div>
            </div>
          </div>
          <RatingBar label="BUY" pct={STATIC_ANALYST.buy} color="var(--success-color)" />
          <RatingBar label="HOLD" pct={STATIC_ANALYST.hold} color="#f0b90b" />
          <RatingBar label="SELL" pct={STATIC_ANALYST.sell} color="var(--danger-color)" />
          <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 10 }}>
            powered by <strong style={{ color: "var(--text-secondary)" }}>Trendlyn</strong>
          </div>
        </div>

        {/* Fundamental Ratios */}
        <div
          style={{
            flex: "1 1 280px",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: 10,
            padding: "16px 20px",
          }}
        >
          <FundamentalRatios />
        </div>
      </div>

      {/* ── Performance Overview ── */}
      <SectionCard title="Performance Overview">
        {/* Sector Trend row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 12, color: "var(--text-secondary)", marginRight: 4 }}>
            Sector Trend{" "}
            <span style={{ color: "var(--accent-color)", fontWeight: 700 }}>
              (#{STATIC_PERFORMANCE.sectorRank})
            </span>
          </span>
          {[STATIC_PERFORMANCE.cap, STATIC_PERFORMANCE.sector].map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 4,
                background: "var(--border-color)",
                color: "var(--text-secondary)",
                letterSpacing: "0.05em",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            gap: 20,
            flexWrap: "wrap",
            marginBottom: 18,
          }}
        >
          {[
            {
              label: "Short Term",
              val: STATIC_PERFORMANCE.shortTerm,
              c: "#f0b90b",
            },
            {
              label: "Long Term",
              val: STATIC_PERFORMANCE.longTerm,
              c: "#f0b90b",
            },
          ].map(({ label, val, c }) => (
            <div
              key={label}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: c,
                  display: "inline-block",
                }}
              />
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: c }}>
                {val}
              </span>
            </div>
          ))}
          <StatItem
            label="Market Cap"
            value={`₹${STATIC_PERFORMANCE.marketCap} Cr`}
          />
          <StatItem
            label="1 Year Return"
            value={pct(STATIC_PERFORMANCE.oneYearReturn)}
            color="var(--success-color)"
          />
          <StatItem
            label="Sector Return"
            value={pct(STATIC_PERFORMANCE.sectorReturn)}
            color="var(--success-color)"
          />
          <StatItem
            label="Market Return"
            value={pct(STATIC_PERFORMANCE.marketReturn)}
            color="var(--danger-color)"
          />
        </div>

        {/* Quality / Valuation / Financial + Insights */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div style={{ minWidth: 130 }}>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 4 }}>
                Quality
              </div>
              <ScoreBadge
                label={STATIC_PERFORMANCE.quality.label}
                score={STATIC_PERFORMANCE.quality.score}
                color="var(--success-color)"
              />
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 4 }}>
                Valuation
              </div>
              <ScoreBadge
                label={STATIC_PERFORMANCE.valuation.label}
                score={STATIC_PERFORMANCE.valuation.score}
                color="#f0b90b"
              />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 4 }}>
                Financial
              </div>
              <ScoreBadge
                label={STATIC_PERFORMANCE.financial.label}
                score={STATIC_PERFORMANCE.financial.score}
                color="#f0b90b"
              />
            </div>
          </div>

          <div
            style={{
              flex: 1,
              minWidth: 200,
              borderLeft: "1px solid var(--border-color)",
              paddingLeft: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 24,
                marginBottom: 14,
                flexWrap: "wrap",
              }}
            >
              {[
                {
                  key: "Capital Structure",
                  val: STATIC_PERFORMANCE.quality.capitalStructure,
                },
                { key: "Growth", val: STATIC_PERFORMANCE.quality.growth },
                {
                  key: "Management Risk",
                  val: STATIC_PERFORMANCE.quality.managementRisk,
                },
              ].map(({ key, val }) => (
                <div key={key}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      marginBottom: 2,
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: "var(--success-color)",
                        display: "inline-block",
                      }}
                    />
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                      {key}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--success-color)",
                      paddingLeft: 12,
                    }}
                  >
                    {val}
                  </span>
                </div>
              ))}
            </div>
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  marginBottom: 8,
                  fontWeight: 700,
                }}
              >
                Insights to Look For
              </div>
              {STATIC_PERFORMANCE.insights.map((ins, i) => (
                <div
                  key={i}
                  style={{ display: "flex", gap: 8, marginBottom: 5 }}
                >
                  <span
                    style={{ color: "var(--accent-color)", fontSize: 12, marginTop: 1 }}
                  >
                    •
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text-primary)" }}>{ins}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ── Market Depth ── */}
      <SectionCard title="Market Depth">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          {/* <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            Total Buy Qty:{" "}
            <span style={{ color: "var(--success-color)", fontWeight: 700 }}>
              {Number(raw_data?.totBuyQuan ?? 0).toLocaleString("en-IN")}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            Total Sell Qty:{" "}
            <span style={{ color: "var(--danger-color)", fontWeight: 700 }}>
              {Number(raw_data?.totSellQuan ?? 0).toLocaleString("en-IN")}
            </span>
          </div> */}
        </div>
        {/* <MarketDepth buy={depth.buy || []} sell={depth.sell || []} /> */}
      </SectionCard>
    </div>
  );
};

export default Overview;
