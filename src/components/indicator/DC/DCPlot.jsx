import { useEffect, useRef } from "react";
import { LineSeries } from "lightweight-charts";

export default function DCPlot({
  result,
  rows,
  indicatorStyle,
  indicatorSeriesRef,
  addSeries,
  chart,
  containerRef,
}) {
  const canvasRef = useRef(null);

  /* ================= CREATE DC ================= */

  useEffect(() => {
    if (!result) return;

    if (indicatorSeriesRef.current?.DC) {
      Object.values(indicatorSeriesRef.current.DC).forEach((s) => {
        if (s?.setData) {
          try {
            s.setData([]);
          } catch {}
        }
      });

      indicatorSeriesRef.current.DC = null;
    }

    const groupedSeries = {};

    let upperData = [];
    let lowerData = [];

    /* ================= MAIN LINES ================= */

    Object.entries(result?.data || {}).forEach(([lineName, lineData]) => {
      const rowConfig = rows?.find((r) => r.key === lineName);
      const styleConfig = indicatorStyle?.DC?.[lineName];

      const series = addSeries("DC", LineSeries, {
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

    indicatorSeriesRef.current.DC = groupedSeries;

    drawDCCloud();
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

  /* ================= DRAW DC CLOUD ================= */

  const drawDCCloud = () => {
    const dcGroup = indicatorSeriesRef.current?.DC;
    if (!dcGroup) return;

    const upper = dcGroup.upperData || [];
    const lower = dcGroup.lowerData || [];

    if (!upper?.length || !lower?.length) return;
    if (!canvasRef.current || !chart) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const rect = containerRef.getBoundingClientRect();

    canvas.width = rect.width;
    canvas.height = rect.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const fill = indicatorStyle?.DC?.bbFill;

    if (!fill?.visible) return;

    ctx.beginPath();

    /* ---------- UPPER LINE ---------- */

    for (let i = 0; i < upper?.length; i++) {
      const p = upper[i];

      const x = chart.timeScale().timeToCoordinate(p.time);
      const y = dcGroup.upper.priceToCoordinate(p.value);

      if (x == null || y == null) continue;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    /* ---------- LOWER LINE ---------- */

    for (let i = lower?.length - 1; i >= 0; i--) {
      const p = lower[i];

      const x = chart.timeScale().timeToCoordinate(p.time);
      const y = dcGroup.lower.priceToCoordinate(p.value);

      if (x == null || y == null) continue;

      ctx.lineTo(x, y);
    }

    ctx.closePath();

    ctx.fillStyle = fill?.topFillColor1 || "rgba(76,175,80,0.2)";
    ctx.fill();
  };

  /* ================= REDRAW EVENTS ================= */

  useEffect(() => {
    if (!chart) return;

    const redraw = () => drawDCCloud();

    const unsubscribeTime = chart.timeScale().subscribeVisibleLogicalRangeChange
      ? chart.timeScale().subscribeVisibleLogicalRangeChange(redraw)
      : null;

    const unsubscribeCrosshair = chart.subscribeCrosshairMove
      ? chart.subscribeCrosshairMove(redraw)
      : null;

    return () => {
      if (unsubscribeTime) unsubscribeTime();
      if (unsubscribeCrosshair) unsubscribeCrosshair();
    };
  }, [chart, indicatorStyle, result]);

  /* ================= STYLE UPDATE ================= */

  useEffect(() => {
    const dcGroup = indicatorSeriesRef.current?.DC;
    if (!dcGroup) return;

    Object.entries(dcGroup).forEach(([key, series]) => {
      if (!series?.applyOptions) return;

      const style = indicatorStyle?.DC?.[key];
      if (!style) return;

      series.applyOptions({
        color: style.color,
        lineWidth: style.width,
        lineStyle: style.lineStyle,
        visible: style.visible,
      });
    });

    drawDCCloud();
  }, [indicatorStyle]);

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

      if (indicatorSeriesRef.current?.DC) {
        indicatorSeriesRef.current.DC = null;
      }
    };
  }, []);

  return null;
}
