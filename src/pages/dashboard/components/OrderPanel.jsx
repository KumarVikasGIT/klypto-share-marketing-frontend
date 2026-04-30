import React, { useEffect, useState } from "react";
import apiService from "../../../services/apiServices";

const STOCKS = ["NIFTY", "BANKNIFTY", "SENSEX", "FINNIFTY"];
const EXPIRIES = [
  "30 MAY 2024 (Weekly)",
  "06 JUN 2024 (Weekly)",
  "27 JUN 2024 (Monthly)",
];
const STRIKES = {
  "Nearest ATM": { ATM: "22,200", ITM: "22,150", OTM: "22,250" },
  "OTM +1": { ATM: "22,250", ITM: "22,200", OTM: "22,300" },
};
const ACTIONS = [
  {
    key: "BUY_CALL",
    label: "Buy Call",
    sub: "▲ Long",
    bg: "#10b981",
    text: "#fff",
  },
  {
    key: "SQ_CALL",
    label: "Sq. Off Call",
    sub: "Exit Long",
    bg: "#1f2937",
    text: "#f3f4f6",
  },
  {
    key: "BUY_PUT",
    label: "Buy Put",
    sub: "▼ Short",
    bg: "#ef4444",
    text: "#fff",
  },
  {
    key: "SQ_PUT",
    label: "Sq. Off Put",
    sub: "Exit Short",
    bg: "#1f2937",
    text: "#f3f4f6",
  },
];

