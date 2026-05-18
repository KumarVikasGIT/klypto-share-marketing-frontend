export default function TRInput(
  response,
  indicatorSeriesRef,
  latestIndicatorValuesRef
, instanceId) {
  const group = indicatorSeriesRef.current?.[instanceId || "TR"];
  if (!group) return;

  const trData =
    response?.data
      ?.filter((d) => d.trueRange != null && d.time != null)
      .map((d) => ({
        time: Number(d.time),
        value: Number(d.trueRange),
      })) ?? [];

  group.trLine?.setData(trData);

  latestIndicatorValuesRef.current[instanceId || "TR"] = {
    tr: trData[trData.length - 1]?.value ?? null,
  };
}