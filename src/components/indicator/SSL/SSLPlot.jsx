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
  mainSeriesRef,
  candlesRef,
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

  /* ================= APPLY BAR COLORS TO MAIN CANDLES ================= */

  const applyBarColors = (closeMap, upperArr, lowerArr) => {
    // Only color bars if color_bars is enabled (default true) and series exists
    const colorBars = indicatorStyle?.SSL_HYBRID?.candles?.visible ?? true;
    if (!colorBars) return;

    const mainSeries = mainSeriesRef?.current;
    const candles = candlesRef?.current;
    if (!mainSeries || !candles?.length) return;

    const upperByTime = new Map(upperArr.map((p) => [p.time, p.value]));
    const lowerByTime = new Map(lowerArr.map((p) => [p.time, p.value]));

    const coloredCandles = candles.map((candle) => {
      const t = candle.time;
      const close = closeMap.get(t) ?? candle.close;
      const upper = upperByTime.get(t) ?? null;
      const lower = lowerByTime.get(t) ?? null;
      const barColor = getBaselineColor(close, upper, lower);
      
      const res = { ...candle };
      if (barColor != null) {
        res.color = barColor;
        res.wickColor = barColor;
        res.borderColor = barColor;
      }
      return res;
    });

    try {
      mainSeries.setData(coloredCandles);
    } catch (e) {
      console.warn("SSL bar color apply failed:", e);
    }
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

    const baselineArr = nestedData.baseline || [];
    const upperArr = nestedData.upperChannel || [];
    const lowerArr = nestedData.lowerChannel || [];
    const ssl1Arr = nestedData.ssl1 || [];
    const ssl2Arr = nestedData.ssl2 || [];
    const atrUpperArr = nestedData.atrUpper || [];
    const atrLowerArr = nestedData.atrLower || [];

    // Build time → close lookup from all available data
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

    // Also seed from candlesRef for reliability
    if (candlesRef?.current) {
      candlesRef.current.forEach((c) => {
        if (c?.time != null && c?.close != null) {
          closeMap.set(c.time, c.close);
        }
      });
    }

    closeMapRef.current = closeMap;

    const lineNames = [
      "baseline",
      "upperChannel",
      "lowerChannel",
      "ssl1",
      "ssl2",
      "atrUpper",
      "atrLower",
    ];

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
        const colored = [];
        lineData.forEach((point, i) => {
          if (point.value == null || Number.isNaN(Number(point.value))) return;
          const actualClose = closeMap.get(point.time) ?? point.close ?? null;

          colored.push({
            time: point.time,
            value: point.value,
            color: getBaselineColor(
              actualClose,
              point.upperChannel ?? upperArr[i]?.value ?? null,
              point.lowerChannel ?? lowerArr[i]?.value ?? null,
            ),
          });
        });
        series.setData(colored);
      } else if (lineName === "upperChannel" || lineName === "lowerChannel") {
        // Channel lines use same color logic as baseline
        const colored = [];
        lineData.forEach((point, i) => {
          if (point.value == null || Number.isNaN(Number(point.value))) return;
          const actualClose = closeMap.get(point.time) ?? point.close ?? null;

          colored.push({
            time: point.time,
            value: point.value,
            color: getBaselineColor(
              actualClose,
              upperArr[i]?.value ?? null,
              lowerArr[i]?.value ?? null,
            ),
          });
        });
        series.setData(colored);
      } else if (lineName === "ssl1") {
        const colored = [];
        lineData.forEach((point) => {
          if (point.value == null || Number.isNaN(Number(point.value))) return;
          const actualClose = closeMap.get(point.time) ?? point.close ?? null;

          colored.push({
            time: point.time,
            value: point.value,
            color: getSsl1Color(actualClose, point.value),
          });
        });
        series.setData(colored);
      } else if (lineName === "ssl2") {
        const colored = [];
        lineData.forEach((point, i) => {
          if (point.value == null || Number.isNaN(Number(point.value))) return;
          const actualClose = closeMap.get(point.time) ?? point.close ?? null;

          colored.push({
            time: point.time,
            value: point.value,
            color: getSsl2Color(
              actualClose,
              point.value,
              baselineArr[i]?.value ?? null,
              point.atr ?? null,
            ),
          });
        });
        series.setData(colored);
      } else {
        const validData = lineData.filter(p => p.value != null && !Number.isNaN(Number(p.value)));
        series.setData(validData);
      }

      groupedSeries[lineName] = series;
      if (lineName === "upperChannel") upperChannelData = lineData;
      if (lineName === "lowerChannel") lowerChannelData = lineData;
    });

    groupedSeries.upperChannelData = upperChannelData;
    groupedSeries.lowerChannelData = lowerChannelData;
    indicatorSeriesRef.current.SSL_HYBRID = groupedSeries;

    // Apply bar colors to the main candlestick series
    applyBarColors(closeMap, upperArr, lowerArr);
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
      const options = {
        visible: (style.visible ?? true) && shouldShow,
      };
      if (style.color != null) options.color = style.color;
      if (style.width != null) options.lineWidth = style.width;
      if (style.lineStyle != null) options.lineStyle = style.lineStyle;
      
      series.applyOptions(options);
    });

    drawBaselineCloud();

    // Re-apply bar colors when style changes (e.g., color_bars toggled)
    const nestedData = result?.data || {};
    const upperArr = nestedData.upperChannel || [];
    const lowerArr = nestedData.lowerChannel || [];
    applyBarColors(closeMapRef.current, upperArr, lowerArr);
  }, [indicatorStyle, result]);

  /* ================= CLEANUP ================= */

  useEffect(() => {
    return () => {
      // Restore default candle colors on indicator removal
      const mainSeries = mainSeriesRef?.current;
      const candles = candlesRef?.current;
      if (mainSeries && candles?.length) {
        try {
          const restored = candles.map(({ color, wickColor, borderColor, ...rest }) => rest);
          mainSeries.setData(restored);
        } catch {}
      }

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

