export default function MomentumInput(
  response,
  indicatorSeriesRef,
  latestIndicatorValuesRef
, instanceId) {
  const rows = Array.isArray(response?.data) ? response.data : [];

  /* ================= MOMENTUM ================= */
  const momentumData = rows
    .filter((d) => d.mom != null && d.time != null)
    .map((d) => ({
      time: Number(d.time),
      value: Number(d.mom),
    }))
    .sort((a, b) => a.time - b.time);

  if (!indicatorSeriesRef.current[instanceId || "MOM"]) {
    // If series not created yet, just store result for plotting later
    indicatorSeriesRef.current[instanceId || "MOM"] = {
      result: null,
      MOM: null, // placeholder for LineSeries
    };
  }

  const series = indicatorSeriesRef.current[instanceId || "MOM"].MOM;

  if (series) {
    series.setData(momentumData); // update existing line
  }

  /* ================= UPDATE HOVER VALUES ================= */
  latestIndicatorValuesRef.current[instanceId || "MOM"] = {
    MOM: momentumData[momentumData.length - 1]?.value,
  };

  /* ================= STORE RESULT ================= */
  indicatorSeriesRef.current[instanceId || "MOM"].result = {
    data: {
      momentum: momentumData,
    },
  };
}