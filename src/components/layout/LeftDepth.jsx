import React from "react";
import { FiX, FiSettings } from "react-icons/fi";
import { Spinner } from "../tradingModals/Spinner";

const LeftDepth = ({ onClose, predictResults, setSelectedCurrency, isPredicting, predictionStatus }) => {
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
    progressContainer: {
      padding: "16px",
      borderBottom: "1px solid var(--border-color)",
      background: "var(--bg-secondary)",
    },
    progressHeader: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: "0.85rem",
      marginBottom: "8px",
      fontWeight: "600",
    },
    progressBarBg: {
      width: "100%",
      height: "8px",
      background: "var(--border-color)",
      borderRadius: "4px",
      overflow: "hidden",
    },
    progressBarFill: {
      height: "100%",
      background: "#22c55e",
      transition: "width 0.3s ease",
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
        <span>Strategy Results</span>
        <FiX style={{ cursor: "pointer" }} onClick={onClose} />
      </div>

      {predictionStatus?.status === 'running' && (
        <div style={styles.progressContainer}>
          <div style={styles.progressHeader}>
            <span>{predictionStatus.phase === 'fetching_ticks' ? 'Fetching Ticks...' : 'Predicting AI...'}</span>
            <span>
              {predictionStatus.total ? `${predictionStatus.processed || 0} / ${predictionStatus.total}` : ''}
            </span>
          </div>
          <div style={styles.progressBarBg}>
            <div 
              style={{
                ...styles.progressBarFill, 
                width: predictionStatus.total 
                  ? `${Math.max(5, ((predictionStatus.processed || 0) / predictionStatus.total) * 100)}%` 
                  : "5%"
              }} 
            />
          </div>
        </div>
      )}

      <div className="custom-scrollbar" style={styles.listContainer}>
        {isPredicting && (!predictionStatus || predictionStatus.status !== 'running') ? (
          <div style={{ display: "flex", height: "100%", justifyContent: "center", alignItems: "center" }}>
            <Spinner />
          </div>
        ) : predictResults && predictResults.length > 0 ? (
          predictResults.map((item, idx) => {
            const type = item.response?.type || "UNKNOWN";
            const isCall = type.toUpperCase() === "CALL";
            
            return (
              <div
                key={item.uuid || idx}
                style={styles.listItem}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--bg-secondary)"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                onClick={() => {
                  if (setSelectedCurrency && item.symbol) {
                    setSelectedCurrency({
                      name: item.symbol,
                      symbol: item.symbol,
                      segment: "NSE",
                      type: "currency"
                    });
                  }
                }}
              >
                {/* Row 1: Symbol + Trade Type Badge */}
                <div style={styles.itemTop}>
                  <span style={styles.symbol}>{item?.symbol}</span>
                  <span style={{...styles.badge, ...(isCall ? styles.badgeCall : styles.badgePut)}}>
                    {type}
                  </span>
                </div>

                {/* Row 2: Entry Price + Signal */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: "600", color: isCall ? "#22c55e" : "#ef4444" }}>
                    ₹{item.response?.entry_price ?? "—"}
                  </span>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", background: "var(--bg-secondary)", padding: "1px 6px", borderRadius: "4px" }}>
                    {item.response?.signal || "—"}
                  </span>
                </div>

                {/* Row 3: Trend + Status + RSI */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {item.response?.trend && (
                    <span style={{ fontSize: "0.68rem", color: item.response.trend === "UP" ? "#22c55e" : "#ef4444" }}>
                      ↕ {item.response.trend}
                    </span>
                  )}
                  {item.response?.status && (
                    <span style={{ fontSize: "0.68rem", color: "var(--text-secondary)" }}>
                      • {item.response.status}
                    </span>
                  )}
                  {item.response?.rsi && (
                    <span style={{ fontSize: "0.68rem", color: "var(--text-secondary)" }}>
                      RSI: {Number(item.response.rsi).toFixed(1)}
                    </span>
                  )}
                </div>

                {/* Row 4: Time */}
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
