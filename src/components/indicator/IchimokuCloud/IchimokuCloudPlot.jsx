import { useEffect, useRef } from "react";
import { LineSeries } from "lightweight-charts";

export default function IchimokuCloudPlot({
  result,
  indicatorStyle,
  indicatorSeriesRef,
  addSeries,
  chart,
  containerRef,
}) {
  const cloudCanvasRef = useRef(null);
  const cloudCtxRef = useRef(null);

  /* ================= CREATE SERIES ================= */

  useEffect(() => {
    if (!result) return;

    if (indicatorSeriesRef.current?.ICHIMOKU) {
      Object.values(indicatorSeriesRef.current.ICHIMOKU).forEach((s) => {
        if (s?.setData) {
          try {
            s.setData([]);
          } catch {}
        }
      });

      indicatorSeriesRef.current.ICHIMOKU = null;
    }

    const style = indicatorStyle?.ICHIMOKU ?? {};
    const grouped = {};

    /* ================= DATA ================= */

    const conversionLine = result?.data?.conversionLine || [];
    const baseLine = result?.data?.baseLine || [];
    const spanA = result?.data?.leadLine1 || [];
    const spanB = result?.data?.leadLine2 || [];
    const laggingSpan = result?.data?.laggingSpan || [];

    /* ================= LINES ================= */

    const conversionSeries = addSeries("main", LineSeries, {
      color: style?.conversionLine?.color,
      lineWidth: style?.conversionLine?.width ?? 2,
      visible: style?.conversionLine?.visible ?? true,
    });

    const baseSeries = addSeries("main", LineSeries, {
      color: style?.baseLine?.color,
      lineWidth: style?.baseLine?.width ?? 2,
      visible: style?.baseLine?.visible ?? true,
    });

    const spanASeries = addSeries("main", LineSeries, {
      color: style?.leadLine1?.color,
      lineWidth: style?.leadLine1?.width ?? 2,
      visible: style?.leadLine1?.visible ?? true,
    });

    const spanBSeries = addSeries("main", LineSeries, {
      color: style?.leadLine2?.color,
      lineWidth: style?.leadLine2?.width ?? 2,
      visible: style?.leadLine2?.visible ?? true,
    });

    const laggingSeries = addSeries("main", LineSeries, {
      color: style?.laggingSpan?.color,
      lineWidth: style?.laggingSpan?.width ?? 2,
      visible: style?.laggingSpan?.visible ?? true,
    });

    conversionSeries.setData(conversionLine);
    baseSeries.setData(baseLine);
    spanASeries.setData(spanA);
    spanBSeries.setData(spanB);
    laggingSeries.setData(laggingSpan);

    /* ================= STORE ================= */

    grouped.conversionLine = conversionSeries;
    grouped.baseLine = baseSeries;
    grouped.leadLine1 = spanASeries;
    grouped.leadLine2 = spanBSeries;
    grouped.laggingSpan = laggingSeries;

    grouped.spanA = spanA;
    grouped.spanB = spanB;

    indicatorSeriesRef.current.ICHIMOKU = grouped;
  }, [result]);

  /* ================= CREATE CANVAS ================= */

  useEffect(() => {
    if (!containerRef?.current || !chart) return;
    if (cloudCanvasRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const canvas = document.createElement("canvas");

    canvas.width = rect.width;
    canvas.height = rect.height;
    canvas.style.position = "absolute";
    canvas.style.left = "0";
    canvas.style.top = "0";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "1";

    containerRef.current.appendChild(canvas);

    cloudCanvasRef.current = canvas;
    cloudCtxRef.current = canvas.getContext("2d");
  }, [chart]);

  /* ================= DRAW KUMO CLOUD ================= */

  useEffect(() => {
    const drawCloud = () => {
      const group = indicatorSeriesRef.current?.ICHIMOKU;
      if (!group || !cloudCtxRef.current || !cloudCanvasRef.current) return;

      const { spanA, spanB, leadLine1, leadLine2 } = group;
      if (!spanA?.length || !spanB?.length) return;

      const ctx = cloudCtxRef.current;
      const canvas = cloudCanvasRef.current;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const bullishColor =
        indicatorStyle?.ICHIMOKU?.cloudFillBullish?.color ||
        "rgba(0,200,0,0.25)";
      const bearishColor =
        indicatorStyle?.ICHIMOKU?.cloudFillBearish?.color ||
        "rgba(255,0,0,0.25)";

      for (let i = 0; i < spanA.length - 1; i++) {
        const a1 = spanA[i];
        const a2 = spanA[i + 1];
        const b1 = spanB[i];
        const b2 = spanB[i + 1];

        const x1 = chart.timeScale().timeToCoordinate(a1.time);
        const x2 = chart.timeScale().timeToCoordinate(a2.time);
        const yA1 = leadLine1.priceToCoordinate(a1.value);
        const yA2 = leadLine1.priceToCoordinate(a2.value);
        const yB1 = leadLine2.priceToCoordinate(b1.value);
        const yB2 = leadLine2.priceToCoordinate(b2.value);

        if ([x1, x2, yA1, yA2, yB1, yB2].some((v) => v === null)) continue;

        const bullish = (a1.value + a2.value) / 2 > (b1.value + b2.value) / 2;

        ctx.beginPath();
        ctx.moveTo(x1, yA1);
        ctx.lineTo(x2, yA2);
        ctx.lineTo(x2, yB2);
        ctx.lineTo(x1, yB1);
        ctx.closePath();

        ctx.fillStyle = bullish ? bullishColor : bearishColor;
        ctx.fill();
      }
    };

    drawCloud();
    chart.timeScale().subscribeVisibleLogicalRangeChange(drawCloud);
    chart.subscribeCrosshairMove(drawCloud);

    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(drawCloud);
      chart.unsubscribeCrosshairMove(drawCloud);
    };
  }, [result, indicatorStyle]);

  /* ================= STYLE UPDATE ================= */

  useEffect(() => {
    const group = indicatorSeriesRef.current?.ICHIMOKU;
    if (!group) return;

    const style = indicatorStyle?.ICHIMOKU ?? {};

    [
      "conversionLine",
      "baseLine",
      "leadLine1",
      "leadLine2",
      "laggingSpan",
    ].forEach((key) => {
      const s = group[key];
      const st = style?.[key];
      if (!s || !st) return;
      s.applyOptions({
        color: st.color,
        lineWidth: st.width,
        lineStyle: st.lineStyle ?? 0,
        visible: st.visible,
      });
    });
  }, [indicatorStyle]);

  return null;
}
