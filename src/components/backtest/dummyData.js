/**
 * Dummy Data for Backtest Dashboard
 * 
 * ── WHERE TO FETCH ACTUAL DATA ──
 * To populate this dashboard with real data, you generally have two approaches:
 * 
 * 1. Build Your Own Backend (Recommended for full control):
 *    Fetch raw historical candle data from providers like **Polygon.io**, **Alpaca**, or **Kite Connect (Zerodha)**.
 *    Run the backtest on your Node.js or Python backend using libraries like `vectorbt` or `backtrader`.
 *    Expose an endpoint (e.g., `GET /api/backtest/results`) that calculates and returns the exact JSON structures below.
 * 
 * 2. Third-Party Backtesting Engines via API:
 *    - **QuantConnect API**: A cloud-based algorithmic trading engine. You can run backtests via their API and fetch detailed JSON reports containing trade lists, equity curves, and performance metrics.
 *    - **Alpaca Trading API**: Offers historical data and paper trading environments. While you still write the logic, they provide robust endpoints for evaluating portfolio history.
 *    - **MetaAPI**: If trading Forex/CFDs via MetaTrader, MetaAPI can pull backtest reports and trade history directly from the terminal.
 */

// Top Summary Cards
export const summaryMetrics = {
  netPnl: { value: 24560.75, percentage: 24.56, label: "Net PnL", isPositive: true },
  totalReturn: { value: 24.56, annualized: 18.47, label: "Total Return", isPositive: true },
  totalTrades: { value: 312, label: "Total Trades" },
  winRate: { value: 62.18, wins: 194, losses: 118, label: "Win Rate (Accuracy)" },
  profitFactor: { value: 2.35, label: "Profit Factor", isPositive: true },
  maxDrawdown: { value: -8.73, absolute: -8642.21, label: "Max Drawdown", isPositive: false },
  maxProfitSingle: { value: 2345.60, label: "Max Profit (Single Trade)", isPositive: true },
  maxLossSingle: { value: -1250.00, label: "Max Loss (Single Trade)", isPositive: false }
};

// Key Metrics Table Data
export const keyMetrics = [
  { label: "Initial Capital", value: "$10,000.00", color: "var(--text-primary)" },
  { label: "Final Capital", value: "$34,560.75", color: "var(--success-color)" },
  { label: "Net PnL", value: "$24,560.75", color: "var(--success-color)" },
  { label: "Total Return", value: "24.56%", color: "var(--success-color)" },
  { label: "Annualized Return", value: "18.47%", color: "var(--success-color)" },
  { label: "Calmar Ratio", value: "2.11", color: "var(--text-primary)" },
  { label: "Sharpe Ratio", value: "1.34", color: "var(--text-primary)" },
  { label: "Sortino Ratio", value: "2.02", color: "var(--text-primary)" },
  { label: "Total Trades", value: "312", color: "var(--text-primary)" },
  { label: "Win Rate (Accuracy)", value: "62.18%", color: "var(--success-color)" },
  { label: "Profit Factor", value: "2.35", color: "var(--success-color)" },
  { label: "Expectancy", value: "$78.72", color: "var(--success-color)" },
  { label: "Avg Profit", value: "$125.73", color: "var(--success-color)" },
  { label: "Avg Loss", value: "-$63.91", color: "var(--danger-color)" },
  { label: "Max Drawdown", value: "-8.73%", color: "var(--danger-color)" },
  { label: "Max Drawdown ($)", value: "-$8,642.21", color: "var(--danger-color)" }
];

// Secondary Stats Cards
export const secondaryStats = {
  consecutiveWins: { value: 9, subValue: "Best: 17", color: "var(--success-color)", label: "Consecutive Wins" },
  consecutiveLosses: { value: 4, subValue: "Worst: 7", color: "var(--danger-color)", label: "Consecutive Losses" },
  avgProfitPerTrade: { value: "$125.73", color: "var(--success-color)", label: "Avg Profit per Trade" },
  avgLossPerTrade: { value: "-$63.91", color: "var(--danger-color)", label: "Avg Loss per Trade" },
  largestWinningStreak: { value: "$7,890.40", subValue: "17 Wins", color: "var(--success-color)", label: "Largest Winning Streak" },
  largestLosingStreak: { value: "-$3,210.50", subValue: "7 Losses", color: "var(--danger-color)", label: "Largest Losing Streak" },
  recoveryFactor: { value: "2.84", color: "var(--success-color)", label: "Recovery Factor" },
  kellyCriterion: { value: "12.35%", color: "var(--success-color)", label: "Kelly Criterion" }
};

