export default function AroonInput(
  response,
  indicatorSeriesRef,
  latestIndicatorValuesRef,
  instanceId
) {
  const upSeries = response?.data?.aroonUpSeries ?? [];
  const downSeries = response?.data?.aroonDownSeries ?? [];

  console.log(upSeries, downSeries, "serrrrrrrrrrrr")

  /* ---------- SAFETY CHECK ---------- */

  if (!indicatorSeriesRef.current[instanceId || "AROON"]) {
    indicatorSeriesRef.current[instanceId || "AROON"] = {};
  }

  const series = indicatorSeriesRef.current[instanceId || "AROON"];

  /* ---------- UPDATE SERIES ---------- */

  series.aroonUp?.setData(upSeries);
  series.aroonDown?.setData(downSeries);

  /* ---------- UPDATE LATEST VALUE ---------- */

  latestIndicatorValuesRef.current[instanceId || "AROON"] = {
    aroonUp: upSeries[upSeries.length - 1]?.value,
    aroonDown: downSeries[downSeries.length - 1]?.value,
  };

  /* ---------- STORE RESULT ---------- */

  series.result = {
    data: {
      aroonUp: upSeries,
      aroonDown: downSeries,
    },
  };
}
