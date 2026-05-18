export default function UOInput(
  response,
  indicatorSeriesRef,
  latestIndicatorValuesRef,
  instanceId
) {
  const rows = Array.isArray(response?.data?.series)
    ? response.data.series
    : [];

  // Process Ultimate Oscillator data
  const uoData = rows
    .filter((d) => d.uo != null && d.time != null)
    .map((d) => ({
      time: Number(d.time),
      value: Number(d.uo),
    }));

  // Store in indicatorSeriesRef for the plotting component
  if (!indicatorSeriesRef.current[instanceId || "UO"]) {
    indicatorSeriesRef.current[instanceId || "UO"] = {};
  }

  indicatorSeriesRef.current[instanceId || "UO"].uoData = uoData;
  indicatorSeriesRef.current[instanceId || "UO"].result = { data: { uo: uoData } };

  // Store latest value
  latestIndicatorValuesRef.current[instanceId || "UO"] = {
    uo: uoData.length ? uoData[uoData.length - 1].value : null,
  };

  return uoData;
}