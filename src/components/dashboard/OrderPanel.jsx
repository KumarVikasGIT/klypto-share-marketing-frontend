// import React, { useEffect, useState, useRef } from "react";
// import apiService from "../../services/apiServices";
// import SearchSelect from "./SearchSelect";
// import { s } from "../../util/common";
// import OrderBook from "./OrderBook";
// import socket from "../../services/socket";

// const ACTIONS = [
//   {
//     key: "BUY_CALL",
//     label: "Buy Call",
//     sub: "▲ Long",
//     bg: "var(--success-color)",
//     text: "#fff",
//   },
//   {
//     key: "SQ_CALL",
//     label: "Sq. Off Call",
//     sub: "Exit Long",
//     bg: "var(--bg-secondary)",
//     text: "var(--text-primary)",
//   },
//   {
//     key: "BUY_PUT",
//     label: "Buy Put",
//     sub: "▼ Short",
//     bg: "var(--danger-color)",
//     text: "#fff",
//   },
//   {
//     key: "SQ_PUT",
//     label: "Sq. Off Put",
//     sub: "Exit Short",
//     bg: "var(--bg-secondary)",
//     text: "var(--text-primary)",
//   },
// ];

// const ACTION_MAP = {
//   BUY_CALL: "BUY",
//   SQ_CALL: "SELL",
//   BUY_PUT: "BUY",
//   SQ_PUT: "SELL",
// };

// const getValidationError = ({
//   stock,
//   expiry,
//   strategy,
//   preference,
//   product,
//   orderType,
//   qty,
// }) => {
//   if (!stock) return "Please select a Stock before proceeding.";
//   if (!expiry) return "Please select an Expiry date.";
//   if (!preference) return "Please select a Preference (ATM / ITM / OTM).";
//   if (!product) return "Please select a Product type (INTRADAY / CARRYFORWARD).";
//   if (!orderType) return "Please select an Order Type (MARKET / LIMIT).";
//   if (!qty || qty < 1) return "Quantity must be at least 1 lot.";
//   return null;
// };

// const findATM = (strikes, ltp) =>
//   strikes.reduce((prev, curr) =>
//     Math.abs(curr - ltp) < Math.abs(prev - ltp) ? curr : prev,
//   );

// const fmt = (n) => (n != null ? Number(n).toLocaleString("en-IN") : "—");

// // Parse a formatted strike string back to a raw number for chain lookup
// const parseStrike = (formatted) => {
//   if (!formatted || formatted === "—") return NaN;
//   return Number(String(formatted).replace(/,/g, ""));
// };

// const OrderPanel = ({
//   stock,
//   setStock,
//   expiry,
//   setExpiry,
//   strategy,
//   setStrategy,
//   preference,
//   setPreference,
//   product,
//   setProduct,
//   orderType,
//   setOrderType,
//   qty,
//   setQty,
//   validity,
//   setValidity,
//   action,
//   setAction,
//   orders,
//   setOrders,
// }) => {
//   const [stocks, setStocks] = useState([]);
//   const [validationMsg, setValidationMsg] = useState("");
//   const [chainLoading, setChainLoading] = useState(false);
//   const [rawChainData, setRawChainData] = useState(null);

//   const [currentPrice, setCurrentPrice] = useState(null);
//   const [priceChange, setPriceChange] = useState(null);
//   const [priceChangePct, setPriceChangePct] = useState(null);
//   const [expiries, setExpiries] = useState([]);
//   const [strikeMap, setStrikeMap] = useState({});
//   const [lotSize, setLotSize] = useState(75);
//   const fetchedChainStockRef = useRef(null);

//   const recommendedStrike = strikeMap[strategy]?.[preference] ?? "—";

//   // ── 1. All stocks + live prices from socket ──
//   useEffect(() => {
//     socket.emit("getMasterWatchlist");

//     const handleStocks = (data) => {
//       console.log("[OrderPanel] masterWatchlistResponse", data);
//       const equity = (data?.data?.equity || []).map((item) => ({ ...item, category: "EQ" }));
//       const futures = (data?.data?.futures || []).map((item) => ({ ...item, category: "FUT" }));
//       const options = (data?.data?.trendingOptions || []).map((item) => ({ ...item, category: "OPT" }));
//       const indices = (data?.data?.indices || []).map((item) => ({ ...item, category: "IDX" }));
//       setStocks([...indices, ...equity, ...futures, ...options]);
//     };

//     const handleStockUpdate = (updatedStock) => {
//       if (!updatedStock?.token) return;
//       setStocks((prev) =>
//         prev.map((s) =>
//           s.token === updatedStock.token ? { ...s, ...updatedStock } : s,
//         ),
//       );
//     };

//     const handleLiveTick = (tick) => {
//       if (!tick?.token) return;
//       setStocks((prev) =>
//         prev.map((s) => (s.token === tick.token ? { ...s, ...tick } : s)),
//       );
//     };

//     socket.on("masterWatchlistResponse", handleStocks);
//     socket.on("stockUpdate", handleStockUpdate);
//     socket.on("liveTick", handleLiveTick);

//     return () => {
//       socket.off("masterWatchlistResponse", handleStocks);
//       socket.off("stockUpdate", handleStockUpdate);
//       socket.off("liveTick", handleLiveTick);
//     };
//   }, []);

//   // ── 2. Derive live price for selected stock ──
//   useEffect(() => {
//     if (!stock || stocks.length === 0) return;

//     const match = stocks.find(
//       (s) =>
//         s.userCode === stock ||
//         s.name === stock ||
//         s.symbol === stock ||
//         s.actualSymbol === stock,
//     );

//     if (!match) return;

