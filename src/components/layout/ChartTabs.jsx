import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaCode  } from "react-icons/fa6";
import { SiVitest } from "react-icons/si";
import GoToDateDialog from "./GoToDateDialog";
import { TbCalendarShare } from "react-icons/tb";

const ChartTabs = ({
  activeTab,
  setActiveTab,
  onCodeClick,
  onStrategyClick,
  onGoToDate,
}) => {
  const [showGoToDate, setShowGoToDate] = useState(false);
  const navigate = useNavigate();
  const styles = {
    container: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 16px",
      height: "48px",
      backgroundColor: "var(--bg-primary)",
      borderBottom: "1px solid var(--border-color)",
      color: "var(--text-primary)",
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    },
    tabsGroup: {
      display: "flex",
      height: "100%",
    },
    tab: {
      padding: "0 16px",
      display: "flex",
      alignItems: "center",
      fontSize: "0.9rem",
      fontWeight: "500",
      cursor: "pointer",
      position: "relative",
      color: "var(--text-secondary)",
    },
    tabActive: {
      color: "var(--accent-color)",
    },
    activeIndicator: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: "2px",
      backgroundColor: "var(--accent-color)",
    },
    actionsGroup: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
    },
    scalperBtn: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "6px 12px",
      backgroundColor: "transparent",
      border: "1px solid #7c3aed",
      borderRadius: "4px",
      color: "#7c3aed",
      fontSize: "0.8rem",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.2s",
    },
    iconBtn: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "32px",
      height: "32px",
      border: "1px solid var(--border-color)",
      borderRadius: "4px",
      backgroundColor: "transparent",
      color: "var(--text-secondary)",
      cursor: "pointer",
    },
  };

  const tabs = ["Chart", "Overview", "Option Chain", "OI Analytics"];

  return (
    <div className="chart-tabs-container">
      <style>{`
        .chart-tabs-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          height: 48px;
          background-color: var(--bg-primary);
          border-bottom: 1px solid var(--border-color);
          color: var(--text-primary);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          overflow-x: auto;
          white-space: nowrap;
          position: relative;
          z-index: 50;
        }
        .chart-tabs-container::-webkit-scrollbar {
          display: none;
        }
        .chart-tabs-group {
          display: flex;
          height: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .chart-tabs-group::-webkit-scrollbar {
          display: none;
        }
        .chart-tab-item {
          padding: 0 16px;
          display: flex;
          align-items: center;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          position: relative;
          color: var(--text-secondary);
          flex-shrink: 0;
        }
        .chart-tab-active {
          color: var(--accent-color);
        }
        .chart-tab-active-indicator {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background-color: var(--accent-color);
        }
        .chart-actions-group {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-left: 20px;
          flex-shrink: 0;
        }
        .chart-scalper-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background-color: transparent;
          border: 1px solid #7c3aed;
          border-radius: 4px;
          color: #7c3aed;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .chart-scalper-btn:hover {
          background-color: rgba(124, 58, 237, 0.1);
        }
        .chart-strategy-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          border-radius: 4px;
          border: 1px solid #999;
          padding: 6px 12px;
          color: #999;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          background-color: transparent;
        }
        .chart-strategy-btn:hover {
          background-color: rgba(124, 58, 237, 0.1);
        }

        @media (max-width: 768px) {
          .chart-tabs-container {
            flex-direction: column;
            align-items: flex-start;
            height: auto;
            padding: 0;
          }
          .chart-tabs-group {
            width: 100%;
            height: auto;
            padding: 8px 16px;
            flex-wrap: wrap;
            overflow-x: visible;
            gap: 12px;
          }
          .chart-tab-item {
            padding: 4px 8px;
            flex-grow: 1;
            justify-content: center;
          }
          .chart-actions-group {
            width: 100%;
            padding: 8px 16px;
            margin-left: 0;
            border-bottom: 1px solid var(--border-color);
            background: var(--bg-secondary);
            justify-content: space-between;
          }
        }
      `}</style>
      <div className="chart-tabs-group">
        {tabs.map((tab) => (
          <div
            key={tab}
            className={`chart-tab-item ${activeTab === tab ? "chart-tab-active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
            {activeTab === tab && (
              <div className="chart-tab-active-indicator" />
            )}
          </div>
        ))}
      </div>

      <div className="chart-actions-group">
        <button title="Go to" onClick={() => setShowGoToDate(true)}>
          <TbCalendarShare size={14} />
          
        </button>
        <button
          title="Run Strategy"
          onClick={onStrategyClick}
          className="chart-strategy-btn"
        >
          <SiVitest size={14} /> STRATEGY
        </button>
        <button className="chart-scalper-btn" onClick={onCodeClick}>
          <FaCode />
          CODE EDITOR
        </button>
      </div>

      {showGoToDate && (
        <GoToDateDialog
          onClose={() => setShowGoToDate(false)}
          onGoTo={(date) => {
            if (onGoToDate) onGoToDate(date);
          }}
        />
      )}
    </div>
  );
};

export default ChartTabs;
