import React, { useState, useEffect } from "react";
import { FiX, FiZap, FiTrash2, FiBell, FiBellOff } from "react-icons/fi";

const CONDITIONS = [
  { label: "Crosses Above", value: "crossesAbove" },
  { label: "Crosses Below", value: "crossesBelow" },
  { label: "Greater Than", value: "greaterThan" },
  { label: "Less Than", value: "lessThan" },
];

const ScannerPanel = ({ onClose, addAlert, clearAllCoins, scanner, matchedCoins, removeCoin, setSelectedCurrency, activeIndicators }) => {
  const dynamicIndicators = activeIndicators && activeIndicators?.length > 0 
    ? Array.from(new Set(activeIndicators.map(ind => ind.type)))
    : ["RSI"];

  const [indicator, setIndicator] = useState(scanner?.indicator || dynamicIndicators[0] || "RSI");
  const [condition, setCondition] = useState(scanner?.condition || "crossesAbove");
  const [value, setValue] = useState(scanner?.value?.toString() || "30");
  const [active, setActive] = useState(!!scanner);

  const handleActivate = () => {
    const numVal = parseFloat(value);
    if (isNaN(numVal)) return;
    addAlert({ indicator, condition, value: numVal });
    setActive(true);
    onClose();
  };

  const handleClear = () => {
    clearAllCoins();
    setActive(false);
  };

  const s = {
    overlay: {
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.55)", zIndex: 1500,
      display: "flex", alignItems: "center", justifyContent: "center",
    },
    panel: {
      background: "var(--bg-primary)",
      border: "1px solid var(--border-color)",
      borderRadius: "10px",
      width: "420px",
      maxWidth: "100%",
      maxHeight: "80vh",
      display: "flex",
      flexDirection: "column",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      color: "var(--text-primary)",
      overflow: "hidden",
      boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
    },
    header: {
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "14px 18px", borderBottom: "1px solid var(--border-color)",
      background: "var(--bg-secondary)",
    },
    title: { fontWeight: 700, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: 8, color: "var(--text-primary)" },
    body: { padding: "18px", display: "flex", flexDirection: "column", gap: "14px" },
    label: { fontSize: "0.7rem", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: 4, letterSpacing: "0.05em" },
    select: {
      width: "100%", background: "var(--bg-secondary)", border: "1px solid var(--border-color)",
      color: "var(--text-primary)", borderRadius: 6, padding: "8px 10px", fontSize: "0.85rem",
      cursor: "pointer", outline: "none",
    },
    input: {
      width: "100%", background: "var(--bg-secondary)", border: "1px solid var(--border-color)",
      color: "var(--text-primary)", borderRadius: 6, padding: "8px 10px", fontSize: "0.85rem",
      outline: "none", boxSizing: "border-box",
    },
    row: { display: "flex", gap: 10 },
    activateBtn: {
      flex: 1, background: active ? "#1a3a1a" : "var(--accent-color)",
      border: active ? "1px solid #22ab94" : "none",
      color: active ? "#22ab94" : "#fff", borderRadius: 6,
      padding: "9px 0", fontSize: "0.85rem", fontWeight: 600,
      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    },
    clearBtn: {
      background: "var(--border-color)", border: "none", color: "var(--text-secondary)",
      borderRadius: 6, padding: "9px 14px", fontSize: "0.85rem",
      cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
    },
    divider: { height: "1px", background: "var(--border-color)", margin: "4px 0" },
    matchedHeader: {
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "10px 18px 6px",
    },
    matchedTitle: { fontSize: "0.72rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" },
    matchedCount: {
      background: "var(--accent-color)", color: "#fff", borderRadius: 20,
      padding: "1px 8px", fontSize: "0.7rem", fontWeight: 700,
    },
    matchedList: { flex: 1, overflowY: "auto", padding: "0 10px 10px" },
    matchedItem: {
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "9px 10px", borderRadius: 7, cursor: "pointer",
      marginBottom: 3, background: "var(--bg-secondary)", transition: "background 0.15s",
    },
    badge: {
      width: 28, height: 28, borderRadius: "50%",
      background: "linear-gradient(135deg, var(--accent-color), #22ab94)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "0.65rem", fontWeight: 700, color: "#fff",
    },
    symbolText: { fontWeight: 600, fontSize: "0.85rem", color: "var(--text-primary)" },
    rsiText: { fontSize: "0.75rem", color: "#22ab94", marginTop: 1 },
    timeText: { fontSize: "0.68rem", color: "var(--text-secondary)" },
    emptyState: {
      textAlign: "center", padding: "24px 0", color: "#4a4f5e", fontSize: "0.8rem",
    },
  };

  const conditionLabel = CONDITIONS.find(c => c.value === condition)?.label || condition;

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.panel}>
        <div style={s.header}>
          <div style={s.title}>
            <FiZap size={15} color="#f7c948" />
            Scanner
          </div>
          <FiX size={16} style={{ cursor: "pointer", color: "var(--text-secondary)" }} onClick={onClose} />
        </div>

        <div style={s.body}>
          <div>
            <div style={s.label}>Indicator</div>
            <select style={s.select} value={indicator} onChange={e => setIndicator(e.target.value)}>
              {dynamicIndicators.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>

          <div>
            <div style={s.label}>Condition</div>
            <select style={s.select} value={condition} onChange={e => setCondition(e.target.value)}>
              {CONDITIONS.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <div style={s.label}>Value</div>
            <input
              style={s.input}
              type="number"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="e.g. 30"
            />
          </div>

          {active && scanner && (
            <div style={{
              background: "rgba(34, 171, 148, 0.1)", border: "1px solid #22ab9440",
              borderRadius: 7, padding: "8px 12px", fontSize: "0.8rem", color: "#22ab94",
              display: "flex", alignItems: "center", gap: 7,
            }}>
              <FiBell size={13} />
              Active: <b>{scanner.indicator}</b> {conditionLabel} <b>{scanner.value}</b>
            </div>
          )}

          <div style={s.row}>
            <button style={s.activateBtn} onClick={handleActivate}>
              <FiZap size={13} />
              {active ? "Update Scanner" : "Activate Scanner"}
            </button>
            <button style={s.clearBtn} onClick={handleClear} title="Clear results">
              <FiTrash2 size={13} />
              Clear
            </button>
          </div>
        </div>

        <div style={s.divider} />

        <div style={s.matchedHeader}>
          <span style={s.matchedTitle}>Matched Stocks</span>
          {matchedCoins?.length > 0 && (
            <span style={s?.matchedCount}>{matchedCoins?.length}</span>
          )}
        </div>

        <div className="scanner-scroll" style={s?.matchedList}>
          <style>{`
            .scanner-scroll::-webkit-scrollbar { width: 5px; }
            .scanner-scroll::-webkit-scrollbar-track { background: var(--bg-primary); }
            .scanner-scroll::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }
            .scanner-matched-item:hover { background: var(--border-color) !important; }
          `}</style>

          {matchedCoins?.length === 0 ? (
            <div style={s.emptyState}>
              <FiBellOff size={22} style={{ marginBottom: 8, opacity: 0.4 }} />
              <div>No matches yet</div>
              <div style={{ marginTop: 4, fontSize: "0.72rem" }}>Activate scanner to start watching</div>
            </div>
          ) : (
            matchedCoins?.map((coin, idx) => (
              <div
                key={idx}
                className="scanner-matched-item"
                style={s.matchedItem}
                onClick={() => setSelectedCurrency && setSelectedCurrency({ name: coin.symbol })}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={s.badge}>{coin.symbol.substring(0, 1)}</div>
                  <div>
                    <div style={s.symbolText}>{coin.symbol}</div>
                    <div style={s.rsiText}>{coin.indicator}: {coin.rsi} · {coin.condition}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={s.timeText}>{coin.timestamp}</span>
                  <FiTrash2
                    size={13}
                    color="var(--text-secondary)"
                    style={{ cursor: "pointer" }}
                    onClick={(e) => { e.stopPropagation(); removeCoin(coin.symbol); }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ScannerPanel;