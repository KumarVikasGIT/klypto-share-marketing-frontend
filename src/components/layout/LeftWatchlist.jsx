import React, { useState, useEffect } from "react";
import { FiSearch, FiSettings, FiX, FiPlus, FiMaximize2 } from "react-icons/fi";
import socket from "../../services/socket";

const LeftWatchlist = ({ onClose, setSelectedCurrency }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [stocksData, setStocksData] = useState([]);

    useEffect(() => {
      socket.emit("getMasterWatchlist");

      /*
      INITIAL STOCKS
    */
      const handleStocks = (data) => {
        console.log("stocks event", data);

        const equity = (data?.data?.equity || []).map((item) => ({
          ...item,
          category: "EQ",
        }));

        const futures = (data?.data?.futures || []).map((item) => ({
          ...item,
          category: "FUT",
        }));

        const options = (data?.data?.trendingOptions || []).map((item) => ({
          ...item,
          category: "OPT",
        }));

        const indices = (data?.data?.indices || []).map((item) => ({
          ...item,
          category: "IDX",
        }));

        const combined = [...indices, ...equity, ...futures, ...options];


        setStocksData(combined);
        
      };
      socket.on("masterWatchlistResponse", handleStocks);

      /*
      SINGLE STOCK UPDATE
      (if the backend sends single stock updates, it might be on 'stockUpdate' or 'liveTick')
    */
      const handleStockUpdate = (updatedStock) => {
        // Handle potential single stock update if emitted
        if (!updatedStock?.token) return;

        setStocksData((prev) =>
          prev.map((stock) =>
            stock.token === updatedStock.token
              ? { ...stock, ...updatedStock }
              : stock,
          ),
        );
      };
      socket.on("stockUpdate", handleStockUpdate);

      /*
      LIVE TICK
    */
      const handleLiveTick = (tick) => {
        // console.log("liveTick", tick);

        if (!tick?.token) return;

        setStocksData((prev) =>
          prev.map((stock) =>
            stock.token === tick.token
              ? {
                  ...stock,
                  ...tick,
                }
              : stock,
          ),
        );
      };
      socket.on("liveTick", handleLiveTick);

      return () => {
        // socket.disconnect(); // 🔥 Do NOT disconnect singleton socket
        socket.off("masterWatchlistResponse", handleStocks);
        socket.off("stockUpdate", handleStockUpdate);
        socket.off("liveTick", handleLiveTick);
      };
    }, []);

  const styles = {
    container: {
      display: "flex",
      flexDirection: "column",
      height: "calc(100vh - 60px)", // Assuming navbar is 60px
      backgroundColor: "#ffffff", // Light theme based on user's image snippet for the left part? Wait, user asked for darktheme. Let me make it dark.
      // Wait, user explicitly said "this is the view i want for my application in darktheme". The image looks light theme, but they WANT dark theme.
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
    headerIcons: {
      display: "flex",
      gap: "12px",
      color: "var(--text-secondary)",
      cursor: "pointer",
    },
    tabsContainer: {
      display: "flex",
      padding: "0 16px",
      borderBottom: "1px solid var(--border-color)",
      gap: "16px",
    },
    tabActive: {
      padding: "12px 0",
      color: "var(--accent-color)",
      borderBottom: "2px solid var(--accent-color)",
      fontWeight: "500",
      fontSize: "0.9rem",
      cursor: "pointer",
    },
    searchContainer: {
      padding: "12px 16px",
      borderBottom: "1px solid var(--border-color)",
    },
    searchBox: {
      display: "flex",
      alignItems: "center",
      backgroundColor: "var(--bg-secondary)",
      borderRadius: "4px",
      padding: "6px 12px",
      border: "1px solid var(--border-color)",
    },
    searchInput: {
      border: "none",
      background: "transparent",
      color: "var(--text-primary)",
      outline: "none",
      width: "100%",
      marginLeft: "8px",
      fontSize: "0.85rem",
    },
    listContainer: {
      flex: 1,
      overflowY: "auto",
    },
    listItem: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "10px 14px",
      borderBottom: "1px solid var(--bg-secondary)",
      cursor: "pointer",
    },
    stockLeft: {
      display: "flex",
      flexDirection: "column",
    },
    stockName: {
      fontWeight: "600",
      fontSize: "0.85rem",
      color: "var(--text-primary)",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    segment: {
      fontSize: "0.6rem",
      color: "var(--text-secondary)",
    },
    stockRight: {
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
    },
    ltp: {
      fontWeight: "600",
      fontSize: "0.85rem",
      display: "flex",
      alignItems: "center",
      gap: "4px",
    },
    changeData: {
      fontSize: "0.75rem",
    },
    footer: {
      padding: "12px 16px",
      borderTop: "1px solid var(--border-color)",
      fontSize: "0.8rem",
      color: "var(--accent-color)",
      cursor: "pointer",
      display: "flex",
      justifyContent: "space-between",
    },
  };

  return (
    <div style={styles.container}>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: var(--bg-primary);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--border-color);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #363a45;
        }
      `}</style>
      <div style={styles.header}>
        <span>Watchlist</span>
        <div style={styles.headerIcons}>
          <FiSettings />
          <FiX onClick={onClose} />
        </div>
      </div>

      <div style={styles.tabsContainer}>
        <div style={styles.tabActive}>mywatchlist</div>
        <div
          style={{
            ...styles.tabActive,
            color: "var(--text-secondary)",
            borderBottom: "none",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <FiPlus /> <FiMaximize2 size={12} />
        </div>
      </div>

      <div style={styles.searchContainer}>
        <div style={styles.searchBox}>
          <FiSearch color="var(--text-secondary)" size={14} />
          <input
            style={styles.searchInput}
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <FiSettings color="var(--text-secondary)" size={14} style={{ cursor: "pointer" }} />
        </div>
      </div>

      <div className="custom-scrollbar" style={styles.listContainer}>
        {/* {alertResult?.length && alertResult */}
        {stocksData
          .filter(
            (s) => s.name.toLowerCase().includes(searchTerm.toLowerCase()),
            // s.symbol.toLowerCase().includes(searchTerm.toLowerCase()),
          )
          .map((stock, idx) => {
            const pChange = parseFloat(stock.percent_change);
            const rawChange = parseFloat(stock.change);
            const isPositive = (!isNaN(pChange) ? pChange : (!isNaN(rawChange) ? rawChange : 0)) >= 0;
            const color = isPositive ? "var(--success-color)" : "var(--danger-color)"; // TradingView green/red
            const Arrow = isPositive ? "▲" : "▼";

            return (
              <div
                key={idx}
                style={styles.listItem}
                onClick={() =>
                  setSelectedCurrency({
                    symbol: stock.symbol,
                    name: stock.name,
                    token: stock.token,
                    segment: stock.segment || "NSE",
                    type: stock.type || "currency",
                    userCode: stock.userCode,
                  })
                }
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "var(--border-color)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                <div style={styles.stockLeft}>
                  <div style={styles.stockName}>
                    {/* CATEGORY CIRCLE */}
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        minWidth: 22,
                        borderRadius: "50%",
                        background:
                          stock.category === "EQ"
                            ? "#2563eb"
                            : stock.category === "FUT"
                              ? "#7c3aed"
                              : stock.category === "OPT"
                                ? "#ea580c"
                                : "#475569",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "9px",
                        fontWeight: 700,
                      }}
                    >
                      {stock.category}
                    </div>

                    {/* SYMBOL */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <span>
                        {/* {stock?.symbol} */}
                         {stock?.name}</span>

                      {/* <span style={styles.segment}>{stock?.segment}</span> */}
                    </div>
                  </div>
                </div>
                <div style={styles.stockRight}>
                  <div style={{ ...styles.ltp, color }}>
                    {stock?.ltp} <span> {Arrow} </span>
                  </div>
                  <div style={{ ...styles.changeData, color }}>
                    {stock?.change} (
                    {isPositive && stock.percent_change > 0 ? "+" : ""}
                    {stock.percent_change}%)
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/*<div style={styles.footer}>
        <span>OPTIONS QUICK LIST</span>
        <span>{">"}</span>
      </div>*/}
    </div>
  );
};

export default LeftWatchlist;
