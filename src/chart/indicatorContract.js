const OVERLAY_PANES = new Set(["", "overlay", "main", "price", "chart"]);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isContractPlot(plot) {
  return (
    plot &&
    typeof plot === "object" &&
    (Array.isArray(plot.data) || plot.title || plot.style || plot.id)
  );
}

function normalizePane(value, fallback = "overlay") {
  return String(value || fallback).trim().toLowerCase();
}

export function isOverlayPane(value) {
  return OVERLAY_PANES.has(normalizePane(value, ""));
}

export function getScriptChartContract(result = {}) {
  const chart = result?.chart && typeof result.chart === "object" ? result.chart : null;
  const chartPlots = asArray(chart?.plots);

  if (chart && (chartPlots.length > 0 || asArray(chart.levels).length > 0)) {
    return {
      name: chart.name || result.name || "Custom Indicator",
      pane: normalizePane(chart.pane, chart.overlay ? "overlay" : "indicator"),
      overlay: Boolean(chart.overlay),
      plots: chartPlots,
      levels: asArray(chart.levels),
      fills: asArray(chart.fills),
      signals: asArray(chart.signals),
      labels: asArray(chart.labels),
      boxes: asArray(chart.boxes),
      zones: asArray(chart.zones),
      barColors: asArray(chart.barColors),
      bgColors: asArray(chart.bgColors),
      features: chart.features || result.features || {},
      logs: asArray(chart.logs),
      errors: asArray(chart.errors),
    };
  }

  const plots = asArray(result?.plots);
  if (!plots.some(isContractPlot)) return null;

  return {
    name: result.name || "Custom Indicator",
    pane: normalizePane(result.pane, result.overlay ? "overlay" : "indicator"),
    overlay: Boolean(result.overlay),
    plots,
    levels: asArray(result.levels),
    fills: asArray(result.fills),
    signals: asArray(result.signals),
    labels: asArray(result.labels),
    boxes: asArray(result.boxes),
    zones: asArray(result.zones),
    barColors: asArray(result.barColors),
    bgColors: asArray(result.bgColors),
    features: result.features || {},
    logs: asArray(result.logs),
    errors: asArray(result.errors),
  };
}

export function getContractPlotTitle(plot, fallback = "Plot") {
  return plot?.title || plot?.name || plot?.id || fallback;
}

export function isContractPlotOverlay(contract, plot) {
  if (typeof plot?.overlay === "boolean") return plot.overlay;
  if (plot?.pane) return isOverlayPane(plot.pane);
  return Boolean(contract?.overlay) || isOverlayPane(contract?.pane);
}

export function splitContractByPane(contract) {
  const overlayPlots = [];
  const lowerPaneMap = new Map();

  asArray(contract?.plots).forEach((plot, index) => {
    if (!isContractPlot(plot)) return;
    if (isContractPlotOverlay(contract, plot)) {
      overlayPlots.push(plot);
      return;
    }

    const pane = normalizePane(plot.pane || contract.pane, "indicator");
    if (!lowerPaneMap.has(pane)) {
      lowerPaneMap.set(pane, []);
    }
    lowerPaneMap.get(pane).push({ ...plot, _contractIndex: index });
  });

  const base = {
    ...contract,
    levels: asArray(contract?.levels),
    fills: asArray(contract?.fills),
    signals: asArray(contract?.signals),
    labels: asArray(contract?.labels),
    boxes: asArray(contract?.boxes),
    zones: asArray(contract?.zones),
  };

  return {
    overlay:
      overlayPlots.length > 0
        ? { ...base, pane: "overlay", overlay: true, plots: overlayPlots }
        : null,
    panes: [...lowerPaneMap.entries()].map(([pane, plots]) => ({
      ...base,
      pane,
      overlay: false,
      plots,
    })),
  };
}
