const IST_OFFSET = 19800;

export default function HealthyBoxInput(
  response,
  indicatorSeriesRef,
  latestIndicatorValuesRef,
  instanceId
) {
  const rows = Array.isArray(response?.data) ? response.data : [];

  const healthScore = rows
    .filter((d) => d.healthScore != null)
    .map((d) => ({
      time: Number(d.time) + IST_OFFSET,
      value: Number(d.healthScore),
    }));

  const directionalScore = rows
    .filter((d) => d.directionalScore != null)
    .map((d) => ({
      time: Number(d.time) + IST_OFFSET,
      value: Number(d.directionalScore),
    }));

  const indicatorId = instanceId || "HEALTHY_BOX";
  const series = indicatorSeriesRef.current?.[indicatorId];

  if (!series) return;

  series.healthScore?.setData(healthScore);
  series.directionalScore?.setData(directionalScore);

  latestIndicatorValuesRef.current[indicatorId] = {
    healthScore: healthScore.at(-1)?.value ?? null,
    directionalScore: directionalScore.at(-1)?.value ?? null,
  };
}