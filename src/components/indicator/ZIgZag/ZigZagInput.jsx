export default function ZIGZAGInput(
  response,
  indicatorSeriesRef,
  latestIndicatorValuesRef,
  indicatorStyle // ✅ pass this from parent
, instanceId) {
  const series = response?.data?.series ?? [];
  const pivots = response?.data?.pivots ?? [];

  const zigzagSeries =
    indicatorSeriesRef.current?.[instanceId || "ZIGZAG"]?.zigzagLine;

  // ❌ If series not ready, exit
  if (!zigzagSeries) return;

  // ✅ SAFE STYLE (uses correct key "z")
  const zigzagStyle = indicatorStyle?.ZIGZAG?.z || {};

  const lineColor = zigzagStyle.color ?? "#2962ff";
  const visible = zigzagStyle.visible ?? true;
  const width = zigzagStyle.width ?? 2;

  // 🔹 Prepare line data
  const lineData = series
    .filter((d) => d?.value != null && d?.time != null)
    .map((d) => ({
      time: Number(d.time),
      value: Number(d.value),
    }));

  // ✅ Update line
  try {
    zigzagSeries.setData(lineData);
  } catch (e) {
    console.warn("ZIGZAG setData error:", e);
  }

  // ✅ APPLY STYLE HERE ALSO (important for live updates)
  try {
    zigzagSeries.applyOptions({
      color: lineColor,
      lineWidth: width,
      visible: visible,
    });
  } catch (e) {
    console.warn("ZIGZAG applyOptions error:", e);
  }

  // 🔹 Markers (pivot points)
  const markers = pivots.map((p) => {
    const isHigh = p.type === "high";

    return {
      time: Number(p.time),
      position: isHigh ? "aboveBar" : "belowBar",
      color: lineColor, // ✅ dynamic color from palette
      shape: "circle",
      text: isHigh ? "H" : "L",
    };
  });

  // ✅ Update markers
  try {
    zigzagSeries.setMarkers(markers);
  } catch (e) {
    console.warn("ZIGZAG markers error:", e);
  }

  // 🔹 Store latest value (for tooltip / panel)
  latestIndicatorValuesRef.current[instanceId || "ZIGZAG"] = {
    zigzagLine:
      lineData.length > 0
        ? lineData[lineData.length - 1].value
        : null,
  };
}