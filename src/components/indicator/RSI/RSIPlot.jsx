import { useEffect, useRef } from "react";
import { LineSeries, BaselineSeries, AreaSeries } from "lightweight-charts";

export default function RSIPlot({
  id,
  result,
  rows,
  indicatorStyle,
  indicatorSeriesRef,
  addSeries,
  indicatorConfigs,
  chart,
  panesRef,
  containerRef,
  indicatorVisibility,
}) {
  const canvasRef = useRef(null);
  console.log("📍 RSIPlot Render", { id, hasResult: !!result, hasPanes: !!panesRef?.current });

  /* ================= CREATE RSI ================= */

  useEffect(() => {
    if (!result) return;

    if (indicatorSeriesRef.current?.[id]) {
      Object.values(indicatorSeriesRef.current[id]).forEach((s) => {
        if (s && typeof s.setData === "function") {
          try {
            chart?.removeSeries(s);
          } catch {}
        }
      });

      indicatorSeriesRef.current[id] = null;
    }

    const groupedSeries = {};
    let rsiData = [];

    let bbUpperData = [];
    let bbLowerData = [];

    const style = indicatorStyle?.[id] || indicatorStyle?.RSI;
    const upper = style?.upper?.value ?? 70;
    const middle = style?.middle?.value ?? 50;
    const lower = style?.lower?.value ?? 30;

    const bandFill = style?.bandFill;
    const obFill = style?.obFill;
    const osFill = style?.osFill;

    Object.entries(result?.data).forEach(([lineName, lineData]) => {
      const rowConfig = rows?.find((r) => r.key === lineName);
      const styleConfig = style?.[lineName];

      const series = addSeries(id, LineSeries, {
        color: styleConfig?.color || rowConfig?.color || "rgba(38,166,154,1)",
        lineWidth: styleConfig?.width || 2,
        visible: styleConfig?.visible ?? true,
        priceLineVisible: false,
        lastValueVisible: lineName === "rsi" || lineName === "smoothingMA",
      });

      if (!series) return;

      series.setData(lineData);

      groupedSeries[lineName] = series;

      if (lineName === "rsi") rsiData = lineData;

      if (lineName === "bbUpper") {
        groupedSeries.bbUpper = series;
        bbUpperData = lineData;
      }

      if (lineName === "bbLower") {
        groupedSeries.bbLower = series;
        bbLowerData = lineData;
      }
    });

    const makeLevelData = (value) =>
      rsiData.map((p) => ({
        time: p.time,
        value,
      }));

    const upperLine = addSeries(id, LineSeries, {
      color: style?.upper?.color,
      lineWidth: style?.upper?.width ?? 1,
      lineStyle: style?.upper?.lineStyle ?? 2,
      visible: style?.upper?.visible ?? true,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const middleLine = addSeries(id, LineSeries, {
      color: style?.middle?.color,
      lineWidth: style?.middle?.width ?? 1,
      lineStyle: style?.middle?.lineStyle ?? 2,
      visible: style?.middle?.visible ?? true,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const lowerLine = addSeries(id, LineSeries, {
      color: style?.lower?.color,
      lineWidth: style?.lower?.width ?? 1,
      lineStyle: style?.lower?.lineStyle ?? 2,
      visible: style?.lower?.visible ?? true,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    upperLine.setData(makeLevelData(upper));
    middleLine.setData(makeLevelData(middle));
    lowerLine.setData(makeLevelData(lower));

    groupedSeries.upper = upperLine;
    groupedSeries.middle = middleLine;
    groupedSeries.lower = lowerLine;

    const bandData = rsiData?.map((p) => ({
      time: p.time,
      value: upper,
    }));

    const bandBackgroundSeries = addSeries(id, BaselineSeries, {
      baseValue: { type: "price", price: lower },
      topFillColor1: bandFill?.topFillColor1,
      topFillColor2: bandFill?.topFillColor2,
      bottomFillColor1: "rgba(0,0,0,0)",
      bottomFillColor2: "rgba(0,0,0,0)",
      topLineColor: "transparent",
      bottomLineColor: "transparent",
      visible: bandFill?.visible ?? true,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    bandBackgroundSeries.setData(bandData);

    const overboughtSeries = addSeries(id, BaselineSeries, {
      baseValue: { type: "price", price: upper },
      topFillColor1: obFill?.topFillColor1,
      topFillColor2: obFill?.topFillColor2,
      bottomFillColor1: "rgba(0,0,0,0)",
      bottomFillColor2: "rgba(0,0,0,0)",
      topLineColor: "transparent",
      bottomLineColor: "transparent",
      visible: obFill?.visible ?? true,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const oversoldSeries = addSeries(id, BaselineSeries, {
      baseValue: { type: "price", price: lower },
      bottomFillColor1: osFill?.bottomFillColor1,
      bottomFillColor2: osFill?.bottomFillColor2,
      topFillColor1: "rgba(0,0,0,0)",
      topFillColor2: "rgba(0,0,0,0)",
      topLineColor: "transparent",
      bottomLineColor: "transparent",
      visible: osFill?.visible ?? true,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const overboughtData = [];
    const oversoldData = [];

    rsiData.forEach((p) => {
      overboughtData.push({
        time: p.time,
        value: p.value > upper ? p.value : upper,
      });

      oversoldData.push({
        time: p.time,
        value: p.value < lower ? p.value : lower,
      });
    });

    overboughtSeries.setData(overboughtData);
    oversoldSeries.setData(oversoldData);

    groupedSeries.bandBackground = bandBackgroundSeries;
    groupedSeries.overboughtFill = overboughtSeries;
    groupedSeries.oversoldFill = oversoldSeries;

    groupedSeries.rsiData = rsiData;
    groupedSeries.bbUpperData = bbUpperData;
    groupedSeries.bbLowerData = bbLowerData;

    indicatorSeriesRef.current[id] = groupedSeries;
  }, [result]);

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

      // If canvas already exists and is in the correct div, don't recreate
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
      canvas.style.zIndex = "10"; // Higher z-index

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

    const rsiGroup = indicatorSeriesRef.current?.[id];
    if (!rsiGroup) return;

    const upperData = rsiGroup.bbUpperData || [];
    const lowerData = rsiGroup.bbLowerData || [];

    if (!upperData.length || !lowerData.length) return;

    const style = indicatorStyle?.[id] || indicatorStyle?.RSI;
    const fill = style?.bbFill;
    if (!fill?.visible) return;

    ctx.save();
    ctx.translate(leftOffset, topOffset);

    // Clip to timeScale width (prevent Y-axis bleed) and pane height (prevent bleeding into other panes)
    ctx.rect(0, 0, paneChart.timeScale().width(), paneRect.height);
    ctx.clip();

    ctx.beginPath();
    let pointsDrawn = 0;

    for (let i = 0; i < upperData.length; i++) {
      const p = upperData[i];
      const x = paneChart.timeScale().timeToCoordinate(p.time);
      const y = rsiGroup.bbUpper.priceToCoordinate(p.value);
      
      if (i === 0) console.log("📍 First Point:", { x, y, value: p.value, time: p.time });

      if (x == null || y == null) continue;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      pointsDrawn++;
    }

    for (let i = lowerData.length - 1; i >= 0; i--) {
      const p = lowerData[i];
      const x = paneChart.timeScale().timeToCoordinate(p.time);
      const y = rsiGroup.bbLower.priceToCoordinate(p.value);
      if (x == null || y == null) continue;
      ctx.lineTo(x, y);
      pointsDrawn++;
    }

    ctx.closePath();
    ctx.fillStyle = fill?.topFillColor1 || "rgba(38,166,154,0.3)";
    ctx.fill();
    ctx.restore();
  };

  useEffect(() => {
    const pane = panesRef.current?.[id];
    const paneChart = pane?.chart;

    if (!paneChart) return;

    const redraw = () => {
      if (canvasRef.current) drawBBCloud();
    };

    const unsubscribeTime = paneChart.timeScale()
      .subscribeVisibleLogicalRangeChange
      ? paneChart.timeScale().subscribeVisibleLogicalRangeChange(redraw)
      : null;

    const unsubscribeCrosshair = paneChart.subscribeCrosshairMove
      ? paneChart.subscribeCrosshairMove(redraw)
      : null;

    return () => {
      if (unsubscribeTime) unsubscribeTime();
      if (unsubscribeCrosshair) unsubscribeCrosshair();
    };
  }, [panesRef, id, indicatorStyle]);

  /* ================= STYLE UPDATE ================= */

  useEffect(() => {
    const rsiGroup = indicatorSeriesRef.current?.[id];
    if (!rsiGroup) return;

    const rsiData = rsiGroup.rsiData ?? [];
    const style = indicatorStyle?.[id] || indicatorStyle?.RSI;

    const upperValue = style?.upper?.value ?? 70;
    const middleValue = style?.middle?.value ?? 50;
    const lowerValue = style?.lower?.value ?? 30;

    const makeLevel = (v) => rsiData.map((p) => ({ time: p.time, value: v }));

    rsiGroup.upper?.setData(makeLevel(upperValue));
    rsiGroup.middle?.setData(makeLevel(middleValue));
    rsiGroup.lower?.setData(makeLevel(lowerValue));

    const rsiStyle = style?.rsi;
    const smoothingStyle = style?.smoothingMA;

    const bandFill = style?.bandFill;
    const obFill = style?.obFill;
    const osFill = style?.osFill;

    const isMasterVisible = indicatorVisibility?.[id] !== false;

    if (rsiGroup.rsi) {
      rsiGroup.rsi.applyOptions({
        color: rsiStyle?.color,
        lineWidth: rsiStyle?.width,
        visible: isMasterVisible && (rsiStyle?.visible !== false),
      });
    }

    if (rsiGroup.smoothingMA) {
      rsiGroup.smoothingMA.applyOptions({
        color: smoothingStyle?.color,
        lineWidth: smoothingStyle?.width,
        visible: isMasterVisible && (smoothingStyle?.visible !== false),
      });
    }

    rsiGroup.bbUpper?.applyOptions({
      color: style?.bbUpper?.color,
      lineWidth: style?.bbUpper?.width,
      visible: isMasterVisible && (style?.bbUpper?.visible !== false),
    });

    rsiGroup.bbLower?.applyOptions({
      color: style?.bbLower?.color,
      lineWidth: style?.bbLower?.width,
      visible: isMasterVisible && (style?.bbLower?.visible !== false),
    });

    if (rsiGroup.bandBackground) {
      rsiGroup.bandBackground.applyOptions({
        topFillColor1: bandFill?.topFillColor1,
        topFillColor2: bandFill?.topFillColor2,
        visible: isMasterVisible && (bandFill?.visible !== false),
      });
    }

    if (rsiGroup.overboughtFill) {
      rsiGroup.overboughtFill.applyOptions({
        topFillColor1: obFill?.topFillColor1,
        topFillColor2: obFill?.topFillColor2,
        visible: isMasterVisible && (obFill?.visible !== false),
      });
    }

    if (rsiGroup.oversoldFill) {
      rsiGroup.oversoldFill.applyOptions({
        bottomFillColor1: osFill?.bottomFillColor1,
        bottomFillColor2: osFill?.bottomFillColor2,
        visible: isMasterVisible && (osFill?.visible !== false),
      });
    }

    if (canvasRef.current) {
      canvasRef.current.style.display = isMasterVisible ? "block" : "none";
      drawBBCloud();
    }
  }, [indicatorStyle, result, id, indicatorVisibility]);

  useEffect(() => {
    const pane = panesRef.current?.[id];
    const paneChart = pane?.chart;

    if (!paneChart) return;

    const redraw = () => {
      if (canvasRef.current) drawBBCloud();
    };

    // ðŸ”¥ THIS is what actually fixes it
    paneChart.timeScale().subscribeVisibleTimeRangeChange(redraw);

    // also keep existing ones
    paneChart.timeScale().subscribeVisibleLogicalRangeChange(redraw);
    paneChart.subscribeCrosshairMove(redraw);

    return () => {
      paneChart.timeScale().unsubscribeVisibleTimeRangeChange(redraw);
      paneChart.timeScale().unsubscribeVisibleLogicalRangeChange(redraw);
      paneChart.unsubscribeCrosshairMove(redraw);
    };
  }, [panesRef, id]);

  useEffect(() => {
    return () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.remove();
      }
      canvasRef.current = null;
      if (indicatorSeriesRef.current?.[id]) {
        indicatorSeriesRef.current[id] = null;
      }
    };
  }, [id]);

  return null;
}
