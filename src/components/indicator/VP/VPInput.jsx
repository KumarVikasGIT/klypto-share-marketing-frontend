export default function VPInput(
  response,
  indicatorSeriesRef,
  latestIndicatorValuesRef,
  maType
, instanceId) {
  const rows = Array.isArray(response?.data) ? response.data : [];

  const volumeData = rows
    .filter((d) => d.volume != null && d.time != null)
    .map((d) => ({
      time: Number(d.time),
      value: Number(d.volume),
      color:
        d.color ??
        (d.close >= d.open
          ? "rgba(38,166,154,1)"
          : "rgba(239,83,80,1)"),
    }))
    .sort((a, b) => a.time - b.time);

  const maData = rows
    .filter((d) => d.volumeMA != null && d.time != null)
    .map((d) => ({
      time: Number(d.time),
      value: Number(d.volumeMA),
    }))
    .sort((a, b) => a.time - b.time);

  const series = indicatorSeriesRef.current?.[instanceId || "VP"];
  if (!series) return;

  /* 🔥 HISTOGRAM */
  series.volume?.setData(volumeData);

  /* 🔥 MA */
  if (maType !== "none") {
    series.volumeMA?.setData(maData);
  } else {
    series.volumeMA?.setData([]);
  }

  /* 🔥 VALUES */
  latestIndicatorValuesRef.current[instanceId || "VP"] = {
    volume: volumeData.at(-1)?.value,
    volumeMA: maType !== "none" ? maData.at(-1)?.value : null,
  };

  /* 🔥 STORE */
  indicatorSeriesRef.current[instanceId || "VP"].result = {
    data: {
      volume: volumeData,
      volumeMA: maType !== "none" ? maData : [],
    },
  };
}