import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import {
  OPTION_CHAIN_BASE_URL,
  SOCKET_URL,
} from "../../services/websocket/socket";

const OptionChain = ({ onSymbolChange }) => {
  const navigate = useNavigate();

  // ── Dropdown state ──
  const [liveContractsList, setLiveContractsList] = useState([]);
  const [metadata, setMetadata] = useState({});
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [selectedContract, setSelectedContract] = useState(null);
  const [expiriesList, setExpiriesList] = useState([]);
  const [activeExpiry, setActiveExpiry] = useState("");
  const [symbolSearch, setSymbolSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // ── Chart state ──
  const [spotPrice, setSpotPrice] = useState(null);
  const [spotChange, setSpotChange] = useState(null);
  const [atmStrike, setAtmStrike] = useState(null);
  const [strikes, setStrikes] = useState([]);
  const [pcr, setPcr] = useState(null);
  const prevSpotRef = useRef(null);
  const autoRefreshRef = useRef(true);

  // ── Hover state ──
  const [hoveredCell, setHoveredCell] = useState(null);
  const [hoveredRow, setHoveredRow] = useState(null);

  // ── Socket ──
  const [localSocket, setLocalSocket] = useState(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch metadata from REST API
  useEffect(() => {
    const metadataUrl = import.meta.env.VITE_METADATA_API_URL || "http://192.168.1.6:3000";
    axios
      .get(`${metadataUrl}/api/historical-metadata`)
      .then((res) => {
        const data = res.data;
        console.log("[OptionChain] historical-metadata response:", data);
        if (data.success) {
          setMetadata(data.metadata || {});
          // Default selection is now handled by live-options-list
        }
      })
      .catch((err) =>
        console.error("[OptionChain] Failed to fetch metadata:", err),
      );
  }, []);

  // When symbol changes, update expiries from metadata
  useEffect(() => {
    if (!selectedSymbol || !metadata[selectedSymbol]) return;
    const expiries = metadata[selectedSymbol]?.expiries || [];
    setExpiriesList(expiries);

    // Only set a default expiry if the current active expiry isn't valid for this symbol
    setActiveExpiry((current) => {
      if (!current) return expiries[0] || "";
      const normalizeExp = (e) => (e || "").replace(/\s+/g, "").toLowerCase();
      const match = expiries.find(
        (e) => normalizeExp(e) === normalizeExp(current),
      );
      if (match) return match;
      return expiries[0] || "";
    });

    // Reset chain on symbol change
    setStrikes([]);
    setSpotPrice(null);
    setAtmStrike(null);

    // Notify parent of symbol change
    if (onSymbolChange) {
      onSymbolChange(selectedSymbol);
    }
  }, [selectedSymbol, metadata, onSymbolChange]);

  // Socket setup (one persistent connection)
  useEffect(() => {
    const s = io(SOCKET_URL);
    setLocalSocket(s);
    s.on("connect", () => console.log("[OptionChain] Socket connected"));
    s.on("disconnect", () => console.log("[OptionChain] Socket disconnected"));

    // Listen for live-options-list to update symbol dropdown
    s.on("live-options-list", (response) => {
      // console.log("[OptionChain] live-options-list received:", response);
      if (Array.isArray(response?.data) && response.data.length > 0) {
        setLiveContractsList((prev) => {
          if (prev.length === 0) return response.data;

          // Merge new ticks into the existing list so the dropdown never empties
          const mergedMap = new Map(
            prev.map((c) => [
              `${c.symbol}-${c.expiry ?? c.expiry_date}-${c.strike ?? c.strike_price}-${c.option_type}`,
              c,
            ]),
          );

          response.data.forEach((c) => {
            const key = `${c.symbol}-${c.expiry ?? c.expiry_date}-${c.strike ?? c.strike_price}-${c.option_type}`;
            mergedMap.set(key, { ...mergedMap.get(key), ...c });
          });

          return Array.from(mergedMap.values());
        });

        // Auto-select first contract if none is selected
        setSelectedContract((prev) => {
          if (!prev) {
            const first = response.data[0];
            setSelectedSymbol(first.symbol);
            setActiveExpiry(first.expiry ?? first.expiry_date);
            setSymbolSearch(first.symbol);
            return first;
          }
          return prev;
        });
      }
    });

    return () => {
      s.disconnect();
    };
  }, []);

  // Subscribe to option-chain-data when symbol/expiry changes
  useEffect(() => {
    if (!localSocket || !selectedSymbol || !activeExpiry) return;

    const subscribe = () => {
      const payload = { symbol: selectedSymbol, expiry_date: activeExpiry };
      console.log("[OptionChain] set-filters:", payload);
      localSocket.emit("set-filters", payload);
    };

    const handleUpdate = (response) => {
      if (!autoRefreshRef.current) return;
      // console.log("[OptionChain] option-chain-data received:", response);

      if (
        response?.symbol &&
        response.symbol !== selectedSymbol &&
        response.symbol !== "ALL"
      )
        return;

      let chainData = response?.data || response?.chain || [];

      // If backend sends 'ALL' broadcast, filter locally
      if (response?.symbol === "ALL") {
        const normalize = (s) => (s || "").replace(/\s+/g, "").toLowerCase();
        chainData = chainData.filter((item) => {
          const itemSym = item.symbol || item.name;
          const itemExp = item.expiry_date || item.expiry;
          return (
            normalize(itemSym) === normalize(selectedSymbol) &&
            normalize(itemExp) === normalize(activeExpiry)
          );
        });
      }

      if (response?.spotPrice != null && response.spotPrice !== "") {
        const newSpot = Number(response.spotPrice);
        if (!isNaN(newSpot)) {
          if (prevSpotRef.current != null) {
            setSpotChange(newSpot - Number(prevSpotRef.current));
          }
          prevSpotRef.current = newSpot;
          setSpotPrice(newSpot);
        }
      }
      if (response?.atmStrike != null) setAtmStrike(response.atmStrike);

      if (chainData.length > 0) {
        let finalStrikes = chainData;

        // Group flat array (strike_price + option_type format)
        if (
          chainData[0]?.strike_price !== undefined &&
          chainData[0]?.option_type !== undefined
        ) {
          const chainMap = {};
          let newAtmSpot = null;
          chainData.forEach((item) => {
            const strike = Number(item.strike_price);
            if (!chainMap[strike])
              chainMap[strike] = { strike, ce: null, pe: null };
            if (item.option_type === "CE") chainMap[strike].ce = item;
            else if (item.option_type === "PE") chainMap[strike].pe = item;
            if (item.spot_price) newAtmSpot = Number(item.spot_price);
          });
          finalStrikes = Object.values(chainMap).sort(
            (a, b) => a.strike - b.strike,
          );
          if (newAtmSpot) {
            setSpotPrice(newAtmSpot);
            let closest = null,
              minDiff = Infinity;
            finalStrikes.forEach((s) => {
              const diff = Math.abs(s.strike - newAtmSpot);
              if (diff < minDiff) {
                minDiff = diff;
                closest = s.strike;
              }
            });
            if (closest) setAtmStrike(closest);
          }
        }

        setStrikes(finalStrikes);
        const totalCallOI = finalStrikes.reduce(
          (sum, row) => sum + (Number(row.ce?.oi || row.call?.oi) || 0),
          0,
        );
        const totalPutOI = finalStrikes.reduce(
          (sum, row) => sum + (Number(row.pe?.oi || row.put?.oi) || 0),
          0,
        );
        setPcr(totalCallOI > 0 ? (totalPutOI / totalCallOI).toFixed(2) : null);
      }
    };

    localSocket.on("option-chain-data", handleUpdate);
    if (localSocket.connected) subscribe();
    else localSocket.once("connect", subscribe);

    return () => {
      localSocket.off("option-chain-data", handleUpdate);
      localSocket.off("connect", subscribe);
    };
  }, [localSocket, selectedSymbol, activeExpiry]);

  // ── Helpers ──
  const getStyle = (val) => {
    const n = Number(val);
    if (n > 0) return { color: "var(--success-color)" };
    if (n < 0) return { color: "var(--danger-color)" };
    return { color: "var(--text-primary)" };
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
    if (n >= 10000000) return (n / 10000000).toFixed(2) + "Cr";
    if (n >= 100000) return (n / 100000).toFixed(2) + "L";
    if (n >= 1000) return (n / 1000).toFixed(2) + "K";
    return n.toFixed(2);
  };

  const fmtPct = (val) => {
    if (val == null || val === "") return null;
    const n = Number(val);
    return isNaN(n) ? null : n;
  };

  const fmtGreeks = (val) => {
    if (val == null || val === "") return "—";
    const n = Number(val);
    return isNaN(n) ? val : n.toFixed(4);
  };

  const fmtIV = (val) => {
    if (val == null || val === "") return "—";
    const n = Number(val);
    return isNaN(n) ? val : n.toFixed(2);
  };

  const normalizeSide = (side) => {
    if (!side) return {};
    return {
      ltp: side.ltp ?? side.lastPrice ?? null,
      ltpChgPct: side.ltpChgPct ?? side.pChange ?? side.ltpChange ?? null,
      oi: side.oi ?? side.openInterest ?? null,
      oiChg:
        side.oiChg ??
        side.changeInOI ??
        side.oiChange ??
        side.oi_change ??
        null,
      oiChgPct: side.oiChgPct ?? side.pChangeinOI ?? side.oiChangePct ?? null,
      volume: side.volume ?? side.totalTradedVolume ?? side.vol ?? null,
      iv: side.iv ?? side.impliedVolatility ?? null,
      delta: side.delta ?? null,
      gamma: side.gamma ?? null,
      theta: side.theta ?? null,
      vega: side.vega ?? null,
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
          <span style={getStyle(pct)}>
            {" "}
            ({pct > 0 ? "+" : ""}
            {pct.toFixed(2)}%)
          </span>
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
            ({pct > 0 ? "+" : ""}
            {pct.toFixed(2)}%)
          </span>
        )}
      </>
    );
  };

  // const handleTrade = (strike, optionType, action, price) => {
  //   const stockName = `${selectedSymbol} ${activeExpiry} ${strike} ${optionType}`;
  //   navigate("/dashboard", {
  //     state: {
  //       stock: stockName,
  //       expiry: activeExpiry,
  //       action: action,
  //       price: price,
  //     },
  //   });
  // };

  const handleTrade = (strike, optionType, action, price) => {
    const stockName = `${selectedSymbol} ${activeExpiry} ${strike} ${optionType}`;
    const state = {
      stock: stockName,
      expiry: activeExpiry,
      action: action,
      price: price,
    };

    // Encode state in sessionStorage so the new tab can read it
    const key = `trade_${Date.now()}`;
    sessionStorage.setItem(key, JSON.stringify(state));

    window.open(`/dashboard?tradeKey=${key}`, "_blank");
  };

  const filteredContracts = liveContractsList.filter((c) => {
    const search = (symbolSearch || "").toLowerCase();
    const sym = (c.symbol || "").toLowerCase();
    const str = (c.strike ?? c.strike_price ?? "").toString();
    const exp = (c.expiry ?? c.expiry_date ?? "").toLowerCase();

    return sym.includes(search) || str.includes(search) || exp.includes(search);
  });

  // ── Render ──
  return (
    <div
      className="w-100 h-100 p-3"
      style={{
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
        overflowY: "auto",
      }}
    >
      {/* ── Header Controls ── */}
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        {/* Symbol Dropdown */}
        <div ref={dropdownRef} style={{ position: "relative", minWidth: 300 }}>
          <div
            onClick={() => {
              if (!dropdownOpen) {
                setSymbolSearch(""); // Clear search when opening
                setDropdownOpen(true);
              } else {
                setDropdownOpen(false);
              }
            }}
            style={{
              padding: "6px 12px",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              borderRadius: 6,
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
              minWidth: 140,
            }}
          >
            {selectedContract ? (
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                  {selectedContract.symbol}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    background: "var(--border-color)",
                    color: "var(--text-primary)",
                    padding: "2px 6px",
                    borderRadius: 4,
                  }}
                >
                  {selectedContract.exchange ?? "NSE FO"}
                </span>
                <span style={{ color: "#363a45" }}>|</span>
                <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                  {selectedContract.expiry} {selectedContract.strike}{" "}
                  {selectedContract.option_type}
                </span>
                <span
                  style={{
                    color:
                      (selectedContract?.change_percentage ?? 0) >= 0
                        ? "var(--success-color)"
                        : "var(--danger-color)",
                    fontWeight: 600,
                  }}
                >
                  {selectedContract?.ltp ?? 0}{" "}
                  {(selectedContract?.change_percentage ?? 0) >= 0 ? "▲" : "▼"}{" "}
                  <span style={{ fontSize: 11, fontWeight: 500 }}>
                    {(selectedContract?.change_percentage ?? 0) >= 0 ? "+" : ""}
                    {Number(selectedContract?.change_percentage ?? 0).toFixed(
                      2,
                    )}
                    %
                  </span>
                </span>
              </div>
            ) : (
              <span>{selectedSymbol || "Select Symbol"}</span>
            )}
            <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>
              {dropdownOpen ? "▲" : "▼"}
            </span>
          </div>
          {dropdownOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-color)",
                borderRadius: 6,
                zIndex: 100,
                minWidth: 400,
                boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "6px 8px",
                  borderBottom: "1px solid var(--border-color)",
                }}
              >
                <input
                  autoFocus
                  value={symbolSearch}
                  onChange={(e) => setSymbolSearch(e.target.value)}
                  placeholder="Search symbol..."
                  style={{
                    width: "100%",
                    background: "var(--bg-primary)",
                    border: "1px solid var(--border-color)",
                    borderRadius: 4,
                    padding: "4px 8px",
                    fontSize: 12,
                    color: "var(--text-primary)",
                    outline: "none",
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div style={{ maxHeight: 220, overflowY: "auto" }}>
                {filteredContracts.length === 0 ? (
                  <div
                    style={{
                      padding: "10px 12px",
                      color: "var(--text-secondary)",
                      fontSize: 12,
                    }}
                  >
                    {liveContractsList.length === 0
                      ? "Waiting for live options list..."
                      : "No contracts found"}
                  </div>
                ) : (
                  filteredContracts.map((contract, idx) => {
                    const change =
                      contract.change_absolute ??
                      contract.change ??
                      contract.netChange ??
                      0;
                    const pChange =
                      contract.change_percentage ??
                      contract.pChange ??
                      contract.change_percent ??
                      0;
                    const isPos = pChange >= 0;
                    const color = isPos
                      ? "var(--success-color)"
                      : "var(--danger-color)";
                    const exchange = contract.exchange ?? "NFO";
                    const expDate = contract.expiry ?? contract.expiry_date;
                    const strikePrice =
                      contract.strike ?? contract.strike_price;

                    return (
                      <div
                        key={`${contract.symbol}-${expDate}-${strikePrice}-${contract.option_type}-${idx}`}
                        onClick={() => {
                          setSelectedSymbol(contract.symbol);
                          setActiveExpiry(expDate);
                          setSelectedContract(contract);
                          setSymbolSearch(contract.symbol);
                          setDropdownOpen(false);
                        }}
                        style={{
                          padding: "8px 12px",
                          borderBottom: "1px solid var(--border-color)",
                          cursor: "pointer",
                          background:
                            selectedSymbol === contract.symbol
                              ? "rgba(8,153,129,0.2)"
                              : "transparent",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background =
                            "rgba(255,255,255,0.05)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background =
                            selectedSymbol === contract.symbol
                              ? "rgba(8,153,129,0.2)"
                              : "transparent";
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: 4,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <span
                              style={{
                                fontWeight: 600,
                                color: "var(--text-primary)",
                              }}
                            >
                              {contract.symbol}
                            </span>
                            <span
                              style={{
                                fontSize: 9,
                                background: "var(--accent-color)",
                                color: "#fff",
                                padding: "1px 4px",
                                borderRadius: 4,
                              }}
                            >
                              {exchange}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color }}>
                            {change > 0 ? "+" : ""}
                            {Number(change).toFixed(2)} ({isPos ? "+" : ""}
                            {Number(pChange).toFixed(2)}%)
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            fontSize: 11,
                            color: "var(--text-secondary)",
                          }}
                        >
                          <span>
                            Exp:{" "}
                            <b style={{ color: "var(--text-primary)" }}>
                              {expDate}
                            </b>
                          </span>
                          <span>
                            Strike:{" "}
                            <b style={{ color: "var(--text-primary)" }}>
                              {strikePrice}
                            </b>
                          </span>
                          <span
                            style={{
                              color:
                                contract.option_type === "CE"
                                  ? "var(--success-color)"
                                  : "var(--danger-color)",
                              fontWeight: 600,
                            }}
                          >
                            {contract.option_type}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Spot Price */}
        {spotPrice != null && (
          <span
            style={{
              fontSize: 15,
              fontWeight: 700,
              color:
                spotChange == null
                  ? "var(--text-primary)"
                  : spotChange >= 0
                    ? "var(--success-color)"
                    : "var(--danger-color)",
            }}
          >
            ₹
            {Number(spotPrice).toLocaleString("en-IN", {
              minimumFractionDigits: 2,
            })}
            {spotChange != null && (
              <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 4 }}>
                ({spotChange >= 0 ? "+" : ""}
                {spotChange.toFixed(2)})
              </span>
            )}
          </span>
        )}

        {pcr != null && (
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            PCR: <b style={{ color: "var(--text-primary)" }}>{pcr}</b>
          </span>
        )}

        {/* Expiry Pills */}
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            marginLeft: "auto",
          }}
        >
          {expiriesList.map((exp) => (
            <button
              key={exp}
              onClick={() => setActiveExpiry(exp)}
              style={{
                padding: "4px 10px",
                borderRadius: 4,
                border: "1px solid var(--border-color)",
                background:
                  activeExpiry === exp
                    ? "var(--success-color)"
                    : "var(--bg-secondary)",
                color: activeExpiry === exp ? "#fff" : "var(--text-primary)",
                fontSize: 11,
                cursor: "pointer",
                fontWeight: activeExpiry === exp ? 600 : 400,
              }}
            >
              {exp}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div
        style={{
          borderRadius: 8,
          overflowX: "auto",
          overflowY: "hidden",
          border: "1px solid var(--border-color)",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13,
            textAlign: "center",
            minWidth: 1000,
          }}
        >
          <thead>
            <tr
              style={{
                background: "var(--bg-secondary)",
                borderBottom: "1px solid var(--border-color)",
              }}
            >
              <th
                colSpan="9"
                style={{
                  padding: "12px",
                  borderRight: "1px solid var(--border-color)",
                  color: "var(--success-color)",
                }}
              >
                CALL
              </th>
              <th
                style={{
                  padding: "12px",
                  borderRight: "1px solid var(--border-color)",
                  color: "var(--text-primary)",
                }}
              >
                Strike
              </th>
              <th
                colSpan="9"
                style={{ padding: "12px", color: "var(--danger-color)" }}
              >
                PUT
              </th>
            </tr>
            <tr
              style={{
                background: "var(--bg-secondary)",
                borderBottom: "1px solid var(--border-color)",
                color: "var(--text-secondary)",
                fontSize: 11,
              }}
            >
              <th style={{ padding: "8px" }}>Vega</th>
              <th style={{ padding: "8px" }}>Theta</th>
              <th style={{ padding: "8px" }}>Gamma</th>
              <th style={{ padding: "8px" }}>Delta</th>
              <th style={{ padding: "8px" }}>IV</th>
              <th style={{ padding: "8px" }}>Volume</th>
              <th style={{ padding: "8px" }}>OI Chng</th>
              <th style={{ padding: "8px" }}>OI</th>
              <th
                style={{
                  padding: "8px",
                  borderRight: "1px solid var(--border-color)",
                }}
              >
                LTP
              </th>
              <th
                style={{
                  padding: "8px",
                  borderRight: "1px solid var(--border-color)",
                }}
              >
                Strike
              </th>
              <th style={{ padding: "8px" }}>LTP</th>
              <th style={{ padding: "8px" }}>OI</th>
              <th style={{ padding: "8px" }}>OI Chng</th>
              <th style={{ padding: "8px" }}>Volume</th>
              <th style={{ padding: "8px" }}>IV</th>
              <th style={{ padding: "8px" }}>Delta</th>
              <th style={{ padding: "8px" }}>Gamma</th>
              <th style={{ padding: "8px" }}>Theta</th>
              <th style={{ padding: "8px" }}>Vega</th>
            </tr>
          </thead>
          <tbody>
            {strikes.length === 0 ? (
              <tr>
                <td
                  colSpan={19}
                  style={{
                    padding: 40,
                    color: "var(--text-secondary)",
                    fontSize: 13,
                  }}
                >
                  {selectedSymbol
                    ? `Waiting for option chain data for ${selectedSymbol}…`
                    : "Select a symbol to view option chain"}
                </td>
              </tr>
            ) : (
              strikes.map((row, i) => {
                const strike = Number(row.strike);
                const prevStrike =
                  i > 0 ? Number(strikes[i - 1].strike) : -Infinity;
                const isCallItm = spot != null && strike < spot;
                const isPutItm = spot != null && strike > spot;
                let callBg = isCallItm
                  ? "rgba(255,235,59,0.05)"
                  : "transparent";
                let putBg = isPutItm ? "rgba(255,235,59,0.05)" : "transparent";
                if (hoveredRow === strike) {
                  callBg = isCallItm
                    ? "rgba(255,235,59,0.12)"
                    : "rgba(255,255,255,0.07)";
                  putBg = isPutItm
                    ? "rgba(255,235,59,0.12)"
                    : "rgba(255,255,255,0.07)";
                }

                const ceProps = {
                  onMouseEnter: () => {
                    setHoveredCell(`${strike}-CE`);
                    setHoveredRow(strike);
                  },
                  onMouseLeave: () => {
                    setHoveredCell(null);
                    setHoveredRow(null);
                  },
                };
                const peProps = {
                  onMouseEnter: () => {
                    setHoveredCell(`${strike}-PE`);
                    setHoveredRow(strike);
                  },
                  onMouseLeave: () => {
                    setHoveredCell(null);
                    setHoveredRow(null);
                  },
                };

                const ce = normalizeSide(row.ce ?? row.call);
                const pe = normalizeSide(row.pe ?? row.put);

                const BsButtons = ({ optType, ltp }) => (
                  <div
                    style={{
                      position: "absolute",
                      right: optType === "CE" ? "4px" : undefined,
                      left: optType === "PE" ? "4px" : undefined,
                      top: "50%",
                      transform: "translateY(-50%)",
                      display: "flex",
                      gap: "4px",
                      background: "var(--bg-secondary)",
                      padding: "4px",
                      borderRadius: "4px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.6)",
                      zIndex: 10,
                    }}
                  >
                    <button
                      onClick={() => handleTrade(strike, optType, "BUY", ltp)}
                      style={{
                        background: "#45c4aa",
                        color: "var(--bg-primary)",
                        fontWeight: "700",
                        border: "none",
                        padding: "2px 7px",
                        borderRadius: "3px",
                        fontSize: "11px",
                        cursor: "pointer",
                      }}
                    >
                      B
                    </button>
                    <button
                      onClick={() => handleTrade(strike, optType, "SELL", ltp)}
                      style={{
                        background: "#ff646d",
                        color: "var(--bg-primary)",
                        fontWeight: "700",
                        border: "none",
                        padding: "2px 7px",
                        borderRadius: "3px",
                        fontSize: "11px",
                        cursor: "pointer",
                      }}
                    >
                      S
                    </button>
                  </div>
                );

                const strikeCell = (
                  <td
                    onMouseEnter={() => setHoveredRow(strike)}
                    onMouseLeave={() => setHoveredRow(null)}
                    style={{
                      padding: "10px",
                      fontWeight: "bold",
                      borderRight: "1px solid var(--border-color)",
                      background: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {strike.toLocaleString("en-IN")}
                  </td>
                );

                const showSpotLine =
                  spot != null && spot > prevStrike && spot <= strike;
                const showSpotLineAtEnd =
                  i === strikes.length - 1 && spot != null && spot > strike;
                const spotLineColor =
                  spotChange >= 0
                    ? "var(--success-color)"
                    : "var(--danger-color)";
                const spotLineBg =
                  spotChange >= 0
                    ? "rgba(8,153,129,0.1)"
                    : "rgba(242,54,69,0.1)";

                const renderSpotDivider = (keySuffix) => (
                  <tr key={`spot-divider-${strike}-${keySuffix}`}>
                    <td
                      colSpan="19"
                      style={{
                        padding: 0,
                        position: "relative",
                        height: "30px",
                        verticalAlign: "middle",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          right: 0,
                          top: "50%",
                          height: "2px",
                          background: spotLineColor,
                          zIndex: 1,
                        }}
                      ></div>
                      <div
                        style={{
                          position: "relative",
                          zIndex: 2,
                          display: "inline-block",
                          background: "var(--bg-primary)",
                          color: spotLineColor,
                          border: `1px solid ${spotLineColor}`,
                          padding: "2px 10px",
                          borderRadius: "6px",
                          fontSize: 13,
                          fontWeight: "bold",
                        }}
                      >
                        <span
                          style={{
                            background: spotLineBg,
                            position: "absolute",
                            inset: 0,
                            borderRadius: "6px",
                          }}
                        ></span>
                        <span style={{ position: "relative", zIndex: 1 }}>
                          {Number(spot).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </td>
                  </tr>
                );

                return (
                  <React.Fragment key={`${strike}-${i}`}>
                    {showSpotLine && renderSpotDivider("before")}
                    <tr
                      style={{
                        borderBottom: "1px solid var(--border-color)",
                      }}
                    >
                      {/* CALL SIDE */}
                      <td
                        {...ceProps}
                        style={{ padding: "10px", background: callBg }}
                      >
                        {fmtGreeks(ce.vega)}
                      </td>
                      <td
                        {...ceProps}
                        style={{ padding: "10px", background: callBg }}
                      >
                        {fmtGreeks(ce.theta)}
                      </td>
                      <td
                        {...ceProps}
                        style={{ padding: "10px", background: callBg }}
                      >
                        {fmtGreeks(ce.gamma)}
                      </td>
                      <td
                        {...ceProps}
                        style={{ padding: "10px", background: callBg }}
                      >
                        {fmtGreeks(ce.delta)}
                      </td>
                      <td
                        {...ceProps}
                        style={{ padding: "10px", background: callBg }}
                      >
                        {fmtIV(ce.iv)}
                      </td>
                      <td
                        {...ceProps}
                        style={{
                          padding: "10px",
                          background: callBg,
                          whiteSpace: "nowrap",
                          minWidth: "70px",
                        }}
                      >
                        {fmtOI(ce.volume)}
                      </td>
                      <td
                        {...ceProps}
                        style={{
                          padding: "10px",
                          background: callBg,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {renderOiChng(ce.oiChg, ce.oiChgPct)}
                      </td>
                      <td
                        {...ceProps}
                        style={{
                          padding: "10px",
                          background: callBg,
                          color: "var(--danger-color)",
                          whiteSpace: "nowrap",
                          minWidth: "70px",
                        }}
                      >
                        {fmtOI(ce.oi)}
                      </td>
                      <td
                        {...ceProps}
                        style={{
                          padding: "10px",
                          background: callBg,
                          borderRight: "1px solid var(--border-color)",
                          position: "relative",
                        }}
                      >
                        {renderLtp(ce.ltp, ce.ltpChgPct)}
                        {hoveredCell === `${strike}-CE` && (
                          <BsButtons optType="CE" ltp={ce.ltp} />
                        )}
                      </td>

                      {/* STRIKE */}
                      {strikeCell}

                      {/* PUT SIDE */}
                      <td
                        {...peProps}
                        style={{
                          padding: "10px",
                          background: putBg,
                          position: "relative",
                        }}
                      >
                        {renderLtp(pe.ltp, pe.ltpChgPct)}
                        {hoveredCell === `${strike}-PE` && (
                          <BsButtons optType="PE" ltp={pe.ltp} />
                        )}
                      </td>
                      <td
                        {...peProps}
                        style={{
                          padding: "10px",
                          background: putBg,
                          color: "var(--success-color)",
                          whiteSpace: "nowrap",
                          minWidth: "70px",
                        }}
                      >
                        {fmtOI(pe.oi)}
                      </td>
                      <td
                        {...peProps}
                        style={{
                          padding: "10px",
                          background: putBg,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {renderOiChng(pe.oiChg, pe.oiChgPct)}
                      </td>
                      <td
                        {...peProps}
                        style={{
                          padding: "10px",
                          background: putBg,
                          whiteSpace: "nowrap",
                          minWidth: "70px",
                        }}
                      >
                        {fmtOI(pe.volume)}
                      </td>
                      <td
                        {...peProps}
                        style={{ padding: "10px", background: putBg }}
                      >
                        {fmtIV(pe.iv)}
                      </td>
                      <td
                        {...peProps}
                        style={{ padding: "10px", background: putBg }}
                      >
                        {fmtGreeks(pe.delta)}
                      </td>
                      <td
                        {...peProps}
                        style={{ padding: "10px", background: putBg }}
                      >
                        {fmtGreeks(pe.gamma)}
                      </td>
                      <td
                        {...peProps}
                        style={{ padding: "10px", background: putBg }}
                      >
                        {fmtGreeks(pe.theta)}
                      </td>
                      <td
                        {...peProps}
                        style={{ padding: "10px", background: putBg }}
                      >
                        {fmtGreeks(pe.vega)}
                      </td>
                    </tr>
                    {showSpotLineAtEnd && renderSpotDivider("after")}
                  </React.Fragment>
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
