export default function ROCInput(
  response,
  indicatorSeriesRef,
  latestIndicatorValuesRef
, instanceId) {

  const rows = Array.isArray(response?.data) ? response.data : [];

  /* ================= ROC DATA ================= */

  const rocData = rows
    .filter((d) => d.roc != null && d.time != null)
    .map((d) => ({
      time: Number(d.time),
      value: Number(d.roc),
    }))
    .sort((a, b) => a.time - b.time);


  const series = indicatorSeriesRef.current?.[instanceId || "ROC"];
  if (!series) return;

  /* ================= UPDATE ROC ================= */

  series.roc?.setData(rocData);

  /* ================= UPDATE HOVER VALUES ================= */

  latestIndicatorValuesRef.current[instanceId || "ROC"] = {
    roc: rocData[rocData.length - 1]?.value,
  };

  /* ================= STORE RESULT ================= */

  indicatorSeriesRef.current[instanceId || "ROC"].result = {
    data: {
      roc: rocData,
    },
  };
}