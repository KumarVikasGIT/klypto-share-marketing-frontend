export default function CKSInput(
  response,
  indicatorSeriesRef,
  latestIndicatorValuesRef
, instanceId) {

  const longSeries = indicatorSeriesRef.current?.[instanceId || "CKS"]?.long;
  const shortSeries = indicatorSeriesRef.current?.[instanceId || "CKS"]?.short;

  if (!longSeries || !shortSeries) return;

  const longData =
    response?.data
      ?.filter((d) => d.stopLong != null && d.time != null)
      .map((d) => ({
        time: Number(d.time),
        value: Number(d.stopLong),
      })) ?? [];

  const shortData =
    response?.data
      ?.filter((d) => d.stopShort != null && d.time != null)
      .map((d) => ({
        time: Number(d.time),
        value: Number(d.stopShort),
      })) ?? [];

  longSeries.setData(longData);
  shortSeries.setData(shortData);

  latestIndicatorValuesRef.current[instanceId || "CKS"] = {
    long: longData[longData?.length - 1]?.value ?? null,
    short: shortData[shortData?.length - 1]?.value ?? null,
  };
}