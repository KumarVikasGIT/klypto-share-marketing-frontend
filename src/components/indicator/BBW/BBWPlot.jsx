import { useEffect } from "react";
import { LineSeries } from "lightweight-charts";

export default function BBWPlot({
  result,
  indicatorStyle,
  indicatorSeriesRef,
  addSeries,
}) {

  /* ================= CREATE ================= */

  useEffect(() => {

    const bbw = result?.data?.bbw;
    const highest = result?.data?.highest;
    const lowest = result?.data?.lowest;

    // ✅ HARD CHECK
    if (!Array.isArray(bbw) || bbw?.length === 0) {
      console.log("❌ BBW not plotting", result);
      return;
    }

    // 🔥 REMOVE OLD
    if (indicatorSeriesRef.current?.BBW) {
      Object.values(indicatorSeriesRef.current.BBW).forEach((s) => {
        try { s.setData([]); } catch {}
      });
      indicatorSeriesRef.current.BBW = null;
    }

    /* 🔵 BBW LINE */
    const bbwSeries = addSeries("BBW", LineSeries, {
      color: indicatorStyle?.BBW?.bbwLine?.color ?? "rgba(33,150,243,1)",
      lineWidth: indicatorStyle?.BBW?.bbwLine?.width ?? 2,
      lineStyle: indicatorStyle?.BBW?.bbwLine?.lineStyle ?? 0,
      visible: indicatorStyle?.BBW?.bbwLine?.visible ?? true,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    bbwSeries.setData(bbw);

    /* 🔴 HIGHEST LINE */
    let highestSeries = null;

    if (Array.isArray(highest) && highest?.length) {
      highestSeries = addSeries("BBW", LineSeries, {
        color: indicatorStyle?.BBW?.highest?.color ?? "rgba(244,67,54,1)",
        lineWidth: indicatorStyle?.BBW?.highest?.width ?? 1,
        lineStyle: indicatorStyle?.BBW?.highest?.lineStyle ?? 2,
        visible: indicatorStyle?.BBW?.highest?.visible ?? true,
        priceLineVisible: false,
      });

      highestSeries.setData(highest);
    }

    /* 🟢 LOWEST LINE */
    let lowestSeries = null;

    if (Array.isArray(lowest) && lowest?.length) {
      lowestSeries = addSeries("BBW", LineSeries, {
        color: indicatorStyle?.BBW?.lowest?.color ?? "rgba(0,200,83,1)",
        lineWidth: indicatorStyle?.BBW?.lowest?.width ?? 1,
        lineStyle: indicatorStyle?.BBW?.lowest?.lineStyle ?? 2,
        visible: indicatorStyle?.BBW?.lowest?.visible ?? true,
        priceLineVisible: false,
      });

      lowestSeries?.setData(lowest);
    }

    indicatorSeriesRef.current.BBW = {
      bbwLine: bbwSeries,
      highest: highestSeries,
      lowest: lowestSeries,
    };

    console.log("✅ BBW plotted SUCCESS");

  }, [result]);


  /* ================= STYLE UPDATE ================= */

  useEffect(() => {

    const group = indicatorSeriesRef?.current?.BBW;
    if (!group) return;

    group.bbwLine?.applyOptions({
      color: indicatorStyle?.BBW?.bbwLine?.color,
      lineWidth: indicatorStyle?.BBW?.bbwLine?.width,
      lineStyle: indicatorStyle?.BBW?.bbwLine?.lineStyle ?? 0,
      visible: indicatorStyle?.BBW?.bbwLine?.visible,
    });

    group.highest?.applyOptions({
      color: indicatorStyle?.BBW?.highest?.color,
      lineWidth: indicatorStyle?.BBW?.highest?.width,
      lineStyle: indicatorStyle?.BBW?.highest?.lineStyle ?? 2,
      visible: indicatorStyle?.BBW?.highest?.visible,
    });

    group.lowest?.applyOptions({
      color: indicatorStyle?.BBW?.lowest?.color,
      lineWidth: indicatorStyle?.BBW?.lowest?.width,
      lineStyle: indicatorStyle?.BBW?.lowest?.lineStyle ?? 2,
      visible: indicatorStyle?.BBW?.lowest?.visible,
    });

  }, [indicatorStyle?.BBW]);

  return null;
}