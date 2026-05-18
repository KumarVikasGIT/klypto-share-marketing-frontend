export default function WMAInput(
  response,
  indicatorSeriesRef,
  latestIndicatorValuesRef
, instanceId) {

  const rows = Array.isArray(response?.data) ? response.data : [];

  /* ================= WMA ================= */

  const wmaData = rows
    .filter((d) => d.wma != null && d.time != null)
    .map((d) => ({
      time: Number(d.time),
      value: Number(d.wma),
    }))
    .sort((a, b) => a.time - b.time);

  const series = indicatorSeriesRef.current?.[instanceId || "WMA"];

  if (!series) return;

  /* ================= UPDATE WMA ================= */

  series.wma?.setData(wmaData);

  /* ================= UPDATE HOVER VALUES ================= */

  latestIndicatorValuesRef.current[instanceId || "WMA"] = {
    wma: wmaData[wmaData.length - 1]?.value,
  };

  /* ================= STORE RESULT ================= */

  indicatorSeriesRef.current[instanceId || "WMA"].result = {
    data: {
      wma: wmaData,
    },
  };
}