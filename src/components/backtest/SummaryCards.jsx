import React from "react";

const SummaryCards = ({ data }) => {
  return (
    <div className="summary-cards-container">
      {Object.values(data).map((item, i) => (
        <div key={i} className="summary-card">
          <div className="summary-card-title">
            {item.label} <span className="info-icon">ⓘ</span>
          </div>
          <div
            className="summary-card-value"
            style={{
              color:
                item.isPositive === true
                  ? "var(--success-color)"
                  : item.isPositive === false
                  ? "var(--danger-color)"
                  : "var(--text-primary)",
            }}
          >
            {item.label.includes("Rate") || item.label.includes("Return") || item.label.includes("Drawdown") ? "" : item.value < 0 ? "-" : ""}
            {item.label.includes("Rate") || item.label.includes("Return") || item.label.includes("Drawdown") ? "" : "$"}
            {Math.abs(item.value).toLocaleString("en-US", {
              minimumFractionDigits: Number.isInteger(item.value) ? 0 : 2,
            })}
            {item.label.includes("Rate") || item.label.includes("Return") || item.label.includes("Drawdown") ? "%" : ""}
          </div>
          {item.percentage && (
            <div className="summary-card-sub" style={{ color: "var(--success-color)" }}>
              {item.percentage}%
            </div>
          )}
          {item.annualized && (
            <div className="summary-card-sub">
              Annualized {item.annualized}%
            </div>
          )}
          {item.wins !== undefined && (
            <div className="summary-card-sub">
              {item.wins} Wins / {item.losses} Losses
            </div>
          )}
          {item.absolute !== undefined && (
            <div className="summary-card-sub">
              ${item.absolute.toLocaleString("en-US")}
            </div>
          )}
          {!item.percentage && !item.annualized && item.wins === undefined && item.absolute === undefined && (
            <div className="summary-card-sub" style={{ opacity: 0 }}>
              Placeholder
            </div>
          )}
        </div>
      ))}

      <style>{`
        .summary-cards-container {
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }
        @media (max-width: 1200px) {
          .summary-cards-container {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        @media (max-width: 768px) {
          .summary-cards-container {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        .summary-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .summary-card-title {
          font-size: 11px;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .info-icon {
          color: var(--text-secondary);
          font-size: 10px;
          cursor: pointer;
        }
        .summary-card-value {
          font-size: 18px;
          font-weight: 600;
        }
        .summary-card-sub {
          font-size: 10px;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
};

export default SummaryCards;
