import React from "react";
import "./Backtest.css";
import {
  summaryMetrics,
  keyMetrics,
  secondaryStats,
  longShortPerformance,
  recentTrades,
  equityCurveData,
  benchmarkCurveData,
  drawdownData,
  profitByTimeData,
  pnlDistributionData,
} from "../../components/backtest/dummyData";

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

const Backtest = () => {
  return (
    <div className="backtest-dashboard">
      {/* ── Top Bar ── */}
      <div className="bd-top-bar">
        <div className="bd-title-group">
          <h1>Backtest Dashboard</h1>
          <span className="bd-subtitle">Strategy: <span style={{ color: "var(--accent-color)" }}>EMA Crossover</span></span>
        </div>
        <div className="bd-controls">
          <div className="bd-date-picker">
            <span>2023-01-01</span>
            <span style={{ color: "var(--text-secondary)", margin: "0 8px" }}>→</span>
            <span>2024-05-20</span>
            <span style={{ marginLeft: 8, color: "var(--text-secondary)" }}>📅</span>
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
          <EquityCurve equityData={equityCurveData} benchmarkData={benchmarkCurveData} />
          <KeyMetrics data={keyMetrics} />
        </div>

        {/* Row 3: Secondary Stats */}
        <SecondaryStats data={secondaryStats} />

        {/* Row 4: PnL, Outcome, Profit/Time, Long/Short */}
        <div className="bd-grid-row" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr" }}>
          <PnLDistribution data={pnlDistributionData} />
          <TradeOutcome data={summaryMetrics} />
          <ProfitByTime data={profitByTimeData} />
          <LongVsShort data={longShortPerformance} />
        </div>

        {/* Row 5: Recent Trades & Drawdown */}
        <div className="bd-grid-row" style={{ gridTemplateColumns: "2fr 1fr" }}>
          <RecentTrades data={recentTrades} />
          <DrawdownCurve drawdownData={drawdownData} />
        </div>
      </div>
    </div>
  );
};

export default Backtest;
