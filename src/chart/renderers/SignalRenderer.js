import { createSeriesMarkers } from "lightweight-charts";

export function renderSignals(series, signals = []) {
  if (!series || !Array.isArray(signals) || signals.length === 0) return null;
  const markers = signals
    .map((signal) => {
      const time = Number(signal.time);
      if (!Number.isFinite(time)) return null;
      const side = String(signal.side || signal.type || "").toUpperCase();
      const isBuy = side === "BUY" || side === "LONG" || side === "CALL";
      return {
        time,
        position: isBuy ? "belowBar" : "aboveBar",
        color: signal.color || (isBuy ? "#22c55e" : "#ef4444"),
        shape: isBuy ? "arrowUp" : "arrowDown",
        text: signal.label || side || "Signal",
      };
    })
    .filter(Boolean);
  return createSeriesMarkers(series, markers);
}
