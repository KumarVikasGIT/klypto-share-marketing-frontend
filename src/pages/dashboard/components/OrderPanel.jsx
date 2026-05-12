import React, { useEffect, useState } from "react";
import apiService from "../../../services/apiServices";
import SearchSelect from "./SearchSelect";
import { s } from "../../../util/common";
import OrderBook from "./OrderBook";
import socket from "../../../services/socket";

const ACTIONS = [
  { key: "BUY_CALL", label: "Buy Call",     sub: "▲ Long",    bg: "#10b981", text: "#fff"    },
  { key: "SQ_CALL",  label: "Sq. Off Call", sub: "Exit Long",  bg: "#1f2937", text: "#f3f4f6" },
  { key: "BUY_PUT",  label: "Buy Put",      sub: "▼ Short",   bg: "#ef4444", text: "#fff"    },
  { key: "SQ_PUT",   label: "Sq. Off Put",  sub: "Exit Short", bg: "#1f2937", text: "#f3f4f6" },
];

const ACTION_MAP = {
  BUY_CALL: "BUY",
  SQ_CALL:  "SELL",
  BUY_PUT:  "BUY",
  SQ_PUT:   "SELL",
};

const getValidationError = ({ stock, expiry, strategy, preference, product, orderType, qty }) => {
  if (!stock)          return "Please select a Stock before proceeding.";
  if (!expiry)         return "Please select an Expiry date.";
  if (!strategy)       return "Please select a Strategy.";
  if (!preference)     return "Please select a Preference (ATM / ITM / OTM).";
  if (!product)        return "Please select a Product type (MIS / NRML / CNC).";
  if (!orderType)      return "Please select an Order Type (MARKET / LIMIT).";
  if (!qty || qty < 1) return "Quantity must be at least 1 lot.";
  return null;
};

const findATM = (strikes, ltp) =>
  strikes.reduce((prev, curr) =>
    Math.abs(curr - ltp) < Math.abs(prev - ltp) ? curr : prev
  );

const fmt = (n) => (n != null ? Number(n).toLocaleString("en-IN") : "—");

