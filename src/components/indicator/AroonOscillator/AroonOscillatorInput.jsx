export default function AroonOscillatorInput(
  response,
  indicatorSeriesRef,
  latestIndicatorValuesRef
, instanceId) {
  console.log("AO INPUT RESPONSE:", response);

  /* ================= GET ROWS ================= */

  const rows = Array.isArray(response?.data) ? response.data : [];

  console.log("AO RAW ROWS:", rows);

  if (!rows.length) {
    console.warn("AO rows empty");
    return;
  }

  /* ================= CLEAN DATA ================= */

  const oscData = rows
    .filter((d) => {
      const valid =
        d &&
        d.time !== undefined &&
        d.aroonOsc !== undefined &&
        d.aroonOsc !== null &&
        !isNaN(Number(d.aroonOsc));

      if (!valid) {
        console.warn("Invalid AO row removed:", d);
      }

      return valid;
    })
    .map((d) => ({
      time: Number(d.time),
      value: Number(d.aroonOsc),
    }))
    .sort((a, b) => a.time - b.time);

  console.log("AO CLEAN DATA:", oscData);

  if (!oscData.length) {
    console.warn("AO clean data empty");
    return;
  }

  /* ================= ALWAYS STORE DATA ================= */

  // ✅ store globally so plot can pick it later
  indicatorSeriesRef.current[instanceId || "AOData"] = oscData;

  /* ================= TRY LIVE UPDATE (if series exists) ================= */

  const series = indicatorSeriesRef.current?.[instanceId || "AO"];

  if (series) {
    try {
      series.oscillator?.setData(oscData);
      console.log("AO oscillator updated");
    } catch (err) {
      console.error("AO oscillator update error:", err);
    }

    /* ================= LEVEL VALUES ================= */

    const upper = series.upperLevel?.options?.value ?? 90;
    const center = series.center?.options?.value ?? 0;
    const lower = series.lowerLevel?.options?.value ?? -90;

    console.log("AO LEVELS:", { upper, center, lower });

    const makeLevelData = (value) =>
      oscData.map((p) => ({
        time: p.time,
        value,
      }));

    try {
      series.upperLevel?.setData(makeLevelData(upper));
      series.center?.setData(makeLevelData(center));
      series.lowerLevel?.setData(makeLevelData(lower));

      console.log("AO level lines updated");
    } catch (err) {
      console.error("AO level update error:", err);
    }

    series.oscData = oscData;
  } else {
    console.warn("AO series not ready yet (data stored)");
  }

  /* ================= HOVER VALUE ================= */

  latestIndicatorValuesRef.current[instanceId || "AO"] = {
    oscillator: oscData[oscData.length - 1]?.value,
  };

  console.log(
    "AO latest value:",
    latestIndicatorValuesRef.current[instanceId || "AO"].oscillator
  );

  /* ================= STORE RESULT ================= */

  indicatorSeriesRef.current[instanceId || "AOResult"] = {
    data: oscData,
  };

  console.log("AO result stored");
}