//     const ltp = Number(match.ltp);
//     if (!isNaN(ltp) && ltp > 0) {
//       setCurrentPrice(ltp);
//       if (match.change != null) setPriceChange(Number(match.change));
//       if (match.percent_change != null)
//         setPriceChangePct(Number(match.percent_change));
//     }
//   }, [stock, stocks]);

//   // ── 3. Fetch options chain (expiries + strikes) when stock changes ──
//   useEffect(() => {
//     if (!stock) {
//       setCurrentPrice(null);
//       setPriceChange(null);
//       setPriceChangePct(null);
//       setExpiries([]);
//       setStrikeMap({});
//       setExpiry("");
//       setStrategy("");
//       setPreference("");
//       setLotSize(75);
//       setRawChainData(null);
//       fetchedChainStockRef.current = null;
//       return;
//     }

//     if (fetchedChainStockRef.current === stock) return;

//     const stockObj = stocks.find(
//       (s) =>
//         s.userCode === stock || s.name === stock || s.actualSymbol === stock,
//     );
//     if (!stockObj) return;

//     async function fetchChain() {
//       setChainLoading(true);
//       try {
//         const symbolForChain =
//           stockObj.userCode ?? stockObj.actualSymbol ?? stockObj.name;
//         const data = await apiService.get("options/chain", {
//           symbol: symbolForChain,
//         });
//         setRawChainData(data);

//         if (data?.lotSize) setLotSize(data.lotSize);

//         const rawExpiries = data?.allExpiries ?? data?.expiries ?? [];
//         setExpiries(rawExpiries);
//         if (rawExpiries.length > 0) setExpiry(rawExpiries[0]);

//         const chainLtp =
//           data?.underlyingLtp ?? data?.underlyingValue ?? data?.ltp ?? null;
//         const ltpToUse = currentPrice ?? (chainLtp ? Number(chainLtp) : null);

//         if (ltpToUse && !currentPrice) setCurrentPrice(ltpToUse);

//         // ── KEY FIX: build strikes from chain array ──
//         // Each element: { strike: number|string, ce: {...}, pe: {...} }
//         const chain = data?.chain ?? [];
//         const strikes = chain
//           .map((c) => Number(c.strike))
//           .filter((n) => !isNaN(n))
//           .sort((a, b) => a - b);

//         if (strikes.length > 0 && ltpToUse) {
//           const atmStrike = findATM(strikes, ltpToUse);
//           const atmIdx = strikes.indexOf(atmStrike);

//           setStrikeMap({
//             "Nearest ATM": {
//               ATM: fmt(strikes[atmIdx]),
//               ITM: fmt(strikes[atmIdx - 1]),
//               OTM: fmt(strikes[atmIdx + 1]),
//             },
//             "OTM +1": {
//               ATM: fmt(strikes[atmIdx + 1]),
//               ITM: fmt(strikes[atmIdx]),
//               OTM: fmt(strikes[atmIdx + 2]),
//             },
//           });
//         } else if (strikes.length > 0) {
//           const mid = Math.floor(strikes.length / 2);
//           setStrikeMap({
//             "Nearest ATM": {
//               ATM: fmt(strikes[mid]),
//               ITM: fmt(strikes[mid - 1]),
//               OTM: fmt(strikes[mid + 1]),
//             },
//             "OTM +1": {
//               ATM: fmt(strikes[mid + 1]),
//               ITM: fmt(strikes[mid]),
//               OTM: fmt(strikes[mid + 2]),
//             },
//           });
//         }
//       } catch (err) {
//         console.error("Error fetching options chain:", err);
//       } finally {
//         setChainLoading(false);
//         fetchedChainStockRef.current = stock;
//       }
//     }

//     fetchChain();
//   }, [stock, stocks]);

//   const handlePlaceOrder = async (selectedAction) => {
//     const error = getValidationError({
//       stock,
//       expiry,
//       strategy,
//       preference,
//       product,
//       orderType,
//       qty,
//     });
//     if (error) {
//       setValidationMsg(error);
//       return;
//     }

//     setValidationMsg("");
//     setAction(selectedAction);

//     const stockObj = stocks.find(
//       (s) =>
//         s.userCode === stock || s.name === stock || s.actualSymbol === stock,
//     );
//     if (!stockObj) {
//       setValidationMsg("Selected stock not found. Please re-select.");
//       return;
//     }

//     const isCall = selectedAction.includes("CALL");
//     const optionType = isCall ? "ce" : "pe";

//     // ── KEY FIX: parse the formatted strike back to a number ──
//     const strikeNum = parseStrike(recommendedStrike);

//     console.log("recommendedStrike", recommendedStrike);
//     console.log("strikeNum", strikeNum);
//     console.log("optionType", optionType);
//     console.log("rawChainData", rawChainData);
//     console.log("chain", rawChainData?.chain);

//     const contract = rawChainData?.chain?.find(
//       (c) => Number(c.strike) === strikeNum,
//     )?.[optionType];

//     console.log("contract", contract);

//     if (!contract) {
//       setValidationMsg(
//         `Could not find ${optionType.toUpperCase()} contract for strike ${recommendedStrike}. Please check your selection.`,
//       );
//       return;
//     }

//     const payload = {
//       variety: "NORMAL",
//       tradingsymbol: contract?.symbol ?? contract?.tradingsymbol ?? contract?.name,
//       symboltoken: contract?.token ?? contract?.symboltoken ?? stockObj.token,
//       transactiontype: ACTION_MAP[selectedAction],
//       exchange: "NFO",
//       ordertype: orderType,
//       producttype: product,
//       duration: validity || "DAY",
//       price: orderType === "MARKET" ? "0" : String(currentPrice ?? 0),
//       quantity: qty * lotSize,
//       squareoff: "0",
//       stoploss: "0",
//     };

