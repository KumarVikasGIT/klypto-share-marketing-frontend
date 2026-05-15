// import React from "react";

// const mockOptionData = [
//   {
//     strike: 7150,
//     call: { volume: "0", oiChg: 0, oiChgPct: 0.0, oi: "3,125", ltp: 331.05, ltpChgPct: -2.56 },
//     put: { ltp: 198.55, ltpChgPct: -11.66, oi: "7,125", oiChg: -375, oiChgPct: -5.0, volume: "3.5K" },
//   },
//   {
//     strike: 7200,
//     call: { volume: "41.87K", oiChg: 8875, oiChgPct: 23.99, oi: "45.9K", ltp: 341.6, ltpChgPct: 9.65 },
//     put: { ltp: 212.25, ltpChgPct: -15.17, oi: "50.8K", oiChg: 3750, oiChgPct: 7.98, volume: "62.25K" },
//   },
//   {
//     strike: 7250,
//     call: { volume: "26.37K", oiChg: 4750, oiChgPct: 46.34, oi: "15.0K", ltp: 319.2, ltpChgPct: 9.05 },
//     put: { ltp: 235.0, ltpChgPct: -11.42, oi: "19.9K", oiChg: -12750, oiChgPct: -39.08, volume: "54K" },
//   },
//   {
//     strike: 7300,
//     call: { volume: "2L", oiChg: 1375, oiChgPct: 2.42, oi: "58.3K", ltp: 292.0, ltpChgPct: 10.0 },
//     put: { ltp: 254.35, ltpChgPct: -14.0, oi: "50.0K", oiChg: 4250, oiChgPct: 9.29, volume: "70.12K" },
//   },
//   {
//     strike: 7328,
//     isSpot: true,
//   },
//   {
//     strike: 7350,
//     call: { volume: "1.05L", oiChg: 3000, oiChgPct: 21.24, oi: "17.1K", ltp: 271.6, ltpChgPct: 13.03 },
//     put: { ltp: 276.8, ltpChgPct: -14.65, oi: "5.375", oiChg: 375, oiChgPct: 7.5, volume: "3K" },
//   },
//   {
//     strike: 7400,
//     call: { volume: "87.5K", oiChg: -3500, oiChgPct: -8.59, oi: "37.3K", ltp: 243.4, ltpChgPct: 11.42 },
//     put: { ltp: 309.1, ltpChgPct: -14.85, oi: "20.1K", oiChg: 3625, oiChgPct: 21.97, volume: "10.75K" },
//   },
//   {
//     strike: 7450,
//     call: { volume: "3.87K", oiChg: -500, oiChgPct: -5.41, oi: "8,750", ltp: 226.0, ltpChgPct: 13.23 },
//     put: { ltp: 399.7, ltpChgPct: 11.8, oi: "1,750", oiChg: 0, oiChgPct: 0.0, volume: "0" },
//   },
//   {
//     strike: 7500,
//     call: { volume: "2.03L", oiChg: 10000, oiChgPct: 13.47, oi: "84.3K", ltp: 205.0, ltpChgPct: 12.51 },
//     put: { ltp: 365.0, ltpChgPct: -17.41, oi: "16.5K", oiChg: 1750, oiChgPct: 11.86, volume: "7K" },
//   },
// ];

// const OptionChain = ({ selectedCurrency }) => {
//   const getStyle = (val) => {
//     if (val > 0) return { color: "#089981" };
//     if (val < 0) return { color: "#f23645" };
//     return { color: "#d1d4dc" };
//   };

//   const getOiStyle = (val) => {
//     return { color: "#089981" }; // Based on image, OI values are often green or red based on some other logic, but let's default to standard colors
//   };

