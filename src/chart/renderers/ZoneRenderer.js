import { AreaSeries } from "lightweight-charts";
import { contractTimes } from "./seriesUtils";

export function renderZones(chart, contract) {
  const times = contractTimes(contract);
  if (!times.length || !Array.isArray(contract.zones)) return [];
  return contract.zones.map((zone) => {
    const upper = Number(zone.to ?? zone.upper ?? zone.from);
    const lower = Number(zone.from ?? zone.lower ?? zone.to);
    const series = chart.addSeries(AreaSeries, {
      lineColor: zone.borderColor || "rgba(148, 163, 184, 0.35)",
      topColor: zone.color || "rgba(59, 130, 246, 0.16)",
      bottomColor: zone.colorBottom || "rgba(59, 130, 246, 0.04)",
      priceLineVisible: false,
      lastValueVisible: false,
    });
    series.setData(
      times.map((time) => ({
        time,
        value: Number.isFinite(upper) ? upper : lower,
      })),
    );
    return series;
  });
}
