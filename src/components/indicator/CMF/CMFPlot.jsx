import { useEffect } from "react";
import { LineSeries } from "lightweight-charts";

export default function CMFPlot({
  id,
  result,
  indicatorStyle,
  indicatorSeriesRef,
  addSeries,
  indicatorConfigs,
}) {

  /* ================= CREATE SERIES ================= */

  useEffect(() => {

    if (!result?.data?.cmf) return;

    // 🔥 REMOVE OLD SERIES
    if (indicatorSeriesRef.current?.[id]) {
      Object.values(indicatorSeriesRef.current[id]).forEach((s) => {
        if (s?.setData) {
          try { s.setData([]); } catch {}
        }
      });
      indicatorSeriesRef.current[id] = null;
    }

    const mapSeries = (arr) =>
      (arr || []).map((p) => ({
        time: Number(p.time),
        value: Number(p.value),
      }));

    const cmfData = mapSeries(result.data.cmf);

    /* ================= CMF LINE ================= */

    const cmfSeries = addSeries(id, LineSeries, {
      color: indicatorStyle?.CMF?.cmfLine?.color ?? "rgba(255,193,7,1)",
      lineWidth: Number(indicatorStyle?.CMF?.cmfLine?.width ?? 2),
      lineStyle: indicatorStyle?.CMF?.cmfLine?.lineStyle ?? 0,
      visible: indicatorStyle?.CMF?.cmfLine?.visible ?? true,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    /* ================= ZERO LINE ================= */

    const zeroValue = Number(indicatorStyle?.CMF?.zeroLine?.value ?? 0);

    const zeroSeries = addSeries(id, LineSeries, {
      color: indicatorStyle?.CMF?.zeroLine?.color ?? "rgba(158,158,158,1)",
      lineWidth: Number(indicatorStyle?.CMF?.zeroLine?.width ?? 1),
      lineStyle: indicatorStyle?.CMF?.zeroLine?.lineStyle ?? 2,
      visible: indicatorStyle?.CMF?.zeroLine?.visible ?? true,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const zeroData = cmfData.map((p) => ({
      time: p.time,
      value: zeroValue,
    }));

    cmfSeries.setData(cmfData);
    zeroSeries.setData(zeroData);

    indicatorSeriesRef.current[id] = {
      cmfLine: cmfSeries,
      zeroLine: zeroSeries,
      cmfData,
    };
  }, [result, indicatorConfigs]);


  /* ================= STYLE UPDATE (FIXED) ================= */

  useEffect(() => {
    const group = indicatorSeriesRef.current?.[id];
    const style = indicatorStyle?.CMF || indicatorStyle?.[id];

    if (!group || !style) return;

    /* 🔥 APPLY CMF LINE STYLE */
    if (group.cmfLine) {
      group.cmfLine.applyOptions({
        color: style.cmfLine?.color ?? "rgba(255,193,7,1)",
        lineWidth: Number(style.cmfLine?.width ?? 2),
        lineStyle: style.cmfLine?.lineStyle ?? 0,
        visible: style.cmfLine?.visible ?? true,
      });
    }

    /* 🔥 APPLY ZERO LINE STYLE */
    if (group.zeroLine) {
      group.zeroLine.applyOptions({
        color: style.zeroLine?.color ?? "rgba(158,158,158,1)",
        lineWidth: Number(style.zeroLine?.width ?? 1),
        lineStyle: style.zeroLine?.lineStyle ?? 2,
        visible: style.zeroLine?.visible ?? true,
      });
    }

  }, [indicatorStyle?.CMF]); // ✅ FIXED DEPENDENCY

  return null;
}