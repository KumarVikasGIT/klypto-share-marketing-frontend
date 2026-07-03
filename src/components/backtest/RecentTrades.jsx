import React from "react";
import { formatIST } from "../../util/common";

const RecentTrades = ({ data }) => {
  const calculateDuration = (entryTime, exitTime) => {
    if (!entryTime || !exitTime) return "—";

    const start = new Date(entryTime);
    const end = new Date(exitTime);

    const diffMs = end - start;

    if (diffMs <= 0) return "—";

    const totalMinutes = Math.floor(diffMs / (1000 * 60));

    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;

    const parts = [];

    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    if (minutes || parts?.length === 0) parts.push(`${minutes}m`);

    return parts.join(" ");
  };

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
            {(data || []).map((trade, idx) => {
              const entryPrice = trade.entryPrice ?? null;
              const exitPrice = trade.exitPrice ?? null;
              const pnl = trade.pnlValue ?? null;
              const pnlPct = trade.pnlPercentage ?? null;
              const direction = trade.direction ?? "—";
              const symbol = trade.symbol ?? "—";
              const result =
                trade.result ??
                (pnl != null ? (pnl >= 0 ? "Win" : "Loss") : "—");
              const entryTime = trade.entryTime ?? "—";
              const exitTime = trade.exitTime ?? "—";
              const duration = calculateDuration(entryTime, exitTime) ?? "—";
              return (
                <tr key={trade.id ?? idx}>
                  <td>{idx + 1}</td>
                  <td>{formatIST(entryTime)}</td>
                  <td>{formatIST(exitTime)}</td>
                  <td
                    style={{
                      color:
                        direction === "Long" || direction === "BUY"
                          ? "var(--success-color)"
                          : "var(--danger-color)",
                    }}
                  >
                    {direction}
                  </td>
                  <td>{symbol}</td>
                  <td>
                    {entryPrice != null ? Number(entryPrice).toFixed(2) : "—"}
                  </td>
                  <td>
                    {exitPrice != null ? Number(exitPrice).toFixed(2) : "—"}
                  </td>
                  <td
                    style={{
                      color:
                        pnl != null && pnl >= 0
                          ? "var(--success-color)"
                          : "var(--danger-color)",
                      width: "10%",
                    }}
                  >
                    {pnl != null
                      ? `${pnl >= 0 ? "+" : "-"}₹${Math.abs(Number(pnl)).toFixed(2)}`
                      : "—"}
                  </td>
                  <td
                    style={{
                      color:
                        pnlPct != null && pnlPct >= 0
                          ? "var(--success-color)"
                          : "var(--danger-color)",
                    }}
                  >
                    {pnlPct != null
                      ? `${pnlPct >= 0 ? "+" : ""}${Number(pnlPct).toFixed(2)}%`
                      : "—"}
                  </td>
                  <td>{duration}</td>
                  <td
                    style={{
                      color:
                        result === "Win"
                          ? "var(--success-color)"
                          : "var(--danger-color)",
                    }}
                  >
                    {result}
                  </td>
                </tr>
              );
            })}
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
