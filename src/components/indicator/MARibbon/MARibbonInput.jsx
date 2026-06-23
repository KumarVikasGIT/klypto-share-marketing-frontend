const IST_OFFSET = 19800;

export default function MARibbonInput(
  response,
  indicatorSeriesRef,
  latestIndicatorValuesRef,
  instanceId
) {
  const rows = Array.isArray(response?.data) ? response.data : [];

  const ma1Data = rows
    .filter((d) => d.ma1 != null && d.time != null)
    .map((d) => ({
      time: Number(d.time) + IST_OFFSET,
      value: Number(d.ma1),
    }))
    .sort((a, b) => a.time - b.time);

  const ma2Data = rows
    .filter((d) => d.ma2 != null && d.time != null)
    .map((d) => ({
      time: Number(d.time) + IST_OFFSET,
      value: Number(d.ma2),
    }))
    .sort((a, b) => a.time - b.time);

  const ma3Data = rows
    .filter((d) => d.ma3 != null && d.time != null)
    .map((d) => ({
      time: Number(d.time) + IST_OFFSET,
      value: Number(d.ma3),
    }))
    .sort((a, b) => a.time - b.time);

  const ma4Data = rows
    .filter((d) => d.ma4 != null && d.time != null)
    .map((d) => ({
      time: Number(d.time) + IST_OFFSET,
      value: Number(d.ma4),
    }))
    .sort((a, b) => a.time - b.time);

  const indicatorId = instanceId || "MA_RIBBON";

  const series = indicatorSeriesRef.current?.[indicatorId];

  if (!series) return;

  series.ma1?.setData(ma1Data);
  series.ma2?.setData(ma2Data);
  series.ma3?.setData(ma3Data);
  series.ma4?.setData(ma4Data);

  if (!latestIndicatorValuesRef.current[indicatorId]) {
    latestIndicatorValuesRef.current[indicatorId] = {};
  }

  latestIndicatorValuesRef.current[indicatorId].ma1 =
    ma1Data[ma1Data.length - 1]?.value ?? null;

  latestIndicatorValuesRef.current[indicatorId].ma2 =
    ma2Data[ma2Data.length - 1]?.value ?? null;

  latestIndicatorValuesRef.current[indicatorId].ma3 =
    ma3Data[ma3Data.length - 1]?.value ?? null;

  latestIndicatorValuesRef.current[indicatorId].ma4 =
    ma4Data[ma4Data.length - 1]?.value ?? null;

  indicatorSeriesRef.current[indicatorId].result = {
    data: {
      ma1: ma1Data,
      ma2: ma2Data,
      ma3: ma3Data,
      ma4: ma4Data,
    },
  };
}