//     console.log("🚀 DISPATCH PAYLOAD:", payload);

//     // try {
//     //   const res = await apiService.post("equity/dispatchOrder", payload);
//     //   console.log("✅ Order placed:", res);
//     //   setValidationMsg("");
//     // } catch (err) {
//     //   console.error("❌ Order failed:", err);
//     //   setValidationMsg(
//     //     err?.response?.data?.message || "Order placement failed",
//     //   );
//     // }
//   };

//   const pricePositive = !priceChange || Number(priceChange) >= 0;
//   const priceColor = pricePositive ? "var(--success-color)" : "var(--danger-color)";

//   return (
//     <div
//       style={{
//         color: "var(--text-primary)",
//         fontFamily: "'DM Sans', sans-serif",
//         marginLeft: 10,
//         padding: "10px 0px",
//       }}
//     >
//       {/* ── STEP 1 ── */}
//       <div style={s.sectionTitle}>
//         <span style={s.sectionBar}>1</span>Select Stock & Expiry
//       </div>
//       <div style={s.card}>
//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns: "1fr 1fr 1fr",
//             gap: 14,
//           }}
//         >
//           <div>
//             <label style={s.label}>Stock</label>

//             {stock ? (
//               <div
//                 style={{
//                   ...s.select,
//                   display: "flex",
//                   alignItems: "center",
//                   justifyContent: "space-between",
//                   fontWeight: 700,
//                   color: "var(--success-color)",
//                 }}
//               >
//                 <span>{stock}</span>

//                 <span
//                   style={{
//                     fontSize: "0.65rem",
//                     background: "var(--success-color)22",
//                     color: "var(--success-color)",
//                     padding: "2px 8px",
//                     borderRadius: 6,
//                   }}
//                 >
//                   SELECTED
//                 </span>
//               </div>
//             ) : (
//               <SearchSelect
//                 stocks={stocks}
//                 stock={stock}
//                 setStock={(val) => {
//                   setStock(val);
//                   setValidationMsg("");
//                 }}
//                 style={{
//                   ...s.select,
//                   fontSize: "0.85rem",
//                   fontWeight: 700,
//                 }}
//               />
//             )}
//           </div>

//           <div>
//             <label style={s.label}>Current Price</label>
//             {chainLoading ? (
//               <div style={{ fontSize: "0.95rem", color: "var(--text-secondary)" }}>
//                 Loading…
//               </div>
//             ) : currentPrice != null ? (
//               <div>
//                 <div
//                   style={{
//                     fontSize: "1.25rem",
//                     fontWeight: 700,
//                     color: priceColor,
//                     lineHeight: 1,
//                   }}
//                 >
//                   {Number(currentPrice).toLocaleString("en-IN", {
//                     minimumFractionDigits: 2,
//                   })}
//                 </div>
//                 {priceChange != null && (
//                   <div
//                     style={{
//                       fontSize: "0.65rem",
//                       color: priceColor,
//                       marginTop: 2,
//                     }}
//                   >
//                     {pricePositive ? "▲" : "▼"}{" "}
//                     {Number(priceChange) >= 0 ? "+" : ""}
//                     {Number(priceChange).toFixed(2)}
//                     {priceChangePct != null &&
//                       ` (${Number(priceChangePct).toFixed(2)}%)`}
//                   </div>
//                 )}
//               </div>
//             ) : (
//               <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
//                 {stock ? "Waiting for price…" : "—"}
//               </div>
//             )}
//           </div>

//           <div>
//             <label style={s.label}>Expiry</label>
//             <select
//               style={s.select}
//               value={expiry}
//               onChange={(e) => {
//                 setExpiry(e.target.value);
//                 setValidationMsg("");
//               }}
//               disabled={chainLoading}
//             >
//               <option value="">
//                 {chainLoading ? "Loading…" : "Select expiry"}
//               </option>
//               {expiries.map((e) => (
//                 <option key={e} value={e}>
//                   {e}
//                 </option>
//               ))}
//             </select>
//           </div>
//         </div>
//       </div>

