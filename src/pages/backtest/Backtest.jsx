import React, { useEffect, useState } from "react";
import "./Backtest.css";

import SummaryCards from "../../components/backtest/SummaryCards";
import KeyMetrics from "../../components/backtest/KeyMetrics";
import SecondaryStats from "../../components/backtest/SecondaryStats";
import RecentTrades from "../../components/backtest/RecentTrades";
import EquityCurve from "../../components/backtest/EquityCurve";
import DrawdownCurve from "../../components/backtest/DrawdownCurve";
import PnLDistribution from "../../components/backtest/PnLDistribution";
import ProfitByTime from "../../components/backtest/ProfitByTime";
import TradeOutcome from "../../components/backtest/TradeOutcome";
import LongVsShort from "../../components/backtest/LongVsShort";
import socket from "../../services/websocket/socket";

// Helper: format a number as currency string
const fmt = (n, decimals = 2) =>
  n == null
    ? "-"
    : Number(n).toLocaleString("en-IN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });

// Map raw API response → summaryMetrics shape expected by SummaryCards
const buildSummaryMetrics = (d) => ({
  netPnl: {
    label: "Net PnL",
    value: d.netPnL,
    percentage: d.totalReturnPct,
    isPositive: d.netPnL >= 0,
  },
  totalReturn: {
    label: "Total Return",
    value: d.totalReturnPct,
    annualized: d.annualizedReturn,
    isPositive: d.totalReturnPct >= 0,
  },
  totalTrades: { label: "Total Trades", value: d.totalTrades },
  winRate: {
    label: "Win Rate (Accuracy)",
    value: d.winRatePct,
    wins: d.totalWins,
    losses: d.totalLosses,
  },
  profitFactor: {
    label: "Profit Factor",
    value: d.profitFactor,
    isPositive: d.profitFactor >= 1,
  },
  maxDrawdown: {
    label: "Max Drawdown",
    value: d.maxDrawdownPct,
    absolute: d.maxDrawdownValue,
    isPositive: false,
  },
  maxProfitSingle: {
    label: "Max Profit (Single Trade)",
    value: d.maxProfitSingleTrade,
    isPositive: true,
  },
  maxLossSingle: {
    label: "Max Loss (Single Trade)",
    value: d.maxLossSingleTrade,
    isPositive: false,
  },
});

// Map raw API response → keyMetrics shape (array of {label, value, color})
const buildKeyMetrics = (d) => [
  {
    label: "Initial Capital",
    value: `₹${fmt(d.initialCapital)}`,
    color: "var(--text-primary)",
  },
  {
    label: "Final Capital",
    value: `₹${fmt(d.finalCapital)}`,
    color: "var(--success-color)",
  },
  {
    label: "Net PnL",
    value: `₹${fmt(d.netPnL)}`,
    color: d.netPnL >= 0 ? "var(--success-color)" : "var(--danger-color)",
  },
  {
    label: "Total Return",
    value: `${fmt(d.totalReturnPct)}%`,
    color: "var(--success-color)",
  },
  {
    label: "Annualized Return",
    value: `${fmt(d.annualizedReturn)}%`,
    color: "var(--success-color)",
  },
  {
    label: "Calmar Ratio",
    value: `${fmt(d.calmarRatio)}`,
    color: "var(--text-primary)",
  },
  {
    label: "Sharpe Ratio",
    value: `${fmt(d.sharpeRatio)}`,
    color: "var(--text-primary)",
  },
  {
    label: "Sortino Ratio",
    value: `${fmt(d.sortinoRatio)}`,
    color: "var(--text-primary)",
  },
  {
    label: "Total Trades",
    value: `${d.totalTrades}`,
    color: "var(--text-primary)",
  },
  {
    label: "Win Rate",
    value: `${fmt(d.winRatePct)}%`,
    color: "var(--success-color)",
  },
  {
    label: "Profit Factor",
    value: `${fmt(d.profitFactor)}`,
    color: "var(--success-color)",
  },
  {
    label: "Expectancy",
    value: `₹${fmt(d.expectancy)}`,
    color: "var(--success-color)",
  },
  {
    label: "Avg Profit",
    value: `₹${fmt(d.avgProfit)}`,
    color: "var(--success-color)",
  },
  {
    label: "Avg Loss",
    value: `₹${fmt(d.avgLoss)}`,
    color: "var(--danger-color)",
  },
  {
    label: "Max Drawdown (%)",
    value: `${fmt(d.maxDrawdownPct)}%`,
    color: "var(--danger-color)",
  },
  {
    label: "Max Drawdown (₹)",
    value: `₹${fmt(d.maxDrawdownValue)}`,
    color: "var(--danger-color)",
  },
  {
    label: "Kelly Criterion",
    value: `${fmt(d.kellyCriterionPct)}%`,
    color: "var(--text-primary)",
  },
  {
    label: "Recovery Factor",
    value: `${fmt(d.recoveryFactor)}`,
    color: "var(--success-color)",
  },
];

// Map raw API response → secondaryStats shape (object of items)
const buildSecondaryStats = (d) => ({
  consecutiveWins: {
    label: "Consecutive Wins",
    value: d.consecutiveWins?.current ?? "-",
    subValue: `Max: ${d.consecutiveWins?.max ?? "-"}`,
    color: "var(--success-color)",
  },
  consecutiveLosses: {
    label: "Consecutive Losses",
    value: d.consecutiveLosses?.current ?? "-",
    subValue: `Max: ${d.consecutiveLosses?.max ?? "-"}`,
    color: "var(--danger-color)",
  },
  avgProfitPerTrade: {
    label: "Avg Profit per Trade",
    value: `₹${fmt(d.avgProfit)}`,
    color: "var(--success-color)",
  },
  avgLossPerTrade: {
    label: "Avg Loss per Trade",
    value: `₹${fmt(d.avgLoss)}`,
    color: "var(--danger-color)",
  },
  largestWinningStreak: {
    label: "Largest Winning Streak",
    value: `₹${fmt(d.largestWinningStreakValue)}`,
    subValue: `${d.consecutiveWins?.max ?? "-"} Wins`,
    color: "var(--success-color)",
  },
  largestLosingStreak: {
    label: "Largest Losing Streak",
    value: `₹${fmt(d.largestLosingStreakValue)}`,
    subValue: `${d.consecutiveLosses?.max ?? "-"} Losses`,
    color: "var(--danger-color)",
  },
  recoveryFactor: {
    label: "Recovery Factor",
    value: fmt(d.recoveryFactor),
    color: "var(--success-color)",
  },
  kellyCriterion: {
    label: "Kelly Criterion",
    value: `${fmt(d.kellyCriterionPct)}%`,
    color: "var(--success-color)",
  },
});

// Map profitByTime object → lightweight-charts histogram array
const buildProfitByTime = (profitByTime) => {
  if (!profitByTime) return [];
  const dayOffsets = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  const base = new Date("2023-01-02"); // Monday
  return Object.entries(profitByTime).map(([day, value]) => {
    const d = new Date(base);
    d.setDate(d.getDate() + (dayOffsets[day] ?? 0));
    const time = d.toISOString().split("T")[0];
    return {
      time,
      value,
      color: value >= 0 ? "#089981" : "#f23645",
    };
  });
};

// Convert ISO timestamps to YYYY-MM-DD for lightweight-charts.
// If multiple points fall on the same date, they get a small incremental offset.
const normalizeChartData = (rawArr) => {
  if (!rawArr || !rawArr.length) return [];
  const seen = {};
  return rawArr
    .map((pt) => {
      const dateStr = (pt.time || "").slice(0, 10); // "2023-01-01"
      return { time: dateStr, value: pt.value };
    })
    .filter((pt) => pt.time) // drop blank dates
    .reduce((acc, pt) => {
      let t = pt.time;
      if (seen[t] !== undefined) {
        let d = new Date(t);
        do {
          d.setDate(d.getDate() + 1);
          t = d.toISOString().slice(0, 10);
        } while (seen[t] !== undefined);
      }
      seen[t] = true;
      acc.push({ time: t, value: pt.value });
      return acc;
    }, []);
};

// Map pnlDistribution array → lightweight-charts histogram array
const buildPnlDistribution = (pnlDistribution) => {
  if (!pnlDistribution || !pnlDistribution.length) return [];
  const sorted = [...pnlDistribution].sort((a, b) => {
    const aStart = parseFloat(
      (a.range || "0").split(" to ")[0].replace("−", "-"),
    );
    const bStart = parseFloat(
      (b.range || "0").split(" to ")[0].replace("−", "-"),
    );
    return aStart - bStart;
  });
  let d = new Date("2023-01-01");
  return sorted.map((item) => {
    d = new Date(d);
    d.setDate(d.getDate() + 1);
    const time = d.toISOString().split("T")[0];
    const rangeStart = parseFloat(
      (item.range || "0").split(" to ")[0].replace("−", "-"),
    );
    const isLoss = rangeStart < 0;
    return {
      time,
      value: item.count ?? 0,
      color: isLoss ? "#f23645" : "#089981",
    };
  });
};

const Backtest = () => {
  const [apiData, setApiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Request dashboard data for the symbol
    socket.emit("getBacktestDashboard", { symbol: "RELIANCE" });

    const handleResponse = (response) => {
      if (response.success) {
        console.log("Realtime Dashboard Metrics: ", response.data);
        const d =
          response.data?.netPnL != null
            ? response.data
            : (response.data?.data ?? response.data);
        setApiData(d);
      } else {
        console.error("[Backtest Socket Error]", response);
        setError(response.message || "Failed to load backtest data");
      }
      setLoading(false);
    };

    socket.on("backtestDashboardResponse", handleResponse);

    // Cleanup listener on unmount
    return () => {
      socket.off("backtestDashboardResponse", handleResponse);
    };
  }, []);

  if (loading) {
    return (
      <div
        className="backtest-dashboard"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          Loading backtest data…
        </div>
      </div>
    );
  }

  if (error || !apiData) {
    return (
      <div
        className="backtest-dashboard"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ color: "var(--danger-color)", fontSize: 14 }}>
          {error || "No data available"}
        </div>
      </div>
    );
  }

  // Build shaped props from live socket data
  const summaryMetrics = buildSummaryMetrics(apiData);
  const keyMetrics = buildKeyMetrics(apiData);
  const secondaryStats = buildSecondaryStats(apiData);
  const longShortPerformance = apiData.longVsShort
    ? {
        long: {
          netPnl: apiData.longVsShort.long?.netPnL ?? 0,
          percentage: apiData.longVsShort.long?.winRatePct ?? 0,
        },
        short: {
          netPnl: apiData.longVsShort.short?.netPnL ?? 0,
          percentage: apiData.longVsShort.short?.winRatePct ?? 0,
        },
      }
    : {
        long: { netPnl: 0, percentage: 0 },
        short: { netPnl: 0, percentage: 0 },
      };
  const recentTrades = apiData.recentTrades ?? [];

  const equityCurveData = normalizeChartData(apiData.equityCurveData);
  const drawdownCurveData = normalizeChartData(apiData.drawdownCurveData);
  const profitByTimeData = buildProfitByTime(apiData.profitByTime);
  const pnlDistributionData = buildPnlDistribution(apiData.pnlDistribution);

  const benchmarkCurveData = normalizeChartData(
    (apiData.equityCurveData ?? []).map((pt) => ({
      time: pt.time,
      value: pt.benchmark,
    })),
  );

  return (
    <div className="backtest-dashboard">
      {/* ── Top Bar ── */}
      <div className="bd-top-bar">
        <div className="bd-title-group">
          <h1>Backtest Dashboard</h1>
          <span className="bd-subtitle">
            Strategy:{" "}
            <span style={{ color: "var(--accent-color)" }}>EMA Crossover</span>
          </span>
        </div>
        <div className="bd-controls">
          <div className="bd-date-picker">
            <span>2023-01-01</span>
            <span style={{ color: "var(--text-secondary)", margin: "0 8px" }}>
              →
            </span>
            <span>2024-05-20</span>
            <span style={{ marginLeft: 8, color: "var(--text-secondary)" }}>
              📅
            </span>
          </div>
          <select className="bd-select">
            <option>All Markets</option>
          </select>
          <select className="bd-select" style={{ width: 60 }}>
            <option>1D</option>
          </select>
          <button className="bd-run-btn">Run New Backtest</button>
          <div className="bd-icon-btn">⬇</div>
          <div className="bd-icon-btn">⚙</div>
        </div>
      </div>

      {/* ── Main Content Grid ── */}
      <div className="bd-content">
        {/* Row 1: Summary Cards */}
        <SummaryCards data={summaryMetrics} />

        {/* Row 2: Equity & Key Metrics */}
        <div className="bd-grid-row" style={{ gridTemplateColumns: "3fr 1fr" }}>
          <EquityCurve
            equityData={equityCurveData}
            benchmarkData={benchmarkCurveData}
          />
          <KeyMetrics data={keyMetrics} />
        </div>

        {/* Row 3: Secondary Stats */}
        <SecondaryStats data={secondaryStats} />

        {/* Row 4: PnL, Outcome, Profit/Time, Long/Short */}
        <div
          className="bd-grid-row"
          style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr" }}
        >
          <PnLDistribution data={pnlDistributionData} />
          <TradeOutcome data={summaryMetrics} />
          <ProfitByTime data={profitByTimeData} />
          <LongVsShort data={longShortPerformance} />
        </div>

        {/* Row 5: Recent Trades & Drawdown */}
        <div className="bd-grid-row" style={{ gridTemplateColumns: "2fr 1fr" }}>
          <RecentTrades data={recentTrades} />
          <DrawdownCurve drawdownData={drawdownCurveData} />
        </div>
      </div>
    </div>
  );
};

export default Backtest;
