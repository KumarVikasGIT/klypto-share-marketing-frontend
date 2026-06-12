import { useEffect, useRef, useState } from "react";
import useSocket from "./useSocket";
import EVENTS from "../services/websocket/socketEvent";
export default function useAlerts() {
  const [scanner, setScanner] = useState(null);
  const scannerRef = useRef(null);

  const [matchedCoins, setMatchedCoins] = useState([]);
  const [alertsFeed, setAlertsFeed] = useState([]);

  const previousValueRef = useRef({});
  const triggeredRef = useRef({});
  const valueMapRef = useRef({});

  const resetRefs = () => {
    triggeredRef.current = {};
    previousValueRef.current = {};
    valueMapRef.current = {};
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

  const checkAlert = (symbol, currentValue, indicatorType = "RSI") => {
    try {
      const currentScanner = scannerRef.current;

      // Always update previousValue even if no scanner active or it doesn't match
      if (
        !currentScanner ||
        typeof currentValue !== "number" ||
        currentScanner.indicator !== indicatorType
      ) {
        if (typeof currentValue === "number") {
          previousValueRef.current[`${symbol}_${indicatorType}`] = currentValue;
        }
        return;
      }

      const prevKey = `${symbol}_${indicatorType}`;
      const previousValue = previousValueRef.current[prevKey];
      let matched = false;

      if (currentScanner.condition === "crossesAbove") {
        matched =
          typeof previousValue === "number" &&
          previousValue < Number(currentScanner.value) &&
          currentValue >= Number(currentScanner.value);
      }

      if (currentScanner.condition === "crossesBelow") {
        matched =
          typeof previousValue === "number" &&
          previousValue > Number(currentScanner.value) &&
          currentValue <= Number(currentScanner.value);
      }

      if (
        currentScanner.condition === "greaterThan" ||
        currentScanner.condition === ">"
      ) {
        matched = currentValue > Number(currentScanner.value);
      }

      if (
        currentScanner.condition === "lessThan" ||
        currentScanner.condition === "<"
      ) {
        matched = currentValue < Number(currentScanner.value);
      }

      // CRITICAL: always update previousValue AFTER comparison, BEFORE firing alert
      previousValueRef.current[prevKey] = currentValue;

      if (matched && !triggeredRef.current[`${symbol}_${indicatorType}`]) {
        const payload = {
          symbol: symbol.toUpperCase(),
          rsi: currentValue.toFixed(2), // Keep key 'rsi' for compatibility with UI, but it represents the dynamic indicator
          indicator: indicatorType,
          condition: `${currentScanner.condition} ${currentScanner.value}`,
          timestamp: new Date().toLocaleTimeString(),
        };

        console.log(`[Alert Triggered] Matched Coin:`, payload);

        setMatchedCoins((prev) => {
          if (prev.find((item) => item.symbol === payload.symbol)) return prev;
          return [payload, ...prev];
        });

        setAlertsFeed((prev) => [payload, ...prev]);
        triggeredRef.current[`${symbol}_${indicatorType}`] = true;

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

  useSocket({
    handleAlertTick: ({ type, data }) => {
      if (type === EVENTS.STOCK_LIST.STOCKS_LIST) {
        const stocksArray = Array.isArray(data) ? data : data?.stocks || [];
        stocksArray.forEach((s) => {
          if (s.name && s.rsi != null) {
            const rsiVal = Number(s.rsi);
            valueMapRef.current[`${s.name}_RSI`] = rsiVal;
            checkAlert(s.name, rsiVal, "RSI");
          }
        });
      } else if (type === EVENTS.STOCK_LIST.STOCK_UPDATE) {
        const stock = data;
        if (stock?.name && stock.rsi != null) {
          const rsiVal = Number(stock.rsi);
          valueMapRef.current[`${stock.name}_RSI`] = rsiVal;
          checkAlert(stock.name, rsiVal, "RSI");
        }
      } else if (type === EVENTS.CHART.LIVE_TICK) {
        const tick = data;
        if (tick?.type && Array.isArray(tick?.data) && tick.data.length > 0) {
          const sym = tick.symbol || tick.name;
          const typeKey = tick.type.toLowerCase();
          const val =
            tick.data[0][typeKey] ??
            tick.data[0][tick.type] ??
            tick.data[0].value ??
            tick.data[0].rsi ??
            tick.data[0].RSI;
          const indicatorVal = Number(val);
  
          if (sym && Number.isFinite(indicatorVal)) {
            valueMapRef.current[`${sym}_${tick.type}`] = indicatorVal;
            checkAlert(sym, indicatorVal, tick.type);
          }
          return;
        }
  
        // Shape 2: flat { symbol, rsi } (fallback for legacy)
        const sym = tick?.symbol || tick?.name;
        if (sym && tick.rsi != null) {
          const rsiVal = Number(tick.rsi);
          valueMapRef.current[`${sym}_RSI`] = rsiVal;
          checkAlert(sym, rsiVal, "RSI");
        }
      } else if (type === EVENTS.INDICATOR.LIVE_RESPONSE) {
        const tick = data;
        if (!tick?.success || !tick?.type) return;
        const sym = tick.symbol || tick.name;
        const typeKey = tick.type.toLowerCase();
        const val =
          tick.data?.[0]?.[typeKey] ??
          tick.data?.[0]?.[tick.type] ??
          tick.data?.[0]?.value ??
          tick.data?.[0]?.rsi ??
          tick.data?.[0]?.RSI;
        const indicatorVal = Number(val);
  
        if (sym && Number.isFinite(indicatorVal)) {
          valueMapRef.current[`${sym}_${tick.type}`] = indicatorVal;
          checkAlert(sym, indicatorVal, tick.type);
        }
      }
    }
  });

  return {
    alertsFeed,
    matchedCoins,
    scanner,
    addAlert,
    removeCoin,
    clearAllCoins,
  };
}
