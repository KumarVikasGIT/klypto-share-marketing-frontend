export default function EOMInput(
  response,
  indicatorSeriesRef,
  latestIndicatorValuesRef,
  instanceId
) {
  /* :fire: SAFE DATA */
  const rows = Array.isArray(response?.data) ? response.data : [];

  if (!rows.length) {
    console.log(":x: EOM rows empty");
    return;
  }

  const group = indicatorSeriesRef.current?.[instanceId || "EOM"];

  if (!group || !group.eom) {
    console.log(":x: EOM series not ready");
    return;
  } /* :fire: MAP DATA */

  const eomData = rows
    .filter((d) => d.eom != null && d.time != null)
    .map((d) => ({
      time: Number(d.time),
      value: Number(d.eom),
    }));

  if (!eomData.length) {
    console.log(":x: EOM mapped empty");
    return;
  } /* :fire: FORCE UPDATE (IMPORTANT) */

  group.eom.setData([...eomData]); // clone = force refresh
  /* :fire: UPDATE LAST VALUE */

  latestIndicatorValuesRef.current[instanceId || "EOM"] = {
    eom: eomData[eomData.length - 1]?.value ?? null,
  };

  console.log(":white_check_mark: EOM updated", eomData.length);
}
