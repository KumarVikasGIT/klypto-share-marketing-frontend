export default function IchimokuCloudInput(
  response,
  indicatorSeriesRef,
  latestIndicatorValuesRef
, instanceId) {

  const rows = Array.isArray(response?.data) ? response.data : [];

  /* ================= CONVERSION LINE ================= */

  const conversionData = rows
    .filter((d) => d.conversionLine != null && d.time != null)
    .map((d) => ({
      time: Number(d.time),
      value: Number(d.conversionLine),
    }))
    .sort((a, b) => a.time - b.time);

  /* ================= BASE LINE ================= */

  const baseData = rows
    .filter((d) => d.baseLine != null && d.time != null)
    .map((d) => ({
      time: Number(d.time),
      value: Number(d.baseLine),
    }))
    .sort((a, b) => a.time - b.time);

  /* ================= LEAD LINE 1 ================= */

  const leadLine1Data = rows
    .filter((d) => d.leadLine1 != null && d.time != null)
    .map((d) => ({
      time: Number(d.time),
      value: Number(d.leadLine1),
    }))
    .sort((a, b) => a.time - b.time);

  /* ================= LEAD LINE 2 ================= */

  const leadLine2Data = rows
    .filter((d) => d.leadLine2 != null && d.time != null)
    .map((d) => ({
      time: Number(d.time),
      value: Number(d.leadLine2),
    }))
    .sort((a, b) => a.time - b.time);

  /* ================= LAGGING SPAN ================= */

  const laggingData = rows
    .filter((d) => d.laggingSpan != null && d.time != null)
    .map((d) => ({
      time: Number(d.time),
      value: Number(d.laggingSpan),
    }))
    .sort((a, b) => a.time - b.time);

  const series = indicatorSeriesRef.current?.[instanceId || "ICHIMOKU"];
  if (!series) return;

  /* ================= UPDATE SERIES ================= */

  series.conversionLine?.setData(conversionData);
  series.baseLine?.setData(baseData);
  series.leadLine1?.setData(leadLine1Data);
  series.leadLine2?.setData(leadLine2Data);
  series.laggingSpan?.setData(laggingData);

  /* ================= UPDATE HOVER VALUES ================= */

  latestIndicatorValuesRef.current[instanceId || "ICHIMOKU"] = {
    conversionLine: conversionData[conversionData.length - 1]?.value,
    baseLine: baseData[baseData.length - 1]?.value,
    leadLine1: leadLine1Data[leadLine1Data.length - 1]?.value,
    leadLine2: leadLine2Data[leadLine2Data.length - 1]?.value,
    laggingSpan: laggingData[laggingData.length - 1]?.value,
  };

  /* ================= STORE RESULT ================= */

  indicatorSeriesRef.current[instanceId || "ICHIMOKU"].result = {
    data: {
      conversionLine: conversionData,
      baseLine: baseData,
      leadLine1: leadLine1Data,
      leadLine2: leadLine2Data,
      laggingSpan: laggingData,
    },
  };
}