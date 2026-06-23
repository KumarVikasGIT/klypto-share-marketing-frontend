import { useEffect, useRef } from "react";
import { LineSeries } from "lightweight-charts";

export default function SSLPlot({
  result,
  rows,
  indicatorStyle,
  indicatorSeriesRef,
  addSeries,
  chart,
  containerRef,
}) {
  const canvasRef = useRef(null);
  const closeMapRef = useRef(new Map());

  /* ================= DISPLAY MODE ================= */

  const getDisplayVisibility = (lineName) => {
    const displayMode =
      indicatorStyle?.SSL_HYBRID?.displayMode || "FULL_DISPLAY";

    switch (displayMode) {
      case "BASELINE_ONLY":
        return ["baseline", "upperChannel", "lowerChannel"].includes(lineName);
      case "BASELINE_SSL":
        return [
          "baseline",
          "upperChannel",
          "lowerChannel",
          "ssl1",
          "ssl2",
        ].includes(lineName);
      case "SSL_ONLY":
        return ["ssl1", "ssl2"].includes(lineName);
      case "ENTRY_EXIT_ONLY":
        return ["ssl2"].includes(lineName);
      case "FULL_DISPLAY":
      default:
        return true;
    }
  };

  /* ================= PINE SCRIPT COLOR LOGIC ================= */

  const BULLISH = indicatorStyle?.SSL_HYBRID?.candles?.palette?.up || "#00c3ff";
  const BEARISH =
    indicatorStyle?.SSL_HYBRID?.candles?.palette?.down || "#ff0062";
  const NEUTRAL = indicatorStyle?.SSL_HYBRID?.candles?.palette?.neutral || "#666666";

  // baseline_color = close > upperk ? bullish : close < lowerk ? bearish : neutral
  const getBaselineColor = (close, upperChannel, lowerChannel) => {
    if (close == null || upperChannel == null || lowerChannel == null)
      return NEUTRAL;
    if (close > upperChannel) return BULLISH;
    if (close < lowerChannel) return BEARISH;
    return NEUTRAL;
  };

  // ssl_color = close > sslDown ? bullish : close < sslDown ? bearish : neutral
  const getSsl1Color = (close, ssl1) => {
    if (close == null || ssl1 == null) return NEUTRAL;
    if (close > ssl1) return BULLISH;
    if (close < ssl1) return BEARISH;
    return NEUTRAL;
  };

  // ssl2_color = buy_atr ? bullish : sell_atr ? bearish : neutral
  // buy_atr  = buy_inatr  && buy_cont
  //   buy_cont   = close > BBMC && close > sslDown2
  //   buy_inatr  = (close - atr * 0.9) < sslDown2
  // sell_atr = sell_inatr && sell_cont
  //   sell_cont  = close < BBMC && close < sslDown2
  //   sell_inatr = (atr * 0.9 + close) > sslDown2
  const getSsl2Color = (close, ssl2, baseline, atr) => {
    if (close == null || ssl2 == null || baseline == null || atr == null)
      return NEUTRAL;
    const atr_crit = 0.9;
    const upper_half = atr * atr_crit + close;
    const lower_half = close - atr * atr_crit;
    const buy_inatr = lower_half < ssl2;
    const sell_inatr = upper_half > ssl2;
    const buy_cont = close > baseline && close > ssl2;
    const sell_cont = close < baseline && close < ssl2;
    const buy_atr = buy_inatr && buy_cont;
    const sell_atr = sell_inatr && sell_cont;
    if (buy_atr) return BULLISH;
    if (sell_atr) return BEARISH;
    return NEUTRAL;
  };

  /* ================= CREATE SSL ================= */

  useEffect(() => {
    if (!result) return;

    if (indicatorSeriesRef.current?.SSL_HYBRID) {
      Object.values(indicatorSeriesRef.current.SSL_HYBRID).forEach((s) => {
        if (s?.setData) {
          try {
            s.setData([]);
          } catch {}
        }
      });
      indicatorSeriesRef.current.SSL_HYBRID = null;
    }

    const groupedSeries = {};
    let upperChannelData = [];
    let lowerChannelData = [];

    // result.data is nested: { baseline: [{time,value}], upperChannel: [...], ... }
    const nestedData = result?.data || {};

    // raw flat array still available for cross-referencing atr, close etc.
    // We build a time-indexed lookup from the raw response if available
    // Since your mapper doesn't carry close/atr onto the series points yet,
    // we rebuild a lookup map from all available line arrays by index
    const baselineArr = nestedData.baseline || [];
    const upperArr = nestedData.upperChannel || [];
    const lowerArr = nestedData.lowerChannel || [];
    const ssl1Arr = nestedData.ssl1 || [];
    const ssl2Arr = nestedData.ssl2 || [];
    const atrUpperArr = nestedData.atrUpper || [];
    const atrLowerArr = nestedData.atrLower || [];

    // Build index lookup: time → { baseline, upperChannel, lowerChannel, ssl1, ssl2, atr }
    // atr = (atrUpper - close) / mult — but we don't have close here.
    // Instead carry the needed fields at mapping stage (see mapper fix below).
    // For now use point.close / point.atr if present, else fallback gracefully.

    const lineNames = [
      "baseline",
      "upperChannel",
      "lowerChannel",
      "ssl1",
      "ssl2",
      "atrUpper",
      "atrLower",
    ];

    const closeMap = new Map();

    const allSeries = [
      ...baselineArr,
      ...upperArr,
      ...lowerArr,
      ...ssl1Arr,
      ...ssl2Arr,
    ];

    allSeries.forEach((point) => {
      if (point?.time != null && point?.close != null) {
        closeMap.set(point.time, point.close);
      }
    });

    closeMapRef.current = closeMap;

    lineNames.forEach((lineName) => {
      const lineData = nestedData[lineName] || [];
      if (!lineData.length) return;

      const rowConfig = rows?.find((r) => r.key === lineName);
      const styleConfig = indicatorStyle?.SSL_HYBRID?.[lineName];
      const shouldShow = getDisplayVisibility(lineName);

      const series = addSeries("SSL_HYBRID", LineSeries, {
        color: styleConfig?.color || rowConfig?.color,
        lineWidth: styleConfig?.width || 2,
        lineStyle: styleConfig?.lineStyle || 0,
        visible: (styleConfig?.visible ?? true) && shouldShow,
        priceLineVisible: false,
        lastValueVisible: [
          "baseline",
          "ssl1",
          "ssl2",
          "atrUpper",
          "atrLower",
        ].includes(lineName),
      });

      if (!series) return;

      /* ================= DYNAMIC COLORS PER LINE ================= */

      if (lineName === "baseline") {
        const colored = lineData.map((point, i) => {
          const actualClose = closeMap.get(point.time) ?? point.close ?? null;

          return {
            time: point.time,
            value: point.value,
            color: getBaselineColor(
              actualClose,
              point.upperChannel ?? upperArr[i]?.value ?? null,
              point.lowerChannel ?? lowerArr[i]?.value ?? null,
            ),
          };
        });
        series.setData(colored);
      } else if (lineName === "upperChannel" || lineName === "lowerChannel") {
        // Channel lines use same color logic as baseline
        const colored = lineData.map((point, i) => {
          const actualClose = closeMap.get(point.time) ?? point.close ?? null;

          return {
            time: point.time,
            value: point.value,
            color: getBaselineColor(
              actualClose,
              upperArr[i]?.value ?? null,
              lowerArr[i]?.value ?? null,
            ),
          };
        });
        series.setData(colored);
      } else if (lineName === "ssl1") {
        const colored = lineData.map((point) => {
          const actualClose = closeMap.get(point.time) ?? point.close ?? null;

          return {
            time: point.time,
            value: point.value,
            color: getSsl1Color(actualClose, point.value),
          };
        });
        series.setData(colored);
      } else if (lineName === "ssl2") {
        const colored = lineData.map((point, i) => {
          const actualClose = closeMap.get(point.time) ?? point.close ?? null;

          return {
            time: point.time,
            value: point.value,
            color: getSsl2Color(
              actualClose,
              point.value,
              baselineArr[i]?.value ?? null,
              point.atr ?? null,
            ),
          };
        });
        series.setData(colored);
      } else {
        series.setData(lineData);
      }

      groupedSeries[lineName] = series;
      if (lineName === "upperChannel") upperChannelData = lineData;
      if (lineName === "lowerChannel") lowerChannelData = lineData;
    });

    groupedSeries.upperChannelData = upperChannelData;
    groupedSeries.lowerChannelData = lowerChannelData;
    indicatorSeriesRef.current.SSL_HYBRID = groupedSeries;
  }, [result]);

  /* ================= CANVAS INIT ================= */

  useEffect(() => {
    if (!containerRef || canvasRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = 1;
    containerRef.appendChild(canvas);
    canvasRef.current = canvas;
  }, [containerRef]);

  /* ================= DRAW BASELINE CLOUD ================= */

  const drawBaselineCloud = () => {
    const sslGroup = indicatorSeriesRef.current?.SSL_HYBRID;
    if (!sslGroup) return;

    const upper = sslGroup.upperChannelData || [];
    const lower = sslGroup.lowerChannelData || [];
    if (!upper.length || !lower.length) return;
    if (!canvasRef.current || !chart) return;

    const fill = indicatorStyle?.SSL_HYBRID?.baselineFill;
    const upperVisible = indicatorStyle?.SSL_HYBRID?.upperChannel?.visible ?? true;
    const lowerVisible = indicatorStyle?.SSL_HYBRID?.lowerChannel?.visible ?? true;

    if (!fill?.visible) return;
    if (!upperVisible || !lowerVisible) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = containerRef.getBoundingClientRect();

    canvas.width = rect.width;
    canvas.height = rect.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();

    for (let i = 0; i < upper.length; i++) {
      const p = upper[i];
      const x = chart.timeScale().timeToCoordinate(p.time);
      const y = sslGroup.upperChannel?.priceToCoordinate(p.value);
      if (x == null || y == null) continue;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    for (let i = lower.length - 1; i >= 0; i--) {
      const p = lower[i];
      const x = chart.timeScale().timeToCoordinate(p.time);
      const y = sslGroup.lowerChannel?.priceToCoordinate(p.value);
      if (x == null || y == null) continue;
      ctx.lineTo(x, y);
    }

    ctx.closePath();
    ctx.fillStyle = fill?.topFillColor1 || "rgba(33,150,243,0.15)";
    ctx.fill();
  };

  /* ================= REDRAW EVENTS ================= */

  useEffect(() => {
    if (!chart) return;
    const redraw = () => drawBaselineCloud();
    chart.timeScale().subscribeVisibleLogicalRangeChange(redraw);
    chart.subscribeCrosshairMove(redraw);
    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(redraw);
      chart.unsubscribeCrosshairMove(redraw);
    };
  }, [chart, indicatorStyle]);

  /* ================= STYLE UPDATE ================= */

  useEffect(() => {
    const sslGroup = indicatorSeriesRef.current?.SSL_HYBRID;
    if (!sslGroup) return;

    Object.entries(sslGroup).forEach(([key, series]) => {
      if (!series?.applyOptions) return;
      const style = indicatorStyle?.SSL_HYBRID?.[key];
      if (!style) return;
      const shouldShow = getDisplayVisibility(key);
      series.applyOptions({
        color: style.color,
        lineWidth: style.width,
        lineStyle: style.lineStyle,
        visible: (style.visible ?? true) && shouldShow,
      });
    });

    drawBaselineCloud();
  }, [indicatorStyle, result]);

  /* ================= CLEANUP ================= */

  useEffect(() => {
    return () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.remove();
      }
      canvasRef.current = null;
      if (indicatorSeriesRef.current?.SSL_HYBRID) {
        indicatorSeriesRef.current.SSL_HYBRID = null;
      }
    };
  }, []);

  return null;
}
