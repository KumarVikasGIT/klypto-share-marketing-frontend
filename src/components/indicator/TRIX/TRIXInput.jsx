export default function TRIXInput(
  response,
  indicatorSeriesRef,
  latestIndicatorValuesRef,
  instanceId
) {
  const rows = response?.data ?? [];

  const group = indicatorSeriesRef.current?.[instanceId || "TRIX"];
  if (!group) return;

  const trixData = rows
    .filter((d) => d.trix != null && d.time != null)
    .map((d) => ({
      time: Number(d.time),
      value: Number(d.trix),
    }));

  if (!trixData.length) return; /* :fire: FORCE UPDATE SERIES */

  group.trixLine?.setData(trixData); /* :fire: UPDATE ZERO LINE ALSO */

  const zeroValue = group?.zeroValue ?? 0;

  const zeroData = trixData.map((p) => ({
    time: p.time,
    value: zeroValue,
  }));

  group.zeroLine?.setData(zeroData); /* :fire: UPDATE LATEST VALUE */

  latestIndicatorValuesRef.current[instanceId || "TRIX"] = {
    trix: trixData[trixData.length - 1]?.value ?? null,
  };

}
