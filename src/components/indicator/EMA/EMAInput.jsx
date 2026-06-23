const IST_OFFSET = 19800;

export default function EMAInput(
  response,
  indicatorSeriesRef,
  latestIndicatorValuesRef,
  maType,
  instanceId
) {
  const rows = Array.isArray(response?.data) ? response.data : [];

  /* ================= EMA ================= */
  let emaData = rows
    .filter((d) => d.ema != null && d.time != null)
    .map((d) => ({
      time: Number(d.time) + IST_OFFSET,
      value: Number(d.ema),
    }))
    .sort((a, b) => a.time - b.time);

  /* ================= SMOOTHING MA ================= */
  let smoothingData = rows
    .filter((d) => d.smoothingMA != null && d.time != null)
    .map((d) => ({
      time: Number(d.time) + IST_OFFSET,
      value: Number(d.smoothingMA),
    }))
    .sort((a, b) => a.time - b.time);

  /* ================= BOLLINGER BANDS ================= */
  let bbUpperData = [];
  let bbLowerData = [];
  if (maType === "SMA + Bollinger Bands") {
    bbUpperData = rows
      .filter((d) => d.bbUpper != null && d.time != null)
      .map((d) => ({
        time: Number(d.time) + IST_OFFSET,
        value: Number(d.bbUpper),
      }))
      .sort((a, b) => a.time - b.time);

    bbLowerData = rows
      .filter((d) => d.bbLower != null && d.time != null)
      .map((d) => ({
        time: Number(d.time) + IST_OFFSET,
        value: Number(d.bbLower),
      }))
      .sort((a, b) => a.time - b.time);
  }

  /* ================= UPDATE SERIES ================= */
  const indicatorId = instanceId || "EMA";
  const series = indicatorSeriesRef.current?.[indicatorId];

  if (!series) return;

  series.ema?.setData(emaData);

  if (maType !== "none") {
    series.smoothingMA?.setData(smoothingData);
  } else {
    series.smoothingMA?.setData([]);
  }

  if (maType === "SMA + Bollinger Bands") {
    series.bbUpper?.setData(bbUpperData);
    series.bbLower?.setData(bbLowerData);
  }

  /* ================= UPDATE HOVER VALUES ================= */
  if (!latestIndicatorValuesRef.current[indicatorId]) {
    latestIndicatorValuesRef.current[indicatorId] = {};
  }

  latestIndicatorValuesRef.current[indicatorId].ema =
    emaData[emaData.length - 1]?.value ?? null;
  latestIndicatorValuesRef.current[indicatorId].smoothingMA =
    smoothingData[smoothingData.length - 1]?.value ?? null;
  latestIndicatorValuesRef.current[indicatorId].bbUpper =
    bbUpperData[bbUpperData.length - 1]?.value ?? null;
  latestIndicatorValuesRef.current[indicatorId].bbLower =
    bbLowerData[bbLowerData.length - 1]?.value ?? null;

  /* ================= STORE RESULT ================= */
  indicatorSeriesRef.current[indicatorId].result = {
    data: {
      ema: emaData,
      smoothingMA: maType !== "none" ? smoothingData : [],
      bbUpper: bbUpperData,
      bbLower: bbLowerData,
    },
  };
}