//       {/* ── STEP 2 ── */}
//       <div style={s.sectionTitle}>
//         <span style={s.sectionBar}>2</span>Auto Strike Selection
//         <span
//           style={{
//             fontSize: "0.55rem",
//             fontWeight: 700,
//             letterSpacing: "0.08em",
//             background: "#f0b90b22",
//             color: "#f0b90b",
//             border: "1px solid #f0b90b44",
//             borderRadius: 4,
//             padding: "2px 7px",
//           }}
//         >
//           SMART MODE
//         </span>
//       </div>
//       <div style={s.card}>
//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns: "1fr 1fr 1fr",
//             gap: 14,
//             alignItems: "start",
//           }}
//         >
//           <div>
//             <label style={s.label}>Strategy</label>
//             <select
//               style={s.select}
//               value={strategy}
//               onChange={(e) => {
//                 setStrategy(e.target.value);
//                 setValidationMsg("");
//               }}
//               disabled={Object.keys(strikeMap).length === 0}
//             >
//               <option value="">Select strategy</option>
//               {Object.keys(strikeMap).map((k) => (
//                 <option key={k}>{k}</option>
//               ))}
//             </select>
//           </div>
//           <div>
//             <label style={s.label}>Preference</label>
//             <select
//               style={s.select}
//               value={preference}
//               onChange={(e) => {
//                 setPreference(e.target.value);
//                 setValidationMsg("");
//               }}
//             >
//               <option value="">Select preference</option>
//               <option>ATM</option>
//               <option>ITM</option>
//               <option>OTM</option>
//             </select>
//           </div>
//           <div>
//             <label style={s.label}>Recommended Strike</label>
//             <div
//               style={{
//                 background: "rgba(16,185,129,0.06)",
//                 border: "1px solid rgba(16,185,129,0.25)",
//                 borderRadius: 8,
//                 padding: "6px 10px",
//                 textAlign: "center",
//               }}
//             >
//               <div
//                 style={{
//                   fontSize: "0.6rem",
//                   color: "var(--text-secondary)",
//                   letterSpacing: "0.08em",
//                   textTransform: "uppercase",
//                 }}
//               >
//                 Strike
//               </div>
//               <div
//                 style={{
//                   fontSize: "1.2rem",
//                   fontWeight: 700,
//                   color: strategy && preference ? "var(--success-color)" : "var(--text-secondary)",
//                 }}
//               >
//                 {strategy && preference ? recommendedStrike : "—"}
//                 {strategy && preference && recommendedStrike !== "—" && (
//                   <span
//                     style={{ fontSize: "0.65rem", opacity: 0.5, marginLeft: 4 }}
//                   >
//                     {preference}
//                   </span>
//                 )}
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* ── STEP 3 ── */}
//       <div style={s.sectionTitle}>
//         <span style={s.sectionBar}>3</span>Order Details
//       </div>
//       <div style={s.card}>
//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns: "0.8fr 1fr 1.1fr 1fr 0.8fr",
//             gap: 14,
//             alignItems: "start",
//           }}
//         >
//           <div>
//             <label style={s.label}>Product Type</label>
//             <select
//               style={s.select}
//               value={product}
//               onChange={(e) => {
//                 setProduct(e.target.value);
//                 setValidationMsg("");
//               }}
//             >
//               <option value="">Select</option>
//               <option>INTRADAY</option>
//               <option>CARRYFORWARD</option>
//             </select>
//           </div>
//           <div>
//             <label style={s.label}>Order Type</label>
//             <select
//               style={s.select}
//               value={orderType}
//               onChange={(e) => {
//                 setOrderType(e.target.value);
//                 setValidationMsg("");
//               }}
//             >
//               <option value="">Select</option>
//               <option>MARKET</option>
//               <option>LIMIT</option>
//             </select>
//           </div>
//           <div>
//             <label style={s.label}>Quantity (Lots)</label>
//             <div style={{ display: "flex", alignItems: "center" }}>
//               <button
//                 onClick={() => setQty((q) => Math.max(1, q - 1))}
//                 style={{
//                   width: 32,
//                   height: 34,
//                   background: "var(--bg-secondary)",
//                   border: "1px solid var(--border-color)",
//                   borderRadius: "6px 0 0 6px",
//                   color: "var(--text-primary)",
//                   fontSize: "1rem",
//                   cursor: "pointer",
//                   flexShrink: 0,
//                 }}
//               >
//                 −
//               </button>
//               <div
//                 style={{
//                   flex: 1,
//                   height: 34,
//                   background: "var(--bg-secondary)",
//                   border: "1px solid var(--border-color)",
//                   borderLeft: "none",
//                   borderRight: "none",
//                   display: "flex",
//                   alignItems: "center",
//                   justifyContent: "center",
//                   fontWeight: 700,
//                   fontSize: "0.9rem",
//                 }}
//               >
//                 {qty}{" "}
//                 <span
//                   style={{
//                     fontSize: "0.65rem",
//                     color: "var(--text-secondary)",
//                     marginLeft: 4,
//                   }}
//                 >
//                   × {lotSize}
//                 </span>
//               </div>
//               <button
//                 onClick={() => setQty((q) => q + 1)}
//                 style={{
//                   width: 32,
//                   height: 34,
//                   background: "var(--bg-secondary)",
//                   border: "1px solid var(--border-color)",
//                   borderRadius: "0 6px 6px 0",
//                   color: "var(--text-primary)",
//                   fontSize: "1rem",
//                   cursor: "pointer",
//                   flexShrink: 0,
//                 }}
//               >
//                 +
//               </button>
//             </div>
//             <div
//               style={{
//                 fontSize: "0.65rem",
//                 color: "var(--text-secondary)",
//                 marginTop: 4,
//                 textAlign: "center",
//               }}
//             >
//               {qty * lotSize} shares total
//             </div>
//           </div>
//           <div>
//             <label style={s.label}>Price</label>
//             <input
//               style={s.input}
//               placeholder="Market Price"
//               value={
//                 currentPrice != null ? Number(currentPrice).toFixed(2) : ""
//               }
//               readOnly
//             />
//           </div>
//           <div>
//             <label style={s.label}>Total Value</label>
//             <div
//               style={{
//                 height: 34,
//                 background: "rgba(16,185,129,0.07)",
//                 border: "1px solid rgba(16,185,129,0.3)",
//                 borderRadius: 8,
//                 display: "flex",
//                 alignItems: "center",
//                 justifyContent: "center",
//                 fontWeight: 700,
//                 fontSize: "0.88rem",
//                 color: "var(--success-color)",
//                 letterSpacing: "0.01em",
//               }}
//             >
//               {currentPrice != null
//                 ? `₹ ${(currentPrice * qty * lotSize).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
//                 : "—"}
//             </div>
//             <div style={{ fontSize: "0.6rem", color: "var(--text-secondary)", marginTop: 3, textAlign: "center" }}>
//               {qty} lot{qty !== 1 ? "s" : ""} × {lotSize} shares
//             </div>
//           </div>
//           <div>
//             <label style={s.label}>Validity</label>
//             <select
//               style={s.select}
//               value={validity}
//               onChange={(e) => setValidity(e.target.value)}
//             >
//               <option>DAY</option>
//               <option>IOC</option>
//             </select>
//           </div>
//         </div>
//       </div>

