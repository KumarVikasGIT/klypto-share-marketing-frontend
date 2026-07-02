import { useEffect } from "react";
import { LineSeries } from "lightweight-charts";

export default function VolatilityMomentumProPlot({
  result,
  rows,
  indicatorStyle,
  indicatorSeriesRef,
  addSeries,
}) {
  useEffect(() => {
    if (!result) return;

    if (indicatorSeriesRef.current?.VOLATILITY_MOMENTUM_PRO) {
      Object.values(
        indicatorSeriesRef.current.VOLATILITY_MOMENTUM_PRO
      ).forEach((series) => {
        try {
          series?.setData([]);
        } catch {}
      });
    }

    const groupedSeries = {};

    const data = result?.data || {};

    [
      "openingRangeHigh",
      "openingRangeLow",
      "volatilityUpperChannel",
      "volatilityLowerChannel",
    ].forEach((key) => {
      const line = data[key] || [];
      if (!line.length) return;

      const style = indicatorStyle?.VOLATILITY_MOMENTUM_PRO?.[key];
      const row = rows.find((r) => r.key === key);

      const series = addSeries(
        "VOLATILITY_MOMENTUM_PRO",
        LineSeries,
        {
          color: style?.color || row?.color,
          lineWidth: style?.width || 2,
          lineStyle: style?.lineStyle || 0,
          visible: style?.visible ?? true,
          lastValueVisible: true,
          priceLineVisible: false,
        }
      );

      if (!series) return;

      series.setData(line);

      groupedSeries[key] = series;
    });

    indicatorSeriesRef.current.VOLATILITY_MOMENTUM_PRO =
      groupedSeries;
  }, [result]);

  useEffect(() => {
    const group =
      indicatorSeriesRef.current?.VOLATILITY_MOMENTUM_PRO;

    if (!group) return;

    Object.entries(group).forEach(([key, series]) => {
      if (!series?.applyOptions) return;

      const style =
        indicatorStyle?.VOLATILITY_MOMENTUM_PRO?.[key];

      if (!style) return;

      series.applyOptions({
        color: style.color,
        lineWidth: style.width,
        lineStyle: style.lineStyle,
        visible: style.visible,
      });
    });
  }, [indicatorStyle]);

  useEffect(() => {
    return () => {
      indicatorSeriesRef.current.VOLATILITY_MOMENTUM_PRO =
        null;
    };
  }, []);

  return null;
}