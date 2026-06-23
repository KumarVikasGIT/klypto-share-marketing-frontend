export default function STOCHRSIInput(
  response,
  indicatorSeriesRef,
  latestIndicatorValuesRef
, instanceId) {
  const rows = Array.isArray(response?.data?.candles)
    ? response.data.candles
    : [];

  if (!rows.length) {
    console.warn("STOCHRSI: no data");

    const emptyResult = {
      data: {
        kData: [],
        dData: [],
      },
      _v: Date.now(),
    };

    if (indicatorSeriesRef?.current) {
      indicatorSeriesRef.current[instanceId || "STOCHRSIData"] = emptyResult;
    }

    return emptyResult;
  }

  const kData = [];
  const dData = [];

  for (let i = 0; i < rows.length; i++) {
    const d = rows[i];
    if (!d?.time) continue;

    const time = Number(d.time);

    // ✅ K line
    if (
      d.stochRsiK !== null &&
      d.stochRsiK !== undefined &&
      !isNaN(d.stochRsiK)
    ) {
      kData.push({
        time,
        value: Number(d.stochRsiK),
      });
    }

    // ✅ D line
    if (
      d.stochRsiD !== null &&
      d.stochRsiD !== undefined &&
      !isNaN(d.stochRsiD)
    ) {
      dData.push({
        time,
        value: Number(d.stochRsiD),
      });
    }
  }

  // ✅ FORCE NEW REFERENCES (IMPORTANT)
  const result = {
    data: {
      kData: kData.map((x) => ({ ...x })),
      dData: dData.map((x) => ({ ...x })),
    },
    _v: Date.now(), // 🔥 forces update tracking
  };

  /* ---------------- INIT REF ---------------- */

  if (!indicatorSeriesRef.current) {
    indicatorSeriesRef.current = {};
  }

  if (!indicatorSeriesRef.current[instanceId || "STOCHRSI"]) {
    indicatorSeriesRef.current[instanceId || "STOCHRSI"] = {};
  }

  /* ---------------- SERIES UPDATE ---------------- */

  const kSeries = indicatorSeriesRef.current[instanceId || "STOCHRSI"].kLine;
  const dSeries = indicatorSeriesRef.current[instanceId || "STOCHRSI"].dLine;

  try {
    if (kSeries?.setData) {
      kSeries.setData(result.data.kData);
    } else {
      console.warn("STOCHRSI: kLine series missing");
    }

    if (dSeries?.setData) {
      dSeries.setData(result.data.dData);
    } else {
      console.warn("STOCHRSI: dLine series missing");
    }
  } catch (err) {
    console.error("STOCHRSI: chart update failed", err);
  }

  /* ---------------- STORE RAW ---------------- */

  indicatorSeriesRef.current[instanceId || "STOCHRSIData"] = result.data;

  /* ---------------- LATEST VALUES ---------------- */

  if (!latestIndicatorValuesRef.current) {
    latestIndicatorValuesRef.current = {};
  }

  latestIndicatorValuesRef.current[instanceId || "STOCHRSI"] = {
    kLine: result.data.kData.at(-1)?.value ?? null,
    dLine: result.data.dData.at(-1)?.value ?? null,
  };

  /* ---------------- DEBUG ---------------- */

  console.log("STOCHRSI updated:", {
    rows: rows.length,
    kPoints: result.data.kData.length,
    dPoints: result.data.dData.length,
    last: latestIndicatorValuesRef.current[instanceId || "STOCHRSI"],
    version: result._v,
  });

  return result;
}