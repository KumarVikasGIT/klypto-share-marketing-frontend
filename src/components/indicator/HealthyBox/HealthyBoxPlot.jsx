import { useEffect } from "react";
import { LineSeries, HistogramSeries } from "lightweight-charts";

export default function HealthyBoxPlot({
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
      Object.values(indicatorSeriesRef.current[id]).forEach((series) => {
        try {
          chart?.removeSeries(series);
        } catch {}
      });
    }

    const style = indicatorStyle?.[id] ?? indicatorStyle?.HEALTHY_BOX;

    const groupedSeries = {};

    //===================================
    //===================================
    // DIRECTIONAL SCORE (Histogram)
    //===================================

    const directionalScoreSeries = addSeries(id, HistogramSeries, {
      color: style?.directionalScore?.color || "rgba(255,165,0,1)",
      visible: style?.directionalScore?.visible ?? true,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    if (result.data.directionalScore) {
      directionalScoreSeries.setData(result.data.directionalScore);
    }
    groupedSeries.directionalScore = directionalScoreSeries;

    //===================================
    // BODY BOXES (Line)
    //===================================

    const bodyBoxesSeries = addSeries(id, LineSeries, {
      color: style?.bodyBoxes?.color || "rgba(0,0,255,1)",
      lineWidth: style?.bodyBoxes?.width || 2,
      visible: style?.bodyBoxes?.visible ?? true,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    if (result.data.bodyBoxes) {
      bodyBoxesSeries.setData(result.data.bodyBoxes);
    }
    groupedSeries.bodyBoxes = bodyBoxesSeries;

    //===================================
    // TOTAL WICK BOXES (Line)
    //===================================

    const totalWickBoxesSeries = addSeries(id, LineSeries, {
      color: style?.totalWickBoxes?.color || "rgba(255,255,0,1)",
      lineWidth: style?.totalWickBoxes?.width || 2,
      visible: style?.totalWickBoxes?.visible ?? true,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    if (result.data.totalWickBoxes) {
      totalWickBoxesSeries.setData(result.data.totalWickBoxes);
    }
    groupedSeries.totalWickBoxes = totalWickBoxesSeries;

    //===================================
    // REFERENCE LINES (80, 60, 0, -60, -80)
    //===================================

    const refLevels = [
      { key: "strongHealthyLine", value: 80, defaultColor: "rgba(76,175,80,1)" },
      { key: "healthyLine", value: 60, defaultColor: "rgba(255,152,0,1)" },
      { key: "zeroLine", value: 0, defaultColor: "rgba(128,128,128,1)" },
      { key: "healthyBearLine", value: -60, defaultColor: "rgba(255,152,0,1)" },
      { key: "strongBearLine", value: -80, defaultColor: "rgba(244,67,54,1)" }
    ];

    if (result.data.directionalScore) {
      refLevels.forEach(level => {
        const lineData = result.data.directionalScore.map((x) => ({
          time: x.time,
          value: level.value,
        }));
        const lineStyleDef = style?.[level.key];
        const refSeries = addSeries(`${id}_${level.key}`, LineSeries, {
          color: lineStyleDef?.color || level.defaultColor,
          lineWidth: lineStyleDef?.width || 1,
          lineStyle: level.value === 0 ? 0 : 2, // dashed except zero
          visible: lineStyleDef?.visible ?? true,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        refSeries.setData(lineData);
        groupedSeries[level.key] = refSeries;
      });
    }

    //===================================
    // MARKERS
    //===================================

    const markersToSet = [
      ...(result.data.bullSignals || []).map((p) => ({
        time: p.time,
        position: "belowBar",
        shape: "arrowUp",
        color: style?.bullSignals?.color || "rgba(0,255,0,1)",
        text: "HB",
        size: 1,
      })),

      ...(result.data.bearSignals || []).map((p) => ({
        time: p.time,
        position: "aboveBar",
        shape: "arrowDown",
        color: style?.bearSignals?.color || "rgba(255,0,0,1)",
        text: "HS",
        size: 1,
      })),
    ].sort((a, b) => a.time - b.time);

    if (markersToSet.length > 0 && pane) {
      import("lightweight-charts").then(({ createSeriesMarkers }) => {
        const markersPrimitive = createSeriesMarkers(pane, markersToSet);
        pane.attachPrimitive(markersPrimitive);
        groupedSeries.markersPrimitive = markersPrimitive;
      }).catch(err => console.error("Failed to create markers", err));
    }

    indicatorSeriesRef.current[id] = groupedSeries;
  }, [result]);

  useEffect(() => {
    const group = indicatorSeriesRef.current?.[id];
    if (!group) return;

    if (group.markersPrimitive && pane) {
      try {
        pane.detachPrimitive(group.markersPrimitive);
      } catch (e) {}
    }

    const style = indicatorStyle?.[id] ?? indicatorStyle?.HEALTHY_BOX;

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