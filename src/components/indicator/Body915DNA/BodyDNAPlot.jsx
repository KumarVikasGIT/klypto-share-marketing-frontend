import { useEffect } from "react";
import { LineSeries, HistogramSeries } from "lightweight-charts";

export default function BodyDNAPlot({
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
      const oldGroup = indicatorSeriesRef.current[id];
      if (oldGroup.markersPrimitive && oldGroup.directionalBodyBoxes) {
        try { oldGroup.directionalBodyBoxes.detachPrimitive(oldGroup.markersPrimitive); } catch {}
      }
      Object.values(oldGroup).forEach((series) => {
        try {
          chart?.removeSeries(series);
        } catch {}
      });
    }

    const style =
      indicatorStyle?.[id] ??
      indicatorStyle?.BODY915DNA;

    const groupedSeries = {};

    // ===========================
    // Directional Body Boxes Histogram
    // ===========================
    const bodySeries = addSeries(id, HistogramSeries, {
      color: style?.directionalBodyBoxes?.color,
      visible: style?.directionalBodyBoxes?.visible,
      priceLineVisible: false,
    });

    bodySeries.setData(result.data.directionalBodyBoxes);
    groupedSeries.directionalBodyBoxes = bodySeries;

    // ===========================
    // Helper function for lines
    // ===========================
    const addLine = (key) => {
      const series = addSeries(id, LineSeries, {
        color: style?.[key]?.color,
        lineWidth: style?.[key]?.width,
        visible: style?.[key]?.visible,
        priceLineVisible: false,
      });

      series.setData(result.data[key] || []);
      groupedSeries[key] = series;
    };

    addLine("avgBoxes");
    addLine("maxBoxes");
    addLine("minBoxes");
    addLine("bodyPercentile");
    addLine("expansionScore");
    addLine("zScore");

    // ===========================
    // Zero Line
    // ===========================
    const zeroLine = addSeries(id, LineSeries, {
      color: style?.zeroLine?.color,
      lineWidth: style?.zeroLine?.width,
      visible: style?.zeroLine?.visible,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    zeroLine.setData(
      result.data.directionalBodyBoxes.map((x) => ({
        time: x.time,
        value: 0,
      }))
    );

    groupedSeries.zeroLine = zeroLine;

    // ===========================
    // Reference Zones
    // ===========================
    const refLevels = [
      { key: "avgZone", value: 10, defaultColor: "rgba(255,165,0,1)" },
      { key: "avgZoneBearish", value: -10, defaultColor: "rgba(255,165,0,1)" }
    ];

    if (result.data.directionalBodyBoxes) {
      refLevels.forEach(level => {
        const lineData = result.data.directionalBodyBoxes.map((x) => ({
          time: x.time,
          value: level.value,
        }));
        const lineStyleDef = style?.[level.key];
        const refSeries = addSeries(`${id}_${level.key}`, LineSeries, {
          color: lineStyleDef?.color || level.defaultColor,
          lineWidth: lineStyleDef?.width || 1,
          lineStyle: 2, // dashed
          visible: lineStyleDef?.visible ?? true,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        refSeries.setData(lineData);
        groupedSeries[level.key] = refSeries;
      });
    }

    // ===========================
    // Markers
    // ===========================
    const markersToSet = [
      ...(result.data.bullSignals || []).map((d) => ({
        time: d.time,
        position: "belowBar",
        shape: "arrowUp",
        color: style?.bullSignals?.color || "rgba(0,255,0,1)",
        text: "BULL",
        size: 1,
      })),

      ...(result.data.bearSignals || []).map((d) => ({
        time: d.time,
        position: "aboveBar",
        shape: "arrowDown",
        color: style?.bearSignals?.color || "rgba(255,0,0,1)",
        text: "BEAR",
        size: 1,
      })),

      ...(result.data.monsterSignals || []).map((d) => ({
        time: d.time,
        position: "aboveBar",
        shape: "circle",
        color: style?.monsterSignals?.color || "rgba(255,165,0,1)",
        text: "MONSTER",
        size: 1,
      })),
    ].sort((a, b) => a.time - b.time);

    if (markersToSet.length > 0) {
      import("lightweight-charts").then(({ createSeriesMarkers }) => {
        const markersPrimitive = createSeriesMarkers(bodySeries, markersToSet);
        bodySeries.attachPrimitive(markersPrimitive);
        groupedSeries.markersPrimitive = markersPrimitive;
      }).catch(err => console.error("Failed to create markers", err));
    }

    indicatorSeriesRef.current[id] = groupedSeries;
  }, [result]);

  useEffect(() => {
    const group = indicatorSeriesRef.current?.[id];

    if (!group) return;

    const style =
      indicatorStyle?.[id] ??
      indicatorStyle?.BODY915DNA;

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