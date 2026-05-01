// import "bootstrap/dist/css/bootstrap.min.css"; //this is for temp
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  BarSeries,
  AreaSeries,
  HistogramSeries,
  BaselineSeries,
} from "lightweight-charts";
// import IndicatorRuleBuilder from "../components/scanner/IndicatorRuleBuilder";
import { LuCirclePlus, LuCircleMinus } from "react-icons/lu";
import { RiResetRightLine } from "react-icons/ri";
import { useEffect, useRef, useState, useCallback } from "react";
import { FaCode } from "react-icons/fa6";
import ChartHeader from "../components/tradingModals/ChartHeader";

// import SEO from "../components/SEO";
import {
  ChartProprties,
  TIMEFRAME_TO_SECONDS,
  SINGLE_VALUE_CHARTS,
  chartSeriesStyles,
  convertToHeikinAshi,
  getIndicatorChartProperties,
} from "../util/common";
import SourceCodePanel from "../components/indicator/SourceCodePanel";
// import ChartRightSidebar from "../components/chart/rightbar/ChartRightSidebar";
// import ChartLeftSidebar from "../components/chart/leftbar/ChartLeftSidebar";
import {
  IoCloseSharp,
  IoEyeOffOutline,
  IoEyeOutline,
  IoLink,
  IoSettingsOutline,
} from "react-icons/io5";
import IndicatorAlert from "../components/indicator/IndicatorAlert";
import IndicatorPropertyDialog from "../components/indicator/IndicatorPropertyDialog";
import useChartFunctions from "../util/useChartFunctions";
import { indicatorComponents } from "../components/indicator/IndicatorIndex";
import { Spinner } from "../components/tradingModals/Spinner";
import IndicatorBar from "../components/indicator/IndicatorBar";
import {
  indicatorConfigDefault,
  resolvePaneKey,
  indicatorStyleDefault,
  PANE_INDICATORS,
} from "../util/indicatorFunctions";

