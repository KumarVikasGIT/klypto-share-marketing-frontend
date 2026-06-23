import { useEffect } from "react";
import { LineSeries } from "lightweight-charts";

export default function NVIPlot({
  result,
  indicatorStyle,
  indicatorSeriesRef,
  addSeries,
  indicatorConfigs,
}) {

  /* ================= CREATE SERIES ================= */

  useEffect(() => {

    if (!result?.data) return;

    if (indicatorSeriesRef.current?.NVI) {
      Object.values(indicatorSeriesRef.current.NVI).forEach((s) => {
        if (s?.setData) {
          try { s.setData([]); } catch {}
        }
      });
      indicatorSeriesRef.current.NVI = null;
    }

    const mapSeries = (arr) =>
      (arr || []).map((p) => ({
        time: Number(p.time),
        value: Number(p.value),
      }));

    const nviData = mapSeries(result.data.nvi);
    const emaData = mapSeries(result.data.nviEma);

    const nviSeries = addSeries("NVI", LineSeries, {
      color: indicatorStyle?.NVI?.nvi?.color ?? "rgba(41,98,255,1)",
      lineWidth: indicatorStyle?.NVI?.nvi?.width ?? 2,
      lineStyle: indicatorStyle?.NVI?.nvi?.lineStyle ?? 0,
      visible: indicatorStyle?.NVI?.nvi?.visible ?? true,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    const emaSeries = addSeries("NVI", LineSeries, {
      color: indicatorStyle?.NVI?.nviEma?.color ?? "rgba(38,166,154,1)",
      lineWidth: indicatorStyle?.NVI?.nviEma?.width ?? 1,
      lineStyle: indicatorStyle?.NVI?.nviEma?.lineStyle ?? 0,
      visible: indicatorStyle?.NVI?.nviEma?.visible ?? true,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    nviSeries.setData(nviData);
    emaSeries.setData(emaData);

    indicatorSeriesRef.current.NVI = {
      nvi: nviSeries,
      nviEma: emaSeries,
    };

  }, [result, indicatorConfigs]);


  /* ================= STYLE UPDATE ================= */

  useEffect(() => {

    const group = indicatorSeriesRef.current?.NVI;
    if (!group) return;

    group.nvi.applyOptions({
      color: indicatorStyle?.NVI?.nvi?.color ?? "var(--accent-color)",
      lineWidth: indicatorStyle?.NVI?.nvi?.width ?? 2,
      lineStyle: indicatorStyle?.NVI?.nvi?.lineStyle ?? 0,
      visible: indicatorStyle?.NVI?.nvi?.visible ?? true,
    });

    group.nviEma.applyOptions({
      color: indicatorStyle?.NVI?.nviEma?.color ?? "#26a69a",
      lineWidth: indicatorStyle?.NVI?.nviEma?.width ?? 1,
      lineStyle: indicatorStyle?.NVI?.nviEma?.lineStyle ?? 0,
      visible: indicatorStyle?.NVI?.nviEma?.visible ?? true,
    });

  }, [indicatorStyle]);

  return null;
}