//   return (
//     <div className="w-100 h-100 p-3" style={{ background: "#131722", color: "#d1d4dc", overflowY: "auto" }}>
//       <h5 className="mb-3">{selectedCurrency?.name || "NIFTY"} Option Chain</h5>
//       <div style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid #2a2e39" }}>
//         <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "center" }}>
//           <thead>
//             <tr style={{ background: "#1e222d", borderBottom: "1px solid #2a2e39" }}>
//               <th colSpan="4" style={{ padding: "12px", borderRight: "1px solid #2a2e39", color: "#d1d4dc" }}>CALL</th>
//               <th style={{ padding: "12px", borderRight: "1px solid #2a2e39", color: "#d1d4dc" }}>LTP & OI</th>
//               <th colSpan="4" style={{ padding: "12px", color: "#d1d4dc" }}>PUT</th>
//             </tr>
//             <tr style={{ background: "#1e222d", borderBottom: "1px solid #2a2e39", color: "#787b86", fontSize: "12px" }}>
//               <th style={{ padding: "10px" }}>Volume</th>
//               <th style={{ padding: "10px" }}>OI Chng.(Chng%)</th>
//               <th style={{ padding: "10px" }}>OI</th>
//               <th style={{ padding: "10px", borderRight: "1px solid #2a2e39" }}>LTP (LTP Chng%)</th>
//               <th style={{ padding: "10px", borderRight: "1px solid #2a2e39" }}>Strike</th>
//               <th style={{ padding: "10px" }}>LTP (LTP Chng%)</th>
//               <th style={{ padding: "10px" }}>OI</th>
//               <th style={{ padding: "10px" }}>OI Chng.(Chng%)</th>
//               <th style={{ padding: "10px" }}>Volume</th>
//             </tr>
//           </thead>
//           <tbody>
//             {mockOptionData.map((row, i) => {
//               if (row.isSpot) {
//                 return (
//                   <tr key={`spot-${i}`} style={{ background: "rgba(8, 153, 129, 0.1)", borderTop: "2px solid #089981", borderBottom: "2px solid #089981" }}>
//                     <td colSpan="4" style={{ borderRight: "1px solid #2a2e39" }}></td>
//                     <td style={{ padding: "6px", fontWeight: "bold", borderRight: "1px solid #2a2e39", color: "#089981" }}>
//                       <span style={{ background: "#089981", color: "#fff", padding: "2px 6px", borderRadius: "4px" }}>
//                         {row.strike.toFixed(2)}
//                       </span>
//                     </td>
//                     <td colSpan="4"></td>
//                   </tr>
//                 );
//               }

//               // Color backgrounds based on in-the-money / out-of-the-money
//               // ITM Call logic: Strike < Spot (7328) -> Light yellow (in light theme) -> we'll use a subtle dark tint
//               const isCallItm = row.strike < 7328;
//               const isPutItm = row.strike > 7328;

//               const callBg = isCallItm ? "rgba(255, 235, 59, 0.05)" : "transparent";
//               const putBg = isPutItm ? "rgba(255, 235, 59, 0.05)" : "transparent";

//               return (
//                 <tr key={row.strike} style={{ borderBottom: "1px solid #2a2e39" }}>
//                   {/* CALL SIDE */}
//                   <td style={{ padding: "12px", background: callBg }}>{row.call.volume}</td>
//                   <td style={{ padding: "12px", background: callBg }}>
//                     {row.call.oiChg} <span style={getStyle(row.call.oiChgPct)}>({row.call.oiChgPct > 0 ? "+" : ""}{row.call.oiChgPct.toFixed(2)}%)</span>
//                   </td>
//                   <td style={{ padding: "12px", background: callBg, color: "#f23645" }}>{row.call.oi}</td>
//                   <td style={{ padding: "12px", background: callBg, borderRight: "1px solid #2a2e39" }}>
//                     <span style={getStyle(row.call.ltpChgPct)}>₹{row.call.ltp.toFixed(2)}</span> <span style={getStyle(row.call.ltpChgPct)}>({row.call.ltpChgPct > 0 ? "+" : ""}{row.call.ltpChgPct.toFixed(2)}%)</span>
//                   </td>

//                   {/* STRIKE */}
//                   <td style={{ padding: "12px", fontWeight: "bold", borderRight: "1px solid #2a2e39", background: "#1e222d" }}>
//                     {row.strike}
//                   </td>

//                   {/* PUT SIDE */}
//                   <td style={{ padding: "12px", background: putBg }}>
//                     <span style={getStyle(row.put.ltpChgPct)}>₹{row.put.ltp.toFixed(2)}</span> <span style={getStyle(row.put.ltpChgPct)}>({row.put.ltpChgPct > 0 ? "+" : ""}{row.put.ltpChgPct.toFixed(2)}%)</span>
//                   </td>
//                   <td style={{ padding: "12px", background: putBg, color: "#089981" }}>{row.put.oi}</td>
//                   <td style={{ padding: "12px", background: putBg }}>
//                     {row.put.oiChg} <span style={getStyle(row.put.oiChgPct)}>({row.put.oiChgPct > 0 ? "+" : ""}{row.put.oiChgPct.toFixed(2)}%)</span>
//                   </td>
//                   <td style={{ padding: "12px", background: putBg }}>{row.put.volume}</td>
//                 </tr>
//               );
//             })}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// };

