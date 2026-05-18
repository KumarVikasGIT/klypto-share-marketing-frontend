export default function PVIInput(
response,
indicatorSeriesRef,
latestIndicatorValuesRef
, instanceId) {
const rows = Array.isArray(response?.data) ? response.data : [];

const pviSeries = indicatorSeriesRef.current?.[instanceId || "PVI"]?.pvi;
const emaSeries = indicatorSeriesRef.current?.[instanceId || "PVI"]?.pviEma;

if (!pviSeries && !emaSeries) return;

const pviData = rows
.filter((d) => d.pvi != null && d.time != null)
.map((d) => ({
time: Number(d.time),
value: Number(d.pvi),
}));

const emaData = rows
.filter((d) => d.pviEma != null && d.time != null)
.map((d) => ({
time: Number(d.time),
value: Number(d.pviEma),
}));

if (pviSeries) pviSeries.setData(pviData);
if (emaSeries) emaSeries.setData(emaData);

latestIndicatorValuesRef.current[instanceId || "PVI"] = {
pvi: pviData[pviData.length - 1]?.value ?? null,
pviEma: emaData[emaData.length - 1]?.value ?? null,
};
}
