import { useEffect, useRef } from "react";
import { createChart, HistogramSeries, LineSeries } from "lightweight-charts";
import {
  defaultPriceFormat,
  getIndicatorChartProperties,
} from "../../util/common";
import { analyzeSmartPlotLayout } from "../../util/smartPlotLayout";
import { renderIndicatorContract } from "../../chart/IndicatorManager";
import {
  getContractPlotTitle,
  getScriptChartContract,
  splitContractByPane,
} from "../../chart/indicatorContract";

const GROUP_LABELS = {
  oscillator: "Oscillator",
  momentum: "Momentum",
  volume: "Volume",
  volatility: "Volatility",
  lower: "Indicator",
  top: "Upper Indicator",
};

function isHistogramPlan(plan) {
  const plotType = String(plan?.plot?.type || "").toLowerCase();
  const plotName = String(plan?.plot?.name || plan?.plot?.title || "");

  return (
    ["histogram", "bar", "column", "columns"].includes(plotType) ||
    /histogram|hist\b|volume/i.test(plotName)
  );
}

function getHistogramColor(value, plan) {
  if (plan?.plot?.color) return plan.plot.color;
  if (plan?.family === "volume") return "rgba(34, 197, 94, 0.62)";
  return Number(value) >= 0
    ? "rgba(34, 197, 94, 0.72)"
    : "rgba(239, 68, 68, 0.72)";
}

function toPlotData(seriesData, plan) {
  if (!Array.isArray(seriesData)) return [];

  const histogram = isHistogramPlan(plan);

  return seriesData
    .map((point) => {
      const time = Number(point?.time);
      const value = Number(point?.value);

      if (!Number.isFinite(time)) return null;
      if (!Number.isFinite(value)) return { time };

      return histogram
        ? {
            time,
            value,
            color: point?.color || getHistogramColor(value, plan),
          }
        : { time, value };
    })
    .filter(Boolean);
}

function getIndicatorGroups(candles, result) {
  const contract = getScriptChartContract(result);
  if (contract) {
    const { panes } = splitContractByPane(contract);
    if (panes.length > 0) {
      return panes.map((paneContract, index) => {
        const family = paneContract.pane || "indicator";
        return {
          id: `contract:${family}:${index}`,
          family,
          groupKey: family,
          placement: "bottom",
          title:
            GROUP_LABELS[family] ||
            paneContract.name ||
            family.replace(/-/g, " "),
          contract: paneContract,
          plans: paneContract.plots.map((plot, plotIndex) => ({
            plot: {
              ...plot,
              name: getContractPlotTitle(plot, `Plot ${plotIndex + 1}`),
            },
          })),
        };
      });
    }
  }

  const plots = Array.isArray(result?.plots) ? result.plots : [];
  const plotEntries = plots
    .map((plot, index) => ({
      index,
      plot,
      seriesData: Array.isArray(plot?.values) ? plot.values : [],
    }))
    .filter((entry) => entry.seriesData.length > 0);

  if (plotEntries.length === 0) return [];

  const layout = analyzeSmartPlotLayout({
    plotEntries,
    candles,
  });

  const groups = new Map();

  layout.plans.forEach((plan) => {
    if (plan.placement === "overlay") return;

    const groupId = `${plan.placement}:${plan.groupKey}`;
    if (!groups.has(groupId)) {
      groups.set(groupId, {
        id: groupId,
        family: plan.family,
        groupKey: plan.groupKey,
        placement: plan.placement,
        title:
          GROUP_LABELS[plan.family] ||
          GROUP_LABELS[plan.groupKey] ||
          "Indicator",
        plans: [],
      });
    }

    groups.get(groupId).plans.push(plan);
  });

  return [...groups.values()];
}

