const IST_OFFSET = 19800;

export default function VolatilityMomentumProInput(
  response,
  indicatorSeriesRef,
  latestIndicatorValuesRef,
  instanceId
) {
  const data = response?.data || {};
  const indicatorId = instanceId || "VOLATILITY_MOMENTUM_PRO";

  const series = indicatorSeriesRef.current?.[indicatorId];
  if (!series) return;

  Object.entries(data).forEach(([key, lineData]) => {
    if (series[key]?.setData) {
      series[key].setData(lineData || []);
    }
  });

  if (!latestIndicatorValuesRef.current[indicatorId]) {
    latestIndicatorValuesRef.current[indicatorId] = {};
  }

  // Update latest values
  Object.entries(data).forEach(([key, lineData]) => {
    latestIndicatorValuesRef.current[indicatorId][key] =
      lineData?.length > 0 ? lineData[lineData.length - 1]?.value : null;
  });

  indicatorSeriesRef.current[indicatorId].result = { data };
}