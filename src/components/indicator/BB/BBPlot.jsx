import { useEffect, useRef } from "react";
import { LineSeries } from "lightweight-charts";

export default function BBPlot({
  result,
  rows,
  indicatorStyle,
  indicatorSeriesRef,
  addSeries,
  chart,
  containerRef,
}) {
  const canvasRef = useRef(null);

  /* ================= CREATE BB ================= */

  useEffect(() => {
    if (!result) return;

    if (indicatorSeriesRef.current?.BB) {
      Object.values(indicatorSeriesRef.current.BB).forEach((s) => {
        if (s?.setData) {
          try {
            s.setData([]);
          } catch {}
        }
      });

      indicatorSeriesRef.current.BB = null;
    }

    const groupedSeries = {};

    let upperData = [];
    let lowerData = [];

    /* ================= MAIN LINES ================= */

    Object.entries(result?.data || {}).forEach(([lineName, lineData]) => {
      const rowConfig = rows?.find((r) => r.key === lineName);
      const styleConfig = indicatorStyle?.BB?.[lineName];

      const series = addSeries("BB", LineSeries, {
        color: styleConfig?.color || rowConfig?.color || "#26a69a",
        lineWidth: styleConfig?.width || 2,
        lineStyle: styleConfig?.lineStyle,
        visible: styleConfig?.visible ?? true,
        priceLineVisible: false,
        lastValueVisible: true,
      });

      if (!series) return;

      series.setData(lineData);

      groupedSeries[lineName] = series;

      if (lineName === "upper") upperData = lineData;
      if (lineName === "lower") lowerData = lineData;
    });

    groupedSeries.upperData = upperData;
    groupedSeries.lowerData = lowerData;

    indicatorSeriesRef.current.BB = groupedSeries;
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

  /* ================= DRAW BB CLOUD ================= */

  const drawBBCloud = () => {
    const bbGroup = indicatorSeriesRef.current?.BB;
    if (!bbGroup) return;

    const upper = bbGroup.upperData || [];
    const lower = bbGroup.lowerData || [];

    if (!upper?.length || !lower?.length) return;
    if (!canvasRef.current || !chart) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const rect = containerRef.getBoundingClientRect();

    canvas.width = rect.width;
    canvas.height = rect.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const fill = indicatorStyle?.BB?.bbFill;

    if (!fill?.visible) return;

    ctx.save();
    // Clip to timeScale width (prevent bleeding into y-axis) and canvas height (prevent bleeding into oscillators)
    ctx.rect(0, 0, chart.timeScale().width(), canvas.height);
    ctx.clip();

    ctx.beginPath();

    for (let i = 0; i < upper?.length; i++) {
      const p = upper[i];

      const x = chart.timeScale().timeToCoordinate(p.time);
      const y = bbGroup.upper.priceToCoordinate(p.value);

      if (x == null || y == null) continue;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    for (let i = lower?.length - 1; i >= 0; i--) {
      const p = lower[i];

      const x = chart.timeScale().timeToCoordinate(p.time);
      const y = bbGroup.lower.priceToCoordinate(p.value);

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

    const redraw = () => drawBBCloud();

    chart.timeScale().subscribeVisibleTimeRangeChange(redraw);
    chart.subscribeCrosshairMove(redraw);

    drawBBCloud();

    return () => {
      chart.timeScale().unsubscribeVisibleTimeRangeChange(redraw);
      chart.unsubscribeCrosshairMove(redraw);
    };
  }, [chart, indicatorStyle, result]);

  /* ================= STYLE UPDATE ================= */

  useEffect(() => {
    const bbGroup = indicatorSeriesRef.current?.BB;
    if (!bbGroup) return;

    Object.entries(bbGroup).forEach(([key, series]) => {
      if (!series?.applyOptions) return;

      const style = indicatorStyle?.BB?.[key];
      if (!style) return;

      series.applyOptions({
        color: style.color,
        lineWidth: style.width,
        lineStyle: style.lineStyle,
        visible: style.visible,
      });
    });

    drawBBCloud();
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

      if (indicatorSeriesRef.current?.BB) {
        indicatorSeriesRef.current.BB = null;
      }
    };
  }, []);

  return null;
}
