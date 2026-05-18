export default function STOCHInput(
  response,
  indicatorSeriesRef,
  latestIndicatorValuesRef
, instanceId) {
  const rows = Array.isArray(response?.data) ? response.data : [];

  const kData = rows
    .filter((d) => d?.stochastick != null && d?.time != null)
    .map((d) => ({
      time: d.time,
      value: d.stochastick,
    }));

    // {time: 1774564440, stochastick: 49.79, stochasticd: 46.1}
  const dData = rows
    .filter((d) => d?.stochasticd != null && d?.time != null)
    .map((d) => ({
      time: d.time,
      value: d.stochasticd,
    }));

  // Update latest indicator values
  if (kData.length) {
    latestIndicatorValuesRef.current[instanceId || "STOCH"] = {
      k: kData[kData.length - 1].value,
      d: dData[dData.length - 1]?.value ?? null,
    };
  }

  // Push updated data to existing series only
  const series = indicatorSeriesRef.current?.[instanceId || "STOCH"];
  if (series) {
    if (series.k) series.k.setData(kData);
    if (series.d) series.d.setData(dData);

    const makeLevel = (v) => kData.map((p) => ({ time: p.time, value: v }));
    const upper = series.upper?.options?.value ?? 80;
    const middle = series.middle?.options?.value ?? 50;
    const lower = series.lower?.options?.value ?? 20;

    if (series.upper) series.upper.setData(makeLevel(upper));
    if (series.middle) series.middle.setData(makeLevel(middle));
    if (series.lower) series.lower.setData(makeLevel(lower));
    if (series.bg) series.bg.setData(makeLevel(upper));
  }

  return {
    kData,
    dData,
    rows,
  };
}