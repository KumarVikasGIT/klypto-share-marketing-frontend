import React from "react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

const LongVsShort = ({ data }) => {
  const longPnl  = data?.long?.netPnl  ?? data?.long?.netPnL  ?? 0;
  const shortPnl = data?.short?.netPnl ?? data?.short?.netPnL ?? 0;
  const longPct  = data?.long?.percentage  ?? data?.long?.winRatePct  ?? 0;
  const shortPct = data?.short?.percentage ?? data?.short?.winRatePct ?? 0;

  const chartData = {
    labels: ["Long", "Short"],
    datasets: [
      {
        data: [longPnl, shortPnl],
        backgroundColor: ["#089981", "#f23645"],
        borderWidth: 0,
        cutout: "75%",
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#1a1d27",
        titleColor: "#d1d4dc",
        bodyColor: "#d1d4dc",
        borderColor: "#2e3347",
        borderWidth: 1,
      },
    },
  };

  const totalPnL = longPnl + shortPnl;

  return (
    <div className="long-short-container">
      <div className="ls-header">
        <span className="ls-title">Long vs Short Performance</span>
      </div>
      <div className="ls-body">
        <div className="ls-chart-wrapper">
          <Doughnut data={chartData} options={options} />
          <div className="ls-center-text">
            <span className="ls-center-lbl">Net PnL</span>
            <span className="ls-center-val">₹{totalPnL.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
        
        <div className="ls-legend">
          <div className="ls-legend-item">
            <div className="ls-legend-title">
              <span className="ls-legend-color" style={{ background: "#089981" }}></span> Long
            </div>
            <div className="ls-legend-val" style={{ color: "#089981" }}>
              ₹{longPnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })} ({longPct}%)
            </div>
          </div>
          <div className="ls-legend-item">
            <div className="ls-legend-title">
              <span className="ls-legend-color" style={{ background: "#f23645" }}></span> Short
            </div>
            <div className="ls-legend-val" style={{ color: "#f23645" }}>
              ₹{shortPnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })} ({shortPct}%)
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .long-short-container {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          display: flex;
          flex-direction: column;
          height: 100%;
          padding: 12px;
        }
        .ls-header {
          margin-bottom: 12px;
        }
        .ls-title {
          font-size: 13px;
          color: var(--text-primary);
          font-weight: 600;
        }
        .ls-body {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-around;
          flex: 1;
          gap: 16px;
        }
        .ls-chart-wrapper {
          position: relative;
          width: 120px;
          height: 120px;
        }
        .ls-center-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .ls-center-val {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .ls-center-lbl {
          font-size: 10px;
          color: var(--text-secondary);
        }
        .ls-legend {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .ls-legend-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .ls-legend-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--text-primary);
        }
        .ls-legend-color {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .ls-legend-val {
          font-size: 12px;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
};

export default LongVsShort;
