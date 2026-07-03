import { useEffect, useRef } from "react";
import { LineSeries } from "lightweight-charts";

export default function VolatilityMomentumProPlot({
  result,
  rows,
  indicatorStyle,
  indicatorSeriesRef,
  addSeries,
  chart,
  containerRef,
}) {
  const canvasRef = useRef(null);
  const tooltipsContainerRef = useRef(null);
  const tooltipsRef = useRef([]);

  /* ================= CREATE SERIES ================= */

  useEffect(() => {
    if (!result) return;

    if (indicatorSeriesRef.current?.VOLATILITY_MOMENTUM_PRO) {
      Object.values(indicatorSeriesRef.current.VOLATILITY_MOMENTUM_PRO).forEach((s) => {
        if (s?.setData) {
          try {
            s.setData([]);
          } catch {}
        }
      });
      indicatorSeriesRef.current.VOLATILITY_MOMENTUM_PRO = null;
    }

    const groupedSeries = {};
    const data = result?.data || {};

    let upperData = [];
    let lowerData = [];

    // Keys that map to simple line series
    [
      "openingRangeHigh",
      "openingRangeLow",
      "upperChannel",
      "lowerChannel",
    ].forEach((key) => {
      const lineData = data[key] || [];
      if (!lineData?.length) return;

      const style = indicatorStyle?.VOLATILITY_MOMENTUM_PRO?.[key];
      const row = rows?.find((r) => r.key === key);

      const series = addSeries(
        "VOLATILITY_MOMENTUM_PRO",
        LineSeries,
        {
          color: style?.color || row?.color || "#fff",
          lineWidth: style?.width || 2,
          lineStyle: style?.lineStyle || 0,
          visible: style?.visible ?? true,
          lastValueVisible: true,
          priceLineVisible: false,
        }
      );

      if (!series) return;

      series.setData(lineData);
      groupedSeries[key] = series;

      if (key === "upperChannel") upperData = lineData;
      if (key === "lowerChannel") lowerData = lineData;
    });

    groupedSeries.upperData = upperData;
    groupedSeries.lowerData = lowerData;

    indicatorSeriesRef.current.VOLATILITY_MOMENTUM_PRO = groupedSeries;
  }, [result]);

  /* ================= INIT DOM ELEMENTS ================= */

  useEffect(() => {
    if (!containerRef) return;

    if (!canvasRef.current) {
      const canvas = document.createElement("canvas");
      canvas.style.position = "absolute";
      canvas.style.top = "0";
      canvas.style.left = "0";
      canvas.style.pointerEvents = "none";
      canvas.style.zIndex = "1";
      containerRef.appendChild(canvas);
      canvasRef.current = canvas;
    }

    if (!tooltipsContainerRef.current) {
      const div = document.createElement("div");
      div.style.position = "absolute";
      div.style.top = "0";
      div.style.left = "0";
      div.style.pointerEvents = "none";
      div.style.zIndex = "2";
      div.style.overflow = "hidden"; // clip markers that go off chart
      containerRef.appendChild(div);
      tooltipsContainerRef.current = div;
    }
  }, [containerRef]);

  /* ================= REBUILD TOOLTIPS DOM ================= */

  useEffect(() => {
    const data = result?.data || {};
    const container = tooltipsContainerRef.current;
    
    if (!container) return;

    container.innerHTML = "";
    tooltipsRef.current = [];

    const createTooltip = (p, color, contentHTML, position) => {
      const el = document.createElement("div");
      el.style.position = "absolute";
      el.style.backgroundColor = color;
      el.style.color = "#fff";
      el.style.padding = "4px 8px";
      el.style.borderRadius = "4px";
      el.style.fontSize = "11px";
      el.style.fontFamily = "sans-serif";
      el.style.textAlign = "center";
      el.style.whiteSpace = "nowrap"; // Fix wrapping issue
      el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";
      el.style.display = "none"; // hidden until positioned

      const tail = document.createElement("div");
      tail.style.position = "absolute";
      tail.style.left = "50%";
      tail.style.marginLeft = "-5px";
      tail.style.borderWidth = "5px";
      tail.style.borderStyle = "solid";

      if (position === "aboveBar") {
        el.style.transform = "translate(-50%, -100%)";
        el.style.marginTop = "-8px";
        tail.style.top = "100%";
        tail.style.borderColor = `${color} transparent transparent transparent`;
      } else {
        el.style.transform = "translate(-50%, 0)";
        el.style.marginTop = "8px";
        tail.style.bottom = "100%";
        tail.style.borderColor = `transparent transparent ${color} transparent`;
      }

      el.appendChild(tail);

      const content = document.createElement("div");
      content.innerHTML = contentHTML;
      el.appendChild(content);

      container.appendChild(el);
      tooltipsRef.current.push({ el, time: p.time, value: p.value, position });
    };

    // 1. is915 Markers
    const is915Style = indicatorStyle?.VOLATILITY_MOMENTUM_PRO?.is915Markers;
    if (is915Style?.visible !== false) {
      (data.is915Markers || []).forEach((p) => {
        const score = p.volMomentumScore != null ? p.volMomentumScore : 0;
        let color = is915Style?.color || "rgba(255,165,0,1)";
        if (score >= 80) color = "#4caf50"; // green
        else if (score >= 60) color = "#ff9800"; // orange
        else color = "#9e9e9e"; // gray

        const angle = p.angle != null ? p.angle.toFixed(2) : "--";
        const atrP = p.atrPower != null ? p.atrPower.toFixed(2) : "--";
        const volP = p.volPower != null ? p.volPower.toFixed(2) : "--";
        const scoreStr = p.volMomentumScore != null ? p.volMomentumScore.toFixed(2) : "--";
        const html = `<strong>9:15 Volatility Scan</strong><br/>Angle: ${angle}°<br/>ATR Power: ${atrP}x<br/>Volume Power: ${volP}x<br/>Score: ${scoreStr}/100`;
        
        createTooltip(p, color, html, "aboveBar");
      });
    }

    // 2. Sharp / Extreme Signals
    const addSignalTooltips = (key, text, defaultColor, position) => {
      const style = indicatorStyle?.VOLATILITY_MOMENTUM_PRO?.[key];
      if (style?.visible === false) return;
      (data[key] || []).forEach(p => {
        createTooltip(p, style?.color || defaultColor, `<strong>${text}</strong>`, position);
      });
    };

    addSignalTooltips("sharpUpSignals", "SHARP UP", "#4caf50", "belowBar");
    addSignalTooltips("sharpDownSignals", "SHARP DOWN", "#f44336", "aboveBar");
    addSignalTooltips("extremeUpSignals", "EXTREME UP", "#4caf50", "belowBar");
    addSignalTooltips("extremeDownSignals", "EXTREME DOWN", "#f44336", "aboveBar");

  }, [result, indicatorStyle]);


  /* ================= DRAW BACKGROUNDS & CHANNEL FILL & POSITION TOOLTIPS ================= */

  const drawFills = () => {
    const group = indicatorSeriesRef.current?.VOLATILITY_MOMENTUM_PRO;
    if (!group) return;

    if (!canvasRef.current || !chart) return;

    const timeScale = chart.timeScale();
    const tsWidth = timeScale.width(); // Exact width of the chart pane (excludes price scale)
    
    // Find exact height of the main chart pane (the first row in the lightweight-charts table)
    let paneHeight = containerRef.getBoundingClientRect().height - 26; // fallback
    const firstRow = containerRef.querySelector("table tr");
    if (firstRow && firstRow.clientHeight) {
      paneHeight = firstRow.clientHeight;
    }

    // Resize containers to tightly fit the pane (so we don't bleed into scales or lower panes)
    canvasRef.current.width = tsWidth;
    canvasRef.current.height = paneHeight;
    tooltipsContainerRef.current.style.width = `${tsWidth}px`;
    tooltipsContainerRef.current.style.height = `${paneHeight}px`;

    // 1. Position tooltips
    tooltipsRef.current.forEach(({ el, time, value, position }) => {
      const x = timeScale.timeToCoordinate(time);
      let y = null;

      // Determine y based on position and value
      if (position === "aboveBar") {
        y = group.upperChannel?.priceToCoordinate(value);
        if (y == null && group.lowerChannel) y = group.lowerChannel.priceToCoordinate(value);
      } else {
        y = group.lowerChannel?.priceToCoordinate(value);
        if (y == null && group.upperChannel) y = group.upperChannel.priceToCoordinate(value);
      }
      
      if (y == null) y = 50; 

      if (x === null || x < 0 || x > tsWidth) {
        el.style.display = "none";
      } else {
        el.style.display = "block";
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
      }
    });

    // 2. Draw canvas stuff
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const data = result?.data || {};

    // High move backgrounds
    const bgStyle = indicatorStyle?.VOLATILITY_MOMENTUM_PRO?.highMoveBackground;
    const highMove = data?.highMoveBackground || [];
    
    if (bgStyle?.visible && highMove?.length > 0) {
      ctx.fillStyle = bgStyle.color || "rgba(255,140,0,0.12)";
      highMove.forEach(p => {
        const x = timeScale.timeToCoordinate(p.time);
        if (x != null && x >= 0 && x <= tsWidth) {
           ctx.fillRect(x - 3, 0, 6, canvas.height);
        }
      });
    }

    // Channel fill
    const upper = group.upperData || [];
    const lower = group.lowerData || [];

    if (upper?.length > 0 && lower?.length > 0) {
      const fillStyle = indicatorStyle?.VOLATILITY_MOMENTUM_PRO?.channelFill;
      
      if (fillStyle?.visible) {
        ctx.beginPath();
    
        for (let i = 0; i < upper.length; i++) {
          const p = upper[i];
          const x = timeScale.timeToCoordinate(p.time);
          const y = group.upperChannel?.priceToCoordinate(p.value);
    
          if (x == null || y == null) continue;
    
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
    
        for (let i = lower.length - 1; i >= 0; i--) {
          const p = lower[i];
          const x = timeScale.timeToCoordinate(p.time);
          const y = group.lowerChannel?.priceToCoordinate(p.value);
    
          if (x == null || y == null) continue;
    
          ctx.lineTo(x, y);
        }
    
        ctx.closePath();
        ctx.fillStyle = fillStyle?.topFillColor1 || "rgba(255,140,0,0.12)";
        ctx.fill();
      }
    }
  };

  /* ================= REDRAW EVENTS ================= */

  useEffect(() => {
    if (!chart) return;

    const redraw = () => drawFills();

    chart.timeScale().subscribeVisibleTimeRangeChange(redraw);
    chart.subscribeCrosshairMove(redraw);

    drawFills();

    return () => {
      chart.timeScale().unsubscribeVisibleTimeRangeChange(redraw);
      chart.unsubscribeCrosshairMove(redraw);
    };
  }, [chart, indicatorStyle, result]);

  /* ================= STYLE UPDATE ================= */

  useEffect(() => {
    const group = indicatorSeriesRef.current?.VOLATILITY_MOMENTUM_PRO;
    if (!group) return;

    Object.entries(group).forEach(([key, series]) => {
      if (!series?.applyOptions) return;
      
      const style = indicatorStyle?.VOLATILITY_MOMENTUM_PRO?.[key];
      if (!style) return;

      series.applyOptions({
        color: style.color,
        lineWidth: style.width || 2,
        lineStyle: style.lineStyle,
        visible: style.visible,
      });
    });

    drawFills();
  }, [indicatorStyle]);

  /* ================= CLEANUP ================= */

  useEffect(() => {
    return () => {
      if (canvasRef.current) {
        canvasRef.current.remove();
        canvasRef.current = null;
      }
      
      if (tooltipsContainerRef.current) {
        tooltipsContainerRef.current.remove();
        tooltipsContainerRef.current = null;
      }

      if (indicatorSeriesRef.current?.VOLATILITY_MOMENTUM_PRO) {
        indicatorSeriesRef.current.VOLATILITY_MOMENTUM_PRO = null;
      }
    };
  }, []);

  return null;
}