const OrderPanel = ({
  stock, setStock,
  expiry, setExpiry,
  strategy, setStrategy,
  preference, setPreference,
  product, setProduct,
  orderType, setOrderType,
  qty, setQty,
  validity, setValidity,
  action, setAction,
  orders, setOrders,
}) => {
  const [stocks, setStocks]               = useState([]);
  const [stocksData, setStocksData]       = useState([]);
  const [validationMsg, setValidationMsg] = useState("");
  const [chainLoading, setChainLoading]   = useState(false);

  const [currentPrice, setCurrentPrice]     = useState(null);
  const [priceChange, setPriceChange]       = useState(null);
  const [priceChangePct, setPriceChangePct] = useState(null);
  const [expiries, setExpiries]   = useState([]);
  const [strikeMap, setStrikeMap] = useState({});
  const [lotSize, setLotSize]     = useState(75);

  const recommendedStrike = strikeMap[strategy]?.[preference] ?? "—";

  // ── 1. All stocks + live prices from socket ──
  useEffect(() => {
    socket.emit("getAllStocks");

    const handleStocks = (data) => {
      console.log("stocks", data);
      const arr = Array.isArray(data) ? data : data?.stocks || [];
      setStocks(arr);
      setStocksData(arr);
    };

    const handleStockUpdate = (updatedStock) => {
      if (!updatedStock?.token) return;
      setStocksData((prev) =>
        prev.map((s) =>
          s.token === updatedStock.token ? { ...s, ...updatedStock } : s
        )
      );
    };

    const handleLiveTick = (tick) => {
      if (!tick?.token) return;
      setStocksData((prev) =>
        prev.map((s) => (s.token === tick.token ? { ...s, ...tick } : s))
      );
    };

    socket.on("stocks", handleStocks);
    socket.on("stockUpdate", handleStockUpdate);
    socket.on("liveTick", handleLiveTick);

    return () => {
      socket.off("stocks", handleStocks);
      socket.off("stockUpdate", handleStockUpdate);
      socket.off("liveTick", handleLiveTick);
    };
  }, []);

  // ── 2. Derive live price for selected stock ──
  // Fields from your backend: ltp, change, percent_change, name, userCode, token
  useEffect(() => {
    if (!stock || stocksData.length === 0) return;

    const match = stocksData.find(
      (s) =>
        s.userCode === stock ||
        s.name     === stock ||
        s.symbol   === stock ||
        s.actualSymbol === stock
    );

    if (!match) return;

    const ltp = Number(match.ltp);
    if (!isNaN(ltp) && ltp > 0) {
      setCurrentPrice(ltp);
      // Backend sends change and percent_change directly
      if (match.change != null)         setPriceChange(Number(match.change));
      if (match.percent_change != null) setPriceChangePct(Number(match.percent_change));
    }
  }, [stock, stocksData]);

  // ── 3. Fetch options chain (expiries + strikes) when stock changes ──
  useEffect(() => {
    if (!stock) {
      setCurrentPrice(null);
      setPriceChange(null);
      setPriceChangePct(null);
      setExpiries([]);
      setStrikeMap({});
      setExpiry("");
      setStrategy("");
      setPreference("");
      setLotSize(75);
      return;
    }

    // Wait for socket stocks to load before calling chain API
    const stockObj = stocksData.find(
      (s) =>
        s.userCode     === stock ||
        s.name         === stock ||
        s.actualSymbol === stock
    );
    if (!stockObj) return;

    async function fetchChain() {
      setChainLoading(true);
      try {
        // Use name/actualSymbol/fullName — whatever your chain API expects
        const symbolForChain = stockObj.actualSymbol ?? stockObj.name ?? stockObj.userCode;
        const data = await apiService.get("options/chain", { symbol: symbolForChain });

        // lotSize
        if (data?.lotSize) setLotSize(data.lotSize);

        // Expiries — your backend returns allExpiries array
        const rawExpiries = data?.allExpiries ?? data?.expiries ?? [];
        setExpiries(rawExpiries);
        if (rawExpiries.length > 0) setExpiry(rawExpiries[0]);

        // Use socket ltp if available, else fall back to chain underlyingLtp
        const chainLtp = data?.underlyingLtp ?? data?.underlyingValue ?? data?.ltp ?? null;
        const ltpToUse = currentPrice ?? (chainLtp ? Number(chainLtp) : null);

        if (ltpToUse && !currentPrice) setCurrentPrice(ltpToUse);

        // Build strike map
        const strikes = (data?.strikes || []).slice().sort((a, b) => a - b);

        if (strikes.length > 0 && ltpToUse) {
          const atmStrike = findATM(strikes, ltpToUse);
          const atmIdx    = strikes.indexOf(atmStrike);
          setStrikeMap({
            "Nearest ATM": {
              ATM: fmt(strikes[atmIdx]),
              ITM: fmt(strikes[atmIdx - 1]),
              OTM: fmt(strikes[atmIdx + 1]),
            },
            "OTM +1": {
              ATM: fmt(strikes[atmIdx + 1]),
              ITM: fmt(strikes[atmIdx]),
              OTM: fmt(strikes[atmIdx + 2]),
            },
          });
        } else if (strikes.length > 0) {
          const mid = Math.floor(strikes.length / 2);
          setStrikeMap({
            "Nearest ATM": {
              ATM: fmt(strikes[mid]),
              ITM: fmt(strikes[mid - 1]),
              OTM: fmt(strikes[mid + 1]),
            },
            "OTM +1": {
              ATM: fmt(strikes[mid + 1]),
              ITM: fmt(strikes[mid]),
              OTM: fmt(strikes[mid + 2]),
            },
          });
        }
      } catch (err) {
        console.error("Error fetching options chain:", err);
      } finally {
        setChainLoading(false);
      }
    }

    fetchChain();
  }, [stock, stocksData]); // depends on stocksData so it waits for socket

  const handlePlaceOrder = async (selectedAction) => {
    const error = getValidationError({ stock, expiry, strategy, preference, product, orderType, qty });
    if (error) { setValidationMsg(error); return; }

    setValidationMsg("");
    setAction(selectedAction);

    const stockObj = stocksData.find(
      (s) => s.userCode === stock || s.name === stock || s.actualSymbol === stock
    );
    if (!stockObj) {
      setValidationMsg("Selected stock not found. Please re-select.");
      return;
    }

    const payload = {
      variety:         "NORMAL",
      tradingsymbol:   stock,
      symboltoken:     stockObj.token,
      transactiontype: ACTION_MAP[selectedAction],
      segment:         "NSE",
      ordertype:       orderType,
      producttype:     product === "MIS" ? "INTRADAY" : "DELIVERY",
      duration:        validity || "DAY",
      price:           orderType === "MARKET" ? "0" : String(currentPrice ?? 0),
      quantity:        qty,
      squareoff:       "0",
      stoploss:        "0",
    };

    console.log("🚀 DISPATCH PAYLOAD:", payload);

    try {
      const res = await apiService.post("equity/dispatchOrder", payload);
      console.log("✅ Order placed:", res);
      setValidationMsg("");
    } catch (err) {
      console.error("❌ Order failed:", err);
      setValidationMsg(err?.response?.data?.message || "Order placement failed");
    }
  };

  const pricePositive = !priceChange || Number(priceChange) >= 0;
  const priceColor    = pricePositive ? "#10b981" : "#ef4444";

  return (
    <div style={{ color: "#f3f4f6", fontFamily: "'DM Sans', sans-serif", marginLeft: 10, padding: "10px 0px" }}>

      {/* ── STEP 1 ── */}
      <div style={s.sectionTitle}>
        <span style={s.sectionBar}>1</span>Select Stock & Expiry
      </div>
      <div style={s.card}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>

          <div>
            <label style={s.label}>Stock</label>
            <SearchSelect
              stocks={stocks}
              stock={stock}
              setStock={(val) => { setStock(val); setValidationMsg(""); }}
              style={{ ...s.select, fontSize: "0.85rem", fontWeight: 700 }}
            />
          </div>

          <div>
            <label style={s.label}>Current Price</label>
            {chainLoading ? (
              <div style={{ fontSize: "0.95rem", color: "#6b7280" }}>Loading…</div>
            ) : currentPrice != null ? (
              <div>
                <div style={{ fontSize: "1.25rem", fontWeight: 700, color: priceColor, lineHeight: 1 }}>
                  {Number(currentPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                {priceChange != null && (
                  <div style={{ fontSize: "0.65rem", color: priceColor, marginTop: 2 }}>
                    {pricePositive ? "▲" : "▼"} {Number(priceChange) >= 0 ? "+" : ""}
                    {Number(priceChange).toFixed(2)}
                    {priceChangePct != null && ` (${Number(priceChangePct).toFixed(2)}%)`}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: "0.78rem", color: "#4b5563" }}>
                {stock ? "Waiting for price…" : "—"}
              </div>
            )}
          </div>

          <div>
            <label style={s.label}>Expiry</label>
            <select
              style={s.select}
              value={expiry}
              onChange={(e) => { setExpiry(e.target.value); setValidationMsg(""); }}
              disabled={chainLoading}
            >
              <option value="">{chainLoading ? "Loading…" : "Select expiry"}</option>
              {expiries.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── STEP 2 ── */}
      <div style={s.sectionTitle}>
        <span style={s.sectionBar}>2</span>Auto Strike Selection
        <span style={{ fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.08em", background: "#f59e0b22", color: "#f59e0b", border: "1px solid #f59e0b44", borderRadius: 4, padding: "2px 7px" }}>
          SMART MODE
        </span>
      </div>
      <div style={s.card}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, alignItems: "start" }}>
          <div>
            <label style={s.label}>Strategy</label>
            <select
              style={s.select}
              value={strategy}
              onChange={(e) => { setStrategy(e.target.value); setValidationMsg(""); }}
              disabled={Object.keys(strikeMap).length === 0}
            >
              <option value="">Select strategy</option>
              {Object.keys(strikeMap).map((k) => <option key={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label style={s.label}>Preference</label>
            <select
              style={s.select}
              value={preference}
              onChange={(e) => { setPreference(e.target.value); setValidationMsg(""); }}
            >
              <option value="">Select preference</option>
              <option>ATM</option>
              <option>ITM</option>
              <option>OTM</option>
            </select>
          </div>
          <div>
            <label style={s.label}>Recommended Strike</label>
            <div style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 8, padding: "6px 10px", textAlign: "center" }}>
              <div style={{ fontSize: "0.6rem", color: "#6b7280", letterSpacing: "0.08em", textTransform: "uppercase" }}>Strike</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: strategy && preference ? "#10b981" : "#4b5563" }}>
                {strategy && preference ? recommendedStrike : "—"}
                {strategy && preference && recommendedStrike !== "—" && (
                  <span style={{ fontSize: "0.65rem", opacity: 0.5, marginLeft: 4 }}>{preference}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── STEP 3 ── */}
      <div style={s.sectionTitle}>
        <span style={s.sectionBar}>3</span>Order Details
      </div>
      <div style={s.card}>
        <div style={{ display: "grid", gridTemplateColumns: "0.8fr 1fr 1.1fr 1fr 0.8fr", gap: 14, alignItems: "start" }}>
          <div>
            <label style={s.label}>Product</label>
            <select style={s.select} value={product} onChange={(e) => { setProduct(e.target.value); setValidationMsg(""); }}>
              <option value="">Select</option>
              <option>MIS</option>
              <option>NRML</option>
              <option>CNC</option>
            </select>
          </div>
          <div>
            <label style={s.label}>Order Type</label>
            <select style={s.select} value={orderType} onChange={(e) => { setOrderType(e.target.value); setValidationMsg(""); }}>
              <option value="">Select</option>
              <option>MARKET</option>
              <option>LIMIT</option>
            </select>
          </div>
          <div>
            <label style={s.label}>Quantity (Lots)</label>
            <div style={{ display: "flex", alignItems: "center" }}>
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} style={{ width: 32, height: 34, background: "#1f2937", border: "1px solid #374151", borderRadius: "6px 0 0 6px", color: "#f3f4f6", fontSize: "1rem", cursor: "pointer", flexShrink: 0 }}>−</button>
              <div style={{ flex: 1, height: 34, background: "#1f2937", border: "1px solid #374151", borderLeft: "none", borderRight: "none", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.9rem" }}>
                {qty} <span style={{ fontSize: "0.65rem", color: "#6b7280", marginLeft: 4 }}>× {lotSize}</span>
              </div>
              <button onClick={() => setQty((q) => q + 1)} style={{ width: 32, height: 34, background: "#1f2937", border: "1px solid #374151", borderRadius: "0 6px 6px 0", color: "#f3f4f6", fontSize: "1rem", cursor: "pointer", flexShrink: 0 }}>+</button>
            </div>
            <div style={{ fontSize: "0.65rem", color: "#6b7280", marginTop: 4, textAlign: "center" }}>{qty * lotSize} shares total</div>
          </div>
          <div>
            <label style={s.label}>Price</label>
            <input style={s.input} placeholder="Market Price" value={currentPrice != null ? Number(currentPrice).toFixed(2) : ""} readOnly />
          </div>
          <div>
            <label style={s.label}>Validity</label>
            <select style={s.select} value={validity} onChange={(e) => setValidity(e.target.value)}>
              <option>DAY</option>
              <option>IOC</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── STEP 4 ── */}
      <div style={s.sectionTitle}>
        <span style={s.sectionBar}>4</span>Select Action
      </div>

      {validationMsg && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "9px 14px", marginBottom: 10, fontSize: "0.78rem", color: "#f87171", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "0.9rem" }}>⚠</span>{validationMsg}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 4 }}>
        {ACTIONS.map(({ key, label, sub, bg, text }) => {
          const isSelected = action === key;
          return (
            <button
              key={key}
              onClick={() => handlePlaceOrder(key)}
              style={{
                width: "100%", padding: "12px 10px", borderRadius: 8,
                fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.05em",
                textTransform: "uppercase", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                transition: "all 0.15s",
                background: isSelected ? bg : `${bg}22`,
                color: isSelected ? text : bg === "#1f2937" ? "#9ca3af" : bg,
                border: isSelected ? "none" : `1px solid ${bg === "#1f2937" ? "#374151" : bg + "55"}`,
                boxShadow: isSelected && bg !== "#1f2937" ? `0 4px 14px ${bg}44` : "none",
              }}
              onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = `${bg}44`; }}
              onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = `${bg}22`; }}
              onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
              onMouseUp={(e)   => (e.currentTarget.style.transform = "scale(1)")}
            >
              <span>{label}</span>
              <span style={{ fontSize: "0.6rem", fontWeight: 500, opacity: 0.7 }}>{sub}</span>
            </button>
          );
        })}
      </div>

      <div>
        <OrderBook orders={orders} setOrders={setOrders} />
      </div>
    </div>
  );
};

export default OrderPanel;