export default function TEMAInput(
  response,
  indicatorSeriesRef,
  latestIndicatorValuesRef
, instanceId) {

  const rows = Array.isArray(response?.data) ? response.data : [];

  /* ================= TEMA ================= */

  const temaData = rows
    .filter((d) => d.tema != null && d.time != null)
    .map((d) => ({
      time: Number(d.time),
      value: Number(d.tema),
    }))
    .sort((a, b) => a.time - b.time);

  const series = indicatorSeriesRef.current?.[instanceId || "TEMA"];

  if (!series) return;

  /* ================= UPDATE TEMA ================= */

  series.tema?.setData(temaData);

  /* ================= HOVER VALUE ================= */

  latestIndicatorValuesRef.current[instanceId || "TEMA"] = {
    tema: temaData[temaData.length - 1]?.value,
  };

  /* ================= STORE RESULT ================= */

  indicatorSeriesRef.current[instanceId || "TEMA"].result = {
    data: {
      tema: temaData,
    },
  };
}