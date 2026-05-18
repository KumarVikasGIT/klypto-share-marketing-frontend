export default function CHOPInput(
  response,
  indicatorSeriesRef,
  latestIndicatorValuesRef
, instanceId) {

  const rows = response?.data ?? [];

  const group = indicatorSeriesRef.current?.[instanceId || "CHOP"];
  if (!group) return;

  const chopData = rows
    .filter((d) => d?.chop != null && d?.time != null)
    .map((d) => ({
      time: Number(d.time),
      value: Number(d.chop),
    }));

  if (!chopData.length) return;

  /* UPDATE CHOP LINE */

  group.chopLine?.setData(chopData);


  /* UPDATE BANDS */

  const upper = group?.upperValue ?? 61.8;
  const middle = group?.middleValue ?? 50;
  const lower = group?.lowerValue ?? 38.2;

  const makeLevel = (v) =>
    chopData.map((p) => ({
      time: p.time,
      value: v,
    }));

  group.upper?.setData(makeLevel(upper));
  group.middle?.setData(makeLevel(middle));
  group.lower?.setData(makeLevel(lower));


  /* UPDATE BG FILL */

  group.bg?.setData(makeLevel(upper));


  /* UPDATE STORED DATA */

  group.chopData = chopData;


  /* UPDATE LATEST VALUE */

  latestIndicatorValuesRef.current[instanceId || "CHOP"] = {
    chop: chopData[chopData.length - 1]?.value ?? null,
  };

  console.log("✅ CHOP updated after input change");
}