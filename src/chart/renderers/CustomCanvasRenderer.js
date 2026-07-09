export function renderCustomCanvas(_, plot) {
  return {
    type: "customCanvas",
    id: plot?.id,
    draw: plot?.draw || null,
    data: Array.isArray(plot?.data) ? plot.data : [],
    style: plot?.style || {},
  };
}
