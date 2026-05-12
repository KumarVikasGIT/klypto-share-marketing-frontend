import { useEffect, useRef, useState } from "react";
import socket from "../services/socket";

export default function useAlerts() {
  const [scanner, setScanner] = useState(null);
  const scannerRef = useRef(null);

  const [matchedCoins, setMatchedCoins] = useState([]);
  const [alertsFeed, setAlertsFeed] = useState([]);

  const previousRsiRef = useRef({});
  const triggeredRef = useRef({});
  const rsiMapRef = useRef({});

  const resetRefs = () => {
    triggeredRef.current = {};
    previousRsiRef.current = {};
    rsiMapRef.current = {};
  };

  const addAlert = (data) => {
    setScanner(data);
    scannerRef.current = data;
    setMatchedCoins([]);
    setAlertsFeed([]);
    resetRefs();
  };

  const removeCoin = (symbol) => {
    setMatchedCoins((prev) => prev.filter((item) => item.symbol !== symbol));
  };

  const clearAllCoins = () => {
    setMatchedCoins([]);
    setAlertsFeed([]);
    resetRefs();
    setScanner(null);
    scannerRef.current = null;
  };

  const checkAlert = (symbol, currentRSI) => {
    try {
      const currentScanner = scannerRef.current;

      // ✅ Always update previousRsi even if no scanner active
      if (!currentScanner || typeof currentRSI !== "number") {
        previousRsiRef.current[symbol] = currentRSI;
        return;
      }

      const previousRSI = previousRsiRef.current[symbol];
      let matched = false;

      if (currentScanner.condition === "crossesAbove") {
        // Need: prev < threshold AND current >= threshold
        matched =
          typeof previousRSI === "number" &&
          previousRSI < Number(currentScanner.value) &&
          currentRSI >= Number(currentScanner.value);
      }

      if (currentScanner.condition === "crossesBelow") {
        // Need: prev > threshold AND current <= threshold
        matched =
          typeof previousRSI === "number" &&
          previousRSI > Number(currentScanner.value) &&
          currentRSI <= Number(currentScanner.value);
      }

      if (currentScanner.condition === "greaterThan" || currentScanner.condition === ">") {
        matched = currentRSI > Number(currentScanner.value);
      }

      if (currentScanner.condition === "lessThan" || currentScanner.condition === "<") {
        matched = currentRSI < Number(currentScanner.value);
      }

      // ✅ CRITICAL: always update previousRsi AFTER comparison, BEFORE firing alert
      previousRsiRef.current[symbol] = currentRSI;

      if (matched && !triggeredRef.current[symbol]) {
        const payload = {
          symbol: symbol.toUpperCase(),
          rsi: currentRSI.toFixed(2),
          condition: `${currentScanner.condition} ${currentScanner.value}`,
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
    } catch (e) {
      console.error("[useAlerts] Error in checkAlert:", e);
    }
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
      // Shape 1: { symbol, type: "RSI", data: [{rsi, RSI, value}] }
      if (tick?.type === "RSI" && Array.isArray(tick?.data) && tick.data.length > 0) {
        const sym = tick.symbol || tick.name;
        const rsiVal = Number(
          tick.data[0].rsi ?? tick.data[0].RSI ?? tick.data[0].value
        );
        if (sym && Number.isFinite(rsiVal)) {
          console.log(`[RSI Live Tick] Symbol: ${sym}, RSI: ${rsiVal}, Prev: ${previousRsiRef.current[sym]}`);
          rsiMapRef.current[sym] = rsiVal;
          checkAlert(sym, rsiVal);
        }
        return;
      }

      // Shape 2: flat { symbol, rsi }
      const sym = tick?.symbol || tick?.name;
      if (sym && tick.rsi != null) {
        const rsiVal = Number(tick.rsi);
        rsiMapRef.current[sym] = rsiVal;
        checkAlert(sym, rsiVal);
      }
    };

    const handleIndicatorTick = (tick) => {
      if (!tick?.success || tick?.type !== "RSI") return;
      const sym = tick.symbol || tick.name;
      const rsiVal = Number(
        tick.data?.[0]?.rsi ?? tick.data?.[0]?.RSI ?? tick.data?.[0]?.value
      );
      if (sym && Number.isFinite(rsiVal)) {
        console.log(`[Indicator RSI] Symbol: ${sym}, RSI: ${rsiVal}, Prev: ${previousRsiRef.current[sym]}`);
        rsiMapRef.current[sym] = rsiVal;
        checkAlert(sym, rsiVal);
      }
    };

    socket.on("liveIndicatorResponse", handleIndicatorTick);
    socket.on("stocks", handleStocks);
    socket.on("stockUpdate", handleStockUpdate);
    socket.on("liveTick", handleLiveTick);

    return () => {
      socket.off("stocks", handleStocks);
      socket.off("stockUpdate", handleStockUpdate);
      socket.off("liveTick", handleLiveTick);
      socket.off("liveIndicatorResponse", handleIndicatorTick);
    };
  }, []);

  return {
    alertsFeed,
    matchedCoins,
    scanner,
    addAlert,
    removeCoin,
    clearAllCoins,
  };
}