//       {/* ── STEP 4 ── */}
//       <div style={s.sectionTitle}>
//         <span style={s.sectionBar}>4</span>Select Action
//       </div>

//       {validationMsg && (
//         <div
//           style={{
//             background: "rgba(239,68,68,0.08)",
//             border: "1px solid rgba(239,68,68,0.3)",
//             borderRadius: 8,
//             padding: "9px 14px",
//             marginBottom: 10,
//             fontSize: "0.78rem",
//             color: "var(--danger-color)",
//             display: "flex",
//             alignItems: "center",
//             gap: 8,
//           }}
//         >
//           <span style={{ fontSize: "0.9rem" }}>⚠</span>
//           {validationMsg}
//         </div>
//       )}

//       <div
//         style={{
//           display: "grid",
//           gridTemplateColumns: "1fr 1fr 1fr 1fr",
//           gap: 10,
//           marginBottom: 4,
//         }}
//       >
//         {ACTIONS.map(({ key, label, sub, bg, text }) => {
//           const isSelected = action === key;
//           return (
//             <button
//               key={key}
//               onClick={() => handlePlaceOrder(key)}
//               style={{
//                 width: "100%",
//                 padding: "12px 10px",
//                 borderRadius: 8,
//                 fontWeight: 700,
//                 fontSize: "0.8rem",
//                 letterSpacing: "0.05em",
//                 textTransform: "uppercase",
//                 cursor: "pointer",
//                 display: "flex",
//                 flexDirection: "column",
//                 alignItems: "center",
//                 gap: 2,
//                 transition: "all 0.15s",
//                 background: isSelected ? bg : `${bg}22`,
//                 color: isSelected ? text : bg === "var(--bg-secondary)" ? "var(--text-secondary)" : bg,
//                 border: isSelected
//                   ? "none"
//                   : `1px solid ${bg === "var(--bg-secondary)" ? "var(--border-color)" : bg + "55"}`,
//                 boxShadow:
//                   isSelected && bg !== "var(--bg-secondary)"
//                     ? `0 4px 14px ${bg}44`
//                     : "none",
//               }}
//               onMouseEnter={(e) => {
//                 if (!isSelected) e.currentTarget.style.background = `${bg}44`;
//               }}
//               onMouseLeave={(e) => {
//                 if (!isSelected) e.currentTarget.style.background = `${bg}22`;
//               }}
//               onMouseDown={(e) =>
//                 (e.currentTarget.style.transform = "scale(0.97)")
//               }
//               onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
//             >
//               <span>{label}</span>
//               <span
//                 style={{ fontSize: "0.6rem", fontWeight: 500, opacity: 0.7 }}
//               >
//                 {sub}
//               </span>
//             </button>
//           );
//         })}
//       </div>

//       <div>
//         <OrderBook orders={orders} setOrders={setOrders} />
//       </div>
//     </div>
//   );
// };

// export default OrderPanel;
import React, { useEffect, useState, useRef } from "react";
import apiService from "../../services/apiServices";
import SearchSelect from "./SearchSelect";
import { s } from "../../util/common";
import OrderBook from "./OrderBook";
import socket from "../../services/socket";

const ACTIONS = [
  { key: "BUY_CALL", label: "Buy Call",    sub: "▲ Long",      bg: "var(--success-color)", text: "#fff"     },
  { key: "SQ_CALL",  label: "Sq. Off Call",sub: "Exit Long",   bg: "var(--bg-secondary)", text: "var(--text-primary)"  },
  { key: "BUY_PUT",  label: "Buy Put",     sub: "▼ Short",     bg: "var(--danger-color)", text: "#fff"     },
  { key: "SQ_PUT",   label: "Sq. Off Put", sub: "Exit Short",  bg: "var(--bg-secondary)", text: "var(--text-primary)"  },
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
  if (!product)        return "Please select a Product type (INTRADAY / CARRYFORWARD).";
  if (!orderType)      return "Please select an Order Type (MARKET / LIMIT).";
  if (!qty || qty < 1) return "Quantity must be at least 1 lot.";
  return null;
};

const findATM = (strikes, ltp) =>
  strikes.reduce((prev, curr) =>
    Math.abs(curr - ltp) < Math.abs(prev - ltp) ? curr : prev,
  );

const fmt = (n) => (n != null ? Number(n).toLocaleString("en-IN") : "—");

