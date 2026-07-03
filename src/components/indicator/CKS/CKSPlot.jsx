import { useEffect } from "react";
import { LineSeries } from "lightweight-charts";

export default function CKSPlot({
  result,
  indicatorStyle,
  indicatorSeriesRef,
  addSeries,
}) {

  /* ================= CREATE CKS ================= */

  useEffect(() => {
    if (!result) return;

    const longData = result?.data?.long;
    const shortData = result?.data?.short;

    if (!Array.isArray(longData) || !Array.isArray(shortData)) return;
    if (!longData?.length && !shortData?.length) return;

    /* 🔥 REMOVE OLD CKS */

    if (indicatorSeriesRef.current?.CKS) {
      Object.values(indicatorSeriesRef.current.CKS).forEach((s) => {
        if (s?.setData) {
          try {
            s.setData([]);
          } catch {}
        }
      });
      indicatorSeriesRef.current.CKS = null;
    }

    const groupedSeries = {};

    const longStyle = indicatorStyle?.CKS?.long;
    const shortStyle = indicatorStyle?.CKS?.short;

    /* 🔵 LONG SERIES */

    const longSeries = addSeries("CKS", LineSeries, {
      color: longStyle?.color || "#26a69a",
      lineWidth: longStyle?.width || 2,
      lineStyle: longStyle?.lineStyle ?? 0,
      visible: longStyle?.visible ?? true,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    if (longSeries) {
      longSeries.setData(longData);
      groupedSeries.long = longSeries;
    }

    /* 🔴 SHORT SERIES */

    const shortSeries = addSeries("CKS", LineSeries, {
      color: shortStyle?.color || "#ef5350",
      lineWidth: shortStyle?.width || 2,
      lineStyle: shortStyle?.lineStyle ?? 0,
      visible: shortStyle?.visible ?? true,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    if (shortSeries) {
      shortSeries.setData(shortData);
      groupedSeries.short = shortSeries;
    }

    indicatorSeriesRef.current.CKS = groupedSeries;

  }, [result]);


  /* ================= STYLE UPDATE ================= */

  useEffect(() => {
    const cksGroup = indicatorSeriesRef.current?.CKS;
    if (!cksGroup) return;

    const longStyle = indicatorStyle?.CKS?.long;
    const shortStyle = indicatorStyle?.CKS?.short;

    /* 🔵 UPDATE LONG */

    if (cksGroup.long) {
      cksGroup.long.applyOptions({
        color: longStyle?.color,
        lineWidth: longStyle?.width,
        lineStyle: longStyle?.lineStyle ?? 0,
        visible: longStyle?.visible,
        lastValueVisible: longStyle?.visible,
        opacity: longStyle?.opacity,
      });
    }

    /* 🔴 UPDATE SHORT */

    if (cksGroup.short) {
      cksGroup.short.applyOptions({
        color: shortStyle?.color,
        lineWidth: shortStyle?.width,
        lineStyle: shortStyle?.lineStyle ?? 0,
        visible: shortStyle?.visible,
        lastValueVisible: shortStyle?.visible,
        opacity: shortStyle?.opacity,
      });
    }

  }, [indicatorStyle]);

  return null;
}