export function renderBoxes(_, contract) {
  return Array.isArray(contract?.boxes) ? contract.boxes : [];
}
