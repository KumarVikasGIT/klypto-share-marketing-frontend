export default function TMAInput(
  response,
  indicatorSeriesRef,
  latestIndicatorValuesRef
, instanceId) {
  const group = indicatorSeriesRef.current?.[instanceId || "TMA"];
  if (!group) return;

  const tmaData =
    response?.data
      ?.filter((d) => d.tma != null && d.time != null)
      .map((d) => ({
        time: Number(d.time),
        value: Number(d.tma),
      })) ?? [];

  group.tmaLine?.setData(tmaData);

  latestIndicatorValuesRef.current[instanceId || "TMA"] = {
    tma: tmaData[tmaData.length - 1]?.value ?? null,
  };
}