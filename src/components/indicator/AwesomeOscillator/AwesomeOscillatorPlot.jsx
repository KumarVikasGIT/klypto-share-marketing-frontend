import { useEffect } from "react";
import { HistogramSeries } from "lightweight-charts";

export default function AWOPlot({
  result,
  indicatorStyle,
  indicatorSeriesRef,
  addSeries,
  chart, // chart reference to attach series to bottom pane
}) {
  useEffect(() => {
    if (!result?.data) return;

    const awo = result?.data || [];

    if (!Array.isArray(awo) || awo?.length === 0) return;

    // ---------- REMOVE OLD SERIES ----------
    if (indicatorSeriesRef?.current?.AWO) {
      Object.values(indicatorSeriesRef?.current?.AWO).forEach((s) => {
        try {
          s?.setData?.([]);
        } catch {}
      });
      indicatorSeriesRef.current.AWO = null;
    }

    const groupedSeries = {};

    // ---------- AWO HISTOGRAM ----------
    const style = indicatorStyle?.AWO?.awoBars || {};
    const palette = style?.palette || { up: "rgba(38,166,154,0.6)", down: "rgba(239,83,80,0.6)" };

    const histSeries = addSeries("AWO", HistogramSeries, {
      priceLineVisible: false,
      visible: style?.visible ?? true,
      priceScaleId: "pane_awo", // attach to bottom pane, create pane with this ID
    });

    const coloredAO = awo.map((d) => ({
      time: Number(d.time),
      value: Number(d.ao ?? d.value ?? 0),
      color: d.ao >= 0 ? palette.up : palette.down,
    }));

    histSeries.setData(coloredAO);

    groupedSeries.hist = histSeries;
    groupedSeries.rawData = awo;

    indicatorSeriesRef.current.AWO = groupedSeries;
  }, [result]);

  // ---------- STYLE / PALETTE UPDATE ----------
  useEffect(() => {
    const g = indicatorSeriesRef.current?.AWO;
    if (!g) return;

    const awo = g.rawData;
    if (!awo) return;

    const style = indicatorStyle?.AWO?.awoBars || {};
    const palette = style?.palette || { up: "rgba(38,166,154,0.6)", down: "rgba(239,83,80,0.6)" };
    const visible = style?.visible ?? true;

    const recolored = awo.map((d) => ({
      time: Number(d.time),
      value: Number(d.ao ?? d.value ?? 0),
      color: d.ao >= 0 ? palette.up : palette.down,
    }));

    g.hist?.applyOptions({ visible });
    g.hist?.setData(recolored);
  }, [indicatorStyle?.AWO?.awoBars?.palette?.up, indicatorStyle?.AWO?.awoBars?.palette?.down, indicatorStyle?.AWO?.awoBars?.visible]);

  return null;
}