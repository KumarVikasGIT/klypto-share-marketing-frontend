import React from "react";
import { FiX, FiSettings } from "react-icons/fi";
import { Spinner } from "../tradingModals/Spinner";

const LeftDepth = ({ onClose, predictResults, setSelectedCurrency, isPredicting }) => {
  const styles = {
    container: {
      display: "flex",
      flexDirection: "column",
      height: "calc(100vh - 60px)",
      background: "var(--bg-primary)",
      color: "var(--text-primary)",
      borderRight: "1px solid var(--border-color)",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "12px 16px",
      borderBottom: "1px solid var(--border-color)",
      fontWeight: "600",
      fontSize: "0.95rem",
    },
    listContainer: {
      flex: 1,
      overflowY: "auto",
    },
    listItem: {
      padding: "12px 16px",
      borderBottom: "1px solid var(--border-color)",
      display: "flex",
      flexDirection: "column",
      gap: "6px",
      cursor: "pointer",
      transition: "background 0.2s",
    },
    itemTop: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    symbol: {
      fontWeight: "600",
      fontSize: "0.9rem",
      color: "var(--text-primary)",
    },
    badge: {
      fontSize: "0.65rem",
      fontWeight: "bold",
      padding: "2px 6px",
      borderRadius: "4px",
    },
    badgeCall: {
      background: "rgba(34, 197, 94, 0.15)",
      color: "#22c55e",
      border: "1px solid rgba(34, 197, 94, 0.3)",
    },
    badgePut: {
      background: "rgba(239, 68, 68, 0.15)",
      color: "#ef4444",
      border: "1px solid rgba(239, 68, 68, 0.3)",
    },
    time: {
      fontSize: "0.75rem",
      color: "var(--text-secondary)",
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span>Results</span>
        <FiX style={{ cursor: "pointer" }} onClick={onClose} />
      </div>
      <div className="custom-scrollbar" style={styles.listContainer}>
        {isPredicting ? (
          <div style={{ display: "flex", height: "100%", justifyContent: "center", alignItems: "center" }}>
            <Spinner />
          </div>
        ) : predictResults && predictResults.length > 0 ? (
          predictResults.map((item, idx) => {
            const type = item.response?.type || "UNKNOWN";
            const isCall = type.toUpperCase() === "CALL";
            
            return (
              <div 
                key={idx} 
                style={styles.listItem}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--bg-secondary)"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                onClick={() => {
                  if (setSelectedCurrency && item.symbol) {
                    setSelectedCurrency({
                      name: item.symbol,
                      symbol: item.symbol,
                      segment: "NSE", // Assuming NSE for now
                      type: "currency"
                    });
                  }
                }}
              >
                <div style={styles.itemTop}>
                  <span style={styles.symbol}>{item.symbol}</span>
                  <span style={{...styles.badge, ...(isCall ? styles.badgeCall : styles.badgePut)}}>
                    {isCall ? "BUY" : type.toUpperCase() === "PUT" ? "SELL" : type}
                  </span>
                </div>
                <div style={styles.time}>
                  {item.tick?.datetime || item.response?.entry_time || "N/A"}
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ textAlign: "center", marginTop: "20px", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            No results available.
          </div>
        )}
      </div>
    </div>
  );
};

export default LeftDepth;
