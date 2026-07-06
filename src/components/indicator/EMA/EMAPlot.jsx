import { useEffect, useRef } from "react";
import { LineSeries } from "lightweight-charts";

export default function EMAPlot({
  result,
  rows,
  indicatorStyle,
  indicatorSeriesRef,
  addSeries,
  chart,
  containerRef,
  indicatorConfigs,
}) {

  const canvasRef = useRef(null);

  /* ================= CREATE EMA ================= */

  useEffect(() => {

    if (!result) return;

    if (indicatorSeriesRef.current?.EMA) {
      Object.values(indicatorSeriesRef.current.EMA).forEach((s) => {
        if (s?.setData) {
          try { s.setData([]); } catch {}
        }
      });
      indicatorSeriesRef.current.EMA = null;
    }

    const groupedSeries = {};

    let upperData = [];
    let lowerData = [];

    Object.entries(result?.data || {}).forEach(([lineName, lineData]) => {

      const rowConfig = rows?.find((r) => r.key === lineName);
      const styleConfig = indicatorStyle?.EMA?.[lineName];

      const series = addSeries("EMA", LineSeries, {
        color: styleConfig?.color || rowConfig?.color || "#42a5f5",
        lineWidth: styleConfig?.width || 2,
        lineStyle: styleConfig?.lineStyle,
        visible: styleConfig?.visible ?? true,
        priceLineVisible: false,
        lastValueVisible: lineName === "ema" || lineName === "smoothingMA",
      });

      if (!series) return;

      series.setData(lineData);

      groupedSeries[lineName] = series;

      if (lineName === "bbUpper") upperData = lineData;
      if (lineName === "bbLower") lowerData = lineData;

    });

    groupedSeries.bbUpperData = upperData;
    groupedSeries.bbLowerData = lowerData;

    indicatorSeriesRef.current.EMA = groupedSeries;

  }, [result]);



  /* ================= CANVAS INIT ================= */

  useEffect(() => {

    if (!containerRef || canvasRef.current) return;

    const canvas = document.createElement("canvas");

    canvas.style.position = "absolute";
    canvas.style.left = "0px";
    canvas.style.top = "0px";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = 1;

    containerRef.appendChild(canvas);

    canvasRef.current = canvas;

  }, [containerRef]);



  /* ================= DRAW CLOUD ================= */

  const drawCloud = () => {

    const emaGroup = indicatorSeriesRef.current?.EMA;
    if (!emaGroup) return;

    const upper = emaGroup.bbUpperData || [];
    const lower = emaGroup.bbLowerData || [];

    if (!upper.length || !lower.length) return;
    if (!canvasRef.current || !chart) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const rect = containerRef.getBoundingClientRect();

    canvas.width = rect.width;
    canvas.height = rect.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const maType = indicatorConfigs?.EMA?.maType;

    if (maType !== "SMA + Bollinger Bands") return;

    const fill = indicatorStyle?.EMA?.bbFill;

    if (!fill?.visible) return;

    ctx.save();
    // Clip to timeScale width (prevent bleeding into y-axis) and canvas height (prevent bleeding into oscillators)
    ctx.rect(0, 0, chart.timeScale().width(), canvas.height);
    ctx.clip();

    ctx.beginPath();

    /* upper band */

    for (let i = 0; i < upper.length; i++) {

      const p = upper[i];

      const x = chart.timeScale().timeToCoordinate(p.time);
      const y = emaGroup.bbUpper.priceToCoordinate(p.value);

      if (x == null || y == null) continue;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);

    }

    /* lower band reverse */

    for (let i = lower.length - 1; i >= 0; i--) {

      const p = lower[i];

      const x = chart.timeScale().timeToCoordinate(p.time);
      const y = emaGroup.bbLower.priceToCoordinate(p.value);

      if (x == null || y == null) continue;

      ctx.lineTo(x, y);

    }

    ctx.closePath();

    ctx.fillStyle = fill?.topFillColor1 || "rgba(76,175,80,0.2)";
    ctx.fill();
    ctx.restore();
  };



  /* ================= REDRAW EVENTS ================= */

  useEffect(() => {

    if (!chart) return;

    const redraw = () => drawCloud();

    chart.timeScale().subscribeVisibleTimeRangeChange(redraw);
    chart.subscribeCrosshairMove(redraw);

    drawCloud();

    return () => {
      chart.timeScale().unsubscribeVisibleTimeRangeChange(redraw);
      chart.unsubscribeCrosshairMove(redraw);
    };

  }, [chart, indicatorConfigs, indicatorStyle, result]);



  /* ================= STYLE UPDATE ================= */

  useEffect(() => {

    const emaGroup = indicatorSeriesRef.current?.EMA;
    if (!emaGroup) return;

    Object.entries(emaGroup).forEach(([key, series]) => {

      if (!series?.applyOptions) return;

      const style = indicatorStyle?.EMA?.[key];
      if (!style) return;

      series.applyOptions({
        color: style.color,
        lineWidth: style.width,
        lineStyle: style.lineStyle,
        visible: style.visible,
      });

    });

    drawCloud();

  }, [indicatorStyle, result]);

  useEffect(() => {
    return () => {
      const canvas = canvasRef.current;

      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.remove();
      }

      canvasRef.current = null;

      if (indicatorSeriesRef.current?.EMA) {
        indicatorSeriesRef.current.EMA = null;
      }
    };
  }, []);

  return null;
}