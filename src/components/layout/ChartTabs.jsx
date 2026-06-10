import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaCode, FaLaptopCode } from "react-icons/fa6";
import { FiMaximize, FiZap } from "react-icons/fi";
import { SiVitest } from "react-icons/si";

const ChartTabs = ({ activeTab, setActiveTab, onCodeClick }) => {
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

  const tabs = ["Chart", "Overview", "Option Chain","OI Analytics"];

  return (
    <div style={styles.container}>
      <div style={styles.tabsGroup}>
        {tabs.map((tab) => (
          <div
            key={tab}
            style={{
              ...styles.tab,
              ...(activeTab === tab ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
            {activeTab === tab && <div style={styles.activeIndicator} />}
          </div>
        ))}
      </div>

      <div style={styles.actionsGroup}>
        <button
          style={styles.scalperBtn}
          onClick={onCodeClick}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(124, 58, 237, 0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <FaCode />
          CODE EDITOR
        </button>
        <button
          style={{...styles.actionsGroup, borderRadius: "4px", border: "1px solid #999", padding: "6px 12px", color: "#999", fontSize: "0.8rem", fontWeight: "600", cursor: "pointer", transition: "all 0.2s" }}
          onClick={() => navigate('/backtest')}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(124, 58, 237, 0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <SiVitest size={14} /> BACKTEST
        </button>
      </div>
    </div>
  );
};

export default ChartTabs;