// Long vs Short Performance
export const longShortPerformance = {
  long: { netPnl: 17890.40, percentage: 72.86 },
  short: { netPnl: 6670.35, percentage: 27.14 }
};

// Recent Trades
export const recentTrades = [
  { id: 1, entryTime: "2024-05-17 10:15", exitTime: "2024-05-17 14:30", direction: "Long", symbol: "AAPL", entryPrice: 189.23, exitPrice: 191.45, pnl: 222.00, pnlPct: 1.17, duration: "4h 15m", result: "Win" },
  { id: 2, entryTime: "2024-05-16 09:45", exitTime: "2024-05-16 11:20", direction: "Short", symbol: "MSFT", entryPrice: 416.78, exitPrice: 413.50, pnl: 328.00, pnlPct: 0.79, duration: "1h 35m", result: "Win" },
  { id: 3, entryTime: "2024-05-15 13:10", exitTime: "2024-05-15 15:45", direction: "Long", symbol: "NVDA", entryPrice: 940.25, exitPrice: 932.10, pnl: -814.50, pnlPct: -0.87, duration: "2h 35m", result: "Loss" },
  { id: 4, entryTime: "2024-05-14 10:00", exitTime: "2024-05-14 12:05", direction: "Long", symbol: "TSLA", entryPrice: 177.35, exitPrice: 181.90, pnl: 455.00, pnlPct: 2.56, duration: "2h 5m", result: "Win" },
  { id: 5, entryTime: "2024-05-13 09:35", exitTime: "2024-05-13 10:40", direction: "Short", symbol: "AMZN", entryPrice: 186.40, exitPrice: 187.65, pnl: -125.00, pnlPct: -0.67, duration: "1h 5m", result: "Loss" }
];

// Helper to generate dates
const generateDates = (count) => {
  const dates = [];
  let d = new Date("2023-01-01");
  for (let i = 0; i < count; i++) {
    dates.push(d.toISOString().split('T')[0]);
    d.setDate(d.getDate() + 1);
  }
  return dates;
};

// Equity Curve Data (for lightweight-charts LineSeries)
export const equityCurveData = generateDates(500).map((time, i) => {
  const base = 10000;
  // Create a nice looking simulated upward curve with some noise
  const noise = Math.sin(i / 10) * 1000 + Math.cos(i / 25) * 2000 + (Math.random() - 0.5) * 500;
  const trend = i * 40;
  return { time, value: base + trend + noise };
});

export const benchmarkCurveData = generateDates(500).map((time, i) => {
  const base = 10000;
  const noise = Math.sin(i / 20) * 500 + (Math.random() - 0.5) * 300;
  const trend = i * 25;
  return { time, value: base + trend + noise };
});

// Drawdown Curve Data (for lightweight-charts AreaSeries)
export const drawdownData = equityCurveData.map((data, i) => {
  // Simulate drawdown percentages
  const noise = Math.sin(i / 15) * -5 + (Math.random() - 0.5) * 2;
  const val = Math.min(0, Math.max(-10, noise)); // keep between 0 and -10
  return { time: data.time, value: val };
});

// Profit by Time (Days of week) - mapped as a generic histogram for Lightweight charts
export const profitByTimeData = [
  { time: '2023-01-01', value: 4000, color: 'var(--success-color)' }, // Mon
  { time: '2023-01-02', value: 6500, color: 'var(--success-color)' }, // Tue
  { time: '2023-01-03', value: 3500, color: 'var(--success-color)' }, // Wed
  { time: '2023-01-04', value: 3000, color: 'var(--success-color)' }, // Thu
  { time: '2023-01-05', value: 5000, color: 'var(--success-color)' }, // Fri
  { time: '2023-01-06', value: 1000, color: 'var(--success-color)' }, // Sat
  { time: '2023-01-07', value: 0, color: 'var(--success-color)' },    // Sun
];

// PnL Distribution (Histogram)
export const pnlDistributionData = [];
let distTime = new Date('2023-01-01');
for (let i = -15; i <= 25; i++) {
  distTime.setDate(distTime.getDate() + 1);
  const val = Math.round(Math.exp(-Math.pow(i - 5, 2) / 50) * 50) + Math.random() * 5;
  const isLoss = i < 0;
  pnlDistributionData.push({
    time: distTime.toISOString().split('T')[0],
    value: isLoss ? val * 0.5 : val, 
    color: isLoss ? 'var(--danger-color)' : 'var(--success-color)'
  });
}
