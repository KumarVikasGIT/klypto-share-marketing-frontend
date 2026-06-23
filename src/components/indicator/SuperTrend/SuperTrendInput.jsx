export default function SuperTrendInput(
  response,
  indicatorSeriesRef,
  latestIndicatorValuesRef
, instanceId) {
  const rows = Array.isArray(response?.data) ? response.data : [];

  if (!rows.length) {
    console.warn("SuperTrendInput: no rows");

    const emptyResult = {
      type: "multi",
      data: {
        upTrend: [],
        downTrend: [],
        bodyMiddle: [],
      },
      _v: Date.now(),
    };

    if (indicatorSeriesRef?.current) {
      indicatorSeriesRef.current[instanceId || "SUPERTREND_DATA"] = emptyResult.data;
    }

    return emptyResult;
  }

  const upTrend = [];
  const downTrend = [];
  const bodyMiddle = [];

  for (let i = 0; i < rows.length; i++) {
    const d = rows[i];
    if (!d?.time) continue;

    const time = Number(d.time);

    // ✅ upTrend
    upTrend.push({
      time,
      value:
        d.upTrend !== null && d.upTrend !== undefined && !isNaN(d.upTrend)
          ? Number(d.upTrend)
          : null,
    });

    // ✅ downTrend
    downTrend.push({
      time,
      value:
        d.downTrend !== null && d.downTrend !== undefined && !isNaN(d.downTrend)
          ? Number(d.downTrend)
          : null,
    });

    // ✅ bodyMiddle (only valid values)
    if (
      d.bodyMiddle !== null &&
      d.bodyMiddle !== undefined &&
      !isNaN(d.bodyMiddle)
    ) {
      bodyMiddle.push({
        time,
        value: Number(d.bodyMiddle),
      });
    }
  }

  // ✅ ALWAYS NEW OBJECT REFERENCES
  const result = {
    type: "multi",
    data: {
      upTrend: upTrend.map((x) => ({ ...x })),
      downTrend: downTrend.map((x) => ({ ...x })),
      bodyMiddle: bodyMiddle.map((x) => ({ ...x })),
    },
    _v: Date.now(),
  };

  // ✅ INIT REF SAFELY
  if (!indicatorSeriesRef.current) {
    indicatorSeriesRef.current = {};
  }

  // ✅ STORE RAW DATA
  indicatorSeriesRef.current[instanceId || "SUPERTREND_DATA"] = result.data;

  // ✅ 🔥 IMPORTANT: FORCE CHART UPDATE (if series exist)
  const series = indicatorSeriesRef.current;

  try {
    if (series.upTrendSeries?.setData) {
      series.upTrendSeries.setData(result.data.upTrend);
    }

    if (series.downTrendSeries?.setData) {
      series.downTrendSeries.setData(result.data.downTrend);
    }

    if (series.bodyMiddleSeries?.setData) {
      series.bodyMiddleSeries.setData(result.data.bodyMiddle);
    }
  } catch (err) {
    console.error("SuperTrendInput: chart update failed", err);
  }

  // ✅ Latest values
  const last = rows[rows.length - 1];

  if (!latestIndicatorValuesRef.current) {
    latestIndicatorValuesRef.current = {};
  }

  latestIndicatorValuesRef.current[instanceId || "SUPERTREND"] = {
    supertrend:
      last?.supertrend !== undefined ? Number(last.supertrend) : null,
    upTrend: last?.upTrend !== undefined ? Number(last.upTrend) : null,
    downTrend: last?.downTrend !== undefined ? Number(last.downTrend) : null,
    bodyMiddle:
      last?.bodyMiddle !== undefined ? Number(last.bodyMiddle) : null,
  };

  // ✅ DEBUG LOG (optional)
  console.log("SuperTrend updated:", {
    points: rows.length,
    last: latestIndicatorValuesRef.current[instanceId || "SUPERTREND"],
    version: result._v,
  });

  return result;
}