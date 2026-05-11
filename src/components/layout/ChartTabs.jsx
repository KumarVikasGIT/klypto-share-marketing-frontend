import React, { useState } from "react";
import { FiMaximize, FiZap } from "react-icons/fi";

const ChartTabs = ({ activeTab, setActiveTab }) => {

  const styles = {
    container: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 16px",
      height: "48px",
      backgroundColor: "#131722",
      borderBottom: "1px solid #2a2e39",
      color: "#d1d4dc",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
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
      color: "#787b86",
    },
    tabActive: {
      color: "#2962ff",
    },
    activeIndicator: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: "2px",
      backgroundColor: "#2962ff",
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
      border: "1px solid #2a2e39",
      borderRadius: "4px",
      backgroundColor: "transparent",
      color: "#787b86",
      cursor: "pointer",
    }
  };

  const tabs = ["Chart", "Overview", "Option Chain", "Alerts"];

  return (
    <div style={styles.container}>
      <div style={styles.tabsGroup}>
        {tabs.map(tab => (
          <div 
            key={tab}
            style={{
              ...styles.tab,
              ...(activeTab === tab ? styles.tabActive : {})
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
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(124, 58, 237, 0.1)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
        >
          <FiZap /> SCALPER MODE
        </button>
        <button style={styles.iconBtn}>
          <FiMaximize size={14} />
        </button>
      </div>
    </div>
  );
};

export default ChartTabs;
