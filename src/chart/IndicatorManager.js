import { LineSeries } from "lightweight-charts";
import { renderArea } from "./renderers/AreaRenderer";
import { renderCandleOverlay } from "./renderers/CandleOverlayRenderer";
import { renderCustomCanvas } from "./renderers/CustomCanvasRenderer";
import {
  renderContractFills,
  renderGradientFill,
} from "./renderers/GradientFillRenderer";
import { renderHistogram } from "./renderers/HistogramRenderer";
import { renderLine } from "./renderers/LineRenderer";
import { renderPrimitives } from "./renderers/PrimitiveRenderer";
import { renderSignals } from "./renderers/SignalRenderer";
import { renderZones } from "./renderers/ZoneRenderer";
import { contractTimes } from "./renderers/seriesUtils";

function renderLevel(chart, level, times) {
  if (!times.length) return null;
  const series = chart.addSeries(LineSeries, {
    color: level.color || "#94a3b8",
    lineWidth: level.width || 1,
    lineStyle: 2,
    priceLineVisible: true,
    title: level.label || "",
  });
  series.setData(times.map((time) => ({ time, value: Number(level.value) })));
  return series;
}

export function renderIndicatorContract(chart, contract, options = {}) {
  const rendered = {
    series: [],
    markers: null,
    primitives: renderPrimitives(chart, contract),
    customCanvas: [],
  };
  const plots = Array.isArray(contract?.plots) ? contract.plots : [];
  const plotsById = new Map(
    plots
      .filter((plot) => plot?.id)
      .map((plot) => [plot.id, plot]),
  );

  rendered.series.push(...renderContractFills(chart, contract, plotsById));

  plots.forEach((plot) => {
    if (plot?.style?.visible === false) return;
    const fillSeries = renderGradientFill(chart, plot);
    if (fillSeries) {
      rendered.series.push(fillSeries);
    }

    let series = null;
    switch (String(plot?.type || "line")) {
      case "area":
      case "baseline":
      case "cloud":
        series = renderArea(chart, plot);
        break;
      case "histogram":
      case "bar":
      case "column":
      case "columns":
      case "heatmap":
        series = renderHistogram(chart, plot);
        break;
      case "candle":
        series = renderCandleOverlay(chart, plot);
        break;
      case "customCanvas":
        rendered.customCanvas.push(renderCustomCanvas(chart, plot));
        break;
      case "line":
      case "stepLine":
      case "scatter":
      default:
        series = renderLine(chart, plot);
        break;
    }
    if (series) {
      rendered.series.push(series);
    }
  });

  const times = contractTimes(contract);
  (contract?.levels || []).forEach((level) => {
    const series = renderLevel(chart, level, times);
    if (series) rendered.series.push(series);
  });

  rendered.series.push(...renderZones(chart, contract));

  if (options.markerSeries) {
    rendered.markers = renderSignals(options.markerSeries, contract?.signals || []);
  }

  return rendered;
}
