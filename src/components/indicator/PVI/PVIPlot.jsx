import { useEffect } from "react";
import { LineSeries } from "lightweight-charts";

export default function PVIPlot({
  result,
  indicatorStyle,
  indicatorSeriesRef,
  addSeries,
  indicatorConfigs,
}) {

  /* ================= CREATE SERIES ================= */

  useEffect(() => {

    if (!result?.data) return;

    if (indicatorSeriesRef.current?.PVI) {
      Object.values(indicatorSeriesRef.current.PVI).forEach((s) => {
        if (s?.setData) {
          try { s.setData([]); } catch {}
        }
      });
      indicatorSeriesRef.current.PVI = null;
    }

    const mapSeries = (arr) =>
      (arr || []).map((p) => ({
        time: Number(p.time),
        value: Number(p.value),
      }));

    const pviData = mapSeries(result.data.pvi);
    const emaData = mapSeries(result.data.pviEma); // ✅ FIXED

    const pviSeries = addSeries("PVI", LineSeries, {
      color: indicatorStyle?.PVI?.pvi?.color ?? "rgba(41,98,255,1)",
      lineWidth: indicatorStyle?.PVI?.pvi?.width ?? 2,
      lineStyle: indicatorStyle?.PVI?.pvi?.lineStyle ?? 0,
      visible: indicatorStyle?.PVI?.pvi?.visible ?? true,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    const emaSeries = addSeries("PVI", LineSeries, {
      color: indicatorStyle?.PVI?.pviEma?.color ?? "rgba(38,166,154,1)", // ✅ FIXED
      lineWidth: indicatorStyle?.PVI?.pviEma?.width ?? 1,
      lineStyle: indicatorStyle?.PVI?.pviEma?.lineStyle ?? 0,
      visible: indicatorStyle?.PVI?.pviEma?.visible ?? true,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    pviSeries.setData(pviData);
    emaSeries.setData(emaData);

    indicatorSeriesRef.current.PVI = {
      pvi: pviSeries,
      pviEma: emaSeries, // ✅ FIXED
    };

  }, [result, indicatorConfigs]);


  /* ================= STYLE UPDATE ================= */

  useEffect(() => {

    const group = indicatorSeriesRef.current?.PVI;
    if (!group) return;

    group.pvi.applyOptions({
      color: indicatorStyle?.PVI?.pvi?.color ?? "var(--accent-color)",
      lineWidth: indicatorStyle?.PVI?.pvi?.width ?? 2,
      lineStyle: indicatorStyle?.PVI?.pvi?.lineStyle ?? 0,
      visible: indicatorStyle?.PVI?.pvi?.visible ?? true,
    });

    group.pviEma.applyOptions({
      color: indicatorStyle?.PVI?.pviEma?.color ?? "#26a69a",
      lineWidth: indicatorStyle?.PVI?.pviEma?.width ?? 1,
      lineStyle: indicatorStyle?.PVI?.pviEma?.lineStyle ?? 0,
      visible: indicatorStyle?.PVI?.pviEma?.visible ?? true,
    });

  }, [indicatorStyle]);

  return null;
}