const parseStrike = (formatted) => {
  if (!formatted || formatted === "—") return NaN;
  return Number(String(formatted).replace(/,/g, ""));
};

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
  const parseSymbolName = (fullName) => {
    if (!fullName || typeof fullName !== "string") return { base: fullName, hasExpiry: false };
    const match = fullName.match(/^([A-Z-]+)\s?(\d{1,2}[A-Z]{3}\d{2,4})\s?(.*)$/i);
    if (match) {
      return { base: match[1].trim(), expiry: match[2], suffix: match[3].trim(), hasExpiry: true };
    }
    return { base: fullName, hasExpiry: false };
  };

  const [stocks, setStocks]               = useState([]);
  const [validationMsg, setValidationMsg] = useState("");
  const [chainLoading, setChainLoading]   = useState(false);
  const [rawChainData, setRawChainData]   = useState(null);

  const [currentPrice, setCurrentPrice]     = useState(null);
  const [priceChange, setPriceChange]       = useState(null);
  const [priceChangePct, setPriceChangePct] = useState(null);
  const [expiries, setExpiries]             = useState([]);
  const [strikeMap, setStrikeMap]           = useState({});
  const [lotSize, setLotSize]               = useState(75);

  const [selectedStockObj, setSelectedStockObj] = useState(null);

  // ── Live option chain from websocket ──
  const [wsChain, setWsChain] = useState(null);

  const fetchedChainStockRef = useRef(null);
  const subscribedSymbolRef  = useRef(null);

  const recommendedStrike = strikeMap[strategy]?.[preference] ?? "—";

  // Derived: live CE/PE LTP for the recommended strike from websocket
  const strikeNum     = parseStrike(recommendedStrike);
  const wsRow         = wsChain?.chain?.find((c) => Number(c.strike) === strikeNum);
  const liveCeLtp     = wsRow?.ce?.ltp  != null ? Number(wsRow.ce.ltp)  : null;
  const livePeLtp     = wsRow?.pe?.ltp  != null ? Number(wsRow.pe.ltp)  : null;

  // ── 1. Socket: master watchlist + live ticks ──
  useEffect(() => {
    socket.emit("getMasterWatchlist");

    const handleStocks = (data) => {
      const equity  = (data?.data?.equity          || []).map((i) => ({ ...i, category: "EQ"  }));
      const futures = (data?.data?.futures         || []).map((i) => ({ ...i, category: "FUT" }));
      const options = (data?.data?.trendingOptions || []).map((i) => ({ ...i, category: "OPT" }));
      const indices = (data?.data?.indices         || []).map((i) => ({ ...i, category: "IDX" }));
      setStocks([...indices, ...equity, ...futures, ...options]);
    };

    const patchStocks = (upd) => {
      if (!upd?.token) return;
      setStocks((prev) => prev.map((s) => s.token === upd.token ? { ...s, ...upd } : s));
    };

    socket.on("masterWatchlistResponse", handleStocks);
    socket.on("stockUpdate", patchStocks);
    socket.on("liveTick",    patchStocks);

    return () => {
      socket.off("masterWatchlistResponse", handleStocks);
      socket.off("stockUpdate", patchStocks);
      socket.off("liveTick",    patchStocks);
    };
  }, []);

  // ── 2. Subscribe/unsubscribe option chain when stock changes ──
  useEffect(() => {
    // Unsubscribe previous symbol if any
    if (subscribedSymbolRef.current) {
      socket.emit("unsubscribeOptionChain", { symbol: subscribedSymbolRef.current });
      subscribedSymbolRef.current = null;
      setWsChain(null);
    }

    if (!stock) return;

    const currentToken = stock?.token ?? stock;
    const stockObj = stocks.find((s) => s.token === currentToken);
    if (!stockObj) return;

    const rawSymbol      = stockObj.symbol ?? stockObj.name ?? stockObj.userCode ?? stockObj.actualSymbol;
    const symbolForChain = parseSymbolName(rawSymbol).base;

    // Subscribe to live option chain
    socket.emit("subscribeOptionChain", { symbol: symbolForChain });
    subscribedSymbolRef.current = symbolForChain;

    // Handler for live option chain updates
    const handleOptionChainUpdate = (data) => {
      // Match by symbol to avoid stale updates from previous stock
      if (data?.symbol !== subscribedSymbolRef.current) return;

      setWsChain(data);

      // Keep spot price live from websocket chain
      if (data?.spotPrice != null) {
        setCurrentPrice(Number(data.spotPrice));
      }
    };

    socket.on("optionChainUpdate", handleOptionChainUpdate);

    return () => {
      socket.off("optionChainUpdate", handleOptionChainUpdate);
      // Unsubscribe on cleanup
      if (subscribedSymbolRef.current) {
        socket.emit("unsubscribeOptionChain", { symbol: subscribedSymbolRef.current });
        subscribedSymbolRef.current = null;
      }
    };
  }, [stock, stocks]);

  // ── 3. Keep selectedStockObj + live price in sync with ticks ──
  useEffect(() => {
    if (!stock || stocks.length === 0) return;
    const currentToken = stock?.token ?? stock;
    const match = stocks.find((s) => s.token === currentToken);
    if (!match) return;

    setSelectedStockObj((prev) => prev ? { ...prev, ...match } : match);

    const ltp = Number(match.ltp);
    if (!isNaN(ltp) && ltp > 0) {
      // Only update from stock tick if wsChain hasn't provided a spotPrice
      if (!wsChain?.spotPrice) {
        setCurrentPrice(ltp);
      }
      if (match.change         != null) setPriceChange(Number(match.change));
      if (match.percent_change != null) setPriceChangePct(Number(match.percent_change));
    }
  }, [stock, stocks, wsChain]);

  // ── 4. Fetch options chain (expiries + lot size + strike map) when stock changes ──
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
      setRawChainData(null);
      setSelectedStockObj(null);
      setWsChain(null);
      fetchedChainStockRef.current = null;
      return;
    }

    const currentToken = stock?.token ?? stock;
    if (fetchedChainStockRef.current === currentToken) return;

    const stockObj = stocks.find((s) => s.token === currentToken);
    if (!stockObj) return;

    async function fetchChain() {
      setChainLoading(true);
      try {
        const rawSymbol      = stockObj.symbol ?? stockObj.name ?? stockObj.userCode ?? stockObj.actualSymbol;
        const symbolForChain = parseSymbolName(rawSymbol).base;
        const data           = await apiService.get("options/chain", { symbol: symbolForChain });
        setRawChainData(data);

        if (data?.lotSize) setLotSize(data.lotSize);

        const rawExpiries = data?.allExpiries ?? data?.expiries ?? [];
        setExpiries(rawExpiries);
        if (rawExpiries.length > 0) setExpiry(rawExpiries[0]);

        const chainLtp = data?.underlyingLtp ?? data?.underlyingValue ?? data?.ltp ?? null;
        const ltpToUse = currentPrice ?? (chainLtp ? Number(chainLtp) : null);
        if (ltpToUse && !currentPrice) setCurrentPrice(ltpToUse);

        // Build strike map from REST chain (used for ATM/ITM/OTM labels)
        const chain   = data?.chain ?? [];
        const strikes = chain
          .map((c) => Number(c.strike))
          .filter((n) => !isNaN(n))
          .sort((a, b) => a - b);

        if (strikes.length > 0 && ltpToUse) {
          const atm    = findATM(strikes, ltpToUse);
          const atmIdx = strikes.indexOf(atm);
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
        fetchedChainStockRef.current = stock?.token ?? stock;
      }
    }

    fetchChain();
  }, [stock, stocks]);

  // ── 5. Place order ──
  const handlePlaceOrder = async (selectedAction) => {
    const error = getValidationError({ stock, expiry, strategy, preference, product, orderType, qty });
    if (error) { setValidationMsg(error); return; }

    setValidationMsg("");
    setAction(selectedAction);

    const currentToken = stock?.token ?? stock;
    const stockObj     = selectedStockObj ?? stocks.find((s) => s.token === currentToken);
    if (!stockObj) {
      setValidationMsg("Selected stock not found. Please re-select.");
      return;
    }

    const isCall    = selectedAction.includes("CALL");
    const strikeNum = parseStrike(recommendedStrike);

    // ── Primary: websocket chain (live, has ce/pe keys) ──
    const wsChainRow  = wsChain?.chain?.find((c) => Number(c.strike) === strikeNum);
    const wsContract  = wsChainRow?.[isCall ? "ce" : "pe"];

    // ── Fallback: REST chain (has call/put keys) ──
    const restChainRow = rawChainData?.chain?.find((c) => Number(c.strike) === strikeNum);
    const restContract = restChainRow?.[isCall ? "call" : "put"];

    const contract = wsContract ?? restContract;

    console.log("strikeNum",    strikeNum);
    console.log("wsChainRow",   wsChainRow);
    console.log("wsContract",   wsContract);
    console.log("restContract", restContract);
    console.log("contract",     contract);

    if (!contract) {
      setValidationMsg(
        `Could not find ${isCall ? "CE" : "PE"} contract for strike ${recommendedStrike}. Please check your selection.`,
      );
      return;
    }

    const tradingsymbol =
      contract?.symbol        ??
      contract?.tradingsymbol ??
      contract?.name          ??
      stockObj.userCode;

    const symboltoken =
      contract?.token       ??
      contract?.symboltoken ??
      stockObj.token;

    // For LIMIT orders — use live contract LTP from websocket, fallback to spot price
    const contractLtp = wsContract?.ltp != null ? Number(wsContract.ltp) : null;

    const payload = {
      variety:         "NORMAL",
      tradingsymbol,
      symboltoken,
      transactiontype: ACTION_MAP[selectedAction],
      exchange:        contract?.exch_seg ?? contract?.exchange ?? stockObj?.segment ?? "NFO",
      ordertype:       orderType,
      producttype:     product,
      duration:        validity || "DAY",
      price:           orderType === "MARKET"
                         ? "0"
                         : String(contractLtp ?? currentPrice ?? 0),
      quantity:        qty * lotSize,
      squareoff:       "0",
    };

    console.log("🚀 DISPATCH PAYLOAD:", payload);

    // try {
    //   const res = await apiService.post("equity/dispatchOrder", payload);
    //   console.log("✅ Order placed:", res);
    //   setValidationMsg("");
    // } catch (err) {
    //   console.error("❌ Order failed:", err);
    //   setValidationMsg(err?.response?.data?.message || "Order placement failed");
    // }
  };

  const pricePositive = !priceChange || Number(priceChange) >= 0;
  const priceColor    = pricePositive ? "var(--success-color)" : "var(--danger-color)";

  return (
    <div style={{ color: "var(--text-primary)", fontFamily: "'DM Sans', sans-serif", marginLeft: 10, padding: "10px 0px" }}>

      {/* ── STEP 1 ── */}
      <div style={s.sectionTitle}>
        <span style={s.sectionBar}>1</span>Select Stock & Expiry
      </div>
      <div style={s.card}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>

          <div>
            <label style={s.label}>Stock</label>
            {stock ? (
              <div style={{
                ...s.select,
                display: "flex", alignItems: "center", justifyContent: "space-between",
                fontWeight: 700, color: "var(--success-color)",
              }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {(() => {
                    const fullName = selectedStockObj?.name ?? selectedStockObj?.symbol ?? stock?.name ?? stock;
                    const parsed   = parseSymbolName(fullName);
                    return parsed.base;
                  })()}
                </span>
                <span
                  onClick={() => { setStock(""); setSelectedStockObj(null); setValidationMsg(""); }}
                  style={{
                    fontSize: "0.6rem", background: "var(--success-color)22", color: "var(--success-color)",
                    padding: "2px 8px", borderRadius: 6, cursor: "pointer", flexShrink: 0,
                  }}
                  title="Change stock"
                >
                  ✕ CHANGE
                </span>
              </div>
            ) : (
              <SearchSelect
                stocks={stocks}
                stock={stock}
                setStock={(obj) => { setStock(obj); setValidationMsg(""); }}
                onSelect={(obj) => { setSelectedStockObj(obj); setValidationMsg(""); }}
                style={{ ...s.select, fontSize: "0.85rem", fontWeight: 700 }}
              />
            )}
          </div>

          <div>
            <label style={s.label}>Current Price</label>
            {chainLoading ? (
              <div style={{ fontSize: "0.95rem", color: "var(--text-secondary)" }}>Loading…</div>
            ) : currentPrice != null ? (
              <div>
                <div style={{ fontSize: "1.25rem", fontWeight: 700, color: priceColor, lineHeight: 1 }}>
                  {Number(currentPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                {priceChange != null && (
                  <div style={{ fontSize: "0.65rem", color: priceColor, marginTop: 2 }}>
                    {pricePositive ? "▲" : "▼"}{" "}
                    {Number(priceChange) >= 0 ? "+" : ""}{Number(priceChange).toFixed(2)}
                    {priceChangePct != null && ` (${Number(priceChangePct).toFixed(2)}%)`}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                {stock ? "Waiting for price…" : "—"}
              </div>
            )}
          </div>

          <div style={{
            display: parseSymbolName(selectedStockObj?.name ?? selectedStockObj?.symbol ?? stock?.name ?? stock).hasExpiry ? "block" : "none",
          }}>
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
        <span style={{
          fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.08em",
          background: "#f0b90b22", color: "#f0b90b", border: "1px solid #f0b90b44",
          borderRadius: 4, padding: "2px 7px",
        }}>SMART MODE</span>
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
            <div style={{
              background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.25)",
              borderRadius: 8, padding: "6px 10px", textAlign: "center",
            }}>
              <div style={{ fontSize: "0.6rem", color: "var(--text-secondary)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Strike
              </div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: strategy && preference ? "var(--success-color)" : "var(--text-secondary)" }}>
                {strategy && preference ? recommendedStrike : "—"}
                {strategy && preference && recommendedStrike !== "—" && (
                  <span style={{ fontSize: "0.65rem", opacity: 0.5, marginLeft: 4 }}>{preference}</span>
                )}
              </div>

              {/* ── Live CE / PE premiums from websocket ── */}
              {wsRow && (liveCeLtp != null || livePeLtp != null) && (
                <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 5 }}>
                  {liveCeLtp != null && (
                    <span style={{
                      fontSize: "0.65rem", fontWeight: 600,
                      background: "rgba(16,185,129,0.12)", color: "var(--success-color)",
                      padding: "2px 7px", borderRadius: 5,
                    }}>
                      CE ₹{liveCeLtp.toFixed(2)}
                    </span>
                  )}
                  {livePeLtp != null && (
                    <span style={{
                      fontSize: "0.65rem", fontWeight: 600,
                      background: "rgba(239,68,68,0.12)", color: "var(--danger-color)",
                      padding: "2px 7px", borderRadius: 5,
                    }}>
                      PE ₹{livePeLtp.toFixed(2)}
                    </span>
                  )}
                </div>
              )}
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
            <label style={s.label}>Product Type</label>
            <select style={s.select} value={product} onChange={(e) => { setProduct(e.target.value); setValidationMsg(""); }}>
              <option value="">Select</option>
              <option>INTRADAY</option>
              <option>CARRYFORWARD</option>
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
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                style={{ width: 32, height: 34, background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "6px 0 0 6px", color: "var(--text-primary)", fontSize: "1rem", cursor: "pointer", flexShrink: 0 }}
              >−</button>
              <div style={{
                flex: 1, height: 34, background: "var(--bg-secondary)", border: "1px solid var(--border-color)",
                borderLeft: "none", borderRight: "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: "0.9rem",
              }}>
                {qty}{" "}
                <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)", marginLeft: 4 }}>× {lotSize}</span>
              </div>
              <button
                onClick={() => setQty((q) => q + 1)}
                style={{ width: 32, height: 34, background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "0 6px 6px 0", color: "var(--text-primary)", fontSize: "1rem", cursor: "pointer", flexShrink: 0 }}
              >+</button>
            </div>
            <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)", marginTop: 4, textAlign: "center" }}>
              {qty * lotSize} shares total
            </div>
          </div>

          <div>
            <label style={s.label}>Price</label>
            <input
              style={s.input}
              placeholder={orderType === "MARKET" ? "Market Price" : "0.00"}
              value={currentPrice != null ? currentPrice : ""}
              readOnly={orderType === "MARKET"}
              onChange={(e) => {
                const val = e.target.value;
                if (/^\d*\.?\d*$/.test(val)) setCurrentPrice(val);
              }}
            />
          </div>

          <div>
            <label style={s.label}>Total Value</label>
            <div style={{
              height: 34, background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.3)",
              borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: "0.88rem", color: "var(--success-color)",
            }}>
              {currentPrice != null
                ? `₹ ${(currentPrice * qty * lotSize).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                : "—"}
            </div>
            <div style={{ fontSize: "0.6rem", color: "var(--text-secondary)", marginTop: 3, textAlign: "center" }}>
              {qty} lot{qty !== 1 ? "s" : ""} × {lotSize} shares
            </div>
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
        <div style={{
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: 8, padding: "9px 14px", marginBottom: 10,
          fontSize: "0.78rem", color: "var(--danger-color)", display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ fontSize: "0.9rem" }}>⚠</span>
          {validationMsg}
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
                color: isSelected ? text : bg === "var(--bg-secondary)" ? "var(--text-secondary)" : bg,
                border: isSelected ? "none" : `1px solid ${bg === "var(--bg-secondary)" ? "var(--border-color)" : bg + "55"}`,
                boxShadow: isSelected && bg !== "var(--bg-secondary)" ? `0 4px 14px ${bg}44` : "none",
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