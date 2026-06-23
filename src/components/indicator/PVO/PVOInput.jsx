export default function PVOInput(response, indicatorSeriesRef, latestIndicatorValuesRef, instanceId) {
  const rows = Array.isArray(response?.data) ? response.data : [];
  if (!rows.length) return;

  // ---------- MAP DATA ----------
  const pvoData = rows
    .filter((d) => d.pvo != null && d.time != null)
    .map((d) => ({ time: Number(d.time), value: Number(d.pvo) }));

  const signalData = rows
    .filter((d) => d.signal != null && d.time != null)
    .map((d) => ({ time: Number(d.time), value: Number(d.signal) }));

  const histData = rows
    .filter((d) => d.hist != null && d.time != null)
    .map((d) => ({ time: Number(d.time), value: Number(d.hist) }));

  // ---------- UPDATE SERIES IF EXISTS ----------
  const series = indicatorSeriesRef.current?.[instanceId || "PVO"];
  if (series) {
    series.pvo?.setData(pvoData);
    series.signal?.setData(signalData);
    series.hist?.setData(histData);

    // store raw data for recoloring
    series.rawData = { pvo: pvoData, signal: signalData, hist: histData };

    // store result for plot
    series.result = { data: { pvo: pvoData, signal: signalData, hist: histData } };
  } else {
    // If series does not exist yet, store result and rows for PVOPlot
    indicatorSeriesRef.current[instanceId || "PVO"] = {
      result: { data: { pvo: pvoData, signal: signalData, hist: histData } },
      rows,
    };
  }

  // ---------- UPDATE LATEST VALUES ----------
  latestIndicatorValuesRef.current[instanceId || "PVO"] = {
    pvo: pvoData[pvoData.length - 1]?.value ?? null,
    signal: signalData[signalData.length - 1]?.value ?? null,
    hist: histData[histData.length - 1]?.value ?? null,
  };
}