import { useEffect } from "react";
import { LineSeries } from "lightweight-charts";

export default function ADPlot({
  result,
  indicatorStyle,
  indicatorSeriesRef,
  addSeries,
}) {
  useEffect(() => {
    // ✅ Get AD data
    const adData = result?.data ?? [];


    // 🔥 Remove previous series
    if (indicatorSeriesRef.current?.AD?.ad) {
      try {
        indicatorSeriesRef.current.AD.ad.setData([]);
      } catch {}
      indicatorSeriesRef.current.AD = null;
    }

    // 🔹 Get style
    const style = indicatorStyle?.AD?.ad;

    // 🔹 Add LineSeries
    const adSeries = addSeries("AD", LineSeries, {
      color: style?.color ?? "rgba(156,39,176,1)",
      lineWidth: style?.width ?? 2,
      lineStyle: style?.lineStyle ?? 0,
      visible: style?.visible ?? true,
      priceLineVisible: false,
    });

    // 🔹 Set the data
    adSeries.setData(adData);

    // 🔹 Store reference
    indicatorSeriesRef.current.AD = {
      ad: adSeries,
      result,
      adData,
    };

    console.log("✅ AD plotted successfully", adData?.length);
  }, [result]);

  // ================= STYLE UPDATE =================
  useEffect(() => {
    const g = indicatorSeriesRef?.current?.AD;
    if (!g) return;

    const style = indicatorStyle?.AD?.ad;
    if (!style) return;

    g.ad?.applyOptions({
      color: style?.color,
      lineWidth: style?.width,
      lineStyle: style?.lineStyle,
      visible: style?.visible,
    });
  }, [indicatorStyle?.AD]);

  return null;
}