import React, { useState, useEffect, useMemo, useRef } from "react";
import { io } from "socket.io-client";

const FlashCell = ({ value, className }) => {
  const [flashClass, setFlashClass] = useState("");
  const prevValueRef = React.useRef(value);

  useEffect(() => {
    if (value !== prevValueRef.current && value !== "-" && value != null) {
      const numVal = parseFloat(value);
      const prevNum = parseFloat(prevValueRef.current);
      if (!isNaN(numVal) && !isNaN(prevNum)) {
        if (numVal > prevNum) {
          setFlashClass(
            "bg-green-600 text-white font-extrabold scale-110 relative z-10 shadow-lg transition-none",
          );
        } else if (numVal < prevNum) {
          setFlashClass(
            "bg-red-600 text-white font-extrabold scale-110 relative z-10 shadow-lg transition-none",
          );
        }

        const timer = setTimeout(() => {
          setFlashClass("transition-all duration-1000 ease-in-out");
        }, 400);

        prevValueRef.current = value;
        return () => clearTimeout(timer);
      }
      prevValueRef.current = value;
    }
  }, [value]);

  return <td className={`${className} ${flashClass}`}>{value || "-"}</td>;
};

const OptionChainUI = () => {
  const [liveData, setLiveData] = useState([]);
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [selectedExpiry, setSelectedExpiry] = useState("");
  const [isConnected, setIsConnected] = useState(false);

  const [symbols, setSymbols] = useState(["NIFTY", "BANKNIFTY"]);

  // Fetch all target symbols from the backend
  useEffect(() => {
    fetch("./targetSymbols.json")
      .then((res) => res.json())
      .then((data) => {
        // Ensure NIFTY and BANKNIFTY are at the top for convenience
        let sortedSymbols = data;
        if (
          sortedSymbols.includes("NIFTY") &&
          sortedSymbols.includes("BANKNIFTY")
        ) {
          sortedSymbols = [
            "NIFTY",
            "BANKNIFTY",
            ...sortedSymbols.filter((s) => s !== "NIFTY" && s !== "BANKNIFTY"),
          ];
        }
        setSymbols(sortedSymbols);
        if (sortedSymbols.length > 0) {
          setSelectedSymbol(sortedSymbols[0]);
        }
      })
      .catch((err) => console.error("Error fetching symbols:", err));
  }, []);

  // Move socket instance to a ref or state so it can be accessed in other effects
  const [socketInstance, setSocketInstance] = useState(null);

  // Initialize Socket Connection
  useEffect(() => {
    // Connect to backend (adjust URL if backend is hosted elsewhere)
    const socket = io("http://192.168.1.16:3000");
    setSocketInstance(socket);

    socket.on("connect", () => {
      setIsConnected(true);
      console.log("Connected to Option Chain WebSocket");
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
      console.log("Disconnected from WebSocket");
    });

    // Listen for live data updates
    socket.on("option-chain-data", (response) => {
      if (response && response.data && response.data.length > 0) {
        setLiveData(response.data);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Emit filters whenever selectedSymbol or socket changes
  useEffect(() => {
    if (socketInstance && isConnected) {
      socketInstance.emit("set-filters", { symbol: selectedSymbol });
    }
  }, [selectedSymbol, socketInstance, isConnected]);

  // Filter data by selected symbol
  const symbolData = useMemo(() => {
    return liveData.filter((item) => item.symbol === selectedSymbol);
  }, [liveData, selectedSymbol]);

  // Extract unique expiries for the selected symbol
  const expiries = useMemo(() => {
    const uniqueExpiries = [
      ...new Set(symbolData.map((item) => item.expiry_date)),
    ];
    // Sort expiries chronologically
    uniqueExpiries.sort((a, b) => new Date(a) - new Date(b));
    return uniqueExpiries;
  }, [symbolData]);

  // Auto-select the nearest expiry if not set or if symbol changes
  useEffect(() => {
    if (expiries.length > 0) {
      if (!selectedExpiry || !expiries.includes(selectedExpiry)) {
        setSelectedExpiry(expiries[0]);
      }
    } else {
      setSelectedExpiry("");
    }
  }, [expiries, selectedExpiry]);

  // Filter data by selected expiry
  const expiryData = useMemo(() => {
    return symbolData.filter((item) => item.expiry_date === selectedExpiry);
  }, [symbolData, selectedExpiry]);

  // Group by Strike Price to format for the Option Chain Table
  const optionChain = useMemo(() => {
    const chainMap = {};

    expiryData.forEach((item) => {
      const strike = parseFloat(item.strike_price);
      if (!chainMap[strike]) {
        chainMap[strike] = { strike_price: strike, CE: null, PE: null };
      }
      chainMap[strike][item.option_type] = item;
    });

    // Convert map to array and sort by strike price
    return Object.values(chainMap).sort(
      (a, b) => a.strike_price - b.strike_price,
    );
  }, [expiryData]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-2 font-sans overflow-x-hidden">
      <div className="w-full mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 bg-gray-800 p-5 rounded-xl shadow-lg border border-gray-700">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
              Live Option Chain
            </h1>
            <div className="flex items-center mt-2 space-x-2">
              <div
                className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`}
              ></div>
              <span className="text-sm text-gray-400">
                {isConnected ? "Live WebSocket Connected" : "Disconnected"}
              </span>
            </div>
          </div>

          <div className="flex space-x-4 mt-4 md:mt-0">
            {/* Symbol Dropdown */}
            <div className="flex flex-col">
              <label className="text-xs text-gray-400 mb-1">Symbol</label>
              <select
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                className="bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {symbols.map((sym) => (
                  <option key={sym} value={sym}>
                    {sym}
                  </option>
                ))}
              </select>
            </div>

            {/* Expiry Dropdown */}
            <div className="flex flex-col">
              <label className="text-xs text-gray-400 mb-1">Expiry Date</label>
              <select
                value={selectedExpiry}
                onChange={(e) => setSelectedExpiry(e.target.value)}
                className="bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                disabled={expiries.length === 0}
              >
                {expiries.length > 0 ? (
                  expiries.map((exp) => (
                    <option key={exp} value={exp}>
                      {new Date(exp).toDateString()}
                    </option>
                  ))
                ) : (
                  <option>Waiting for data...</option>
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Option Chain Table */}
        <div className="bg-gray-800 rounded-xl shadow-2xl overflow-hidden border border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-center whitespace-nowrap">
              <thead>
                {/* Master Headers */}
                <tr className="bg-gray-900 border-b border-gray-700 text-gray-300">
                  <th
                    colSpan="13"
                    className="py-3 bg-blue-900/20 border-r border-gray-700"
                  >
                    CALLS (CE)
                  </th>
                  <th className="py-3 bg-gray-800 border-r border-gray-700 w-32">
                    STRIKE
                  </th>
                  <th colSpan="13" className="py-3 bg-red-900/20">
                    PUTS (PE)
                  </th>
                </tr>
                {/* Sub Headers */}
                <tr className="bg-gray-800 border-b border-gray-700 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <th className="py-3 px-2 border-r border-gray-700/50 text-purple-400">
                    Vega
                  </th>
                  <th className="py-3 px-2 border-r border-gray-700/50 text-purple-400">
                    Theta
                  </th>
                  <th className="py-3 px-2 border-r border-gray-700/50 text-purple-400">
                    Gamma
                  </th>
                  <th className="py-3 px-2 border-r border-gray-700/50 text-purple-400">
                    Delta
                  </th>
                  <th className="py-3 px-2 border-r border-gray-700/50 text-yellow-400">
                    IV
                  </th>
                  <th className="py-3 px-2 border-r border-gray-700/50">OI</th>
                  <th className="py-3 px-2 border-r border-gray-700/50">
                    Chng OI
                  </th>
                  <th className="py-3 px-2 border-r border-gray-700/50">Vol</th>
                  <th className="py-3 px-2 border-r border-gray-700/50 text-gray-500">
                    O
                  </th>
                  <th className="py-3 px-2 border-r border-gray-700/50 text-gray-500">
                    H
                  </th>
                  <th className="py-3 px-2 border-r border-gray-700/50 text-gray-500">
                    L
                  </th>
                  <th className="py-3 px-2 border-r border-gray-700/50 text-gray-500">
                    C
                  </th>
                  <th className="py-3 px-2 border-r border-gray-700 text-blue-400">
                    LTP
                  </th>

                  <th className="py-3 px-4 border-r border-gray-700 bg-gray-900 text-white font-bold">
                    Price
                  </th>

                  <th className="py-3 px-2 border-r border-gray-700/50 text-red-400">
                    LTP
                  </th>
                  <th className="py-3 px-2 border-r border-gray-700/50 text-gray-500">
                    O
                  </th>
                  <th className="py-3 px-2 border-r border-gray-700/50 text-gray-500">
                    H
                  </th>
                  <th className="py-3 px-2 border-r border-gray-700/50 text-gray-500">
                    L
                  </th>
                  <th className="py-3 px-2 border-r border-gray-700/50 text-gray-500">
                    C
                  </th>
                  <th className="py-3 px-2 border-r border-gray-700/50">Vol</th>
                  <th className="py-3 px-2 border-r border-gray-700/50">
                    Chng OI
                  </th>
                  <th className="py-3 px-2 border-r border-gray-700/50">OI</th>
                  <th className="py-3 px-2 border-r border-gray-700/50 text-yellow-400">
                    IV
                  </th>
                  <th className="py-3 px-2 border-r border-gray-700/50 text-purple-400">
                    Delta
                  </th>
                  <th className="py-3 px-2 border-r border-gray-700/50 text-purple-400">
                    Gamma
                  </th>
                  <th className="py-3 px-2 border-r border-gray-700/50 text-purple-400">
                    Theta
                  </th>
                  <th className="py-3 px-2 text-purple-400">Vega</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {optionChain.length > 0 ? (
                  optionChain.map((row, idx) => {
                    const ce = row.CE || {};
                    const pe = row.PE || {};

                    // Highlighting ITM/OTM theoretically (Simplified: assuming middle is ATM for visual)
                    // In real life, you'd calculate ATM based on Spot Price.
                    const isCeItm = idx < Math.floor(optionChain.length / 2);
                    const isPeItm = idx >= Math.floor(optionChain.length / 2);

                    return (
                      <tr
                        key={row.strike_price}
                        className="hover:bg-gray-700/30 transition-colors"
                      >
                        {/* Calls Data */}
                        <FlashCell
                          value={ce.vega}
                          className={`py-2 px-1 border-r border-gray-700/50 text-purple-300 ${isCeItm ? "bg-blue-900/10" : ""}`}
                        />
                        <FlashCell
                          value={ce.theta}
                          className={`py-2 px-1 border-r border-gray-700/50 text-purple-300 ${isCeItm ? "bg-blue-900/10" : ""}`}
                        />
                        <FlashCell
                          value={ce.gamma}
                          className={`py-2 px-1 border-r border-gray-700/50 text-purple-300 ${isCeItm ? "bg-blue-900/10" : ""}`}
                        />
                        <FlashCell
                          value={ce.delta}
                          className={`py-2 px-1 border-r border-gray-700/50 text-purple-300 ${isCeItm ? "bg-blue-900/10" : ""}`}
                        />
                        <FlashCell
                          value={ce.iv}
                          className={`py-2 px-1 border-r border-gray-700/50 text-yellow-300 ${isCeItm ? "bg-blue-900/10" : ""}`}
                        />
                        <FlashCell
                          value={ce.oi}
                          className={`py-2 px-1 border-r border-gray-700/50 ${isCeItm ? "bg-blue-900/10" : ""}`}
                        />
                        <td
                          className={`py-2 px-1 border-r border-gray-700/50 ${isCeItm ? "bg-blue-900/10" : ""}`}
                        >
                          <span
                            className={
                              ce.oi_change > 0
                                ? "text-green-400"
                                : ce.oi_change < 0
                                  ? "text-red-400"
                                  : ""
                            }
                          >
                            {ce.oi_change || "-"}
                          </span>
                        </td>
                        <FlashCell
                          value={ce.volume}
                          className={`py-2 px-1 border-r border-gray-700/50 ${isCeItm ? "bg-blue-900/10" : ""}`}
                        />
                        <td
                          className={`py-2 px-1 border-r border-gray-700/50 text-gray-400 ${isCeItm ? "bg-blue-900/10" : ""}`}
                        >
                          {ce.open ? parseFloat(ce.open).toFixed(2) : "-"}
                        </td>
                        <td
                          className={`py-2 px-1 border-r border-gray-700/50 text-green-400/80 ${isCeItm ? "bg-blue-900/10" : ""}`}
                        >
                          {ce.high ? parseFloat(ce.high).toFixed(2) : "-"}
                        </td>
                        <td
                          className={`py-2 px-1 border-r border-gray-700/50 text-red-400/80 ${isCeItm ? "bg-blue-900/10" : ""}`}
                        >
                          {ce.low ? parseFloat(ce.low).toFixed(2) : "-"}
                        </td>
                        <td
                          className={`py-2 px-1 border-r border-gray-700/50 text-gray-400 ${isCeItm ? "bg-blue-900/10" : ""}`}
                        >
                          {ce.close ? parseFloat(ce.close).toFixed(2) : "-"}
                        </td>
                        <FlashCell
                          value={ce.ltp ? parseFloat(ce.ltp).toFixed(2) : null}
                          className={`py-2 px-1 border-r border-gray-700 font-bold text-blue-300 ${isCeItm ? "bg-blue-900/20" : ""}`}
                        />

                        {/* Strike Price */}
                        <td className="py-2 px-2 border-r border-gray-700 bg-gray-800/80 font-bold text-white shadow-inner">
                          {row.strike_price}
                        </td>

                        {/* Puts Data */}
                        <FlashCell
                          value={pe.ltp ? parseFloat(pe.ltp).toFixed(2) : null}
                          className={`py-2 px-1 border-r border-gray-700/50 font-bold text-red-300 ${isPeItm ? "bg-red-900/20" : ""}`}
                        />
                        <td
                          className={`py-2 px-1 border-r border-gray-700/50 text-gray-400 ${isPeItm ? "bg-red-900/10" : ""}`}
                        >
                          {pe.open ? parseFloat(pe.open).toFixed(2) : "-"}
                        </td>
                        <td
                          className={`py-2 px-1 border-r border-gray-700/50 text-green-400/80 ${isPeItm ? "bg-red-900/10" : ""}`}
                        >
                          {pe.high ? parseFloat(pe.high).toFixed(2) : "-"}
                        </td>
                        <td
                          className={`py-2 px-1 border-r border-gray-700/50 text-red-400/80 ${isPeItm ? "bg-red-900/10" : ""}`}
                        >
                          {pe.low ? parseFloat(pe.low).toFixed(2) : "-"}
                        </td>
                        <td
                          className={`py-2 px-1 border-r border-gray-700/50 text-gray-400 ${isPeItm ? "bg-red-900/10" : ""}`}
                        >
                          {pe.close ? parseFloat(pe.close).toFixed(2) : "-"}
                        </td>
                        <FlashCell
                          value={pe.volume}
                          className={`py-2 px-1 border-r border-gray-700/50 ${isPeItm ? "bg-red-900/10" : ""}`}
                        />
                        <td
                          className={`py-2 px-1 border-r border-gray-700/50 ${isPeItm ? "bg-red-900/10" : ""}`}
                        >
                          <span
                            className={
                              pe.oi_change > 0
                                ? "text-green-400"
                                : pe.oi_change < 0
                                  ? "text-red-400"
                                  : ""
                            }
                          >
                            {pe.oi_change || "-"}
                          </span>
                        </td>
                        <FlashCell
                          value={pe.oi}
                          className={`py-2 px-1 border-r border-gray-700/50 ${isPeItm ? "bg-red-900/10" : ""}`}
                        />
                        <FlashCell
                          value={pe.iv}
                          className={`py-2 px-1 border-r border-gray-700/50 text-yellow-300 ${isPeItm ? "bg-red-900/10" : ""}`}
                        />
                        <FlashCell
                          value={pe.delta}
                          className={`py-2 px-1 border-r border-gray-700/50 text-purple-300 ${isPeItm ? "bg-red-900/10" : ""}`}
                        />
                        <FlashCell
                          value={pe.gamma}
                          className={`py-2 px-1 border-r border-gray-700/50 text-purple-300 ${isPeItm ? "bg-red-900/10" : ""}`}
                        />
                        <FlashCell
                          value={pe.theta}
                          className={`py-2 px-1 border-r border-gray-700/50 text-purple-300 ${isPeItm ? "bg-red-900/10" : ""}`}
                        />
                        <FlashCell
                          value={pe.vega}
                          className={`py-2 px-1 text-purple-300 ${isPeItm ? "bg-red-900/10" : ""}`}
                        />
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan="17"
                      className="py-12 text-gray-500 font-medium text-lg"
                    >
                      {isConnected
                        ? "Waiting for market data..."
                        : "Connecting to live feed..."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptionChainUI;
