export default function ADXInput(
  response,
  indicatorSeriesRef,
  latestIndicatorValuesRef
, instanceId) {

  const rows = Array.isArray(response?.data) ? response.data : [];

  const adxData = rows
    .filter((d) => d.adx != null && d.time != null)
    .map((d) => ({
      time: Number(d.time),
      value: Number(d.adx),
    }))
    .sort((a, b) => a.time - b.time);

  const series = indicatorSeriesRef.current?.[instanceId || "ADX"];
  if (!series) return;

  series.adx?.setData(adxData);

  latestIndicatorValuesRef.current[instanceId || "ADX"] = {
    adx: adxData[adxData?.length - 1]?.value,
  };

  indicatorSeriesRef.current[instanceId || "ADX"].result = {
    data: {
      adx: adxData,
    },
  };

}