export default function VWAPInput(response, indicatorSeriesRef, latestIndicatorValuesRef, instanceId) {
  console.log("🚀 VWAP INPUT FUNCTION HIT");

  const rows = Array.isArray(response?.data) ? response.data : [];

  console.log("📦 RAW RESPONSE:", response);
  console.log("📊 ROWS LENGTH:", rows.length);
  // Arrays for VWAP and bands
  const vwap = [];
  const upper1 = [];
  const lower1 = [];
  const upper2 = [];
  const lower2 = [];
  const upper3 = [];
  const lower3 = [];

  rows.forEach((d) => {
    if (!d?.time) return;

    const time = Number(d.time);

    if (d.vwap != null) vwap.push({ time, value: Number(d.vwap) });

    // Band1
    if (d?.bands?.band1) {
      upper1.push({ time, value: Number(d.bands.band1.upper) });
      lower1.push({ time, value: Number(d.bands.band1.lower) });
    }

    // Band2
    if (d?.bands?.band2) {
      upper2.push({ time, value: Number(d.bands.band2.upper) });
      lower2.push({ time, value: Number(d.bands.band2.lower) });
    }

    // Band3
    if (d?.bands?.band3) {
      upper3.push({ time, value: Number(d.bands.band3.upper) });
      lower3.push({ time, value: Number(d.bands.band3.lower) });
    }
  });

  // Debug logs
  console.log("VWAP INPUT DEBUG:");
  console.log("vwap", vwap.length);
  console.log("band1", upper1.length, lower1.length);
  console.log("band2", upper2.length, lower2.length);
  console.log("band3", upper3.length, lower3.length);

  // Result object for plotting
  const result = {
    data: {
      vwap,
      upper1,
      lower1,
      upper2,
      lower2,
      upper3,
      lower3,
    },
  };

  // Store raw series data
  if (!indicatorSeriesRef.current) indicatorSeriesRef.current = {};
  indicatorSeriesRef.current[instanceId || "VWAPData"] = result;

  // Store latest values
  if (!latestIndicatorValuesRef.current) latestIndicatorValuesRef.current = {};
  latestIndicatorValuesRef.current[instanceId || "VWAP"] = {
    vwap: vwap.at(-1)?.value ?? null,
    upper1: upper1.at(-1)?.value ?? null,
    lower1: lower1.at(-1)?.value ?? null,
    upper2: upper2.at(-1)?.value ?? null,
    lower2: lower2.at(-1)?.value ?? null,
    upper3: upper3.at(-1)?.value ?? null,
    lower3: lower3.at(-1)?.value ?? null,
  };

  return result;
}