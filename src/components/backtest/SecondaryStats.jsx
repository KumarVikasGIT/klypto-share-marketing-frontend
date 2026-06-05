import React from "react";

const SecondaryStats = ({ data }) => {
  return (
    <div className="secondary-stats-container">
      {Object.values(data).map((item, i) => (
        <div key={i} className="sec-stat-card">
          <div className="sec-stat-title">{item.label}</div>
          <div className="sec-stat-value" style={{ color: item.color }}>
            {item.value}
          </div>
          {item.subValue && (
            <div className="sec-stat-sub">{item.subValue}</div>
          )}
        </div>
      ))}

      <style>{`
        .secondary-stats-container {
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }
        .sec-stat-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          padding: 12px;
          text-align: center;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 6px;
        }
        .sec-stat-title {
          font-size: 11px;
          color: var(--text-primary);
        }
        .sec-stat-value {
          font-size: 16px;
          font-weight: 600;
        }
        .sec-stat-sub {
          font-size: 10px;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
};

export default SecondaryStats;
