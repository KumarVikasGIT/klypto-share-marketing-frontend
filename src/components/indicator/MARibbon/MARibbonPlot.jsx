import { useEffect } from "react";
import { LineSeries } from "lightweight-charts";

export default function MARibbonPlot({
  result,
  rows,
  indicatorStyle,
  indicatorSeriesRef,
  addSeries,
  chart,
}) {
  useEffect(() => {
    if (!result) return;

    if (indicatorSeriesRef.current?.MA_RIBBON) {
      Object.values(indicatorSeriesRef.current.MA_RIBBON).forEach((s) => {
        if (s && typeof s.setData === "function") {
          try {
            chart?.removeSeries(s);
          } catch {}
        }
      });

      indicatorSeriesRef.current.MA_RIBBON = null;
    }

    const groupedSeries = {};

    Object.entries(result?.data || {}).forEach(
      ([lineName, lineData]) => {
        const rowConfig = rows?.find(
          (r) => r.key === lineName
        );

        const styleConfig =
          indicatorStyle?.MA_RIBBON?.[lineName];

        const series = addSeries(
          "MA_RIBBON",
          LineSeries,
          {
            color:
              styleConfig?.color ||
              rowConfig?.color ||
              "#42a5f5",

            lineWidth: styleConfig?.width || 2,

            lineStyle: styleConfig?.lineStyle,

            visible:
              styleConfig?.visible ?? true,

            priceLineVisible: false,

            lastValueVisible: true,
          }
        );

        if (!series) return;

        series.setData(lineData);

        groupedSeries[lineName] = series;
      }
    );

    indicatorSeriesRef.current.MA_RIBBON =
      groupedSeries;
  }, [result]);

  useEffect(() => {
    const ribbonGroup =
      indicatorSeriesRef.current?.MA_RIBBON;

    if (!ribbonGroup) return;

    Object.entries(ribbonGroup).forEach(
      ([key, series]) => {
        if (!series?.applyOptions) return;

        const style =
          indicatorStyle?.MA_RIBBON?.[key];

        if (!style) return;

        series.applyOptions({
          color: style.color,
          lineWidth: style.width,
          lineStyle: style.lineStyle,
          visible: style.visible,
        });
      }
    );
  }, [indicatorStyle, result]);

  useEffect(() => {
    return () => {
      if (
        indicatorSeriesRef.current?.MA_RIBBON
      ) {
        indicatorSeriesRef.current.MA_RIBBON =
          null;
      }
    };
  }, []);

  return null;
}