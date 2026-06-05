import React from "react";
import { FiX, FiTrash2 } from "react-icons/fi";
import { Link } from "react-router-dom";

const LeftAlertListing = ({
  onClose,
  alertResult,
  setAlertResult,
  setSelectedCurrency,
}) => {
  const styles = {
    container: {
      display: "flex",
      flexDirection: "column",
      height: "calc(100vh - 60px)",
      background: "var(--bg-primary)",
      color: "var(--text-primary)",
      borderRight: "1px solid var(--border-color)",
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
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
      color: "var(--text-secondary)",
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
      borderBottom: "1px solid var(--bg-secondary)",
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
      color: "var(--text-primary)",
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
      color: "var(--text-secondary)",
    },
    emptyState: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "100%",
      color: "var(--text-secondary)",
      padding: "20px",
      textAlign: "center",
    },
  };

  const handleClear = () => {
    setAlertResult([]);
  };

  const results = Array.isArray(alertResult) ? alertResult : [];
  console.log("result",alertResult)

  const handleItemClick = (item) => {
    if (setSelectedCurrency) {
      setSelectedCurrency({
        symbol: item.symbol,
        name: item.name || item.symbol,
        token: item.token,
        segment: item.segment || "NSE",
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
        .custom-scrollbar::-webkit-scrollbar-track { background: var(--bg-primary); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #363a45; }
        .alert-item:hover { background-color: var(--border-color); }
        .clear-btn:hover { background-color: var(--border-color); color: var(--text-primary); }
      `}</style>

      <div style={styles.header}>
        <span>Script Signals</span>
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
          <FiX
            style={{ cursor: "pointer", color: "var(--text-secondary)" }}
            onClick={onClose}
          />
        </div>
      </div>

      <div className="custom-scrollbar" style={styles.listContainer}>
        {results.length === 0 ? (
          <div style={styles.emptyState}>
            <div
              style={{ fontSize: "2rem", marginBottom: "12px", opacity: 0.5 }}
            >
              🔔
            </div>
            <p
              style={{
                fontWeight: "600",
                fontSize: "0.9rem",
                color: "var(--text-primary)",
              }}
            >
              No active alerts
            </p>
            <p
              style={{
                fontSize: "0.75rem",
                marginTop: "8px",
                lineHeight: "1.4",
              }}
            >
              Start a scan from the Alert modal to see matching stocks here.
            </p>
          </div>
        ) : (
          results.map((item, idx) => (
            <div
              key={idx}
              className="alert-item-wrapper"
              style={{
                position: "relative",
              }}
            >
              <Link
                to="/dashboard"
                state={{
                  stock: item,
                }}
                style={{
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div
                  className="alert-item"
                  style={styles.listItem}
                  onClick={() => handleItemClick(item)}
                >
                  <div style={styles.itemTop}>
                    <span style={styles.stockName}>{item.symbol}</span>

                    {item.signalType && (
                      <span style={{
                        fontWeight: "600",
                        fontSize: "0.85rem",
                        color: item.signalType === "BUY" ? "#22ab94" : "var(--danger-color)",
                      }}>
                        {item.signalType}
                      </span>
                    )}
                  </div>

                  <div style={styles.itemBottom}>
                    <span>
                      {item.timestamp || new Date().toLocaleTimeString()}
                    </span>

                    {/* <span>{item.segment || "NSE"}</span> */}
                  </div>
                </div>
              </Link>

            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LeftAlertListing;
