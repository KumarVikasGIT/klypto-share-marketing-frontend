import React, { useEffect, useState } from "react";
import apiService from "../../services/apiServices";



const TYPE_META = {
  BUY_CALL: {
    label: "Buy Call",
    color: "var(--success-color)",
    bg: "rgba(16,185,129,0.12)",
  },
  SQ_CALL: { label: "Sq. Call", color: "var(--text-secondary)", bg: "rgba(156,163,175,0.1)" },
  BUY_PUT: { label: "Buy Put", color: "var(--danger-color)", bg: "rgba(239,68,68,0.12)" },
  SQ_PUT: { label: "Sq. Put", color: "var(--text-secondary)", bg: "rgba(156,163,175,0.1)" },
};

const STATUS_META = {
  COMPLETE: { color: "var(--success-color)", bg: "rgba(16,185,129,0.1)", dot: "var(--success-color)" },
  PENDING: { color: "#f0b90b", bg: "rgba(245,158,11,0.1)", dot: "#f0b90b" },
  REJECTED: { color: "var(--danger-color)", bg: "rgba(239,68,68,0.1)", dot: "var(--danger-color)" },
};

const FILTERS = ["All", "COMPLETE", "PENDING", "REJECTED"];

const OrderBook = ({ orders, setOrders }) => {
  const [filter, setFilter] = useState("All");
  const [sortKey, setSortKey] = useState("time");
  const [sortDir, setSortDir] = useState("desc");


  useEffect(() => {
    async function fetchOrders() {
      try {
        const response = await apiService.get("equity/orders");

        console.log("API ORDERS 👉", response);

        const mapped = response?.data?.map((o) => ({
          id: o.id,

          // ⏱ time
          time: new Date(o.order_time).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),

          // 📊 stock
          stock: o.tradingsymbol?.replace("-EQ", ""),

          // 🔁 type (convert BUY/SELL → your format)
          type: o.transactiontype === "BUY" ? "BUY_CALL" : "SQ_CALL", // adjust later if PUT logic exists

          // ❌ not available from API (set default)
          strike: "-",
          expiry: o.expirey_date || "-",

          // 📦 qty
          qty: o.quantity || 0,

          // 🎯 lots (for equity = same as qty)
          lots: o.quantity || 0,

          // 💰 price
          price: o.price || 0,

          // 📌 status (map API → UI)
          status:
            o.status === "OPEN"
              ? "COMPLETE"
              : o.status === "COMPLETE"
                ? "COMPLETE"
                : o.status === "REJECTED"
                  ? "REJECTED"
                  : "PENDING",
        }));

        setOrders(mapped);
      } catch (err) {
        console.error("Error fetching orders:", err);
      }
    }

    fetchOrders();
  }, []);

  const filtered = orders
    .filter((o) => filter === "All" || o.status === filter)
    .sort((a, b) => {
      const av = a[sortKey],
        bv = b[sortKey];
      const cmp =
        typeof av === "number" ? av - bv : (av?.localeCompare?.(bv) ?? 0);
      return sortDir === "asc" ? cmp : -cmp;
    });

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const totalPnl = orders
    .filter((o) => o.status === "COMPLETE")
    .reduce(
      (sum, o) => sum + (o.type.startsWith("BUY") ? -1 : 1) * o.price * o.lots,
      0,
    );

  const SortIcon = ({ col }) => (
    <span
      style={{
        marginLeft: 4,
        opacity: sortKey === col ? 1 : 0.3,
        fontSize: "0.6rem",
      }}
    >
      {sortKey === col ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
    </span>
  );

  const thStyle = (col) => ({
    padding: "10px 14px",
    fontSize: "0.62rem",
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "var(--text-secondary)",
    textAlign: "left",
    cursor: "pointer",
    whiteSpace: "nowrap",
    userSelect: "none",
    borderBottom: "1px solid var(--bg-secondary)",
    background: "var(--bg-primary)",
  });

  const tdStyle = {
    padding: "11px 14px",
    fontSize: "0.8rem",
    color: "var(--text-primary)",
    borderBottom: "1px solid var(--bg-primary)",
    whiteSpace: "nowrap",
    verticalAlign: "middle",
  };

  const counts = FILTERS.slice(1).reduce((acc, f) => {
    acc[f] = orders.filter((o) => o.status === f).length;
    return acc;
  }, {});

  return (
    <div
      style={{
        marginTop: 28,
        fontFamily: "'DM Sans', sans-serif",
        // padding: "10px 22px",
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 18,
              height: 18,
              borderRadius: 4,
              background: "linear-gradient(135deg,var(--accent-color),var(--accent-color))",
              color: "var(--text-primary)",
              fontSize: "0.6rem",
              fontWeight: 700,
            }}
          >
            ◉
          </div>
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--text-secondary)",
            }}
          >
            Order Book
          </span>
          <span
            style={{
              fontSize: "0.6rem",
              fontWeight: 700,
              background: "var(--bg-secondary)",
              color: "var(--text-secondary)",
              borderRadius: 4,
              padding: "2px 8px",
              border: "1px solid var(--border-color)",
            }}
          >
            {orders.length} orders
          </span>
        </div>

        {/* P&L summary */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background:
              totalPnl >= 0 ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
            border: `1px solid ${totalPnl >= 0 ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
            borderRadius: 8,
            padding: "5px 12px",
          }}
        >
          <span
            style={{
              fontSize: "0.65rem",
              color: "var(--text-secondary)",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Net P&amp;L
          </span>
          <span
            style={{
              fontSize: "0.9rem",
              fontWeight: 700,
              color: totalPnl >= 0 ? "var(--success-color)" : "var(--danger-color)",
            }}
          >
            {totalPnl >= 0 ? "+" : ""}₹
            {Math.abs(totalPnl).toLocaleString("en-IN", {
              maximumFractionDigits: 0,
            })}
          </span>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "4px 12px",
              borderRadius: 6,
              fontSize: "0.7rem",
              fontWeight: 700,
              cursor: "pointer",
              border: "1px solid",
              background:
                filter === f
                  ? f === "All"
                    ? "var(--accent-color)"
                    : (STATUS_META[f]?.bg ?? "var(--accent-color)")
                  : "transparent",
              color:
                filter === f
                  ? f === "All"
                    ? "var(--text-primary)"
                    : (STATUS_META[f]?.color ?? "var(--text-primary)")
                  : "var(--text-secondary)",
              borderColor:
                filter === f
                  ? f === "All"
                    ? "var(--accent-color)"
                    : (STATUS_META[f]?.color ?? "var(--accent-color)")
                  : "var(--border-color)",
              transition: "all 0.15s",
            }}
          >
            {f}
            {f !== "All" && counts[f] ? ` (${counts[f]})` : ""}
          </button>
        ))}
      </div>

      {/* Table */}
      <div
        style={{
          borderRadius: 10,
          overflow: "hidden",
          border: "1px solid var(--bg-secondary)",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            background: "var(--bg-primary)",
          }}
        >
          <thead>
            <tr>
              {[
                { label: "Time", key: "time" },
                { label: "Stock", key: "stock" },
                { label: "Exchange", key: "exchange" },
                { label: "Type", key: "type" },
                { label: "Strike", key: "strike" },
                { label: "Expiry", key: "expirey_date" },
                { label: "Qty", key: "qty" },
                { label: "Price", key: "price" },
                { label: "Value", key: null },
                { label: "Status", key: "status" },
              ].map(({ label, key }) => (
                <th
                  key={label}
                  style={thStyle(key)}
                  onClick={() => key && handleSort(key)}
                >
                  {label}
                  {key && <SortIcon col={key} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  style={{
                    ...tdStyle,
                    textAlign: "center",
                    color: "var(--text-secondary)",
                    padding: "32px",
                  }}
                >
                  No orders found
                </td>
              </tr>
            ) : (
              filtered.map((o, i) => {
                const tm = TYPE_META[o.type];
                const sm = STATUS_META[o.status];
                const value = o.price * o.lots;
                return (
                  <tr
                    key={o.id}
                    style={{
                      background: i % 2 === 0 ? "var(--bg-primary)" : "var(--bg-secondary)",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--border-color)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background =
                        i % 2 === 0 ? "var(--bg-primary)" : "var(--bg-secondary)")
                    }
                  >
                    <td
                      style={{
                        ...tdStyle,
                        color: "var(--text-secondary)",
                        fontFamily: "monospace",
                        fontSize: "0.75rem",
                      }}
                    >
                      {o.time}
                    </td>
                    <td
                      style={{ ...tdStyle, fontWeight: 700, color: "var(--text-primary)" }}
                    >
                      {o.stock}
                    </td>
                    <td style={tdStyle}>{o.segment}</td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          background: tm.bg,
                          color: tm.color,
                          borderRadius: 5,
                          padding: "3px 8px",
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          letterSpacing: "0.05em",
                        }}
                      >
                        {tm.label}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, fontFamily: "monospace" }}>
                      ₹{o.strike}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        color: "var(--text-secondary)",
                        fontSize: "0.75rem",
                      }}
                    >
                      {o.expiry}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 700 }}>{o.qty}</span>
                      <span
                        style={{
                          color: "var(--text-secondary)",
                          fontSize: "0.7rem",
                          marginLeft: 4,
                        }}
                      >
                        × {o.lots / o.qty}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, fontFamily: "monospace" }}>
                      ₹{o.price.toFixed(2)}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        fontWeight: 700,
                        fontFamily: "monospace",
                        color: "var(--text-primary)",
                      }}
                    >
                      ₹
                      {value.toLocaleString("en-IN", {
                        maximumFractionDigits: 0,
                      })}
                    </td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          background: sm.bg,
                          color: sm.color,
                          borderRadius: 5,
                          padding: "3px 8px",
                          fontSize: "0.68rem",
                          fontWeight: 700,
                        }}
                      >
                        <span
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: sm.dot,
                            flexShrink: 0,
                          }}
                        />
                        {o.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrderBook;
