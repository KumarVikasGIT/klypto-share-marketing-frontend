const IST_OFFSET = 19800;

export default function BodyDNAInput(
  response,
  indicatorSeriesRef,
  latestIndicatorValuesRef,
  instanceId
) {
  const rows = Array.isArray(response?.data) ? response.data : [];

  const directionalBodyBoxes = rows
    .filter((d) => d.directionalBodyBoxes != null)
    .map((d) => ({
      time: Number(d.time) + IST_OFFSET,
      value: Number(d.directionalBodyBoxes),
    }));

  const avgBoxes = rows
    .filter((d) => d.avgBoxes != null)
    .map((d) => ({
      time: Number(d.time) + IST_OFFSET,
      value: Number(d.avgBoxes),
    }));

  const maxBoxes = rows
    .filter((d) => d.maxBoxes != null)
    .map((d) => ({
      time: Number(d.time) + IST_OFFSET,
      value: Number(d.maxBoxes),
    }));

  const minBoxes = rows
    .filter((d) => d.minBoxes != null)
    .map((d) => ({
      time: Number(d.time) + IST_OFFSET,
      value: Number(d.minBoxes),
    }));

  const bodyPercentile = rows
    .filter((d) => d.bodyPercentile != null)
    .map((d) => ({
      time: Number(d.time) + IST_OFFSET,
      value: Number(d.bodyPercentile),
    }));

  const expansionScore = rows
    .filter((d) => d.expansionScore != null)
    .map((d) => ({
      time: Number(d.time) + IST_OFFSET,
      value: Number(d.expansionScore),
    }));

  const zScore = rows
    .filter((d) => d.zScore != null)
    .map((d) => ({
      time: Number(d.time) + IST_OFFSET,
      value: Number(d.zScore),
    }));

  const indicatorId = instanceId || "BODY915DNA";
  const series = indicatorSeriesRef.current?.[indicatorId];

  if (!series) return;

  series.directionalBodyBoxes?.setData(directionalBodyBoxes);
  series.avgBoxes?.setData(avgBoxes);
  series.maxBoxes?.setData(maxBoxes);
  series.minBoxes?.setData(minBoxes);
  series.bodyPercentile?.setData(bodyPercentile);
  series.expansionScore?.setData(expansionScore);
  series.zScore?.setData(zScore);

  latestIndicatorValuesRef.current[indicatorId] = {
    directionalBodyBoxes: directionalBodyBoxes.at(-1)?.value ?? null,
    avgBoxes: avgBoxes.at(-1)?.value ?? null,
    maxBoxes: maxBoxes.at(-1)?.value ?? null,
    minBoxes: minBoxes.at(-1)?.value ?? null,
    bodyPercentile: bodyPercentile.at(-1)?.value ?? null,
    expansionScore: expansionScore.at(-1)?.value ?? null,
    zScore: zScore.at(-1)?.value ?? null,
  };
}