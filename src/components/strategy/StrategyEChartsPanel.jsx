import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { CandlestickChart, LineChart } from "echarts/charts";
import {
  AxisPointerComponent,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { LuChevronDown, LuChevronUp } from "react-icons/lu";
import { analyzeSmartPlotLayout } from "../../util/smartPlotLayout";

echarts.use([
  CandlestickChart,
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  AxisPointerComponent,
  CanvasRenderer,
]);

function formatTimeLabel(unixTime) {
  const value = Number(unixTime);
  if (!Number.isFinite(value)) return "";

  const date = new Date(value * 1000);
  return date.toLocaleString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "2-digit",
    hour12: false,
  });
}

function toSeriesValues(seriesData, length) {
  return Array.from({ length }, (_, index) => {
    const point = seriesData?.[index];
    const value = Number(point?.value);
    return Number.isFinite(value) ? value : null;
  });
}

function toLineStyle(lineStyle) {
  if (lineStyle === 2) return "dashed";
  if (lineStyle === 1) return "dotted";
  return "solid";
}

const StrategyEChartsPanel = ({
  candles,
  result,
  symbol,
  timeframe,
  height = 300,
  collapsed,
  onToggleCollapsed,
}) => {
  const chartRef = useRef(null);
  const instanceRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current || collapsed) return undefined;

    const plots = Array.isArray(result?.plots) ? result.plots : [];
    const candleRows = Array.isArray(candles) ? candles : [];

    if (plots.length === 0 || candleRows.length === 0) {
      if (instanceRef.current) {
        instanceRef.current.clear();
      }
      return undefined;
    }

    if (!instanceRef.current) {
      instanceRef.current = echarts.init(chartRef.current);
    }

    const chart = instanceRef.current;
    const rootStyles = getComputedStyle(document.documentElement);
    const textPrimary =
      rootStyles.getPropertyValue("--text-primary").trim() || "#e5e7eb";
    const textSecondary =
      rootStyles.getPropertyValue("--text-secondary").trim() || "#94a3b8";
    const borderColor =
      rootStyles.getPropertyValue("--border-color").trim() ||
      "rgba(148, 163, 184, 0.18)";

    const plotEntries = plots
      .map((plot, index) => ({
        index,
        plot,
        seriesData: Array.isArray(plot?.values) ? plot.values : [],
      }))
      .filter(
        (entry) => Array.isArray(entry.seriesData) && entry.seriesData.length > 0,
      );

    const smartLayout = analyzeSmartPlotLayout({
      plotEntries,
      candles: candleRows,
    });

    const timeLabels = candleRows.map((candle) => formatTimeLabel(candle.time));
    const mainMargins =
      smartLayout.mainPriceScaleOptions?.scaleMargins || {
        top: 0.18,
        bottom: 0.2,
      };

    const groupConfigs = [];
    const seenGroups = new Set();

    smartLayout.plans.forEach((plan) => {
      if (plan.placement === "overlay" || !plan.priceScaleOptions?.scaleMargins) {
        return;
      }

      const groupId = `${plan.placement}:${plan.groupKey}`;
      if (seenGroups.has(groupId)) return;
      seenGroups.add(groupId);

      groupConfigs.push({
        id: groupId,
        groupKey: plan.groupKey,
        placement: plan.placement,
        family: plan.family,
        scaleMargins: plan.priceScaleOptions.scaleMargins,
      });
    });

    groupConfigs.sort(
      (left, right) => left.scaleMargins.top - right.scaleMargins.top,
    );

    const grid = [
      {
        left: 58,
        right: 76,
        top: `${mainMargins.top * 100}%`,
        height: `${(1 - mainMargins.top - mainMargins.bottom) * 100}%`,
      },
    ];
    const xAxis = [
      {
        type: "category",
        data: timeLabels,
        scale: true,
        boundaryGap: false,
        axisLine: { lineStyle: { color: borderColor } },
        axisLabel: { show: false, color: textSecondary },
        axisTick: { show: false },
        splitLine: { show: false },
        min: "dataMin",
        max: "dataMax",
      },
    ];
    const yAxis = [
      {
        scale: true,
        position: "right",
        axisLine: { show: false },
        axisLabel: {
          color: textSecondary,
          formatter: (value) => Number(value).toFixed(2),
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: "rgba(148, 163, 184, 0.12)",
          },
        },
      },
    ];

    const axisByGroup = { "overlay:overlay": 0 };

    groupConfigs.forEach((group, index) => {
      const axisIndex = index + 1;
      axisByGroup[group.id] = axisIndex;
      const height = 1 - group.scaleMargins.top - group.scaleMargins.bottom;
      const showAxisLabels = index === groupConfigs.length - 1;

      grid.push({
        left: 58,
        right: 76,
        top: `${group.scaleMargins.top * 100}%`,
        height: `${height * 100}%`,
      });
      xAxis.push({
        type: "category",
        data: timeLabels,
        gridIndex: axisIndex,
        boundaryGap: false,
        axisLine: { lineStyle: { color: borderColor } },
        axisLabel: {
          show: showAxisLabels,
          color: textSecondary,
          margin: 10,
        },
        axisTick: { show: false },
        splitLine: { show: false },
        min: "dataMin",
        max: "dataMax",
      });
      yAxis.push({
        scale: true,
        gridIndex: axisIndex,
        position: "right",
        axisLine: { show: false },
        axisLabel: {
          color: textSecondary,
          formatter: (value) => Number(value).toFixed(2),
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: "rgba(148, 163, 184, 0.09)",
          },
        },
      });
    });

    const signalTimeIndex = new Map(
      candleRows.map((candle, index) => [String(candle.time), index]),
    );
    const markPointData = Array.isArray(result?.signals)
      ? result.signals
          .map((signal) => {
            const signalIndex = signalTimeIndex.get(String(signal?.time));
            if (signalIndex === undefined) return null;

            const candle = candleRows[signalIndex];
            const price = Number(signal?.price);
            const fallbackPrice =
              signal?.side === "SELL" ? candle?.high : candle?.low;
            const resolvedPrice = Number.isFinite(price)
              ? price
              : Number(fallbackPrice ?? candle?.close);

            return {
              name: signal?.label || signal?.side || "Signal",
              coord: [signalIndex, resolvedPrice],
              value: signal?.side || signal?.label,
              symbol: "triangle",
              symbolRotate: signal?.side === "SELL" ? 180 : 0,
              symbolSize: 14,
              label: { show: false },
              itemStyle: {
                color:
                  signal?.side === "SELL" ? "#EF553B" : "#00CC96",
                borderColor: "#ffffff",
                borderWidth: 1,
              },
            };
          })
          .filter(Boolean)
      : [];

    const series = [
      {
        name: `${symbol || "Strategy"} Price`,
        type: "candlestick",
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: candleRows.map((candle) => [
          Number(candle.open),
          Number(candle.close),
          Number(candle.low),
          Number(candle.high),
        ]),
        itemStyle: {
          color: "#00CC96",
          color0: "#EF553B",
          borderColor: "#00CC96",
          borderColor0: "#EF553B",
        },
        markPoint: markPointData.length > 0 ? { data: markPointData } : undefined,
      },
    ];

    smartLayout.plans.forEach((plan) => {
      const groupId =
        plan.placement === "overlay"
          ? "overlay:overlay"
          : `${plan.placement}:${plan.groupKey}`;
      const axisIndex = axisByGroup[groupId] ?? 0;

      series.push({
        name: plan.plot?.name || `Plot ${plan.index + 1}`,
        type: "line",
        xAxisIndex: axisIndex,
        yAxisIndex: axisIndex,
        data: toSeriesValues(plan.seriesData, candleRows.length),
        showSymbol: false,
        connectNulls: false,
        smooth: false,
        lineStyle: {
          color: plan.styleOptions?.color,
          width: plan.styleOptions?.lineWidth ?? 2,
          type: toLineStyle(plan.styleOptions?.lineStyle),
          opacity: plan.isReference ? 0.95 : 1,
        },
        itemStyle: {
          color: plan.styleOptions?.color,
        },
        emphasis: {
          focus: "series",
        },
        z: axisIndex === 0 ? 4 : 3,
      });
    });

    const option = {
      animation: false,
      backgroundColor: "transparent",
      textStyle: {
        fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif",
      },
      legend: {
        type: "scroll",
        top: 10,
        left: 14,
        right: 90,
        itemWidth: 12,
        itemHeight: 8,
        textStyle: {
          color: textSecondary,
          fontSize: 11,
        },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "cross",
          animation: false,
          label: {
            backgroundColor: "#1e293b",
          },
        },
        backgroundColor: "rgba(15, 23, 42, 0.96)",
        borderColor: "rgba(99, 102, 241, 0.25)",
        textStyle: {
          color: textPrimary,
          fontSize: 12,
        },
      },
      axisPointer: {
        link: [{ xAxisIndex: "all" }],
      },
      grid,
      xAxis,
      yAxis,
      series,
      dataZoom: [
        {
          type: "inside",
          xAxisIndex: xAxis.map((_, index) => index),
          zoomLock: false,
        },
        {
          type: "slider",
          xAxisIndex: xAxis.map((_, index) => index),
          bottom: 10,
          height: 18,
          borderColor: "transparent",
          backgroundColor: "rgba(148, 163, 184, 0.08)",
          fillerColor: "rgba(99, 110, 250, 0.25)",
          handleStyle: {
            color: "#636EFA",
          },
          moveHandleStyle: {
            color: "#94a3b8",
          },
          textStyle: {
            color: textSecondary,
          },
        },
      ],
    };

    chart.setOption(option, true);

    const resizeObserver = new ResizeObserver(() => {
      chart.resize();
    });
    resizeObserver.observe(chartRef.current);

    const handleWindowResize = () => {
      chart.resize();
    };
    window.addEventListener("resize", handleWindowResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleWindowResize);
    };
  }, [candles, collapsed, result, symbol]);

  useEffect(
    () => () => {
      if (instanceRef.current) {
        instanceRef.current.dispose();
        instanceRef.current = null;
      }
    },
    [],
  );

  const plotsCount = Array.isArray(result?.plots) ? result.plots.length : 0;
  const signalsCount = Array.isArray(result?.signals) ? result.signals.length : 0;

  return (
    <div
      style={{
        borderTop: "1px solid var(--border-color)",
        background:
          "linear-gradient(180deg, rgba(15,23,42,0.96) 0%, rgba(2,6,23,0.98) 100%)",
        backdropFilter: "blur(12px)",
        position: "relative",
        zIndex: 6,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          padding: "10px 14px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.86rem",
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              Strategy Studio
            </div>
            <div
              style={{
                fontSize: "0.72rem",
                color: "var(--text-secondary)",
                marginTop: "2px",
              }}
            >
              Apache ECharts smart plotting for {symbol || "strategy"}
              {timeframe ? ` · ${timeframe}` : ""}
            </div>
          </div>
          <span
            style={{
              padding: "4px 8px",
              borderRadius: "999px",
              background: "rgba(99,110,250,0.15)",
              color: "#c7d2fe",
              fontSize: "0.7rem",
              border: "1px solid rgba(99,110,250,0.28)",
            }}
          >
            {plotsCount} plots
          </span>
          <span
            style={{
              padding: "4px 8px",
              borderRadius: "999px",
              background: "rgba(0,204,150,0.12)",
              color: "#a7f3d0",
              fontSize: "0.7rem",
              border: "1px solid rgba(0,204,150,0.22)",
            }}
          >
            {signalsCount} signals
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleCollapsed}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 10px",
            borderRadius: "8px",
            border: "1px solid var(--border-color)",
            background: "rgba(15,23,42,0.78)",
            color: "var(--text-primary)",
            cursor: "pointer",
            fontSize: "0.76rem",
            fontWeight: 600,
          }}
        >
          {collapsed ? <LuChevronUp size={16} /> : <LuChevronDown size={16} />}
          {collapsed ? "Expand" : "Collapse"}
        </button>
      </div>

      {!collapsed && (
        <div
          style={{
            height,
            padding: "0 10px 10px",
          }}
        >
          <div
            ref={chartRef}
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "14px",
              border: "1px solid rgba(148,163,184,0.12)",
              background:
                "radial-gradient(circle at top left, rgba(99,110,250,0.08), transparent 35%), linear-gradient(180deg, rgba(15,23,42,0.88) 0%, rgba(2,6,23,0.98) 100%)",
              overflow: "hidden",
            }}
          />
        </div>
      )}
    </div>
  );
};

export default StrategyEChartsPanel;
