export function renderPrimitives(_, contract) {
  return {
    boxes: Array.isArray(contract?.boxes) ? contract.boxes : [],
    labels: Array.isArray(contract?.labels) ? contract.labels : [],
    fills: Array.isArray(contract?.fills) ? contract.fills : [],
  };
}
