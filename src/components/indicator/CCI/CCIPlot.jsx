import { useEffect, useRef } from "react";
import { LineSeries, BaselineSeries } from "lightweight-charts";

export default function CCIPlot({
  id,
  result,
  rows,
  indicatorStyle,
  indicatorSeriesRef,
  addSeries,
  chart,
  containerRef,
  panesRef,
}) {
  const canvasRef = useRef(null);

  /* ================= CREATE SERIES ================= */

  useEffect(() => {
    if (!result) return;

    // Instance-based cleanup
    if (indicatorSeriesRef.current?.[id]) {
      Object.values(indicatorSeriesRef.current[id]).forEach((s) => {
        if (s && typeof s.setData === "function") {
          try {
            s.setData([]);
          } catch {}
        }
      });
      indicatorSeriesRef.current[id] = null;
    }

    const groupedSeries = {};
    const data = result.data || {};
    const style = indicatorStyle?.[id] || indicatorStyle?.CCI;

    const upper = style?.upperBand?.value ?? 100;
    const middle = style?.middleBand?.value ?? 0;
    const lower = style?.lowerBand?.value ?? -100;

    /* ================= MAIN LINES ================= */

    Object.entries(data).forEach(([lineName, lineData]) => {
      const styleConfig = style?.[lineName];

      const series = addSeries(id, LineSeries, {
        color: styleConfig?.color,
        lineWidth: styleConfig?.width,
        lineStyle: styleConfig?.lineStyle ?? 0,
        visible: styleConfig?.visible ?? true,
        priceLineVisible: false,
        lastValueVisible: true,
      });

      if (!series) return;
      series.setData(lineData);
      groupedSeries[lineName] = series;

      // Store data for cloud fill
      if (lineName === "bbUpper") groupedSeries.bbUpperData = lineData;
      if (lineName === "bbLower") groupedSeries.bbLowerData = lineData;
      if (lineName === "cciLine") groupedSeries.cciData = lineData;
    });

    /* ================= LEVEL BANDS ================= */

    const cciData = groupedSeries.cciData || [];
    const makeLevelData = (v) => cciData.map((p) => ({ time: p.time, value: v }));

    const bands = ["upperBand", "middleBand", "lowerBand"];
    const bandValues = { upperBand: upper, middleBand: middle, lowerBand: lower };

    bands.forEach((b) => {
      const bStyle = style?.[b];
      const series = addSeries(id, LineSeries, {
        color: bStyle?.color,
        lineWidth: bStyle?.width,
        lineStyle: bStyle?.lineStyle ?? 2,
        visible: bStyle?.visible ?? true,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      if (series) {
        series.setData(makeLevelData(bandValues[b]));
        groupedSeries[b] = series;
      }
    });

    /* ================= BACKGROUND FILL ================= */

    const bgFill = style?.bgFill;
    const bgSeries = addSeries(id, BaselineSeries, {
      baseValue: { type: "price", price: lower },
      topFillColor1: bgFill?.topFillColor1,
      topFillColor2: bgFill?.topFillColor2,
      bottomFillColor1: "rgba(0,0,0,0)",
      bottomFillColor2: "rgba(0,0,0,0)",
      topLineColor: "transparent",
      bottomLineColor: "transparent",
      visible: bgFill?.visible ?? true,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    if (bgSeries) {
      bgSeries.setData(cciData.map((p) => ({ time: p.time, value: upper })));
      groupedSeries.bgFill = bgSeries;
    }

    indicatorSeriesRef.current[id] = groupedSeries;
  }, [result, id]);

  /* ================= CANVAS INIT ================= */

  useEffect(() => {
    if (!panesRef?.current || !containerRef) return;

    let retryCount = 0;
    const MAX_RETRIES = 10;

    const initCanvas = () => {
      const pane = panesRef.current[id];
      const paneDiv = pane?.div;
      
      if (!paneDiv) {
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          setTimeout(initCanvas, 100);
        }
        return;
      }

      if (canvasRef.current && canvasRef.current.parentNode === containerRef) {
        if (canvasRef.current) drawBBCloud();
        return;
      }

      if (canvasRef.current) canvasRef.current.remove();

      const canvas = document.createElement("canvas");
      canvas.style.position = "absolute";
      canvas.style.top = "0";
      canvas.style.left = "0";
      canvas.style.pointerEvents = "none";
      canvas.style.zIndex = "10";

      containerRef.appendChild(canvas);
      canvasRef.current = canvas;
      drawBBCloud();
    };

    initCanvas();
  }, [panesRef, id, result, containerRef]);

  /* ================= DRAW BB CLOUD ================= */

  const drawBBCloud = () => {
    const pane = panesRef.current?.[id];
    const paneDiv = pane?.div;
    const paneChart = pane?.chart;

    if (!canvasRef.current || !paneDiv || !paneChart || !containerRef) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const paneRect = paneDiv.getBoundingClientRect();
    const chartRect = containerRef.getBoundingClientRect();

    const topOffset = paneRect.top - chartRect.top;
    const leftOffset = paneRect.left - chartRect.left;

    canvas.width = chartRect.width;
    canvas.height = chartRect.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cciGroup = indicatorSeriesRef.current?.[id];
    if (!cciGroup) return;

    const upperData = cciGroup.bbUpperData || [];
    const lowerData = cciGroup.bbLowerData || [];

    if (!upperData.length || !lowerData.length) return;

    const style = indicatorStyle?.[id] || indicatorStyle?.CCI;
    const fill = style?.bbFill;
    if (!fill?.visible) return;

    ctx.save();
    ctx.translate(leftOffset, topOffset);

    ctx.beginPath();
    for (let i = 0; i < upperData.length; i++) {
      const p = upperData[i];
      const x = paneChart.timeScale().timeToCoordinate(p.time);
      const y = cciGroup.bbUpper.priceToCoordinate(p.value);
      if (x == null || y == null) continue;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    for (let i = lowerData.length - 1; i >= 0; i--) {
      const p = lowerData[i];
      const x = paneChart.timeScale().timeToCoordinate(p.time);
      const y = cciGroup.bbLower.priceToCoordinate(p.value);
      if (x == null || y == null) continue;
      ctx.lineTo(x, y);
    }

    ctx.closePath();
    ctx.fillStyle = fill?.topFillColor1 || "rgba(33,150,243,0.2)";
    ctx.fill();
    ctx.restore();
  };

  /* ================= REDRAW HOOKS ================= */

  useEffect(() => {
    const pane = panesRef.current?.[id];
    const paneChart = pane?.chart;
    if (!paneChart) return;

    const redraw = () => {
      if (canvasRef.current) drawBBCloud();
    };

    paneChart.timeScale().subscribeVisibleTimeRangeChange(redraw);
    paneChart.timeScale().subscribeVisibleLogicalRangeChange(redraw);
    paneChart.subscribeCrosshairMove(redraw);

    return () => {
      paneChart.timeScale().unsubscribeVisibleTimeRangeChange(redraw);
      paneChart.timeScale().unsubscribeVisibleLogicalRangeChange(redraw);
      paneChart.unsubscribeCrosshairMove(redraw);
    };
  }, [panesRef, id]);

  /* ================= STYLE UPDATE ================= */

  useEffect(() => {
    const cciGroup = indicatorSeriesRef.current?.[id];
    if (!cciGroup) return;

    const style = indicatorStyle?.[id] || indicatorStyle?.CCI;
    const lines = ["cciLine", "cciMa", "bbUpper", "bbLower", "upperBand", "middleBand", "lowerBand"];

    lines.forEach((key) => {
      if (!cciGroup[key]) return;
      const s = style?.[key];
      cciGroup[key].applyOptions({
        color: s?.color,
        lineWidth: s?.width,
        lineStyle: s?.lineStyle ?? 0,
        visible: s?.visible,
      });
    });

    if (cciGroup.bgFill) {
        const bgFill = style?.bgFill;
        cciGroup.bgFill.applyOptions({
            topFillColor1: bgFill?.topFillColor1,
            topFillColor2: bgFill?.topFillColor2,
            visible: bgFill?.visible ?? true,
        });
    }

    if (canvasRef.current) drawBBCloud();
  }, [indicatorStyle, result, id]);

  /* ================= CLEANUP ================= */

  useEffect(() => {
    return () => {
      if (canvasRef.current) canvasRef.current.remove();
      canvasRef.current = null;
      if (indicatorSeriesRef.current?.[id]) {
        indicatorSeriesRef.current[id] = null;
      }
    };
  }, [id]);

  return null;
}