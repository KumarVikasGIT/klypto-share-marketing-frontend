import { useEffect } from "react";
import { LineSeries } from "lightweight-charts";

export default function UOPlot({
  result,
  indicatorStyle,
  indicatorSeriesRef,
  addSeries,
}) {



 useEffect(() => {
  if (!result || !Array.isArray(result?.data?.series)) {
    console.log("⏳ UO waiting for valid result...", result);
    return;
  }

  const raw =result?.data?.series;

  if (raw.length === 0) {
    console.log("❌ UO empty data");
    return;
  }

  console.log("✅ UO valid data received:", raw.length);

  // 🔥 CLEAN OLD SERIES
  if (indicatorSeriesRef.current?.UO?.uoLine) {
    try {
      indicatorSeriesRef.current.UO.uoLine.setData([]);
    } catch {}
    indicatorSeriesRef.current.UO = null;
  }

  // 🔥 MAP DATA
  const uoData = raw
    .filter((d) => d.time && (d.uo ?? d.ultimate) !== undefined)
    .map((d) => ({
      time: Number(d.time),
      value: Number(d.uo ?? d.ultimate),
    }));

  if (!uoData.length) {
    console.log("❌ No valid mapped UO data");
    return;
  }

  // 🔥 CREATE SERIES
  const uoSeries = addSeries("UO", LineSeries, {
    color: indicatorStyle?.UO?.uoLine?.color ?? "#E05273",
    lineWidth: indicatorStyle?.UO?.uoLine?.width ?? 2,
    lineStyle: indicatorStyle?.UO?.uoLine?.lineStyle ?? 0,
    visible: indicatorStyle?.UO?.uoLine?.visible ?? true,
  });

  uoSeries.setData(uoData);

  indicatorSeriesRef.current.UO = {
    uoLine: uoSeries,
    uoData,
  };

  console.log("✅ UO plotted successfully");
}, [result]);

  useEffect(() => {
    const g = indicatorSeriesRef.current?.UO;
    if (!g) return;

    const style = indicatorStyle?.UO;

    g.uoLine?.applyOptions({
      color: style?.uoLine?.color,
      lineWidth: style?.uoLine?.width,
      lineStyle: style?.uoLine?.lineStyle,
      visible: style?.uoLine?.visible,
    });
  }, [indicatorStyle?.UO]);

  return null;
}
