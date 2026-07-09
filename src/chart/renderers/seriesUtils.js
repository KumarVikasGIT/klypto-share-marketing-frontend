export function normalizeData(data = []) {
  return Array.isArray(data)
    ? data
        .map((point) => {
          const time = Number(point?.time);
          if (!Number.isFinite(time)) return null;
          const value = Number(point?.value);
          if (!Number.isFinite(value)) return { time };
          return {
            ...point,
            time,
            value,
          };
        })
        .filter(Boolean)
    : [];
}

export function defaultSeriesStyle(plot = {}) {
  const style = plot.style || {};
  return {
    color: style.color || plot.color || "#3b82f6",
    lineWidth: style.width ?? style.lineWidth ?? 2,
    priceLineVisible: false,
    lastValueVisible: style.visible !== false,
  };
}

export function contractTimes(contract = {}) {
  const firstPlot = Array.isArray(contract.plots)
    ? contract.plots.find(
        (plot) => Array.isArray(plot.data) && plot.data.length > 0,
      )
    : null;
  return firstPlot ? firstPlot.data.map((point) => point.time).filter(Boolean) : [];
}
