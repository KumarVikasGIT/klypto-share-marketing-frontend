import React, { useEffect, useState, useRef } from "react";
import socket from "../../../services/socket";

const SidePanel = ({ stock, expiry }) => {
  const [spotPrice, setSpotPrice] = useState(null);
  const [spotChange, setSpotChange] = useState(null);
  const [pcr, setPcr] = useState(null);
  const [strikes, setStrikes] = useState([]);
  const [atmStrike, setAtmStrike] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const autoRefreshRef = useRef(true);
  const prevSpotRef = useRef(null);

  useEffect(() => {
    autoRefreshRef.current = autoRefresh;
  }, [autoRefresh]);

  console.log("stock", stock);


  const subscribe = () => {
    const payload = { stock };
    if (expiry) payload.expiry = expiry;
    console.log("[SidePanel] Emitting subscribeOptionChain:", payload);
    socket.emit("subscribeOptionChain", payload);
  };

  useEffect(() => {
   const handleUpdate = (data) => {
  if (!autoRefreshRef.current) return;
  console.log("[SidePanel] optionChainUpdate received:", data);

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

  if (data.atmStrike != null)   setAtmStrike(data.atmStrike);
  if (data.chain?.length > 0)   {
    setStrikes(data.chain);
    const totalCallOI = data.chain.reduce((sum, row) => sum + (Number(row.ce?.oi) || 0), 0);
    const totalPutOI  = data.chain.reduce((sum, row) => sum + (Number(row.pe?.oi) || 0), 0);
    setPcr(totalCallOI > 0 ? (totalPutOI / totalCallOI).toFixed(2) : null);
  }
};

    socket.on("optionChainUpdate", handleUpdate);

    if (socket.connected) {
      subscribe();
    } else {
      socket.once("connect", subscribe);
    }

    return () => {
      socket.off("optionChainUpdate", handleUpdate);
      socket.off("connect", subscribe);
      socket.emit("unsubscribeOptionChain", { stock });
    };
  }, [stock, expiry]);

  // ✅ Handles string or number, formats large OI values
  const formatOI = (val) => {
    if (val == null || val === "") return "--";
    const n = Number(val);
    if (isNaN(n)) return "--";
    if (n >= 10000000) return (n / 10000000).toFixed(2) + " Cr";
    if (n >= 100000)   return (n / 100000).toFixed(2) + " L";
    if (n >= 1000)     return (n / 1000).toFixed(1) + " K";
    return n.toString();
  };

  // ✅ Handles string or number
  const formatPrice = (val) => {
    if (val == null || val === "") return "--";
    const n = Number(val);
    return isNaN(n) ? "--" : n.toFixed(2);
  };

  const changeColor = spotChange == null ? "#d1d4dc" : spotChange >= 0 ? "#22ab94" : "#ef4444";
  const changeSign  = spotChange != null && spotChange >= 0 ? "+" : "";

  return (
    <div className="side-panel">
      <button className="btn-action btn-buy-put mb-3" style={{ background: "#ef4444" }}>
        SQUARE OFF ALL
      </button>

      <div className="card-custom p-0">
        <div className="p-2 d-flex justify-content-between align-items-center border-bottom border-secondary">
          <span className="small fw-bold">
            LIVE OPTION CHAIN ({stock} {expiry ?? "NEAREST EXPIRY"})
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
                ? Number(spotPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })
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

        <table className="table-dark-custom">
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
                <td colSpan={5} style={{ textAlign: "center", color: "#787b86", padding: "16px 0", fontSize: "0.75rem" }}>
                  Waiting for data…
                </td>
              </tr>
            ) : (
              strikes.map((row, idx) => {
                const isATM = Number(row.strike) === Number(atmStrike); // ✅ coerce both sides
                return (
                  <tr key={idx} style={isATM ? { background: "rgba(139, 92, 246, 0.1)" } : {}}>
                    <td style={isATM ? { color: "#22ab94", fontWeight: "bold" } : {}}>
                      {formatOI(row.ce?.oi)}
                    </td>
                    <td style={isATM ? { color: "#22ab94", fontWeight: "bold" } : {}}>
                      {formatPrice(row.ce?.ltp)}
                    </td>
                    <td
                      className={isATM ? "text-white rounded" : "fw-bold"}
                      style={isATM ? { background: "rgba(139, 92, 246, 0.6)", textAlign: "center" } : {}}
                    >
                      {Number(row.strike).toLocaleString("en-IN")}
                      {isATM && <span className="x-small ms-1 opacity-75">ATM</span>}
                    </td>
                    <td style={isATM ? { color: "#ef4444", fontWeight: "bold" } : {}}>
                      {formatPrice(row.pe?.ltp)}
                    </td>
                    <td style={isATM ? { color: "#ef4444", fontWeight: "bold" } : {}}>
                      {formatOI(row.pe?.oi)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        <div className="p-2 text-center border-top border-secondary">
          <button className="btn btn-link text-accent-green x-small text-decoration-none p-0">
            VIEW FULL CHAIN
          </button>
        </div>
      </div>

      <div className="section-title small mt-3">
        <i className="bi bi-star-fill text-accent-orange me-2"></i>SMART RECOMMENDATION
      </div>
      <div className="row g-2 mb-3">
        <div className="col-6">
          <div className="card-custom p-2 border-success border-opacity-50">
            <div className="x-small text-muted mb-1">Best Call (CE)</div>
            <div className="small fw-bold text-accent-green">
              {atmStrike ? `${Number(atmStrike).toLocaleString("en-IN")} CE` : "--"}
              <span className="x-small opacity-50"> (ATM)</span>
            </div>
            <div className="d-flex gap-1 mt-1 mb-2">
              <span className="badge-custom bg-success bg-opacity-10 text-success border border-success border-opacity-25">High OI</span>
              <span className="badge-custom bg-success bg-opacity-10 text-success border border-success border-opacity-25">IV Low</span>
            </div>
            <button className="btn btn-sm btn-outline-success w-100 x-small py-0">Select</button>
          </div>
        </div>
        <div className="col-6">
          <div className="card-custom p-2 border-danger border-opacity-50">
            <div className="x-small text-muted mb-1">Best Put (PE)</div>
            <div className="small fw-bold text-accent-red">
              {atmStrike ? `${Number(atmStrike).toLocaleString("en-IN")} PE` : "--"}
              <span className="x-small opacity-50"> (ATM)</span>
            </div>
            <div className="d-flex gap-1 mt-1 mb-2">
              <span className="badge-custom bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25">High Vol</span>
              <span className="badge-custom bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25">Tight</span>
            </div>
            <button className="btn btn-sm btn-outline-danger w-100 x-small py-0">Select</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SidePanel;