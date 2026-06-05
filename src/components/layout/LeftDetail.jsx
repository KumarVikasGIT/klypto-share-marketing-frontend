import React, { useState } from "react";
import { FiX, FiPlus, FiMoreHorizontal, FiMaximize2, FiZap } from "react-icons/fi";
import { BsGrid } from "react-icons/bs";
import { AiOutlineEdit } from "react-icons/ai";
import { ListingModal } from "../tradingModals/ListingModal";
import ScannerPanel from "./ScannerPanel"; // ← adjust path if needed

const LeftDetail = ({
  onClose,
  selectedCurrency,
  detailsList,
  onAddStock,
  onRemoveStock,
  setSelectedCurrency,
  // --- Scanner props from useAlerts ---
  addAlert,
  clearAllCoins,
  scanner,
  matchedCoins,
  removeCoin,
  alertsFeed,
  activeIndicators,
  openScannerTrigger,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Tab: "watchlist" | "scanner"
  const [activeTab, setActiveTab] = useState("watchlist");

  React.useEffect(() => {
    if (openScannerTrigger && openScannerTrigger > 0) {
      setActiveTab("scanner");
      setIsScannerOpen(true);
    }
  }, [openScannerTrigger]);

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
    },
    headerTitle: {
      display: "flex",
      alignItems: "center",
      gap: "4px",
      fontWeight: "600",
      fontSize: "0.95rem",
    },
    headerIcons: {
      display: "flex",
      gap: "12px",
      color: "var(--text-secondary)",
      cursor: "pointer",
      alignItems: "center",
    },
    tabBar: {
      display: "flex",
      borderBottom: "1px solid var(--border-color)",
    },
    tab: (active) => ({
      flex: 1,
      padding: "8px 0",
      textAlign: "center",
      fontSize: "0.75rem",
      fontWeight: active ? 600 : 400,
      color: active ? "var(--text-primary)" : "var(--text-secondary)",
      cursor: "pointer",
      borderBottom: active ? "2px solid var(--accent-color)" : "2px solid transparent",
      transition: "all 0.15s",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
    }),
    scannerBadge: {
      background: "var(--accent-color)",
      color: "#fff",
      borderRadius: 20,
      padding: "1px 6px",
      fontSize: "0.65rem",
      fontWeight: 700,
    },
    subHeader: {
      display: "flex",
      justifyContent: "space-between",
      padding: "8px 16px",
      fontSize: "0.7rem",
      color: "var(--text-secondary)",
      textTransform: "uppercase",
      borderBottom: "1px solid var(--border-color)",
    },
    listContainer: {
      flex: 1,
      overflowY: "auto",
    },
    listItem: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "10px 16px",
      borderBottom: "1px solid var(--bg-secondary)",
      cursor: "pointer",
    },
    stockName: {
      fontWeight: "600",
      fontSize: "0.85rem",
      color: "var(--text-primary)",
    },
    stockChange: {
      fontSize: "0.75rem",
    },
    footer: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "12px 16px",
      borderTop: "1px solid var(--border-color)",
      background: "var(--bg-secondary)",
    },
    footerLeft: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontSize: "0.9rem",
      fontWeight: "600",
      color: "var(--text-primary)",
    },
    footerIcons: {
      display: "flex",
      gap: "16px",
      color: "var(--text-secondary)",
      cursor: "pointer",
    },
    btnContainer: {
      display: "flex",
      gap: "8px",
    },
    addBtn: {
      background: "var(--accent-color)",
      color: "white",
      border: "none",
      borderRadius: "4px",
      padding: "4px 8px",
      fontSize: "0.75rem",
      cursor: "pointer",
    },
    deleteBtn: {
      background: "var(--danger-color)",
      color: "white",
      border: "none",
      borderRadius: "4px",
      padding: "4px 8px",
      fontSize: "0.75rem",
      cursor: "pointer",
    },
    // Scanner tab styles
    scannerItem: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "10px 16px",
      borderBottom: "1px solid var(--bg-secondary)",
      cursor: "pointer",
    },
    badge: {
      width: 26,
      height: 26,
      borderRadius: "50%",
      background: "linear-gradient(135deg, var(--accent-color), #22ab94)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      fontSize: "0.6rem",
      fontWeight: "bold",
      color: "#fff",
    },
    rsiTag: {
      fontSize: "0.7rem",
      color: "#22ab94",
      marginTop: 2,
    },
    timeTag: {
      fontSize: "0.68rem",
      color: "var(--text-secondary)",
    },
    emptyState: {
      textAlign: "center",
      padding: "32px 16px",
      color: "#4a4f5e",
      fontSize: "0.8rem",
    },
    scannerActiveBar: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "6px 16px",
      background: "#1a2a1a",
      borderBottom: "1px solid #22ab9430",
      fontSize: "0.72rem",
      color: "#22ab94",
    },
  };

  const handleAddStock = (stock) => onAddStock(stock);
  const handleDeleteStock = (symbol) => onRemoveStock(symbol);

  return (
    <div style={styles.container}>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: var(--bg-primary); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }
        .left-detail-list-item:hover { background: #1a1f2e; }
      `}</style>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          Details <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginLeft: "4px" }}>▼</span>
        </div>
        <div style={styles.headerIcons}>
          {activeTab === "watchlist" && (
            <FiPlus onClick={() => setIsModalOpen(true)} title="Add Symbol" />
          )}
          {activeTab === "scanner" && (
            <FiZap
              size={14}
              color={scanner ? "#f7c948" : "var(--text-secondary)"}
              onClick={() => setIsScannerOpen(true)}
              title="Configure Scanner"
            />
          )}
          <FiMaximize2 size={14} />
          <FiX onClick={onClose} />
          <FiMoreHorizontal />
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabBar}>
        <div
          style={styles.tab(activeTab === "watchlist")}
          onClick={() => setActiveTab("watchlist")}
        >
          Watchlist
        </div>
        <div
          style={styles.tab(activeTab === "scanner")}
          onClick={() => setActiveTab("scanner")}
        >
          <FiZap size={11} />
          Scanner
          {matchedCoins?.length > 0 && (
            <span style={styles.scannerBadge}>{matchedCoins.length}</span>
          )}
        </div>
      </div>

      {/* ── WATCHLIST TAB ── */}
      {activeTab === "watchlist" && (
        <>
          <div style={styles.subHeader}>
            <span>Symbol</span>
            <div style={{ display: "flex", gap: "20px" }}>
              <span>Chg</span>
              <span>Chg%</span>
            </div>
          </div>

          <div className="custom-scrollbar" style={styles.listContainer}>
            {detailsList.map((stock, idx) => {
              const high = parseFloat(stock.high || 0);
              const low = parseFloat(stock.low || 0);
              const calculatedChange = high - low;
              const calculatedPercentChange =
                low !== 0 ? (calculatedChange / low) * 100 : 0;
              const isPositive = calculatedChange >= 0;
              const color = isPositive ? "#22ab94" : "var(--danger-color)";

              return (
                <div
                  key={idx}
                  className="left-detail-list-item"
                  style={styles.listItem}
                  onClick={() => setSelectedCurrency(stock)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{
                      width: "24px", height: "24px", borderRadius: "50%",
                      background: idx % 2 === 0 ? "var(--accent-color)" : "var(--bg-secondary)",
                      display: "flex", justifyContent: "center", alignItems: "center",
                      fontSize: "0.6rem", fontWeight: "bold",
                    }}>
                      {stock.name ? stock.name.substring(0, 1) : "S"}
                    </div>
                    <div style={styles.stockName}>{stock.name}</div>
                  </div>
                  <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
                    <div style={{ ...styles.stockChange, color }}>
                      {calculatedChange.toFixed(2)}
                    </div>
                    <div style={{ ...styles.stockChange, color }}>
                      {`${calculatedPercentChange.toFixed(2)}%`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── SCANNER TAB ── */}
      {activeTab === "scanner" && (
        <>
          {/* Active scanner indicator bar */}
          {scanner ? (
            <div style={styles.scannerActiveBar}>
              <FiZap size={11} color="#f7c948" />
              <span>
                {scanner.indicator} {scanner.condition} {scanner.value}
              </span>
              <span style={{ marginLeft: "auto", color: "var(--text-secondary)", cursor: "pointer" }}
                onClick={() => setIsScannerOpen(true)}>
                Edit
              </span>
            </div>
          ) : (
            <div style={{ ...styles.scannerActiveBar, color: "var(--text-secondary)", background: "#1a1f2e" }}>
              <FiZap size={11} />
              <span>No scanner active —</span>
              <span
                style={{ color: "var(--accent-color)", cursor: "pointer", marginLeft: 4 }}
                onClick={() => setIsScannerOpen(true)}
              >
                Configure
              </span>
            </div>
          )}

          <div style={styles.subHeader}>
            <span>Symbol</span>
            <div style={{ display: "flex", gap: "20px" }}>
              <span>Value</span>
              <span>Time</span>
            </div>
          </div>

          <div className="custom-scrollbar" style={styles.listContainer}>
            {!matchedCoins || matchedCoins.length === 0 ? (
              <div style={styles.emptyState}>
                <FiZap size={24} style={{ marginBottom: 8, opacity: 0.3 }} />
                <div>No matches yet</div>
                <div style={{ marginTop: 4, fontSize: "0.72rem" }}>
                  {scanner ? "Waiting for conditions to trigger…" : "Set up a scanner to start"}
                </div>
              </div>
            ) : (
              matchedCoins.map((coin, idx) => (
                <div
                  key={idx}
                  className="left-detail-list-item"
                  style={styles.scannerItem}
                  onClick={() => setSelectedCurrency({ name: coin.symbol })}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={styles.badge}>{coin.symbol.substring(0, 1)}</div>
                    <div>
                      <div style={styles.stockName}>{coin.symbol}</div>
                      <div style={styles.rsiTag}>{coin.indicator || "RSI"}: {coin.rsi} · {coin.condition}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={styles.timeTag}>{coin.timestamp}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Footer */}
      <div style={styles.footer}>
        <div style={styles.footerLeft}>
          <div style={{
            width: "24px", height: "24px", borderRadius: "50%",
            background: "var(--accent-color)", display: "flex",
            justifyContent: "center", alignItems: "center",
          }}>
            <span style={{ fontSize: "0.8rem" }}>D</span>
          </div>
          {selectedCurrency?.name || "STOCK"}
        </div>
        <div style={styles.footerIcons}>
          <BsGrid />
          <AiOutlineEdit />
          <FiMoreHorizontal />
        </div>
      </div>

      {/* Watchlist Add Modal */}
      {isModalOpen && (
        <ListingModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Symbol Search"
          setSelectedCurrency={setSelectedCurrency}
          renderActions={(stock) => {
            const isAdded = detailsList.some((s) => s.symbol === stock.symbol);
            return (
              <div style={styles.btnContainer}>
                {!isAdded ? (
                  <button
                    style={styles.addBtn}
                    onClick={(e) => { e.stopPropagation(); handleAddStock(stock); }}
                  >
                    Add
                  </button>
                ) : (
                  <button
                    style={styles.deleteBtn}
                    onClick={(e) => { e.stopPropagation(); handleDeleteStock(stock.symbol); }}
                  >
                    Delete
                  </button>
                )}
              </div>
            );
          }}
        />
      )}

      {/* Scanner Config Modal */}
      {isScannerOpen && (
        <ScannerPanel
          onClose={() => setIsScannerOpen(false)}
          addAlert={addAlert}
          clearAllCoins={clearAllCoins}
          scanner={scanner}
          matchedCoins={matchedCoins}
          removeCoin={removeCoin}
          setSelectedCurrency={setSelectedCurrency}
          activeIndicators={activeIndicators}
        />
      )}
    </div>
  );
};

export default LeftDetail;