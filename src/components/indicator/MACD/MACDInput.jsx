export default function MACDInput(
  response,
  indicatorSeriesRef,
  latestIndicatorValuesRef
, instanceId) {
  const rows = Array.isArray(response?.data) ? response.data : [];
  if (!rows.length) return;

  // ---------- MAP DATA ----------
  const macdData = rows
    .filter((d) => d?.macd != null && d?.time != null)
    .map((d) => ({ time: Number(d.time) + 19800, value: Number(d.macd) }));

  const signalData = rows
    .filter((d) => d?.signal != null && d?.time != null)
    .map((d) => ({ time: Number(d.time) + 19800, value: Number(d.signal) }));

  const histogramData = rows
    .filter((d) => d?.hist != null && d?.time != null)
    .map((d) => ({ time: Number(d.time) + 19800, value: Number(d.hist) }));

  // ---------- UPDATE SERIES IF EXISTS ----------
  const series = indicatorSeriesRef.current?.[instanceId || "MACD"];
  if (series) {
    series.macd?.setData(macdData);
    series.signal?.setData(signalData);
    series.histogram?.setData(histogramData);

    // store rawData for style updates (like recoloring histogram)
    series.rawData = { macd: macdData, signal: signalData, histogram: histogramData };

    // store result for plot
    series.result = { data: { macd: macdData, signal: signalData, histogram: histogramData } };
  } else {
    // If series does not exist yet, store result and rows for MACDPlot
    indicatorSeriesRef.current[instanceId || "MACD"] = {
      result: { data: { macd: macdData, signal: signalData, histogram: histogramData } },
      rows,
    };
  }

  // ---------- UPDATE LATEST VALUES ----------
  latestIndicatorValuesRef.current[instanceId || "MACD"] = {
    macd: macdData[macdData.length - 1]?.value ?? null,
    signal: signalData[signalData.length - 1]?.value ?? null,
    histogram: histogramData[histogramData.length - 1]?.value ?? null,
  };
}