// export default OptionChain;

import React, { useEffect, useState, useRef } from "react";
import socket from "../../services/socket";
import SocketEvents from "../../services/socketEvent";

// Parse base symbol from concatenated names like "NIFTY 19MAY2026 23650 CE" → "NIFTY"
const parseSymbolName = (fullName) => {
  if (!fullName || typeof fullName !== "string") return { base: fullName, hasExpiry: false };
  const match = fullName.match(/^([A-Z-]+)\s?(\d{1,2}[A-Z]{3}\d{2,4})\s?(.*)$/i);
  if (match) {
    return { base: match[1].trim(), expiry: match[2], suffix: match[3].trim(), hasExpiry: true };
  }
  return { base: fullName, hasExpiry: false };
};

const OptionChain = ({ selectedCurrency }) => {
  const [spotPrice, setSpotPrice]   = useState(null);
  const [spotChange, setSpotChange] = useState(null);
  const [atmStrike, setAtmStrike]   = useState(null);
  const [strikes, setStrikes]       = useState([]);
  const [pcr, setPcr]               = useState(null);

  const prevSpotRef    = useRef(null);
  const autoRefreshRef = useRef(true);

  const fullName = selectedCurrency?.name;
  const parsed   = parseSymbolName(fullName);
  const stock    = parsed.base;   // base symbol, e.g. "NIFTY"
  const expiry   = selectedCurrency?.expiry || null;

  const subscribe = () => {
    if (!stock) return;
    const payload = {
      symbol:   stock,
      stock:    stock,  // backward compat
      exchange: selectedCurrency?.segment ?? "NSE",
    };
    if (expiry) payload.expiry = expiry;
    // console.log("[OptionChain] Emitting subscribeOptionChain:", payload);
    socket.emit(SocketEvents.SUBSCRIBE_OPTION_CHAIN, payload);
  };

  useEffect(() => {
    if (!stock) return;

    const handleUpdate = (data) => {
      if (!autoRefreshRef.current) return;
      // console.log("[OptionChain] optionChainUpdate received:", data);

      if (data.spotPrice != null && data.spotPrice !== "") {
        const newSpot = Number(data.spotPrice);
        if (!isNaN(newSpot)) {
          if (prevSpotRef.current != null) {
            setSpotChange(newSpot - Number(prevSpotRef.current));
          }
          prevSpotRef.current = newSpot;
          setSpotPrice(newSpot);
        }
      }

      if (data.atmStrike != null) setAtmStrike(data.atmStrike);

      if (data.chain?.length > 0) {
        setStrikes(data.chain);
        const totalCallOI = data.chain.reduce((sum, row) => sum + (Number(row.ce?.oi) || 0), 0);
        const totalPutOI  = data.chain.reduce((sum, row) => sum + (Number(row.pe?.oi) || 0), 0);
        setPcr(totalCallOI > 0 ? (totalPutOI / totalCallOI).toFixed(2) : null);
      }
    };

    socket.on(SocketEvents.OPTION_CHAIN_UPDATE, handleUpdate);

    if (socket.connected) {
      subscribe();
    } else {
      socket.once("connect", subscribe);
    }

    return () => {
      socket.off(SocketEvents.OPTION_CHAIN_UPDATE, handleUpdate);
      socket.off("connect", subscribe);
      socket.emit("unsubscribeOptionChain", { symbol: stock, stock });
    };
  }, [stock, expiry]);

  // ── Helpers ──
  const getStyle = (val) => {
    const n = Number(val);
    if (n > 0) return { color: "#089981" };
    if (n < 0) return { color: "#f23645" };
    return { color: "#d1d4dc" };
  };

  const fmtLtp = (val) => {
    if (val == null || val === "") return "—";
    const n = Number(val);
    return isNaN(n) ? val : `₹${n.toFixed(2)}`;
  };

  const fmtOI = (val) => {
    if (val == null || val === "") return "—";
    const n = Number(val);
    if (isNaN(n)) return val;
    if (n >= 10000000) return (n / 10000000).toFixed(2) + " Cr";
    if (n >= 100000)   return (n / 100000).toFixed(2) + " L";
    if (n >= 1000)     return (n / 1000).toFixed(1) + "K";
    return n.toString();
  };

  const fmtPct = (val) => {
    if (val == null || val === "") return null;
    const n = Number(val);
    return isNaN(n) ? null : n;
  };

  // Normalize a side object (ce or pe) — handle backend field name variations
  const normalizeSide = (side) => {
    if (!side) return {};
    return {
      ltp:       side.ltp       ?? side.lastPrice   ?? null,
      ltpChgPct: side.ltpChgPct ?? side.pChange     ?? side.ltpChange    ?? null,
      oi:        side.oi        ?? side.openInterest ?? null,
      oiChg:     side.oiChg     ?? side.changeInOI  ?? side.oiChange     ?? null,
      oiChgPct:  side.oiChgPct  ?? side.pChangeinOI ?? side.oiChangePct  ?? null,
      volume:    side.volume    ?? side.totalTradedVolume ?? side.vol     ?? null,
    };
  };

  const spot = spotPrice ?? atmStrike ?? null;

  const renderOiChng = (oiChg, oiChgPct) => {
    const chg = fmtOI(oiChg);
    const pct = fmtPct(oiChgPct);
    if (chg === "—" && pct == null) return "—";
    return (
      <>
        {chg}
        {pct != null && (
          <span style={getStyle(pct)}> ({pct > 0 ? "+" : ""}{pct.toFixed(2)}%)</span>
        )}
      </>
    );
  };

  const renderLtp = (ltp, ltpChgPct) => {
    const pct = fmtPct(ltpChgPct);
    return (
      <>
        <span style={getStyle(pct ?? 0)}>{fmtLtp(ltp)}</span>
        {pct != null && (
          <span style={{ ...getStyle(pct), fontSize: 11, marginLeft: 4 }}>
            ({pct > 0 ? "+" : ""}{pct.toFixed(2)}%)
          </span>
        )}
      </>
    );
  };

  return (
    <div className="w-100 h-100 p-3" style={{ background: "#131722", color: "#d1d4dc", overflowY: "auto" }}>
      <h5 className="mb-3">
        {selectedCurrency?.name || "NIFTY"} Option Chain
        {spotPrice != null && (
          <span style={{ fontSize: 13, fontWeight: 400, marginLeft: 12, color: spotChange == null ? "#d1d4dc" : spotChange >= 0 ? "#089981" : "#f23645" }}>
            ₹{Number(spotPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            {spotChange != null && ` (${spotChange >= 0 ? "+" : ""}${spotChange.toFixed(2)})`}
            {pcr != null && <span style={{ color: "#787b86", marginLeft: 10 }}>PCR: {pcr}</span>}
          </span>
        )}
      </h5>

      <div style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid #2a2e39" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "center" }}>
          <thead>
            <tr style={{ background: "#1e222d", borderBottom: "1px solid #2a2e39" }}>
              <th colSpan="4" style={{ padding: "12px", borderRight: "1px solid #2a2e39", color: "#d1d4dc" }}>CALL</th>
              <th style={{ padding: "12px", borderRight: "1px solid #2a2e39", color: "#d1d4dc" }}>Strike</th>
              <th colSpan="4" style={{ padding: "12px", color: "#d1d4dc" }}>PUT</th>
            </tr>
            <tr style={{ background: "#1e222d", borderBottom: "1px solid #2a2e39", color: "#787b86", fontSize: "12px" }}>
              <th style={{ padding: "10px" }}>Volume</th>
              <th style={{ padding: "10px" }}>OI Chng (Chng%)</th>
              <th style={{ padding: "10px" }}>OI</th>
              <th style={{ padding: "10px", borderRight: "1px solid #2a2e39" }}>LTP (Chng%)</th>
              <th style={{ padding: "10px", borderRight: "1px solid #2a2e39" }}>Strike</th>
              <th style={{ padding: "10px" }}>LTP (Chng%)</th>
              <th style={{ padding: "10px" }}>OI</th>
              <th style={{ padding: "10px" }}>OI Chng (Chng%)</th>
              <th style={{ padding: "10px" }}>Volume</th>
            </tr>
          </thead>
          <tbody>
            {strikes.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: 32, color: "#787b86", fontSize: 13 }}>
                  Waiting for option chain data…
                </td>
              </tr>
            ) : (
              strikes.map((row, i) => {
                const strike    = Number(row.strike);
                const isATM     = strike === Number(atmStrike);
                const isCallItm = spot != null && strike < spot;
                const isPutItm  = spot != null && strike > spot;
                const callBg    = isCallItm ? "rgba(255,235,59,0.05)" : "transparent";
                const putBg     = isPutItm  ? "rgba(255,235,59,0.05)" : "transparent";

                const ce = normalizeSide(row.ce ?? row.call);
                const pe = normalizeSide(row.pe ?? row.put);

                if (isATM) {
                  return (
                    <React.Fragment key={`atm-${strike}`}>
                      {/* ATM spot price row */}
                      <tr style={{ background: "rgba(8,153,129,0.1)", borderTop: "2px solid #089981", borderBottom: "2px solid #089981" }}>
                        <td colSpan="4" style={{ borderRight: "1px solid #2a2e39" }} />
                        <td style={{ padding: "6px", fontWeight: "bold", borderRight: "1px solid #2a2e39", color: "#089981" }}>
                          <span style={{ background: "#089981", color: "#fff", padding: "2px 8px", borderRadius: "4px" }}>
                            {spot != null ? Number(spot).toFixed(2) : strike}
                          </span>
                        </td>
                        <td colSpan="4" />
                      </tr>
                      {/* ATM strike data row */}
                      <tr style={{ borderBottom: "1px solid #2a2e39", background: "rgba(8,153,129,0.04)" }}>
                        <td style={{ padding: "12px", background: callBg }}>{fmtOI(ce.volume)}</td>
                        <td style={{ padding: "12px", background: callBg }}>{renderOiChng(ce.oiChg, ce.oiChgPct)}</td>
                        <td style={{ padding: "12px", background: callBg, color: "#f23645" }}>{fmtOI(ce.oi)}</td>
                        <td style={{ padding: "12px", background: callBg, borderRight: "1px solid #2a2e39" }}>{renderLtp(ce.ltp, ce.ltpChgPct)}</td>
                        <td style={{ padding: "12px", fontWeight: "bold", borderRight: "1px solid #2a2e39", background: "#1e222d", color: "#089981" }}>{strike.toLocaleString("en-IN")}</td>
                        <td style={{ padding: "12px", background: putBg }}>{renderLtp(pe.ltp, pe.ltpChgPct)}</td>
                        <td style={{ padding: "12px", background: putBg, color: "#089981" }}>{fmtOI(pe.oi)}</td>
                        <td style={{ padding: "12px", background: putBg }}>{renderOiChng(pe.oiChg, pe.oiChgPct)}</td>
                        <td style={{ padding: "12px", background: putBg }}>{fmtOI(pe.volume)}</td>
                      </tr>
                    </React.Fragment>
                  );
                }

                return (
                  <tr key={`${strike}-${i}`} style={{ borderBottom: "1px solid #2a2e39" }}>
                    {/* CALL SIDE */}
                    <td style={{ padding: "12px", background: callBg }}>{fmtOI(ce.volume)}</td>
                    <td style={{ padding: "12px", background: callBg }}>{renderOiChng(ce.oiChg, ce.oiChgPct)}</td>
                    <td style={{ padding: "12px", background: callBg, color: "#f23645" }}>{fmtOI(ce.oi)}</td>
                    <td style={{ padding: "12px", background: callBg, borderRight: "1px solid #2a2e39" }}>{renderLtp(ce.ltp, ce.ltpChgPct)}</td>

                    {/* STRIKE */}
                    <td style={{ padding: "12px", fontWeight: "bold", borderRight: "1px solid #2a2e39", background: "#1e222d" }}>
                      {strike.toLocaleString("en-IN")}
                    </td>

                    {/* PUT SIDE */}
                    <td style={{ padding: "12px", background: putBg }}>{renderLtp(pe.ltp, pe.ltpChgPct)}</td>
                    <td style={{ padding: "12px", background: putBg, color: "#089981" }}>{fmtOI(pe.oi)}</td>
                    <td style={{ padding: "12px", background: putBg }}>{renderOiChng(pe.oiChg, pe.oiChgPct)}</td>
                    <td style={{ padding: "12px", background: putBg }}>{fmtOI(pe.volume)}</td>
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

export default OptionChain;