export default function Candlestick() {
  const chartRef = useRef();
  const containerRef = useRef();
  const paneContainerRef = useRef();
  const seriesRef = useRef(null);
  const indicatorSeriesRef = useRef({});
  const latestIndicatorValuesRef = useRef({});
  const panesRef = useRef({});
  const paneIndexRef = useRef({});
  const syncingRef = useRef(false);
  const fetchedIndicatorsRef = useRef(new Set());
  const mainChartHeightRef = useRef(500);

  const [openForm, setOpenForm] = useState(false);
  const [timeframeValue, setTimeframeValue] = useState("1d");
  const [selectedCurrency, setSelectedCurrency] = useState({
    symbol: "TCS-EQ",
    name: "TCS",
    token: 11536,
  });
  const [fromDate, setFromDate] = useState("2024-01-01");
  // console.log(fromDate,"fromDate")
  const [toDate, setToDate] = useState("2026-04-30");
  const [selectedIndicator, setSelectedIndicator] = useState([]);
  const [rangeValue, setRangeValue] = useState("1000");
  const [chartType, setChartType] = useState("candlestick");
  const [isMarketOpen, setIsMarketOpen] = useState(true);
  const [liveOhlcv, setLiveOhlcv] = useState({});
  const [liveIndicatorData, setLiveIndicatorData] = useState({});
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [indicatorProperty, setIndicatorProperty] = useState(false);
  const [indicatorLoading, setIndicatorLoading] = useState(false);
  const [mainChartLoading, setMainChartLoading] = useState(false);
  const [showSourcePanel, setShowSourcePanel] = useState(false);
  const [activeSourceIndicator, setActiveSourceIndicator] = useState(null);
  const [indicatorVisibility, setIndicatorVisibility] = useState({});
  const [activeBarIndicator, setActiveBarIndicator] = useState("");
  const prevTimeframeRef = useRef(timeframeValue);
  const prevCurrencyRef = useRef(selectedCurrency);

  const [indicatorConfigs, setIndicatorConfigs] = useState(
    indicatorConfigDefault,
  );
  const [indicatorStyle, setIndicatorStyle] = useState(indicatorStyleDefault);
  const isUp = liveOhlcv?.close >= liveOhlcv?.open;
  const valueColor = isUp ? "text-green-500" : "text-red-500";

  useEffect(() => {
    if (!selectedIndicator.length) return;

    const isContextChange =
      prevTimeframeRef.current !== timeframeValue ||
      prevCurrencyRef.current !== selectedCurrency;

    let indicatorsToFetch = selectedIndicator;

    if (!isContextChange) {
      // ✅ Only filter when indicator list changes
      indicatorsToFetch = selectedIndicator.filter(
        (ind) => !fetchedIndicatorsRef.current.has(ind),
      );

      if (indicatorsToFetch.length === 0) return;
    } else {
      // 🔥 Reset on timeframe / currency change
      fetchedIndicatorsRef.current.clear();

      // Clear existing indicator chart series to prevent overlaying old data
      selectedIndicator.forEach((indicator) => {
        const entry = indicatorSeriesRef.current[indicator];
        if (!entry) return;

        const paneKey = resolvePaneKey(indicator);
        const pane = panesRef.current[paneKey];
        const chartToUse = pane?.chart ?? chartRef.current;
        if (!chartToUse) return;

        if (typeof entry === "object" && !entry.priceScale) {
          Object.values(entry).forEach((series) => {
            if (!series || typeof series.setData !== "function") return;
            try {
              chartToUse.removeSeries(series);
            } catch {}
          });
        } else {
          try {
            chartToUse.removeSeries(entry);
          } catch {}
        }
        delete indicatorSeriesRef.current[indicator];
      });
    }

    fetchIndicatorData(indicatorsToFetch, selectedCurrency, timeframeValue);

    indicatorsToFetch.forEach((ind) => fetchedIndicatorsRef.current.add(ind));

    // update previous values
    prevTimeframeRef.current = timeframeValue;
    prevCurrencyRef.current = selectedCurrency;
  }, [selectedIndicator, selectedCurrency, timeframeValue, fromDate, toDate]);

  const toggleIndicatorVisibility = (indicator) => {
    const currentVisible = indicatorVisibility[indicator] ?? true;
    const newVisibility = !currentVisible;
    const seriesGroup = indicatorSeriesRef.current?.[indicator];
    if (seriesGroup) {
      Object.values(seriesGroup).forEach((series) => {
        if (series?.applyOptions) {
          series.applyOptions({ visible: newVisibility });
        }
      });
      if (seriesGroup._priceLines) {
        Object.values(seriesGroup._priceLines).forEach((line) => {
          line?.applyOptions({ visible: newVisibility });
        });
      }
    }
    setIndicatorVisibility((prev) => ({
      ...prev,
      [indicator]: newVisibility,
    }));
  };

  //  GET PANE INDEX
  const getPaneIndex = (indicator) => {
    // ❗ overlay indicators → always main pane
    if (!PANE_INDICATORS.has(indicator)) return 0;

    if (paneIndexRef.current[indicator] !== undefined) {
      return paneIndexRef.current[indicator];
    }

    const nextPane = Object.keys(paneIndexRef.current).length + 1;
    paneIndexRef.current[indicator] = nextPane;

    return nextPane;
  };

  const closeAlert = () => {
    setShowAlertForm(false);
  };

  //  ADD SERIES
  const addSeries = (indicator, SeriesType, options = {}) => {
    if (!chartRef.current) return null;

    const paneIndex = getPaneIndex(indicator);

    const series = chartRef.current.addSeries(
      SeriesType,
      {
        ...options,
        ...(paneIndex !== 0 && { priceScaleId: `pane_${paneIndex}` }),
      },
      paneIndex,
    );

    return series;
  };

  //  ✅ CHART SYNC ENGINE
  function syncCharts(sourceChart, logicalRange) {
    if (!logicalRange || syncingRef.current) return;
    syncingRef.current = true;
    const charts = [
      chartRef.current,
      ...Object.values(panesRef.current).map((p) => p.chart),
    ];

    charts.forEach((chart) => {
      if (!chart || chart === sourceChart) return;
      chart.timeScale().setVisibleLogicalRange(logicalRange);
    });
    syncingRef.current = false;
  }
  function attachSync(chart) {
    if (!chart) return;

    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (!range || syncingRef.current) return;
      syncCharts(chart, range);
    });
  }

  function cleanupPane(paneKey) {
    const pane = panesRef.current[paneKey];
    if (!pane) return;

    const stillUsed = Object.entries(indicatorSeriesRef.current).some(
      ([indicatorKey, series]) => {
        if (!series || indicatorKey.startsWith("_")) return false;
        return resolvePaneKey(indicatorKey) === paneKey;
      },
    );
    if (stillUsed) return;
    try {
      /* REMOVE DOM ELEMENT */
      if (pane.div && pane.div.parentNode) {
        pane.div.parentNode.removeChild(pane.div);
      }
      /* REMOVE SPLITTER */
      if (pane.splitter && pane.splitter.parentNode) {
        pane.splitter.parentNode.removeChild(pane.splitter);
      }
    } catch (e) {
      console.error("Pane cleanup error:", e);
    }
    delete panesRef.current[paneKey];
  }

  //  ✅ INDICATOR REMOVAL
  const removeIndicator = useCallback((indicator) => {
    const entry = indicatorSeriesRef.current[indicator];
    if (!entry) return;

    const paneKey = resolvePaneKey(indicator);
    const pane = panesRef.current[paneKey];
    const chart = pane?.chart ?? chartRef.current;
    if (!chart) return;

    /* MULTI SERIES */
    if (entry && typeof entry === "object" && !entry.priceScale) {
      Object.values(entry).forEach((series) => {
        if (!series) return;
        if (typeof series.setData !== "function") return;

        try {
          chart.removeSeries(series);
        } catch {}
      });
    } else {
      /* SINGLE SERIES */
      try {
        chart.removeSeries(entry);
      } catch {}
    }

    delete indicatorSeriesRef.current[indicator];
    delete latestIndicatorValuesRef.current[indicator];
    fetchedIndicatorsRef.current.delete(indicator);

    /* ✅ ADD THIS BLOCK (IMPORTANT) */
    setIndicatorConfigs((prev) => {
      const updated = { ...prev };
      delete updated[indicator]; // remove old config
      return {
        ...updated,
        [indicator]: indicatorConfigDefault[indicator] || {},
      };
    });

    setIndicatorStyle((prev) => {
      const updated = { ...prev };
      delete updated[indicator];
      return {
        ...updated,
        [indicator]: indicatorStyleDefault[indicator] || {},
      };
    });

    cleanupPane(paneKey);

    setSelectedIndicator((prev) => prev.filter((i) => i !== indicator));
  }, []);
  // ----------Main chart------------
  useEffect(() => {
    if (!containerRef.current) return;
    if (chartRef.current) return; // Prevent recreating the chart on every render

    const chart = createChart(containerRef.current, {
      ...ChartProprties,
      height: mainChartHeightRef.current,
    });
    chartRef.current = chart;
    attachSync(chart);

    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, []); // Run only once

  useEffect(() => {
    //   WebSocket Trades
    const socket = new WebSocket("wss://socket.delta.exchange");
    socket.onopen = () => {
      socket.send(
        JSON.stringify({
          type: "subscribe",
          payload: {
            channels: [
              {
                name: "v2/ticker",
                symbols: [selectedCurrency || "BTCUSD"],
              },
            ],
          },
        }),
      );
    };

    let currentCandle = null;
    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (!msg?.mark_price || !msg?.timestamp) return;

      const price = Number(msg.mark_price);
      const intervalSec = TIMEFRAME_TO_SECONDS[timeframeValue];
      const rawTime = Math.floor(msg.timestamp / intervalSec) * intervalSec;
      const time = rawTime + 19800; // Shift to IST

      if (!currentCandle || currentCandle.time !== time) {
        currentCandle = {
          time,
          open: price,
          high: price,
          low: price,
          close: price,
        };
        setLiveOhlcv(currentCandle);
      } else {
        currentCandle.high = Math.max(currentCandle.high, price);
        currentCandle.low = Math.min(currentCandle.low, price);
        currentCandle.close = price;

        setLiveOhlcv({ ...currentCandle }); // ← add this line
      }
    };

    return () => {
      socket.close();
    };
  }, [selectedCurrency, timeframeValue]);

  const toggleIndicator = useCallback((indicator) => {
    setSelectedIndicator((prev) => {
      const alreadySelected = prev.includes(indicator);

      if (alreadySelected) {
        const entry = indicatorSeriesRef.current[indicator];
        const paneKey = resolvePaneKey(indicator);
        const pane = panesRef.current[paneKey];
        const chart = pane?.chart ?? chartRef.current;

        if (entry && chart) {
          const seriesList = Array.isArray(entry)
            ? entry
            : typeof entry === "object"
              ? Object.values(entry)
              : [entry];

          seriesList.forEach((series) => {
            try {
              chart.removeSeries(series);
            } catch {}
          });
        }

        delete indicatorSeriesRef.current[indicator];
        delete latestIndicatorValuesRef.current[indicator];
        fetchedIndicatorsRef.current.delete(indicator);

        const updated = prev.filter((i) => i !== indicator);

        setTimeout(() => cleanupPane(paneKey), 0);

        return updated;
      }

      return [...prev, indicator];
    });
  }, []);

  // RENDER INDICATOR VALUE

  const renderValue = (indicator, value) => {
    if (value == null) return "--";

    const showPercent = indicator === "AROON"; // Only show % for Aroon

    /* ================= NUMBER VALUES ================= */
    if (typeof value === "number") {
      const style =
        indicatorStyle?.[indicator]?.sma ||
        indicatorStyle?.[indicator]?.ma ||
        indicatorStyle?.[indicator]?.[indicator?.toLowerCase()];

      if (style?.visible === false) return null;

      const color = style?.color || "#333";

      return (
        <span style={{ color }}>
          {Number(value).toFixed(2)}
          {showPercent ? "%" : ""}
        </span>
      );
    }

    /* ================= OBJECT VALUES ================= */
    if (typeof value === "object") {
      let keysToShow;

      switch (indicator) {
        case "RSI":
          keysToShow = ["rsi", "smoothingMA", "bbUpper", "bbLower"];
          break;
        case "MACD":
          keysToShow = ["macd", "signal", "histogram"];
          break;
        case "CCI":
          keysToShow = ["cciLine", "cciMa"];
          break;
        case "TRIX":
          keysToShow = ["trixLine"];
          break;
        case "CMF":
          keysToShow = ["cmfLine"];
          break;
        case "MFI":
          keysToShow = ["mfiLine"];
          break;
        case "KVO":
          keysToShow = ["kvoLine", "signalLine"];
          break;
        case "STOCHRSI":
          keysToShow = ["kLine", "dLine"];
          break;
        case "EOM":
          keysToShow = ["eom"];
          break;
        case "WPR":
          keysToShow = ["r"];
          break;
        case "ROC":
          keysToShow = ["roc"];
          break;
        case "CHOP":
          keysToShow = ["chopLine"];
          break;
        case "MOM":
          keysToShow = ["mom"];
          break;
        case "UO":
          keysToShow = ["uo"];
          break;
        case "AO":
          keysToShow = ["oscillator"];
          break;
        case "ICHIMOKU":
          keysToShow = [
            "conversionLine",
            "baseLine",
            "leadLine1",
            "leadLine2",
            "laggingSpan",
            "kumoCloudUpper",
            "kumoCloudLower",
          ];
          break;
        case "AROON":
          keysToShow = ["aroonUp", "aroonDown"];
          break;
        case "FT":
          keysToShow = ["fisherLine", "triggerLine"];
          break;
        case "STOCH":
          keysToShow = ["k", "d"];
          break;

        case "SUPERTREND":
          keysToShow = ["upTrend", "downTrend", "bodyMiddle"];

        default:
          keysToShow = Object.keys(value);
      }

      return keysToShow
        .filter((key) => {
          const style = indicatorStyle?.[indicator]?.[key];
          if (style?.visible === false) return false;
          return value[key] != null;
        })
        .map((key) => {
          const val = value[key];
          const color = indicatorStyle?.[indicator]?.[key]?.color || "#333";

          return (
            <span key={key} style={{ marginRight: 8, color }}>
              {Number.isFinite(val)
                ? `${Number(val).toFixed(2)}${showPercent ? "%" : ""}`
                : "--"}
            </span>
          );
        });
    }

    return "--";
  };

  const renderIndicators = () => {
    return selectedIndicator.map((indicator) => {
      const Component = indicatorComponents[indicator];
      if (!Component) return null;

      const data = indicatorSeriesRef.current?.[indicator];

      return (
        <Component
          key={indicator}
          result={data?.result}
          rows={data?.rows}
          indicatorStyle={indicatorStyle}
          indicatorSeriesRef={indicatorSeriesRef}
          addSeries={addSeries}
          containerRef={containerRef.current}
          chart={chartRef.current}
          container={containerRef}
          panesRef={panesRef}
          indicatorConfigs={indicatorConfigs}
          pane={seriesRef.current}
          timeframeValue={timeframeValue}
          selectedCurrency={selectedCurrency}
        />
      );
    });
  };

  // SYNC CROSSHAIR
  const updateIndicatorValues = (param) => {
    const updates = {};

    Object.entries(indicatorSeriesRef.current).forEach(([indicator, group]) => {
      if (!group) return;

      const indicatorValues = {};

      Object.entries(group).forEach(([lineName, series]) => {
        if (!series || typeof series.setData !== "function") return;

        const price = param.seriesData?.get(series);
        if (price !== undefined) {
          indicatorValues[lineName] =
            typeof price === "object" ? price.value : price;
        }
      });

      if (Object.keys(indicatorValues).length === 1) {
        updates[indicator] = Object.values(indicatorValues)[0];
      } else if (Object.keys(indicatorValues).length > 0) {
        updates[indicator] = indicatorValues;
      }
    });

    if (Object.keys(updates).length > 0) {
      latestIndicatorValuesRef.current = updates;
      setLiveIndicatorData(updates); // <- triggers renderValue
    }
  };
  // ATTACH CROSSHAIR

  const attachCrosshair = useCallback((chart) => {
    if (!chart) return () => {};
    const handler = (param) => {
      const charts = [
        chartRef.current,
        ...Object.values(panesRef.current).map((p) => p.chart),
      ].filter(Boolean);

      // clear crosshair if invalid
      if (!param?.point || param.time === undefined) {
        charts.forEach((c) => c.clearCrosshairPosition?.());
        setLiveIndicatorData(latestIndicatorValuesRef.current);
        return;
      }

      // sync crosshair
      charts.forEach((c) => {
        c.setCrosshairPosition(
          param.point?.x ?? 0,
          param.point?.y ?? 0,
          param.time,
        );
      });

      // update candles
      const candle = param.seriesData?.get(seriesRef.current);
      if (candle) setLiveOhlcv({ ...candle });

      // update indicators
      updateIndicatorValues(param);
    };

    chart.subscribeCrosshairMove(handler);
    return () => chart.unsubscribeCrosshairMove(handler);
  }, []);

  // ATTACH MAIN CHART

  useEffect(() => {
    // Reattach crosshair whenever series references change
    const charts = [
      chartRef.current,
      ...Object.values(panesRef.current).map((p) => p.chart),
    ].filter(Boolean);
    const detachHandlers = charts.map((c) => attachCrosshair(c));

    return () => detachHandlers.forEach((d) => d());
  }, [indicatorSeriesRef.current, timeframeValue]);

  // Main useEffect for chart type/data changes
  useEffect(() => {
    if (!chartRef.current) return;

    let isMounted = true;

    const loadChart = async () => {
      try {
        setMainChartLoading(true);

        // remove previous series immediately to avoid showing old data
        if (seriesRef.current) {
          try {
            chartRef.current.removeSeries(seriesRef.current);
          } catch (e) {}
          seriesRef.current = null;
        }

        const response = await fetchDataByCurrency(
          selectedCurrency,
          timeframeValue,
          fromDate,
          toDate,
        );

        if (!isMounted) return;

        // Ensure we remove any series that might have been added concurrently
        if (seriesRef.current) {
          try {
            chartRef.current.removeSeries(seriesRef.current);
          } catch (e) {}
          seriesRef.current = null;
        }

        const data = response?.data || [];

        if (!Array.isArray(data) || !data.length) return;

        switch (chartType) {
          case "line":
            seriesRef.current = chartRef.current.addSeries(
              LineSeries,
              chartSeriesStyles.line,
            );

            seriesRef.current.setData(
              data.map((d) => ({
                time: d.time,
                value: Number(d.close),
              })),
            );
            break;

          case "bar":
            seriesRef.current = chartRef.current.addSeries(
              BarSeries,
              chartSeriesStyles.bar,
            );

            seriesRef.current.setData(
              data.map((d) => ({
                time: d.time,
                open: d.open,
                high: d.high,
                low: d.low,
                close: d.close,
              })),
            );
            break;

          case "area":
            seriesRef.current = chartRef.current.addSeries(
              AreaSeries,
              chartSeriesStyles.area,
            );

            seriesRef.current.setData(
              data.map((d) => ({
                time: d.time,
                value: Number(d.close),
              })),
            );
            break;

          case "baseline":
            seriesRef.current = chartRef.current.addSeries(BaselineSeries, {
              ...chartSeriesStyles.baseline,
              baseValue: {
                type: "price",
                price: Number(data[0]?.close ?? 0),
              },
            });

            seriesRef.current.setData(
              data.map((d) => ({
                time: d.time,
                value: Number(d.close),
              })),
            );
            break;

          case "histogram":
            seriesRef.current = chartRef.current.addSeries(
              HistogramSeries,
              chartSeriesStyles.histogram,
            );

            seriesRef.current.setData(
              data.map((d, index, arr) => {
                const prev = arr[index - 1];
                const isUp = prev ? d.close >= prev.close : true;

                return {
                  time: d.time,
                  value: d.volume,
                  color: isUp ? "#22c55e" : "#ef4444",
                };
              }),
            );
            break;

          case "heikinashi":
            seriesRef.current = chartRef.current.addSeries(
              CandlestickSeries,
              chartSeriesStyles.candlestick,
            );

            seriesRef.current.setData(convertToHeikinAshi(data));
            break;

          case "hollowcandles":
            seriesRef.current = chartRef.current.addSeries(
              CandlestickSeries,
              chartSeriesStyles.hollowcandles,
            );

            seriesRef.current.setData(data);
            break;

          default:
            seriesRef.current = chartRef.current.addSeries(
              CandlestickSeries,
              chartSeriesStyles.candlestick,
            );

            seriesRef.current.setData(data);
        }

        chartRef.current.timeScale().fitContent();
      } catch (err) {
        if (!isMounted) return;
        console.error("Chart load error", err);
      } finally {
        if (isMounted) setMainChartLoading(false);
      }
    };

    loadChart();

    return () => {
      isMounted = false;
    };
  }, [chartType, timeframeValue, selectedCurrency, fromDate, toDate]);

  const { fetchDataByCurrency, fetchIndicatorData } = useChartFunctions({
    chartRef,
    addSeries,
    indicatorSeriesRef,
    indicatorStyle,
    latestIndicatorValuesRef,
    indicatorConfigs,
    fromDate,
    toDate,
  });

  const zoomCharts = (delta) => {
    const charts = [
      chartRef.current,
      ...Object.values(panesRef.current).map((p) => p.chart),
    ].filter(Boolean);
    charts.forEach((chart) => {
      const range = chart.timeScale().getVisibleLogicalRange();
      if (!range) return;
      chart.timeScale().setVisibleLogicalRange({
        from: range.from + delta,
        to: range.to - delta,
      });
    });
  };

  const zoomIn = () => zoomCharts(1);
  const zoomOut = () => zoomCharts(-1);
  const resetZoom = () => {
    const charts = [
      chartRef.current,
      ...Object.values(panesRef.current).map((p) => p.chart),
    ].filter(Boolean);
    charts.forEach((chart) => chart.timeScale().fitContent());
  };
  return (
    <>
      {/* <SEO
        title="Best Crypto Trading Platform"
        description="Trade crypto instantly with low fees"
        keywords="crypto, trading, bitcoin, ethereum"
        url="https://yourdomain.com/"
        image="https://yourdomain.com/banner.jpg"
      /> */}
      <section className="trading-view-wrapper overflow-x-hidden">
        <div className="container-fluid p-0 m-0">
          <div className="row">
            <div className="col-md-12">
              <div className="trading-chart-header">
                <ChartHeader
                  timeframeValue={timeframeValue}
                  setTimeframeValue={setTimeframeValue}
                  rangeValue={rangeValue}
                  setRangeValue={setRangeValue}
                  selectedCurrency={selectedCurrency}
                  setSelectedCurrency={setSelectedCurrency}
                  setChartType={setChartType}
                  chartType={chartType}
                  selectedIndicator={selectedIndicator}
                  setSelectedIndicator={setSelectedIndicator}
                  toggleIndicator={toggleIndicator}
                  fromDate={fromDate}
                  toDate={toDate}
                  setFromDate={setFromDate}
                  setToDate={setToDate}
                />
              </div>
            </div>
          </div>

          <div
            className="row"
            ref={paneContainerRef}
            style={{
              position: "relative",
              width: getIndicatorChartProperties.width,
              height: getIndicatorChartProperties.height,
            }}
          >
            {/* <div className="col-md-1 p-0 m-0"> */}
            {/* <ChartLeftSidebar
                chartRef={chartRef}
                containerRef={containerRef}
              /> */}
            {indicatorLoading && (
              <div
                style={{
                  position: "fixed",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  zIndex: 1000,
                }}
              >
                <Spinner />
              </div>
            )}
            {renderIndicators()}
          </div>
          {/* main chart */}
          <div className="col-md-7">
            <div
              ref={containerRef}
              style={{
                width: ChartProprties.width,
                height: ChartProprties.height,
                position: "relative",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {mainChartLoading && (
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    zIndex: 1000,
                  }}
                >
                  <Spinner />
                </div>
              )}
              {/* -------------------------------sub-header live Values----------------------- */}
              <div
                className="d-flex px-2 py-1 align-items-center gap-2 justify-content-start position-absolute top-0 start-0 z-index-10"
                style={{
                  background: "#1e2330",
                  borderBottom: "1px solid #2e3347",
                  borderRight: "1px solid #2e3347",
                  borderBottomRightRadius: 8,
                  zIndex: 10,
                }}
              >
                <style>{`
    @keyframes ping {
      75%, 100% { transform: scale(2); opacity: 0; }
    }
    .dot-ping {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      opacity: 0.3;
      animation: ping 1.2s cubic-bezier(0, 0, 0.2, 1) infinite;
    }
  `}</style>

                {/* Symbol + Timeframe */}
                <span
                  style={{
                    fontSize: 13,
                    color: "#94a3b8",
                    whiteSpace: "nowrap",
                  }}
                >
                  {selectedCurrency?.name} : {timeframeValue} :
                </span>

                {/* Market status dot */}
                <div
                  style={{
                    position: "relative",
                    width: 12,
                    height: 12,
                    flexShrink: 0,
                  }}
                >
                  <span
                    className="dot-ping"
                    style={{ background: isMarketOpen ? "#22c55e" : "#f87171" }}
                  />
                  <span
                    style={{
                      display: "block",
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: isMarketOpen ? "#22c55e" : "#f87171",
                      position: "relative",
                    }}
                  />
                </div>

                {/* OHLC Values */}
                <div className="d-flex align-items-center gap-1">
                  {SINGLE_VALUE_CHARTS.includes(chartType) ? (
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: "#60a5fa",
                        padding: "2px 6px",
                      }}
                    >
                      {liveOhlcv?.value}
                    </span>
                  ) : (
                    <>
                      {[
                        { label: "O", value: liveOhlcv?.open },
                        { label: "H", value: liveOhlcv?.high },
                        { label: "L", value: liveOhlcv?.low },
                        { label: "C", value: liveOhlcv?.close },
                      ].map(({ label, value }) => (
                        <span
                          key={label}
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            padding: "2px 5px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span style={{ color: "#64748b" }}>{label}: </span>
                          <span className={valueColor}>{value}</span>
                        </span>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* -----------------INDICATOR BAR------------------- */}

              {selectedIndicator?.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: 40,
                    left: 8,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    zIndex: 50,
                  }}
                >
                  <style>{`
    .ind-btn {
      background: transparent;
      border: none;
      padding: 2px;
      cursor: pointer;
      color: #64748b;
      display: flex;
      align-items: center;
      transition: color 0.15s;
    }
    .ind-btn:hover { color: #e2e8f0; }
  `}</style>

                  {selectedIndicator &&
                    selectedIndicator.map((indicator, index) => {
                      const normalizedType = indicator.replace(/[\s/%]+/g, "");
                      const value = liveIndicatorData[normalizedType];
                      return (
                        <div
                          key={index}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                            background: "#1e2330a4",
                            border: "1px solid #2e3347",
                            borderRadius: 6,
                            padding: "0 10px",
                            height: 32,
                            fontSize: 12,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {/* Label + value */}
                          <span
                            style={{
                              color: "#94a3b8",
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <span style={{ color: "#cbd5e1", fontWeight: 500 }}>
                              {indicator}
                            </span>
                            {" : "}
                            {indicatorConfigs?.[normalizedType]?.length ??
                              ""}{" "}
                            {indicatorConfigs?.[normalizedType]?.source ?? ""}
                            <span style={{ display: "flex", gap: 6 }}>
                              {renderValue(normalizedType, value)}
                            </span>
                          </span>

                          {/* Action buttons */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <button
                              className="ind-btn"
                              title={
                                indicatorVisibility[normalizedType]
                                  ? "Hide Indicator"
                                  : "Show Indicator"
                              }
                              onClick={() =>
                                toggleIndicatorVisibility(normalizedType)
                              }
                            >
                              {indicatorVisibility[normalizedType] ? (
                                <IoEyeOutline size={15} />
                              ) : (
                                <IoEyeOffOutline size={15} />
                              )}
                            </button>

                            <button
                              className="ind-btn"
                              title="Indicator Settings"
                              onClick={() => {
                                setActiveBarIndicator(indicator);
                                setIndicatorProperty((prev) => !prev);
                              }}
                            >
                              <IoSettingsOutline size={15} />
                            </button>

                            <button
                              className="ind-btn"
                              title="Source Code"
                              onClick={() => {
                                setActiveSourceIndicator(indicator);
                                setShowSourcePanel(true);
                              }}
                            >
                              <FaCode size={15} />
                            </button>

                            <button
                              className="ind-btn"
                              title="Remove"
                              onClick={() => removeIndicator(normalizedType)}
                            >
                              <IoCloseSharp size={15} />
                            </button>
                          </div>

                          {showAlertForm && (
                            <IndicatorAlert
                              onClose={closeAlert}
                              value={value}
                              liveOhlcv={liveOhlcv}
                              symbol={selectedCurrency}
                            />
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
              {/* {selectedIndicator.map((indicator, index) => {
                const value = liveIndicatorData[indicator];
                const paneIndex = paneIndexRef.current[indicator];
                if (paneIndex === undefined || paneIndex === 0) return null;
                return (
                  <IndicatorBar
                    key={indicator}
                    indicator={indicator}
                    timeframeValue={timeframeValue}
                    value={value}
                    renderValue={renderValue}
                    indicatorVisibility={indicatorVisibility}
                    toggleIndicatorVisibility={toggleIndicatorVisibility}
                    removeIndicator={removeIndicator}
                    setActiveBarIndicator={setActiveBarIndicator}
                    setIndicatorProperty={setIndicatorProperty}
                    setActiveSourceIndicator={setActiveSourceIndicator}
                    setShowSourcePanel={setShowSourcePanel}
                    setShowAlertForm={setShowAlertForm}
                  />
                );
              })} */}
            </div>
          </div>
          {/* <div className="col-md-3">
            <ChartRightSidebar />
          </div> */}
        </div>
        {/* </div> */}

        <SourceCodePanel
          show={showSourcePanel}
          indicator={activeSourceIndicator}
          onClose={() => setShowSourcePanel(false)}
        />
      </section>
      <section className="market-trading-part">
        <div className="container p-0 m-0">
          <div className="row">
            <div className="d-flex align-items-center position-relative">
              <div className="mx-auto d-flex align-items-center gap-2">
                {/* Shared style */}
                <style>{`
      .zoom-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        font-weight: 600;
        font-size: 0.8rem;
        letter-spacing: 0.01em;
        padding: 6px 14px;
        border-radius: 8px;
        border: 1px solid #2e3347;
        background: #1e2330;
        color: #94a3b8;
        cursor: pointer;
        transition: all 0.18s ease;
      }
      .zoom-btn svg {
        transition: transform 0.25s ease;
      }
      .zoom-btn:hover {
        background: #262d3f;
        border-color: #3d4560;
        color: #e2e8f0;
      }
      .zoom-btn:hover svg {
        transform: scale(1.15);
      }
      .zoom-btn:active {
        transform: scale(0.97);
      }
      .zoom-btn-reset {
        background: #2d3748;
        border-color: #4a5568;
        color: #e2e8f0;
      }
      .zoom-btn-reset:hover {
        background: #374151;
        border-color: #6b7280;
        color: #fff;
      }
      .zoom-btn-reset:hover svg {
        transform: rotate(360deg);
        transition: transform 0.5s ease;
      }
      .zoom-divider {
        width: 1px;
        height: 22px;
        background: #2e3347;
      }
    `}</style>

                {/* Zoom In */}
                <button onClick={zoomIn} title="Zoom in" className="zoom-btn">
                  <LuCirclePlus size={14} />
                  Zoom In
                </button>

                <div className="zoom-divider" />

                {/* Zoom Out */}
                <button onClick={zoomOut} title="Zoom out" className="zoom-btn">
                  <LuCircleMinus size={14} />
                  Zoom Out
                </button>

                <div className="zoom-divider" />

                {/* Reset */}
                <button
                  onClick={resetZoom}
                  title="Reset zoom"
                  className="zoom-btn zoom-btn-reset"
                >
                  <RiResetRightLine size={14} />
                  Reset
                </button>
              </div>
            </div>

            {/* --------------indicator sub part property show in modal-------------- */}
            <IndicatorPropertyDialog
              setIndicatorProperty={setIndicatorProperty}
              indicatorProperty={indicatorProperty}
              activeBarIndicator={activeBarIndicator}
              setIndicatorConfigs={setIndicatorConfigs}
              indicatorConfigs={indicatorConfigs}
              indicatorStyle={indicatorStyle}
              setIndicatorStyle={setIndicatorStyle}
              indicatorSeriesRef={indicatorSeriesRef}
              selectedCurrency={selectedCurrency}
              timeframeValue={timeframeValue}
              latestIndicatorValuesRef={latestIndicatorValuesRef}
              fromDate={fromDate}
              toDate={toDate}
            />
          </div>
        </div>
      </section>
    </>
  );
}