const OrderPanel = ({
  stock,
  setStock,
  expiry,
  setExpiry,
  strategy,
  setStrategy,
  preference,
  setPreference,
  product,
  setProduct,
  orderType,
  setOrderType,
  qty,
  setQty,
  validity,
  setValidity,
  action,
  setAction,
}) => {
  const [stocks, setStocks] = useState([]);
  const recommendedStrike = STRIKES[strategy]?.[preference] ?? "22,200";

  const s = {
    sectionTitle: {
      fontSize: "0.7rem",
      fontWeight: 700,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      color: "#9ca3af",
      marginBottom: 10,
      marginTop: 20,
      display: "flex",
      alignItems: "center",
      gap: 8,
    },
    sectionBar: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 18,
      height: 18,
      borderRadius: 4,
      background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
      color: "#fff",
      fontSize: "0.6rem",
      fontWeight: 700,
      flexShrink: 0,
    },
    card: {
      background: "#111827",
      border: "1px solid #1f2937",
      borderRadius: 10,
      padding: "14px 16px",
      marginBottom: 4,
    },
    label: {
      fontSize: "0.67rem",
      fontWeight: 600,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: "#6b7280",
      marginBottom: 5,
      display: "block",
    },
    select: {
      background: "#1f2937",
      border: "1px solid #374151",
      borderRadius: 6,
      color: "#f3f4f6",
      padding: "7px 30px 7px 10px",
      fontSize: "0.85rem",
      width: "100%",
      appearance: "none",
      cursor: "pointer",
      boxSizing: "border-box",
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%236b7280' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`,
      backgroundRepeat: "no-repeat",
      backgroundPosition: "right 10px center",
    },
    input: {
      background: "#1f2937",
      border: "1px solid #374151",
      borderRadius: 6,
      color: "#9ca3af",
      padding: "7px 10px",
      fontSize: "0.85rem",
      width: "100%",
      boxSizing: "border-box",
    },
  };

  // ── Confirm bar colors by action ──
  const confirmMeta = {
    BUY_CALL: {
      bg: "rgba(16,185,129,0.06)",
      border: "rgba(16,185,129,0.25)",
      grad: "linear-gradient(135deg,#10b981,#059669)",
      shadow: "0 4px 14px rgba(16,185,129,0.3)",
    },
    SQ_CALL: {
      bg: "rgba(55,65,81,0.6)",
      border: "#374151",
      grad: "linear-gradient(135deg,#374151,#1f2937)",
      shadow: "none",
    },
    BUY_PUT: {
      bg: "rgba(239,68,68,0.06)",
      border: "rgba(239,68,68,0.25)",
      grad: "linear-gradient(135deg,#ef4444,#dc2626)",
      shadow: "0 4px 14px rgba(239,68,68,0.3)",
    },
    SQ_PUT: {
      bg: "rgba(55,65,81,0.6)",
      border: "#374151",
      grad: "linear-gradient(135deg,#374151,#1f2937)",
      shadow: "none",
    },
  };

  useEffect(() => {
    async function fetchStocks() {
      try {
        const response = await apiService.get("equity/stocks");

        // console.log("stocks API response:", response);

        // ✅ correct path based on your response
        setStocks(response?.stocks || []);
      } catch (err) {
        console.error("Error fetching stocks:", err);
      }
    }

    fetchStocks();
  }, []);

  return (
    <div
      style={{
        color: "#f3f4f6",
        fontFamily: "'DM Sans', sans-serif",
        marginLeft: 10,
      }}
    >
      {/* ── STEP 1: STOCK & EXPIRY ── */}
      <div style={s.sectionTitle}>
        <span style={s.sectionBar}>1</span>Select Stock & Expiry
      </div>
      <div style={s.card}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 14,
          }}
        >
          <div>
            <label style={s.label}>Stock / Index</label>
            <select
              style={{ ...s.select, fontSize: "0.85rem", fontWeight: 700 }}
              value={stock}
                onChange={(e) => setStock(e.target.value)}

            >
              <option value="">Select stock</option>

              {stocks.map((s, index) => (
                <option key={index} value={s.actualSymbol}>
                  {s.name} ({s.actualSymbol})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={s.label}>Current Price</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div>
                <div
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    color: "#10b981",
                    lineHeight: 1,
                  }}
                >
                  22,178.40
                </div>
                <div
                  style={{
                    fontSize: "0.65rem",
                    color: "#10b981",
                    marginTop: 2,
                  }}
                >
                  ▲ +128.75 (0.58%)
                </div>
              </div>
              <div
                style={{
                  flex: 1,
                  height: 28,
                  background: "rgba(16,185,129,0.08)",
                  borderBottom: "2px solid #10b981",
                  borderRadius: "2px 2px 0 0",
                }}
              />
            </div>
          </div>
          <div>
            <label style={s.label}>Expiry</label>
            <select
              style={s.select}
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
            >
              <option value="">Select expiry</option>
              {EXPIRIES.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── STEP 2: AUTO STRIKE ── */}
      <div style={s.sectionTitle}>
        <span style={s.sectionBar}>2</span>Auto Strike Selection
        <span
          style={{
            fontSize: "0.55rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            background: "#f59e0b22",
            color: "#f59e0b",
            border: "1px solid #f59e0b44",
            borderRadius: 4,
            padding: "2px 7px",
          }}
        >
          SMART MODE
        </span>
      </div>
      <div style={s.card}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 14,
            alignItems: "start",
          }}
        >
          <div>
            <label style={s.label}>Strategy</label>
            <select
              style={s.select}
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
            >
              <option value="">Select strategy</option>
              <option>Nearest ATM</option>
              <option>OTM +1</option>
            </select>
          </div>
          <div>
            <label style={s.label}>Preference</label>
            <select
              style={s.select}
              value={preference}
              onChange={(e) => setPreference(e.target.value)}
            >
              <option value="">Select preference</option>
              <option>ATM</option>
              <option>ITM</option>
              <option>OTM</option>
            </select>
          </div>
          <div>
            <label style={s.label}>Recommended Strike</label>
            <div
              style={{
                background: "rgba(16,185,129,0.06)",
                border: "1px solid rgba(16,185,129,0.25)",
                borderRadius: 8,
                padding: "6px 10px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "0.6rem",
                  color: "#6b7280",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Strike
              </div>
              <div
                style={{
                  fontSize: "1.2rem",
                  fontWeight: 700,
                  color: strategy && preference ? "#10b981" : "#4b5563",
                }}
              >
                {strategy && preference ? recommendedStrike : "—"}
                {strategy && preference && (
                  <span
                    style={{ fontSize: "0.65rem", opacity: 0.5, marginLeft: 4 }}
                  >
                    {preference}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── STEP 3: ORDER DETAILS ── */}
      <div style={s.sectionTitle}>
        <span style={s.sectionBar}>3</span>Order Details
      </div>
      <div style={s.card}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "0.8fr 1fr 1.1fr 1fr 0.8fr",
            gap: 14,
            alignItems: "start",
          }}
        >
          <div>
            <label style={s.label}>Product</label>
            <select
              style={s.select}
              value={product}
              onChange={(e) => setProduct(e.target.value)}
            >
              <option value="">Select</option>
              <option>MIS</option>
              <option>NRML</option>
              <option>CNC</option>
            </select>
          </div>
          <div>
            <label style={s.label}>Order Type</label>
            <select
              style={s.select}
              value={orderType}
              onChange={(e) => setOrderType(e.target.value)}
            >
              <option value="">Select</option>
              <option>MARKET</option>
              <option>LIMIT</option>
            </select>
          </div>
          <div>
            <label style={s.label}>Quantity (Lots)</label>
            <div style={{ display: "flex", alignItems: "center" }}>
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                style={{
                  width: 32,
                  height: 34,
                  background: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "6px 0 0 6px",
                  color: "#f3f4f6",
                  fontSize: "1rem",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                −
              </button>
              <div
                style={{
                  flex: 1,
                  height: 34,
                  background: "#1f2937",
                  border: "1px solid #374151",
                  borderLeft: "none",
                  borderRight: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                }}
              >
                {qty}{" "}
                <span
                  style={{
                    fontSize: "0.65rem",
                    color: "#6b7280",
                    marginLeft: 4,
                  }}
                >
                  × 75
                </span>
              </div>
              <button
                onClick={() => setQty((q) => q + 1)}
                style={{
                  width: 32,
                  height: 34,
                  background: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "0 6px 6px 0",
                  color: "#f3f4f6",
                  fontSize: "1rem",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                +
              </button>
            </div>
            <div
              style={{
                fontSize: "0.65rem",
                color: "#6b7280",
                marginTop: 4,
                textAlign: "center",
              }}
            >
              {qty * 75} shares total
            </div>
          </div>
          <div>
            <label style={s.label}>Price</label>
            <input style={s.input} placeholder="Market Price" readOnly />
          </div>
          <div>
            <label style={s.label}>Validity</label>
            <select
              style={s.select}
              value={validity}
              onChange={(e) => setValidity(e.target.value)}
            >
              <option>DAY</option>
              <option>IOC</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── STEP 4: SELECT ACTION ── */}
      <div style={s.sectionTitle}>
        <span style={s.sectionBar}>4</span>Select Action
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: 10,
          marginBottom: 4,
        }}
      >
        {ACTIONS.map(({ key, label, sub, bg, text }) => {
          const isSelected = action === key;
          return (
            <button
              key={key}
              onClick={() => setAction((prev) => (prev === key ? null : key))}
              style={{
                width: "100%",
                padding: "12px 10px",
                borderRadius: 8,
                fontWeight: 700,
                fontSize: "0.8rem",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                transition: "all 0.15s",
                background: isSelected ? bg : `${bg}22`,
                color: isSelected ? text : bg === "#1f2937" ? "#9ca3af" : bg,
                border: isSelected
                  ? "none"
                  : `1px solid ${bg === "#1f2937" ? "#374151" : bg + "55"}`,
                boxShadow:
                  isSelected && bg !== "#1f2937"
                    ? `0 4px 14px ${bg}44`
                    : "none",
              }}
              onMouseEnter={(e) => {
                if (!isSelected) e.currentTarget.style.background = `${bg}44`;
              }}
              onMouseLeave={(e) => {
                if (!isSelected) e.currentTarget.style.background = `${bg}22`;
              }}
              onMouseDown={(e) =>
                (e.currentTarget.style.transform = "scale(0.97)")
              }
              onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              <span>{label}</span>
              <span
                style={{ fontSize: "0.6rem", fontWeight: 500, opacity: 0.7 }}
              >
                {sub}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── CONFIRM BAR ── */}
      {action &&
        (() => {
          const a = ACTIONS.find((x) => x.key === action);
          const m = confirmMeta[action];
          return (
            <div
              style={{
                marginTop: 14,
                padding: "14px 18px",
                background: m.bg,
                border: `1px solid ${m.border}`,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{ display: "flex", gap: 20, flexWrap: "wrap", flex: 1 }}
              >
                {[
                  { label: "Index", value: stock || "—" },
                  {
                    label: "Action",
                    value: a.label.toUpperCase(),
                    color: a.bg === "#1f2937" ? "#9ca3af" : a.bg,
                  },
                  {
                    label: "Expiry",
                    value: expiry ? expiry.split(" (")[0] : "—",
                  },
                  {
                    label: "Strike",
                    value:
                      strategy && preference ? `${recommendedStrike} CE` : "—",
                    color: "#10b981",
                  },
                  { label: "Type", value: orderType || "—" },
                  { label: "Product", value: product || "—" },
                  { label: "Qty", value: `${qty * 75}` },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div
                      style={{
                        fontSize: "0.58rem",
                        color: "#4b5563",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginBottom: 2,
                      }}
                    >
                      {label}
                    </div>
                    <div
                      style={{
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        color: color || "#f3f4f6",
                      }}
                    >
                      {value}
                    </div>
                  </div>
                ))}
              </div>
              <button
                style={{
                  background: m.grad,
                  border: "none",
                  borderRadius: 8,
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  padding: "12px 20px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexShrink: 0,
                  boxShadow: m.shadow,
                  transition: "opacity 0.15s, transform 0.1s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                onMouseDown={(e) =>
                  (e.currentTarget.style.transform = "scale(0.97)")
                }
                onMouseUp={(e) =>
                  (e.currentTarget.style.transform = "scale(1)")
                }
              >
                <svg
                  width="14"
                  height="14"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                >
                  <path d="M15.964.686a.5.5 0 0 0-.65-.65L.767 5.855H.766l-.452.18a.5.5 0 0 0-.082.887l.41.26.001.002 4.995 3.178 3.178 4.995.002.002.26.41a.5.5 0 0 0 .886-.083l6-15Zm-1.833 1.89L6.637 10.07l-.215-.338a.5.5 0 0 0-.154-.154l-.338-.215 7.494-7.494 1.178-.471-.631 1.893Z" />
                </svg>
                <div style={{ textAlign: "left" }}>
                  <div>Confirm</div>
                  <div
                    style={{
                      fontSize: "0.58rem",
                      fontWeight: 500,
                      opacity: 0.7,
                    }}
                  >
                    & Place Order
                  </div>
                </div>
              </button>
            </div>
          );
        })()}

      <div
        style={{
          textAlign: "right",
          fontSize: "0.65rem",
          color: "#4b5563",
          marginTop: 6,
        }}
      >
        Estimated execution: ~320 ms
      </div>
    </div>
  );
};

export default OrderPanel;
