import { useEffect, useRef } from "react";
import { LineSeries } from "lightweight-charts";

export default function VWAPPlot({
  result,
  indicatorStyle,
  indicatorSeriesRef,
  addSeries,
  chart,
  containerRef,
  indicatorConfigs,
}) {
  const canvasRef = useRef(null);

  /* ================= CREATE SERIES ================= */

  useEffect(() => {
    if (!result?.data) return;

    console.log("🔥 VWAP CREATE TRIGGERED");

    console.log("VWAP EFFECT", {
      vwap: result.data.vwap?.length,
      upper1: result.data.upper1?.length,
      lower1: result.data.lower1?.length,
      band1Enabled: indicatorConfigs?.VWAP?.band1?.enabled,
      hasAddSeries: typeof addSeries,
    });

    // CLEAR OLD
    if (indicatorSeriesRef.current?.VWAP) {
      console.log("🧹 Clearing old VWAP series");

      Object.values(indicatorSeriesRef.current.VWAP).forEach((s) => {
        if (s?.setData) {
          try {
            s.setData([]);
          } catch {}
        }
      });

      indicatorSeriesRef.current.VWAP = null;
    }

    const groupedSeries = {};

    const {
      vwap = [],
      upper1 = [],
      lower1 = [],
      upper2 = [],
      lower2 = [],
      upper3 = [],
      lower3 = [],
    } = result.data;

    const config = indicatorConfigs?.VWAP || {};

    console.log("📊 CONFIG", config);

    /* ================= VWAP ================= */

    if (vwap.length) {
      console.log("✅ VWAP plotting", vwap.length);

      const s = addSeries("VWAP-vwap", LineSeries, {
        color: indicatorStyle?.VWAP?.vwap?.color,
        lineWidth: indicatorStyle?.VWAP?.vwap?.width,
        lineStyle: indicatorStyle?.VWAP?.vwap?.lineStyle,
        visible: indicatorStyle?.VWAP?.vwap?.visible,
        priceLineVisible: false,
      });

      s.setData(vwap);
      groupedSeries.vwap = s;
    } else {
      console.warn("❌ VWAP data missing");
    }

    /* ================= BAND CREATOR ================= */

    const createBand = (id, upperData, lowerData) => {
      const bandCfg = config?.[`band${id}`];

      // Default band1 to enabled if config is missing
      const isEnabled = bandCfg?.enabled ?? (id === 1 ? true : false);

      if (!isEnabled) {
        console.log(`🚫 band${id} disabled`);
        return;
      }

      const upperKey = `upperBand${id}`;
      const lowerKey = `lowerBand${id}`;

      const upperStyle = indicatorStyle?.VWAP?.[upperKey] || {};
      const lowerStyle = indicatorStyle?.VWAP?.[lowerKey] || {};

      console.log(`👉 Creating band${id}`, {
        upper: upperData.length,
        lower: lowerData.length,
      });

      const upperSeries = addSeries(`VWAP-${upperKey}`, LineSeries, {
        color: upperStyle.color,
        lineWidth: upperStyle.width,
        lineStyle: upperStyle.lineStyle,
        visible: upperStyle.visible ?? true,
        priceLineVisible: false,
      });

      const lowerSeries = addSeries(`VWAP-${lowerKey}`, LineSeries, {
        color: lowerStyle.color,
        lineWidth: lowerStyle.width,
        lineStyle: lowerStyle.lineStyle,
        visible: lowerStyle.visible ?? true,
        priceLineVisible: false,
      });

      // ✅ SAFE DATA SET
      upperSeries.setData(upperData || []);
      lowerSeries.setData(lowerData || []);

      groupedSeries[upperKey] = upperSeries;
      groupedSeries[lowerKey] = lowerSeries;

      groupedSeries[`${upperKey}Data`] = upperData || [];
      groupedSeries[`${lowerKey}Data`] = lowerData || [];
    };

    createBand(1, upper1, lower1);
    createBand(2, upper2, lower2);
    createBand(3, upper3, lower3);

    indicatorSeriesRef.current.VWAP = groupedSeries;

    console.log("✅ FINAL SERIES", groupedSeries);
  }, [
    result,
    indicatorConfigs?.VWAP?.band1?.enabled,
    indicatorConfigs?.VWAP?.band2?.enabled,
    indicatorConfigs?.VWAP?.band3?.enabled,
  ]);

  /* ================= STYLE UPDATE ================= */

  useEffect(() => {
    const group = indicatorSeriesRef.current?.VWAP;
    if (!group) return;

    Object.entries(group).forEach(([key, series]) => {
      if (!series?.applyOptions) return;

      const style = indicatorStyle?.VWAP?.[key];
      if (!style) return;

      series.applyOptions({
        color: style.color,
        lineWidth: style.width,
        lineStyle: style.lineStyle,
        visible: style.visible,
      });
    });

    drawBands();
  }, [indicatorStyle]);

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

  /* ================= DRAW FILL ================= */

  const drawBands = () => {
    const group = indicatorSeriesRef.current?.VWAP;
    if (!group || !canvasRef.current || !chart) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const rect = containerRef.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const drawSingleBand = (id) => {
      const fillStyle = indicatorStyle?.VWAP?.[`bandFill${id}`];

      const bandCfg = indicatorConfigs?.VWAP?.[`band${id}`];
      const isEnabled = bandCfg?.enabled ?? (id === 1 ? true : false);
      if (!isEnabled) return;

      const upperData = group[`upperBand${id}Data`] || [];
      const lowerData = group[`lowerBand${id}Data`] || [];

      const upperSeries = group[`upperBand${id}`];
      const lowerSeries = group[`lowerBand${id}`];

      if (!upperSeries || !lowerSeries) {
        console.warn(`❌ Missing series for band${id}`);
        return;
      }

      if (!upperData.length || !lowerData.length) {
        console.warn(`❌ Missing data for fill band${id}`);
        return;
      }

      console.log(`🎨 Drawing fill band${id}`);

      ctx.beginPath();

      for (let i = 0; i < upperData.length; i++) {
        const p = upperData[i];
        const x = chart.timeScale().timeToCoordinate(p.time);
        const y = upperSeries.priceToCoordinate(p.value);

        if (x == null || y == null) continue;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      for (let i = lowerData.length - 1; i >= 0; i--) {
        const p = lowerData[i];
        const x = chart.timeScale().timeToCoordinate(p.time);
        const y = lowerSeries.priceToCoordinate(p.value);

        if (x == null || y == null) continue;
        ctx.lineTo(x, y);
      }

      ctx.closePath();

      ctx.fillStyle = fillStyle?.color || "rgba(0,0,0,0.1)";
      ctx.fill();
    };

    drawSingleBand(1);
    drawSingleBand(2);
    drawSingleBand(3);
  };

  /* ================= REDRAW ================= */

  useEffect(() => {
    if (!chart) return;

    const redraw = () => drawBands();

    const unsub1 = chart
      .timeScale()
      .subscribeVisibleLogicalRangeChange?.(redraw);
    const unsub2 = chart.subscribeCrosshairMove?.(redraw);

    return () => {
      if (unsub1) unsub1();
      if (unsub2) unsub2();
    };
  }, [chart, indicatorConfigs]);

  useEffect(() => {
    drawBands();
  }, [indicatorStyle, result, indicatorConfigs]);

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

      if (indicatorSeriesRef.current?.VWAP) {
        indicatorSeriesRef.current.VWAP = null;
      }
    };
  }, []);

  return null;
}
