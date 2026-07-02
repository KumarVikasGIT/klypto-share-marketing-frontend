const IST_OFFSET = 19800;

export default function VolatilityMomentumProInput(
  response,
  indicatorSeriesRef,
  latestIndicatorValuesRef,
  instanceId
) {
  const rows = Array.isArray(response?.data)
    ? response.data
    : [];

  const openingRangeHigh = rows
    .filter(
      (d) => d.orHigh != null && d.time != null
    )
    .map((d) => ({
      time: Number(d.time) + IST_OFFSET,
      value: Number(d.orHigh),
    }))
    .sort((a, b) => a.time - b.time);

  const openingRangeLow = rows
    .filter(
      (d) => d.orLow != null && d.time != null
    )
    .map((d) => ({
      time: Number(d.time) + IST_OFFSET,
      value: Number(d.orLow),
    }))
    .sort((a, b) => a.time - b.time);

  const volatilityUpperChannel = rows
    .filter(
      (d) =>
        d.upperChannel != null &&
        d.time != null &&
        d.highMoveProbability
    )
    .map((d) => ({
      time: Number(d.time) + IST_OFFSET,
      value: Number(d.upperChannel),
    }))
    .sort((a, b) => a.time - b.time);

  const volatilityLowerChannel = rows
    .filter(
      (d) =>
        d.lowerChannel != null &&
        d.time != null &&
        d.highMoveProbability
    )
    .map((d) => ({
      time: Number(d.time) + IST_OFFSET,
      value: Number(d.lowerChannel),
    }))
    .sort((a, b) => a.time - b.time);

  const indicatorId =
    instanceId || "VOLATILITY_MOMENTUM_PRO";

  const series =
    indicatorSeriesRef.current?.[indicatorId];

  if (!series) return;

  series.openingRangeHigh?.setData(
    openingRangeHigh
  );

  series.openingRangeLow?.setData(
    openingRangeLow
  );

  series.volatilityUpperChannel?.setData(
    volatilityUpperChannel
  );

  series.volatilityLowerChannel?.setData(
    volatilityLowerChannel
  );

  if (!latestIndicatorValuesRef.current[indicatorId]) {
    latestIndicatorValuesRef.current[indicatorId] =
      {};
  }

  latestIndicatorValuesRef.current[
    indicatorId
  ].openingRangeHigh =
    openingRangeHigh.at(-1)?.value ?? null;

  latestIndicatorValuesRef.current[
    indicatorId
  ].openingRangeLow =
    openingRangeLow.at(-1)?.value ?? null;

  latestIndicatorValuesRef.current[
    indicatorId
  ].volatilityUpperChannel =
    volatilityUpperChannel.at(-1)?.value ?? null;

  latestIndicatorValuesRef.current[
    indicatorId
  ].volatilityLowerChannel =
    volatilityLowerChannel.at(-1)?.value ?? null;

  indicatorSeriesRef.current[indicatorId].result =
    {
      data: {
        openingRangeHigh,
        openingRangeLow,
        volatilityUpperChannel,
        volatilityLowerChannel,
      },
    };
}