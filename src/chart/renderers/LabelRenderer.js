export function renderLabels(_, contract) {
  return Array.isArray(contract?.labels) ? contract.labels : [];
}
