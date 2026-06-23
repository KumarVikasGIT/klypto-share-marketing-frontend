export default function CMOInput(
  response,
  indicatorSeriesRef,
  latestIndicatorValuesRef,
  instanceId
) {
  const rows = response?.data ?? [];

  const cmoSeries = indicatorSeriesRef.current?.[instanceId || "CMO"]?.cmoLine;

  if (!cmoSeries) return;

  const cmoData = rows
    .filter((d) => d.cmo != null && d.time != null)
    .map((d) => ({
      time: Number(d.time),
      value: Number(d.cmo),
    }));

  cmoSeries.setData(cmoData);

  latestIndicatorValuesRef.current[instanceId || "CMO"] = {
    cmo: cmoData[cmoData.length - 1]?.value ?? null,
  };
}
