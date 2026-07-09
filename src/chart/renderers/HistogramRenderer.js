import { HistogramSeries } from "lightweight-charts";
import { defaultPriceFormat } from "../../util/common";
import { normalizeData } from "./seriesUtils";

export function renderHistogram(chart, plot) {
  const style = plot.style || {};
  const series = chart.addSeries(HistogramSeries, {
    color: style.color || "#3b82f6",
    priceLineVisible: false,
    lastValueVisible: style.visible !== false,
    priceFormat: defaultPriceFormat,
    base: style.base ?? 0,
  });
  series.setData(normalizeData(plot.data));
  return series;
}
