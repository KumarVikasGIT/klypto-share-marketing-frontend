export default function ATRInput(
  response,
  indicatorSeriesRef,
  latestIndicatorValuesRef
, instanceId) {

  const rows = Array.isArray(response?.data) ? response.data : [];

  const atrData = rows
    .filter((d) => d && d.atr != null && d.time != null)
    .map((d) => ({
      time: Number(d.time) + 19800,
      value: Number(d.atr),
    }));

  const series = indicatorSeriesRef.current?.[instanceId || "ATR"];
  if (!series) return;

  series.atr?.setData(atrData);

  latestIndicatorValuesRef.current[instanceId || "ATR"] = {
    atr: atrData[atrData.length - 1]?.value,
  };

}