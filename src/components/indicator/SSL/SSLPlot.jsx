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

  /* ================= DISPLAY MODE ================= */

  const getDisplayVisibility = (lineName) => {
    const displayMode =
      indicatorStyle?.SSL_HYBRID?.displayMode || "FULL_DISPLAY";

    switch (displayMode) {
      case "BASELINE_ONLY":
        return ["baseline", "upperChannel", "lowerChannel"].includes(
          lineName,
        );

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

    Object.entries(result?.data || {}).forEach(([lineName, lineData]) => {
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

      /* ================= DYNAMIC BASELINE COLORS ================= */

      if (lineName === "baseline") {
        const coloredBaseline = lineData.map((point, index) => {
          const upper = result?.data?.upperChannel?.[index];
          const lower = result?.data?.lowerChannel?.[index];

          const close =
            result?.candles?.[index]?.close ??
            result?.ohlc?.[index]?.close ??
            result?.close?.[index];

          let color = "#666666";

          if (
            close != null &&
            upper?.value != null &&
            close > upper.value
          ) {
            color = "#00c3ff";
          } else if (
            close != null &&
            lower?.value != null &&
            close < lower.value
          ) {
            color = "#ff0062";
          }

          return {
            time: point.time,
            value: point.value,
            color,
          };
        });

        series.setData(coloredBaseline);
      } else {
        series.setData(lineData);
      }

      groupedSeries[lineName] = series;

      if (lineName === "upperChannel") {
        upperChannelData = lineData;
      }

      if (lineName === "lowerChannel") {
        lowerChannelData = lineData;
      }
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

    const upperVisible =
      indicatorStyle?.SSL_HYBRID?.upperChannel?.visible ?? true;

    const lowerVisible =
      indicatorStyle?.SSL_HYBRID?.lowerChannel?.visible ?? true;

    if (!fill?.visible) return;

    if (!upperVisible || !lowerVisible) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const rect = containerRef.getBoundingClientRect();

    canvas.width = rect.width;
    canvas.height = rect.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.beginPath();

    /* ================= UPPER PATH ================= */

    for (let i = 0; i < upper.length; i++) {
      const p = upper[i];

      const x = chart.timeScale().timeToCoordinate(p.time);

      const y = sslGroup.upperChannel?.priceToCoordinate(p.value);

      if (x == null || y == null) continue;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    /* ================= LOWER PATH ================= */

    for (let i = lower.length - 1; i >= 0; i--) {
      const p = lower[i];

      const x = chart.timeScale().timeToCoordinate(p.time);

      const y = sslGroup.lowerChannel?.priceToCoordinate(p.value);

      if (x == null || y == null) continue;

      ctx.lineTo(x, y);
    }

    ctx.closePath();

    ctx.fillStyle =
      fill?.topFillColor1 || "rgba(33,150,243,0.15)";

    ctx.fill();
  };

  /* ================= REDRAW EVENTS ================= */

  useEffect(() => {
    if (!chart) return;

    const redraw = () => drawBaselineCloud();

    chart.timeScale().subscribeVisibleLogicalRangeChange(redraw);

    chart.subscribeCrosshairMove(redraw);

    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(
        redraw,
      );

      chart.unsubscribeCrosshairMove(redraw);
    };
  }, [chart, indicatorStyle]);

  /* ================= STYLE UPDATE ================= */

  useEffect(() => {
    const sslGroup = indicatorSeriesRef.current?.SSL_HYBRID;

    if (!sslGroup) return;

    Object.entries(sslGroup).forEach(([key, series]) => {
      if (!series?.applyOptions) return;

      const style =
        indicatorStyle?.SSL_HYBRID?.[key];

      if (!style) return;

      const shouldShow = getDisplayVisibility(key);

      series.applyOptions({
        color: style.color,
        lineWidth: style.width,
        lineStyle: style.lineStyle,

        visible:
          (style.visible ?? true) && shouldShow,
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