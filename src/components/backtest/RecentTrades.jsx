import React from "react";

const RecentTrades = ({ data }) => {
  return (
    <div className="recent-trades-container">
      <div className="rt-header">
        <span className="rt-title">Recent Trades</span>
      </div>
      <div className="rt-table-wrapper">
        <table className="rt-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Entry Time</th>
              <th>Exit Time</th>
              <th>Direction</th>
              <th>Symbol</th>
              <th>Entry Price</th>
              <th>Exit Price</th>
              <th>PnL ($)</th>
              <th>PnL (%)</th>
              <th>Duration</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {data.map((trade) => (
              <tr key={trade.id}>
                <td>{trade.id}</td>
                <td>{trade.entryTime}</td>
                <td>{trade.exitTime}</td>
                <td style={{ color: trade.direction === "Long" ? "var(--success-color)" : "var(--danger-color)" }}>{trade.direction}</td>
                <td>{trade.symbol}</td>
                <td>{trade.entryPrice.toFixed(2)}</td>
                <td>{trade.exitPrice.toFixed(2)}</td>
                <td style={{ color: trade.pnl >= 0 ? "var(--success-color)" : "var(--danger-color)" }}>
                  {trade.pnl >= 0 ? "+" : "-"}${Math.abs(trade.pnl).toFixed(2)}
                </td>
                <td style={{ color: trade.pnlPct >= 0 ? "var(--success-color)" : "var(--danger-color)" }}>
                  {trade.pnlPct >= 0 ? "+" : ""}{trade.pnlPct.toFixed(2)}%
                </td>
                <td>{trade.duration}</td>
                <td style={{ color: trade.result === "Win" ? "var(--success-color)" : "var(--danger-color)" }}>{trade.result}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`
        .recent-trades-container {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .rt-header {
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-color);
        }
        .rt-title {
          font-size: 13px;
          color: var(--text-primary);
          font-weight: 600;
        }
        .rt-table-wrapper {
          overflow-x: auto;
          flex: 1;
        }
        .rt-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .rt-table th {
          font-size: 11px;
          color: var(--text-secondary);
          padding: 10px 16px;
          font-weight: 500;
          border-bottom: 1px solid var(--border-color);
        }
        .rt-table td {
          font-size: 11px;
          color: var(--text-primary);
          padding: 10px 16px;
          border-bottom: 1px solid var(--border-color);
        }
        .rt-table tr:last-child td {
          border-bottom: none;
        }
      `}</style>
    </div>
  );
};

export default RecentTrades;
