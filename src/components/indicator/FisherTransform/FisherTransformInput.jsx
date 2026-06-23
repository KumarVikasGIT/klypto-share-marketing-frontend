export default function FTInput(
  response,
  indicatorSeriesRef,
  latestIndicatorValuesRef
, instanceId) {
  // ---------------- SAFE DATA ----------------
  const rows =
    Array.isArray(response?.data)
      ? response.data
      : [];

  if (!rows.length) {
    console.log(":x: FT rows empty", response);
    return;
  }

  // ---------------- SERIES REFERENCE ----------------
  const group = indicatorSeriesRef.current?.[instanceId || "FT"];
  if (!group || (!group.fisherLine && !group.triggerLine)) {
    console.log(":x: FT series not ready");
    return;
  }

  // ---------------- MAP DATA ----------------
  const fisherData = rows
    .filter((d) => d.fish != null && d.time != null)
    .map((d) => ({
      time: Number(d.time),
      value: Number(d.fish),
    }));

  const triggerData = rows
    .filter((d) => d.trigger != null && d.time != null)
    .map((d) => ({
      time: Number(d.time),
      value: Number(d.trigger),
    }));

  // ---------------- FORCE UPDATE ----------------
  if (group.fisherLine) group.fisherLine.setData([...fisherData]);
  if (group.triggerLine) group.triggerLine.setData([...triggerData]);

  // ---------------- LATEST VALUE ----------------
  latestIndicatorValuesRef.current[instanceId || "FT"] = {
    fisherLine: fisherData[fisherData.length - 1]?.value ?? null,
    triggerLine: triggerData[triggerData.length - 1]?.value ?? null,
  };

  console.log(":white_check_mark: FT updated", {
    fisherPoints: fisherData.length,
    triggerPoints: triggerData.length,
  });

  // ---------------- RETURN DATA ----------------
  return { fisherData, triggerData };
}