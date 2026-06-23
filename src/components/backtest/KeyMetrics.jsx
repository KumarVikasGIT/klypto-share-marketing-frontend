import React from "react";

const KeyMetrics = ({ data }) => {
  // Split data into two columns if needed, or just map sequentially and let CSS grid handle it
  return (
    <div className="key-metrics-container">
      <div className="metrics-header">Key Metrics</div>
      <div className="metrics-grid">
        {data.map((item, index) => (
          <div key={index} className="metric-row">
            <span className="metric-label">{item.label}</span>
            <span className="metric-value" style={{ color: item.color }}>
              {item.value}
            </span>
          </div>
        ))}
      </div>

      <style>{`
        .key-metrics-container {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          padding: 16px;
          height: 100%;
        }
        .metrics-header {
          font-size: 13px;
          color: var(--text-primary);
          margin-bottom: 16px;
          font-weight: 600;
        }
        .metrics-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          column-gap: 32px;
          row-gap: 12px;
        }
        @media (max-width: 768px) {
          .metrics-grid {
            grid-template-columns: 1fr;
          }
        }
        .metric-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 6px;
        }
        .metric-label {
          font-size: 12px;
          color: var(--text-secondary);
        }
        .metric-value {
          font-size: 12px;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
};

export default KeyMetrics;