const StrategySyncedIndicatorCharts = ({
  candles,
  result,
  onChartsReady,
}) => {
  const chartHostsRef = useRef({});
  const chartsRef = useRef([]);
  const indicatorGroups = getIndicatorGroups(candles, result);

  useEffect(() => {
    const disposeAll = () => {
      chartsRef.current.forEach((chart) => {
        try {
          chart.remove();
        } catch (error) {}
      });
      chartsRef.current = [];
      if (onChartsReady) onChartsReady([]);
    };

    disposeAll();

    const nextIndicatorGroups = getIndicatorGroups(candles, result);
    if (
      !Array.isArray(candles) ||
      candles.length === 0 ||
      nextIndicatorGroups.length === 0
    ) {
      return disposeAll;
    }

    const createdCharts = [];
    const baseOptions = getIndicatorChartProperties();

    nextIndicatorGroups.forEach((group, index) => {
      const host = chartHostsRef.current[group.id];
      if (!host) return;

      const isLast = index === nextIndicatorGroups.length - 1;
      const chart = createChart(host, {
        ...baseOptions,
        autoSize: true,
        height: 160,
        layout: {
          ...baseOptions.layout,
          background: { type: "solid", color: "#111827" },
        },
        grid: {
          ...baseOptions.grid,
          horzLines: {
            ...baseOptions.grid.horzLines,
            color: "rgba(120, 123, 134, 0.18)",
          },
          vertLines: {
            ...baseOptions.grid.vertLines,
            color: "rgba(120, 123, 134, 0.14)",
          },
        },
        rightPriceScale: {
          ...baseOptions.rightPriceScale,
          visible: true,
          scaleMargins: {
            top: 0.14,
            bottom: 0.14,
          },
        },
        timeScale: {
          ...baseOptions.timeScale,
          visible: isLast,
          borderVisible: isLast,
        },
      });

      if (group.contract) {
        renderIndicatorContract(chart, group.contract);
      } else {
        group.plans.forEach((plan) => {
          const histogram = isHistogramPlan(plan);
          const seriesColor =
            plan.styleOptions?.color || plan.plot?.color || "#3b82f6";
          const series = chart.addSeries(
            histogram ? HistogramSeries : LineSeries,
            histogram
              ? {
                  color: seriesColor,
                  priceLineVisible: false,
                  lastValueVisible: true,
                  priceFormat: defaultPriceFormat,
                  base: 0,
                }
              : {
                  color: seriesColor,
                  lineWidth: plan.styleOptions?.lineWidth ?? 2,
                  lineStyle: plan.styleOptions?.lineStyle ?? 0,
                  priceLineVisible: false,
                  lastValueVisible: true,
                  crosshairMarkerVisible:
                    plan.styleOptions?.crosshairMarkerVisible ?? true,
                  priceFormat: defaultPriceFormat,
                },
          );

          series.setData(toPlotData(plan.seriesData, plan));
        });
      }

      try {
        chart.priceScale("right").applyOptions({
          autoScale: true,
          mode: 0,
          visible: true,
          minimumWidth: 85,
          scaleMargins: {
            top: 0.12,
            bottom: 0.12,
          },
        });
      } catch (error) {}

      createdCharts.push(chart);
    });

    chartsRef.current = createdCharts;
    if (onChartsReady) onChartsReady(createdCharts);

    return disposeAll;
  }, [candles, result, onChartsReady]);

  if (indicatorGroups.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        padding: "10px 0 0",
        flexShrink: 0,
        width: "100%",
        minWidth: 0,
      }}
    >
      {indicatorGroups.map((group) => (
        <div
          key={group.id}
          style={{
            width: "100%",
            borderTop: "1px solid var(--border-color)",
            background: "#111827",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
              padding: "8px 10px",
              color: "var(--text-secondary)",
            }}
          >
            <div
              style={{
                fontSize: "0.76rem",
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {group.title}
            </div>
            <div
              style={{
                fontSize: "0.72rem",
                opacity: 0.8,
              }}
            >
              {group.plans
                .map((plan) => plan.plot?.name)
                .filter(Boolean)
                .join(" | ")}
            </div>
          </div>
          <div
            ref={(node) => {
              if (node) {
                chartHostsRef.current[group.id] = node;
              } else {
                delete chartHostsRef.current[group.id];
              }
            }}
            style={{
              width: "100%",
              height: "160px",
            }}
          />
        </div>
      ))}
    </div>
  );
};

export default StrategySyncedIndicatorCharts;
