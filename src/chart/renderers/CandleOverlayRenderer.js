import { CandlestickSeries } from "lightweight-charts";
import { defaultPriceFormat } from "../../util/common";

export function renderCandleOverlay(chart, plot) {
  const style = plot.style || {};
  const series = chart.addSeries(CandlestickSeries, {
    upColor: style.upColor || "#22c55e",
    downColor: style.downColor || "#ef4444",
    borderUpColor: style.borderUpColor || style.upColor || "#22c55e",
    borderDownColor: style.borderDownColor || style.downColor || "#ef4444",
    wickUpColor: style.wickUpColor || style.upColor || "#22c55e",
    wickDownColor: style.wickDownColor || style.downColor || "#ef4444",
    priceLineVisible: false,
    priceFormat: defaultPriceFormat,
  });
  series.setData(Array.isArray(plot.data) ? plot.data : []);
  return series;
}
