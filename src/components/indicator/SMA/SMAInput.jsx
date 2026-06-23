const IST_OFFSET = 19800;

export default function SMAInput(
  response,
  indicatorSeriesRef,
  latestIndicatorValuesRef,
  maType,
  instanceId
) {
  const rows = Array.isArray(response?.data) ? response.data : [];

  const smaData = rows
    .filter((d) => d.sma != null && d.time != null)
    .map((d) => ({
      time: Number(d.time) + IST_OFFSET,
      value: Number(d.sma),
    }));

  const smoothingData = rows
    .filter((d) => d.smoothingMA != null && d.time != null)
    .map((d) => ({
      time: Number(d.time) + IST_OFFSET,
      value: Number(d.smoothingMA),
    }));

  const bbUpperData = rows
    .filter((d) => d.bbUpper != null && d.time != null)
    .map((d) => ({
      time: Number(d.time) + IST_OFFSET,
      value: Number(d.bbUpper),
    }));

  const bbLowerData = rows
    .filter((d) => d.bbLower != null && d.time != null)
    .map((d) => ({
      time: Number(d.time) + IST_OFFSET,
      value: Number(d.bbLower),
    }));

  const indicatorId = instanceId || "SMA";
  const series = indicatorSeriesRef.current?.[indicatorId];

  if (!series) return;

  series.sma?.setData(smaData);

  if (maType !== "none") {
    series.smoothingMA?.setData(smoothingData);
  }

  if (maType === "SMA + Bollinger Bands") {
    series.bbUpper?.setData(bbUpperData);
    series.bbLower?.setData(bbLowerData);
  }

  if (!latestIndicatorValuesRef.current[indicatorId]) {
    latestIndicatorValuesRef.current[indicatorId] = {};
  }

  latestIndicatorValuesRef.current[indicatorId] = {
    sma: smaData[smaData.length - 1]?.value,
    smoothingMA: smoothingData[smoothingData.length - 1]?.value,
    bbUpper: bbUpperData[bbUpperData.length - 1]?.value,
    bbLower: bbLowerData[bbLowerData.length - 1]?.value,
  };

  indicatorSeriesRef.current[indicatorId].result = {
    data: {
      sma: smaData,
      smoothingMA: smoothingData,
      bbUpper: bbUpperData,
      bbLower: bbLowerData,
    },
  };
}
