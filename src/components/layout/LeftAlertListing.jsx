import React from "react";
import { FiX, FiTrash2 } from "react-icons/fi";

const LeftAlertListing = ({ onClose, alertResult, setAlertResult, setSelectedCurrency }) => {
  const styles = {
    container: {
      display: "flex",
      flexDirection: "column",
      height: "calc(100vh - 60px)",
      background: "#131722",
      color: "#d1d4dc",
      borderRight: "1px solid #2a2e39",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "12px 16px",
      borderBottom: "1px solid #2a2e39",
      fontWeight: "600",
      fontSize: "0.95rem",
    },
    headerActions: {
      display: "flex",
      gap: "12px",
      alignItems: "center",
    },
    clearBtn: {
      display: "flex",
      alignItems: "center",
      gap: "4px",
      background: "transparent",
      border: "none",
      color: "#787b86",
      cursor: "pointer",
      fontSize: "0.8rem",
      padding: "4px 8px",
      borderRadius: "4px",
      transition: "background 0.2s",
    },
    listContainer: {
      flex: 1,
      overflowY: "auto",
    },
    listItem: {
      display: "flex",
      flexDirection: "column",
      padding: "12px 16px",
      borderBottom: "1px solid #1e222d",
      cursor: "pointer",
      transition: "background 0.2s",
    },
    itemTop: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: "4px",
    },
    stockName: {
      fontWeight: "600",
      fontSize: "0.85rem",
      color: "#d1d4dc",
    },
    rsiValue: {
      fontWeight: "600",
      fontSize: "0.85rem",
      color: "#22ab94",
    },
    itemBottom: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: "0.75rem",
      color: "#787b86",
    },
    emptyState: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "100%",
      color: "#787b86",
      padding: "20px",
      textAlign: "center",
    }
  };

  const handleClear = () => {
    setAlertResult([]);
  };

  const results = Array.isArray(alertResult) ? alertResult : [];

  const handleItemClick = (item) => {
    if (setSelectedCurrency) {
      setSelectedCurrency({
        symbol: item.symbol,
        name: item.name || item.symbol,
        token: item.token,
        segment: item.segment || "NSE"
      });
    }
    if (setActiveTab) {
      setActiveTab("Chart");
    }
  };

  return (
    <div style={styles.container}>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #131722; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #2a2e39; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #363a45; }
        .alert-item:hover { background-color: #2a2e39; }
        .clear-btn:hover { background-color: #2a2e39; color: #d1d4dc; }
      `}</style>
      
      <div style={styles.header}>
        <span>Alert Scanner Results</span>
        <div style={styles.headerActions}>
          {results.length > 0 && (
            <button 
              className="clear-btn" 
              style={styles.clearBtn}
              onClick={handleClear}
            >
              <FiTrash2 size={14} />
              <span>Clear</span>
            </button>
          )}
          <FiX style={{ cursor: "pointer", color: "#787b86" }} onClick={onClose} />
        </div>
      </div>

      <div className="custom-scrollbar" style={styles.listContainer}>
        {results.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={{ fontSize: "2rem", marginBottom: "12px", opacity: 0.5 }}>🔔</div>
            <p style={{ fontWeight: "600", fontSize: "0.9rem", color: "#d1d4dc" }}>No active alerts</p>
            <p style={{ fontSize: "0.75rem", marginTop: "8px", lineHeight: "1.4" }}>
              Start a scan from the Alert modal to see matching stocks here.
            </p>
          </div>
        ) : (
          results.map((item, idx) => (
            <div 
              key={idx} 
              className="alert-item"
              style={styles.listItem}
              onClick={() => handleItemClick(item)}
            >
              <div style={styles.itemTop}>
                <span style={styles.stockName}>{item.symbol}</span>
                <span style={styles.rsiValue}>{Number(item.rsi).toFixed(2)}</span>
              </div>
              <div style={styles.itemBottom}>
                <span>{item.timestamp || new Date().toLocaleTimeString()}</span>
                <span>{item.segment || "NSE"}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LeftAlertListing;
