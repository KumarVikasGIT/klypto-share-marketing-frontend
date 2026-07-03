const IST_OFFSET = 19800;

export default function HMABoxInput(
  response,
  indicatorSeriesRef,
  latestIndicatorValuesRef,
  instanceId
) {
  const rows = Array.isArray(response?.data) ? response.data : [];

  const highToHmaBoxes = rows
    .filter((d) => d.highToHmaBoxes != null)
    .map((d) => ({
      time: Number(d.time) + IST_OFFSET,
      value: Number(d.highToHmaBoxes),
    }));

  const lowToHmaBoxes = rows
    .filter((d) => d.lowToHmaBoxes != null)
    .map((d) => ({
      time: Number(d.time) + IST_OFFSET,
      value: Number(d.lowToHmaBoxes),
    }));

  const closeToHmaBoxes = rows
    .filter((d) => d.closeToHmaBoxes != null)
    .map((d) => ({
      time: Number(d.time) + IST_OFFSET,
      value: Number(d.closeToHmaBoxes),
    }));

  const upperZone = rows.map((d) => ({
    time: Number(d.time) + IST_OFFSET,
    value: Number(d.upperZone),
  }));

  const lowerZone = rows.map((d) => ({
    time: Number(d.time) + IST_OFFSET,
    value: Number(d.lowerZone),
  }));

  const indicatorId = instanceId || "HMA60_BOX_DISTANCE";
  const series = indicatorSeriesRef.current?.[indicatorId];

  if (!series) return;

  series.highToHmaBoxes?.setData(highToHmaBoxes);
  series.lowToHmaBoxes?.setData(lowToHmaBoxes);
  series.closeToHmaBoxes?.setData(closeToHmaBoxes);
  series.upperZone?.setData(upperZone);
  series.lowerZone?.setData(lowerZone);

  latestIndicatorValuesRef.current[indicatorId] = {
    highToHmaBoxes: highToHmaBoxes.at(-1)?.value ?? null,
    lowToHmaBoxes: lowToHmaBoxes.at(-1)?.value ?? null,
    closeToHmaBoxes: closeToHmaBoxes.at(-1)?.value ?? null,
  };
}