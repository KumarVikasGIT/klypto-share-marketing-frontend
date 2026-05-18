export default function STDDEVInput(
  response,
  indicatorSeriesRef,
  latestIndicatorValuesRef
, instanceId) {
  const rows = Array.isArray(response?.data) ? response.data : [];

  const STDDEVData = rows
    .filter((d) => d.value != null && d.time != null)
    .map((d) => ({
      time: Number(d.time),
      value: Number(d.value),
    }))
    .sort((a, b) => a.time - b.time);

  const series = indicatorSeriesRef.current?.[instanceId || "STDDEV"];
  if (!series) return;

  /* 🔥 UPDATE */
  series.STDDEV?.setData(STDDEVData);

  /* 🔥 VALUES */
  latestIndicatorValuesRef.current[instanceId || "STDDEV"] = {
    value: STDDEVData.at(-1)?.value,
  };

  /* 🔥 STORE */
  indicatorSeriesRef.current[instanceId || "STDDEV"].result = {
    data: STDDEVData,
  };
}