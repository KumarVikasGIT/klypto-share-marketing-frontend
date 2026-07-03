export default function ADInput(
  response,
  indicatorSeriesRef,
  latestIndicatorValuesRef
, instanceId) {
  /* :fire: SAFE DATA */
  const rows = Array.isArray(response?.data) ? response.data : [];

  if (!rows?.length) {
    console.log(":x: AD rows empty");
    return;
  }

  const group = indicatorSeriesRef.current?.[instanceId || "AD"];

  if (!group || !group.ad) {
    console.log(":x: AD series not ready");
    return;
  }

  /* :fire: MAP DATA */
  const adData = rows
    .filter((d) => d.ad != null && d.time != null)
    .map((d) => ({
      time: Number(d.time),
      value: Number(d.ad),
    }));

  if (!adData?.length) {
    console.log(":x: AD mapped empty");
    return;
  }

  /* :fire: FORCE UPDATE (IMPORTANT) */
  group.ad.setData([...adData]); // clone = force refresh

  /* :fire: UPDATE LAST VALUE */
  latestIndicatorValuesRef.current[instanceId || "AD"] = {
    value: adData[adData?.length - 1]?.value ?? null,
  };

  console.log(":white_check_mark: AD updated", adData?.length);
}