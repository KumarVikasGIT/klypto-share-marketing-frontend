import { LineSeries } from "lightweight-charts";
import { defaultPriceFormat } from "../../util/common";
import { defaultSeriesStyle, normalizeData } from "./seriesUtils";

export function renderLine(chart, plot) {
  const series = chart.addSeries(LineSeries, {
    ...defaultSeriesStyle(plot),
    lineStyle: plot?.style?.lineStyle === "dashed" ? 2 : 0,
    priceFormat: defaultPriceFormat,
  });
  series.setData(normalizeData(plot.data));
  return series;
}
