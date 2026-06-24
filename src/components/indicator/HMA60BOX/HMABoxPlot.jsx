import { useEffect } from "react";
import { LineSeries, HistogramSeries } from "lightweight-charts";

export default function HMABoxPlot({
  id,
  result,
  indicatorStyle,
  indicatorSeriesRef,
  addSeries,
  chart,
  pane,
}) {

  useEffect(() => {

    if (!result) return;

    if (indicatorSeriesRef.current?.[id]) {
      Object.values(indicatorSeriesRef.current[id]).forEach(series => {
        try {
          chart?.removeSeries(series);
        } catch {}
      });
    }

    const style =
      indicatorStyle?.[id] ??
      indicatorStyle?.HMA60_BOX_DISTANCE;

    const groupedSeries = {};

    // =========================
    // Helper
    // =========================

    const createLine = (key) => {

      const series = addSeries(id, LineSeries, {
        color: style?.[key]?.color,
        lineWidth: style?.[key]?.width,
        visible: style?.[key]?.visible,
        priceLineVisible: false,
      });

      series.setData(result.data[key] || []);

      groupedSeries[key] = series;

      return series;
    };

    // Main Lines
    createLine("highToHmaBoxes");
    createLine("lowToHmaBoxes");

    const closeSeries = createLine("closeToHmaBoxes");

    createLine("upperZone");
    createLine("lowerZone");

    // Zero line
    const zeroLine = addSeries(id, LineSeries, {
      color: style?.zeroLine?.color,
      lineWidth: style?.zeroLine?.width,
      visible: style?.zeroLine?.visible,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    zeroLine.setData(
      result.data.closeToHmaBoxes.map(d => ({
        time: d.time,
        value: 0,
      }))
    );

    groupedSeries.zeroLine = zeroLine;

    // =========================
    // Background Histogram
    // =========================
    if (result.data.bgColors && result.data.bgColors.length > 0) {
      const bgSeries = addSeries(`${id}_bg`, HistogramSeries, {
        lastValueVisible: false,
        priceLineVisible: false,
        baseLineVisible: false,
        autoscaleInfoProvider: () => null, // don't affect auto-scaling
      });
      
      // Map to very large values so it fills the pane vertically
      bgSeries.setData(
        result.data.bgColors.map(d => ({
          time: d.time,
          color: d.color,
          value: 100000, // stretches way up
        }))
      );
      
      try {
        bgSeries.applyOptions({
          base: -100000 // stretches way down
        });
      } catch (e) {
        // Fallback for older versions if needed
      }
      
      groupedSeries.bgSeries = bgSeries;
    }

    indicatorSeriesRef.current[id] = groupedSeries;

  }, [result]);



  useEffect(() => {

    const group = indicatorSeriesRef.current?.[id];

    if (!group) return;

    const style =
      indicatorStyle?.[id] ??
      indicatorStyle?.HMA60_BOX_DISTANCE;

    Object.entries(group).forEach(([key, series]) => {

      if (!series?.applyOptions) return;

      series.applyOptions({
        color: style?.[key]?.color,
        lineWidth: style?.[key]?.width,
        visible: style?.[key]?.visible,
      });

    });

  }, [indicatorStyle]);

  return null;
}