export default function SMAInput(
  response,
  indicatorSeriesRef,
  latestIndicatorValuesRef,
  maType,
) {
  const rows = Array.isArray(response?.data) ? response.data : [];

  const smaData = rows
    .filter((d) => d.sma != null && d.time != null)
    .map((d) => ({ time: Number(d.time), value: Number(d.sma) }));

  const smoothingData = rows
    .filter((d) => d.smoothingMA != null && d.time != null)
    .map((d) => ({ time: Number(d.time), value: Number(d.smoothingMA) }));

  const bbUpperData = rows
    .filter((d) => d.bbUpper != null && d.time != null)
    .map((d) => ({ time: Number(d.time), value: Number(d.bbUpper) }));

  const bbLowerData = rows
    .filter((d) => d.bbLower != null && d.time != null)
    .map((d) => ({ time: Number(d.time), value: Number(d.bbLower) }));

  const series = indicatorSeriesRef.current?.SMA;

  if (!series) return;

  series.sma?.setData(smaData);

  if (maType !== "none") {
    series.smoothingMA?.setData(smoothingData);
  }

  if (maType === "SMA + Bollinger Bands") {
    series.bbUpper?.setData(bbUpperData);
    series.bbLower?.setData(bbLowerData);
  }

  latestIndicatorValuesRef.current.SMA = {
    sma: smaData[smaData.length - 1]?.value,
    smoothingMA: smoothingData[smoothingData.length - 1]?.value,
    bbUpper: bbUpperData[bbUpperData.length - 1]?.value,
    bbLower: bbLowerData[bbLowerData.length - 1]?.value,
  };

  indicatorSeriesRef.current.SMA.result = {
    data: {
      sma: smaData,
      smoothingMA: smoothingData,
      bbUpper: bbUpperData,
      bbLower: bbLowerData,
    },
  };
}
