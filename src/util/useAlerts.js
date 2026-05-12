import { useEffect, useRef, useState } from "react";
import socket from "../services/socket";

export default function useAlerts() {
  const [scanner, setScanner] = useState(null);

  // Sidebar Listing
  const [matchedCoins, setMatchedCoins] = useState([]);

  // Alert Feed
  const [alertsFeed, setAlertsFeed] = useState([]);

  // Previous RSI Tracking
  const previousRsiRef = useRef({});

  // Prevent Multiple Alerts
  const triggeredRef = useRef({});

  const addAlert = (data) => {
    setScanner(data);

    // Start a fresh scan whenever a new condition is added
    setMatchedCoins([]);
    setAlertsFeed([]);
    triggeredRef.current = {};
  };

  // Delete Coin From Listing
  const removeCoin = (symbol) => {
    setMatchedCoins((prev) => prev.filter((item) => item.symbol !== symbol));
  };

  const clearAllCoins = () => {
    setMatchedCoins([]);
    setAlertsFeed([]);
    triggeredRef.current = {};
  };

  const rsiMapRef = useRef({});

  // Function to check a single stock's RSI against the scanner
  const checkAlert = (symbol, currentRSI) => {
    if (!scanner || typeof currentRSI !== "number") {
      previousRsiRef.current[symbol] = currentRSI;
      return;
    }

    const previousRSI = previousRsiRef.current[symbol];
    let matched = false;

    if (scanner.condition === "crossesAbove") {
      matched =
        typeof previousRSI === "number" &&
        previousRSI < Number(scanner.value) &&
        currentRSI >= Number(scanner.value);
    }
    if (scanner.condition === "crossesBelow") {
      matched =
        typeof previousRSI === "number" &&
        previousRSI > Number(scanner.value) &&
        currentRSI <= Number(scanner.value);
    }
    if (scanner.condition === "greaterThan" || scanner.condition === ">") {
      matched = currentRSI > Number(scanner.value);
    }
    if (scanner.condition === "lessThan" || scanner.condition === "<") {
      matched = currentRSI < Number(scanner.value);
    }

    if (matched && !triggeredRef.current[symbol]) {
      const payload = {
        symbol: symbol.toUpperCase(),
        rsi: currentRSI.toFixed(2),
        condition: `${scanner.condition} ${scanner.value}`,
        timestamp: new Date().toLocaleTimeString(),
      };

      console.log("[Alert Triggered] Matched Coin:", payload);

      setMatchedCoins((prev) => {
        if (prev.find((item) => item.symbol === payload.symbol)) return prev;
        return [payload, ...prev];
      });

      setAlertsFeed((prev) => [payload, ...prev]);
      triggeredRef.current[symbol] = true;

      if (Notification.permission === "granted") {
        new Notification(payload.symbol, { body: payload.condition });
      }

      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } catch (err) {
        console.log(err);
      }
    }

    previousRsiRef.current[symbol] = currentRSI;
  };

  useEffect(() => {
    const handleStocks = (data) => {
      const stocksArray = Array.isArray(data) ? data : data?.stocks || [];
      stocksArray.forEach((s) => {
        if (s.name && s.rsi != null) {
          const rsiVal = Number(s.rsi);
          rsiMapRef.current[s.name] = rsiVal;
          checkAlert(s.name, rsiVal);
        }
      });
    };

    const handleStockUpdate = (stock) => {
      if (stock?.name && stock.rsi != null) {
        const rsiVal = Number(stock.rsi);
        rsiMapRef.current[stock.name] = rsiVal;
        checkAlert(stock.name, rsiVal);
      }
    };

    const handleLiveTick = (tick) => {
      if (tick?.rsi != null) {
        console.log(`[RSI Live Tick] Symbol: ${tick.symbol || tick.name}, RSI: ${tick.rsi}`);
      }
      const sym = tick?.symbol || tick?.name;
      if (sym && tick.rsi != null) {
        const rsiVal = Number(tick.rsi);
        rsiMapRef.current[sym] = rsiVal;
        checkAlert(sym, rsiVal);
      }
    };

    socket.on("stocks", handleStocks);
    socket.on("stockUpdate", handleStockUpdate);
    socket.on("liveTick", handleLiveTick);

    return () => {
      socket.off("stocks", handleStocks);
      socket.off("stockUpdate", handleStockUpdate);
      socket.off("liveTick", handleLiveTick);
    };
  }, [scanner]);

  return {
    alertsFeed,
    matchedCoins,
    scanner,
    addAlert,
    removeCoin,
    clearAllCoins,
  };
}
