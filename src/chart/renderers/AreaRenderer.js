import { AreaSeries } from "lightweight-charts";
import { defaultPriceFormat } from "../../util/common";
import { defaultSeriesStyle, normalizeData } from "./seriesUtils";

export function renderArea(chart, plot) {
  const style = plot.style || {};
  const gradient = style.gradientFill || {};
  const series = chart.addSeries(AreaSeries, {
    ...defaultSeriesStyle(plot),
    topColor: gradient.from || style.topColor || `${style.color || "#3b82f6"}55`,
    bottomColor: gradient.to || style.bottomColor || `${style.color || "#3b82f6"}08`,
    lineColor: style.color || "#3b82f6",
    priceFormat: defaultPriceFormat,
  });
  series.setData(normalizeData(plot.data));
  return series;
}
