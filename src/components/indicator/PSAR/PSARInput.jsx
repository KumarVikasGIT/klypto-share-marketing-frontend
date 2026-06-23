export default function PSARInput(
  response,
  indicatorSeriesRef,
  latestIndicatorValuesRef
, instanceId) {
  const rows = Array.isArray(response?.data) ? response.data : [];

  /* ================= PSAR ================= */

  const psarData = rows
    .filter((d) => d.sar != null && d.time != null)
    .map((d) => ({
      time: Number(d.time),
      value: Number(d.sar),
    }))
    .sort((a, b) => a.time - b.time);

  const series = indicatorSeriesRef.current?.[instanceId || "PSAR"];

  if (!series) return;

  /* ================= UPDATE PSAR ================= */

  series.psar?.setData(psarData);

  /* ================= UPDATE HOVER VALUE ================= */

  latestIndicatorValuesRef.current[instanceId || "PSAR"].psar =
    psarData[psarData.length - 1]?.value;

  /* ================= STORE RESULT ================= */

  indicatorSeriesRef.current[instanceId || "PSAR"].result = {
    data: {
      psar: psarData,
    },
  };
}