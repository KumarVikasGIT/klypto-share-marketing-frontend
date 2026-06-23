export default function WilliamsRInput(
  response,
  indicatorSeriesRef,
  latestIndicatorValuesRef
, instanceId) {
  const rows = Array.isArray(response?.data?.series)
    ? response.data.series
    : [];

  // Process %R data
  const rData = rows
    .filter((d) => d.williamPercentR != null && d.time != null)
    .map((d) => ({
      time: Number(d.time),
      value: Number(d.williamPercentR),
    }))
    .sort((a, b) => a.time - b.time);

  // Update series data in indicatorSeriesRef without removing the series
  if (!indicatorSeriesRef.current[instanceId || "WPR"]) {
    indicatorSeriesRef.current[instanceId || "WPR"] = {};
  }
  indicatorSeriesRef.current[instanceId || "WPR"].rData = rData;

  // Update result structure (used by plotting)
  indicatorSeriesRef.current[instanceId || "WPR"].result = { data: { r: rData } };

  // Update latest value
  latestIndicatorValuesRef.current[instanceId || "WPR"] = {
    r: rData.length ? rData[rData.length - 1].value : null,
  };

  return rData;
}