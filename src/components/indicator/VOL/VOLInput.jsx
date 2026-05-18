export default function VOLInput(
  response,
  indicatorSeriesRef,
  latestIndicatorValuesRef
, instanceId) {
  const rows = Array.isArray(response?.data) ? response.data : [];

  const volumeData = rows.map((d) => ({
    time: Number(d.time),
    value: Number(d.volume),
    // color: d.color, // VOLPlot handles colors; just pass along if provided
  }));

  const volumeMAData = rows
    .filter((d) => d.volumeMA != null)
    .map((d) => ({
      time: Number(d.time),
      value: Number(d.volumeMA),
    }));

  const series = indicatorSeriesRef.current?.[instanceId || "VOL"];
  if (!series) return; // series not yet created by VOLPlot

  // ---------- UPDATE EXISTING SERIES ----------
  series.volume?.setData(volumeData);
  series.volumeMA?.setData(volumeMAData);

  // save raw data for VOLPlot style updates
  series.rawData = volumeData;

  // ---------- UPDATE LATEST VALUES ----------
  latestIndicatorValuesRef.current[instanceId || "VOL"] = {
    volume: volumeData[volumeData.length - 1]?.value ?? null,
    volumeMA: volumeMAData[volumeMAData.length - 1]?.value ?? null,
  };

  // ---------- SAVE FOR RE-RENDERS ----------
  series.result = { data: { volume: volumeData, volumeMA: volumeMAData } };
}