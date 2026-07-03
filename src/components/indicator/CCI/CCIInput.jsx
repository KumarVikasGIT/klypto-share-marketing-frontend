export default function CCIInput(
  response,
  indicatorSeriesRef,
  latestIndicatorValuesRef
, instanceId) {
  const rows = Array.isArray(response?.data) ? response.data : [];
  const IST_OFFSET = 19800;

  const cciData = rows
    .filter((d) => d.cci != null && d.time != null)
    .map((d) => ({ time: Number(d.time) + IST_OFFSET, value: Number(d.cci) }))
    .sort((a, b) => a.time - b.time);

  const cciMa = rows
    .filter((d) => d.smoothingMA != null && d.time != null)
    .map((d) => ({ time: Number(d.time) + IST_OFFSET, value: Number(d.smoothingMA) }))
    .sort((a, b) => a.time - b.time);

  const bbUpper = rows
    .filter((d) => d.bbUpper != null && d.time != null)
    .map((d) => ({ time: Number(d.time) + IST_OFFSET, value: Number(d.bbUpper) }))
    .sort((a, b) => a.time - b.time);

  const bbLower = rows
    .filter((d) => d.bbLower != null && d.time != null)
    .map((d) => ({ time: Number(d.time) + IST_OFFSET, value: Number(d.bbLower) }))
    .sort((a, b) => a.time - b.time);

  // Ensure CCI series object exists
  if (!indicatorSeriesRef.current[instanceId || "CCI"]) {
    indicatorSeriesRef.current[instanceId || "CCI"] = {
      cciLine: null,
      cciMa: null,
      bbUpper: null,
      bbLower: null,
      upperBand: null,
      middleBand: null,
      lowerBand: null,
      bgFill: null,
      result: null,
    };
  }

  const series = indicatorSeriesRef.current[instanceId || "CCI"];

  // Update series data if lines exist
  series.cciLine?.setData(cciData);
  series.cciMa?.setData(cciMa);
  series.bbUpper?.setData(bbUpper);
  series.bbLower?.setData(bbLower);

  // Update hover/latest values
  latestIndicatorValuesRef.current[instanceId || "CCI"] = {
    cciLine: cciData[cciData?.length - 1]?.value,
    cciMa: cciMa[cciMa?.length - 1]?.value,
    bbUpper: bbUpper[bbUpper?.length - 1]?.value,
    bbLower: bbLower[bbLower?.length - 1]?.value,
  };

  // Store result data
  series.result = {
    data: {
      cciLine: cciData,
      cciMa: cciMa,
      bbUpper: bbUpper,
      bbLower: bbLower,
    },
  };
}