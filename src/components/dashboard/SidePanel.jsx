import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import socket from "../../services/websocket/socket";

const SidePanel = ({ stock, expiry }) => {
  const [spotPrice, setSpotPrice] = useState(null);
  const [spotChange, setSpotChange] = useState(null);
  const [pcr, setPcr] = useState(null);
  const [strikes, setStrikes] = useState([]);
  const [atmStrike, setAtmStrike] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const autoRefreshRef = useRef(true);
  const prevSpotRef = useRef(null);

  // ── Socket state ──
  const [localSocket, setLocalSocket] = useState(null);

  // Initialize socket
  useEffect(() => {
    setLocalSocket(socket);

    const onConnect = () => console.log("[SidePanel] Data socket connected");
    const onDisconnect = () =>
      console.log("[SidePanel] Data socket disconnected");

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      // Removed socket.disconnect() so we don't kill the shared connection
    };
  }, []);

  const parseSymbolName = (fullName) => {
    if (!fullName || typeof fullName !== "string")
      return { base: fullName, hasExpiry: false };
    const match = fullName.match(
      /^([A-Z-]+)\s?(\d{1,2}[A-Z]{3}\d{2,4})\s?(.*)$/i,
    );
    if (match) {
      return {
        base: match[1].trim(),
        expiry: match[2],
        suffix: match[3].trim(),
        hasExpiry: true,
      };
    }
    return { base: fullName, hasExpiry: false };
  };

  useEffect(() => {
    autoRefreshRef.current = autoRefresh;
  }, [autoRefresh]);

  console.log("stock", stock);
  const subscribe = () => {
    if (!localSocket || !stock || !expiry) return;
    const fullName = stock?.name ?? stock;
    const symbol = parseSymbolName(fullName).base;
    if (!symbol) return;

    const filtersPayload = { symbol, expiry_date: expiry };
    console.log("[SidePanel] Emitting set-filters:", filtersPayload);
    localSocket.emit("set-filters", filtersPayload);
  };

  useEffect(() => {
    if (!localSocket) return;

    console.log(
      "[SidePanel] useEffect mounted. localSocket.connected:",
      localSocket.connected,
    );

    // Debug all incoming events on this socket
    const catchAll = (event, ...args) => {
      // console.log(`[SidePanel] Socket event received: ${event}`);
    };
    localSocket.onAny(catchAll);
    const handleUpdate = (data) => {
      console.log("[SidePanel] option-chain-data received:", data);

      if (!autoRefreshRef.current) return;
      console.log("[SidePanel] option-chain-data received:", data);

      // ✅ Only update if backend sends a valid value, keep previous otherwise
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
      if (data.symbol && data.symbol !== symbol && data.symbol !== "ALL")
        return;

      let chainData =
        data?.chain ?? data?.data ?? (Array.isArray(data) ? data : []);

      if (data.symbol === "ALL") {
        chainData = chainData.filter((item) => {
          const itemSym = item.symbol || item.name;
          const itemExp = item.expiry_date || item.expiry;
          return itemSym === symbol && itemExp === expiry;
        });
      }

      if (chainData.length > 0) {
        let finalStrikes = chainData;

        // Group flat array (strike_price + option_type format)
        if (
          chainData[0]?.strike_price !== undefined &&
          chainData[0]?.option_type !== undefined
        ) {
          const chainMap = {};
          chainData.forEach((item) => {
            const strike = Number(item.strike_price);
            if (!chainMap[strike])
              chainMap[strike] = { strike, ce: null, pe: null };
            if (item.option_type === "CE") chainMap[strike].ce = item;
            else if (item.option_type === "PE") chainMap[strike].pe = item;
          });
          finalStrikes = Object.values(chainMap).sort(
            (a, b) => a.strike - b.strike,
          );
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

    // Listen only for the literal event name "option-chain-data"
    localSocket.on("option-chain-data", handleUpdate);

    if (localSocket.connected) {
      subscribe();
    } else {
      localSocket.once("connect", subscribe);
    }

    return () => {
      localSocket.off("option-chain-data", handleUpdate);
      localSocket.off("connect", subscribe);
      localSocket.offAny(catchAll);
      const unsubSymbol = parseSymbolName(stock?.name ?? stock).base;
      console.log("[SidePanel] Emitting unsubscribeOptionChain:", {
        symbol: unsubSymbol,
      });
      localSocket.emit("unsubscribeOptionChain", { symbol: unsubSymbol });
    };
  }, [stock, expiry, localSocket]);

  // ✅ Handles string or number, formats large OI values
  const formatOI = (val) => {
    if (val == null || val === "") return "--";
    const n = Number(val);
    if (isNaN(n)) return "--";
    if (n >= 10000000) return (n / 10000000).toFixed(2) + " Cr";
    if (n >= 100000) return (n / 100000).toFixed(2) + " L";
    if (n >= 1000) return (n / 1000).toFixed(1) + " K";
    return n.toString();
  };

  // ✅ Handles string or number
  const formatPrice = (val) => {
    if (val == null || val === "") return "--";
    const n = Number(val);
    return isNaN(n) ? "--" : n.toFixed(2);
  };

  const changeColor =
    spotChange == null
      ? "var(--text-primary)"
      : spotChange >= 0
        ? "var(--success-color)"
        : "var(--danger-color)";
  const changeSign = spotChange != null && spotChange >= 0 ? "+" : "";

  return (
    <div className="side-panel">
      <button
        className="btn-action btn-buy-put mb-3"
        style={{ background: "var(--danger-color)", color: "#fff" }}
      >
        SQUARE OFF ALL
      </button>

      <div className="card-custom p-0">
        <div className="p-2 d-flex justify-content-between align-items-center border-bottom border-secondary">
          <span className="small fw-bold">
            LIVE OPTION CHAIN ({parseSymbolName(stock?.name ?? stock).base}{" "}
            {expiry ?? "NEAREST EXPIRY"})
          </span>
          <div className="d-flex align-items-center gap-2">
            <span className="x-small text-muted">Auto Refresh</span>
            <div className="form-check form-switch m-0">
              <input
                className="form-check-input bg-accent-green"
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
            </div>
          </div>
        </div>

        <div className="row g-0 p-2 text-center border-bottom border-secondary">
          <div className="col-4 border-end border-secondary">
            <div className="x-small">Spot Price</div>
            <div className="small fw-bold" style={{ color: changeColor }}>
              {spotPrice != null
                ? Number(spotPrice).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })
                : "--"}
            </div>
          </div>
          <div className="col-4 border-end border-secondary">
            <div className="x-small">Change</div>
            <div className="x-small" style={{ color: changeColor }}>
              {spotChange != null
                ? `${changeSign}${Number(spotChange).toFixed(2)}`
                : "--"}
            </div>
          </div>
          <div className="col-4">
            <div className="x-small">PCR</div>
            <div className="text-white small fw-bold">
              {pcr != null ? Number(pcr).toFixed(2) : "--"}
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table-dark-custom mb-0">
            <thead>
              <tr>
                <th className="bg-primary bg-opacity-10">OI (CE)</th>
                <th className="bg-primary bg-opacity-10">LTP</th>
                <th className="text-accent-purple">Strike</th>
                <th className="bg-danger bg-opacity-10">LTP</th>
                <th className="bg-danger bg-opacity-10">OI (PE)</th>
              </tr>
            </thead>
            <tbody>
              {strikes.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      textAlign: "center",
                      color: "var(--text-secondary)",
                      padding: "16px 0",
                      fontSize: "0.75rem",
                    }}
                  >
                    Waiting for data…
                  </td>
                </tr>
              ) : (
                strikes.map((row, idx) => {
                  const isATM = Number(row.strike) === Number(atmStrike); // ✅ coerce both sides
                  return (
                    <tr
                      key={idx}
                      style={
                        isATM ? { background: "rgba(139, 92, 246, 0.1)" } : {}
                      }
                    >
                      <td
                        style={
                          isATM
                            ? {
                                color: "var(--success-color)",
                                fontWeight: "bold",
                              }
                            : {}
                        }
                      >
                        {formatOI(row.ce?.oi)}
                      </td>
                      <td
                        style={
                          isATM
                            ? {
                                color: "var(--success-color)",
                                fontWeight: "bold",
                              }
                            : {}
                        }
                      >
                        {formatPrice(row.ce?.ltp)}
                      </td>
                      <td
                        className={isATM ? "text-white rounded" : "fw-bold"}
                        style={
                          isATM
                            ? {
                                background: "rgba(139, 92, 246, 0.6)",
                                textAlign: "center",
                              }
                            : {}
                        }
                      >
                        {Number(row.strike).toLocaleString("en-IN")}
                        {isATM && (
                          <span className="x-small ms-1 opacity-75">ATM</span>
                        )}
                      </td>
                      <td
                        style={
                          isATM
                            ? { color: "var(--danger-color)", fontWeight: "bold" }
                            : {}
                        }
                      >
                        {formatPrice(row.pe?.ltp)}
                      </td>
                      <td
                        style={
                          isATM
                            ? { color: "var(--danger-color)", fontWeight: "bold" }
                            : {}
                        }
                      >
                        {formatOI(row.pe?.oi)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-2 text-center border-top border-secondary">
          <button className="btn btn-link text-accent-green x-small text-decoration-none p-0">
            VIEW FULL CHAIN
          </button>
        </div>
      </div>

      <div className="section-title small mt-3">
        <i className="bi bi-star-fill text-accent-orange me-2"></i>SMART
        RECOMMENDATION
      </div>
      <div className="row g-2 mb-3">
        <div className="col-6">
          <div className="card-custom p-2 border-success border-opacity-50">
            <div className="x-small text-muted mb-1">Best Call (CE)</div>
            <div className="small fw-bold text-accent-green">
              {atmStrike
                ? `${Number(atmStrike).toLocaleString("en-IN")} CE`
                : "--"}
              <span className="x-small opacity-50"> (ATM)</span>
            </div>
            <div className="d-flex gap-1 mt-1 mb-2">
              <span className="badge-custom bg-success bg-opacity-10 text-success border border-success border-opacity-25">
                High OI
              </span>
              <span className="badge-custom bg-success bg-opacity-10 text-success border border-success border-opacity-25">
                IV Low
              </span>
            </div>
            <button className="btn btn-sm btn-outline-success w-100 x-small py-0">
              Select
            </button>
          </div>
        </div>
        <div className="col-6">
          <div className="card-custom p-2 border-danger border-opacity-50">
            <div className="x-small text-muted mb-1">Best Put (PE)</div>
            <div className="small fw-bold text-accent-red">
              {atmStrike
                ? `${Number(atmStrike).toLocaleString("en-IN")} PE`
                : "--"}
              <span className="x-small opacity-50"> (ATM)</span>
            </div>
            <div className="d-flex gap-1 mt-1 mb-2">
              <span className="badge-custom bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25">
                High Vol
              </span>
              <span className="badge-custom bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25">
                Tight
              </span>
            </div>
            <button className="btn btn-sm btn-outline-danger w-100 x-small py-0">
              Select
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SidePanel;
