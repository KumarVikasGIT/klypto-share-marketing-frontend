const IST_OFFSET = 19800;

export default function RSIInput(
  response,
  indicatorSeriesRef,
  latestIndicatorValuesRef,
  maType,
  instanceId
) {
  const rows = Array.isArray(response?.data) ? response.data : [];

  // Use instanceId if provided, otherwise fallback to "RSI"
  const series = indicatorSeriesRef.current?.[instanceId || "RSI"];
  if (!series) return;

  /* ================= RSI ================= */

  const rsiData = rows
    .filter((d) => d?.rsi != null && d?.time != null)
    .map((d) => ({
      time: Number(d.time) + IST_OFFSET,
      value: Number(d.rsi),
    }))
    .sort((a, b) => a.time - b.time);

  /* ================= SMOOTHING MA ================= */

  const smoothingData = rows
    .filter((d) => d?.smoothingMA != null && d?.time != null)
    .map((d) => ({
      time: Number(d.time) + IST_OFFSET,
      value: Number(d.smoothingMA),
    }))
    .sort((a, b) => a.time - b.time);

  /* ================= BB UPPER ================= */

  const bbUpperData = rows
    .filter((d) => d?.bbUpper != null && d?.time != null)
    .map((d) => ({
      time: Number(d.time) + IST_OFFSET,
      value: Number(d.bbUpper),
    }))
    .sort((a, b) => a.time - b.time);

  /* ================= BB LOWER ================= */

  const bbLowerData = rows
    .filter((d) => d?.bbLower != null && d?.time != null)
    .map((d) => ({
      time: Number(d.time) + IST_OFFSET,
      value: Number(d.bbLower),
    }))
    .sort((a, b) => a.time - b.time);

  /* ================= UPDATE RSI ================= */

  series.rsi?.setData(rsiData);

  /* ================= UPDATE MA ================= */

  if (maType !== "none") {
    series.smoothingMA?.setData(smoothingData);
  } else {
    series.smoothingMA?.setData([]);
  }

  const indicatorId = instanceId || "RSI";
  console.log(indicatorId, "indicatorId");

  /* ================= BOLLINGER BANDS ================= */

  if (maType === "SMA + Bollinger Bands") {
    series.bbUpper?.setData(bbUpperData);
    series.bbLower?.setData(bbLowerData);

    series.bbUpperData = bbUpperData;
    series.bbLowerData = bbLowerData;

    if (!latestIndicatorValuesRef.current[indicatorId]) {
      latestIndicatorValuesRef.current[indicatorId] = {};
    }
    latestIndicatorValuesRef.current[indicatorId].bbUpper =
      bbUpperData[bbUpperData.length - 1]?.value ?? null;

    latestIndicatorValuesRef.current[indicatorId].bbLower =
      bbLowerData[bbLowerData.length - 1]?.value ?? null;
  } else {
    /* clear BB if MA type changed */

    series.bbUpper?.setData([]);
    series.bbLower?.setData([]);

    series.bbUpperData = [];
    series.bbLowerData = [];

    if (latestIndicatorValuesRef.current[indicatorId]) {
      latestIndicatorValuesRef.current[indicatorId].bbUpper = null;
      latestIndicatorValuesRef.current[indicatorId].bbLower = null;
    }
  }

  /* ================= UPDATE HOVER VALUES ================= */

  if (!latestIndicatorValuesRef.current[indicatorId]) {
    latestIndicatorValuesRef.current[indicatorId] = {};
  }

  latestIndicatorValuesRef.current[indicatorId].rsi =
    rsiData[rsiData.length - 1]?.value ?? null;

  latestIndicatorValuesRef.current[indicatorId].smoothingMA =
    smoothingData[smoothingData.length - 1]?.value ?? null;

  /* ================= STORE RESULT ================= */

  indicatorSeriesRef.current[indicatorId].result = {
    data: {
      rsi: rsiData,
      smoothingMA: maType !== "none" ? smoothingData : [],
      bbUpper: maType === "SMA + Bollinger Bands" ? bbUpperData : [],
      bbLower: maType === "SMA + Bollinger Bands" ? bbLowerData : [],
    },
  };
}