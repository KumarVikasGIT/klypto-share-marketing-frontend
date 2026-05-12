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
import React from "react";
// import IndicatorRuleBuilder from "../components/scanner/IndicatorRuleBuilder";
import { LuCirclePlus, LuCircleMinus } from "react-icons/lu";
import { RiResetRightLine } from "react-icons/ri";
import { useEffect, useRef, useState, useCallback } from "react";
import { FaCode } from "react-icons/fa6";
import ChartHeader from "../components/tradingModals/ChartHeader";
import Navbar from "../components/layout/Navbar";
import LeftWatchlist from "../components/layout/LeftWatchlist";
import RightSidebar from "../components/layout/RightSidebar";
import ChartTabs from "../components/layout/ChartTabs";
import socket from "../services/socket";

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
import LeftDetail from "../components/layout/LeftDetail";
import Overview from "../components/tradingModals/Overview";
import OptionChain from "../components/tradingModals/OptionChain";
import LeftAlertListing from "../components/layout/LeftAlertListing";
import {
  indicatorConfigDefault,
  resolvePaneKey,
  indicatorStyleDefault,
  PANE_INDICATORS,
} from "../util/indicatorFunctions";
import { io } from "socket.io-client";
import { toast } from "react-toastify";
import useAlerts from "../util/useAlerts";

export default function Candlestick() {
  const chartRef = useRef();
  const containerRef = useRef();
  const paneContainerRef = useRef();
  const seriesRef = useRef(null);
  const indicatorSeriesRef = useRef({});
  const latestIndicatorValuesRef = useRef({});
  const indicatorDataRef = useRef({});
  const panesRef = useRef({});
  const paneIndexRef = useRef({});
  const syncingRef = useRef(false);
  const fetchedIndicatorsRef = useRef(new Set());
  const socketRef = useRef(null);

  const { matchedCoins, addAlert, clearAllCoins } = useAlerts();

  const [isWatchlistOpen, setIsWatchlistOpen] = useState(true);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailsList, setDetailsList] = useState([]);
  const [activeTab, setActiveTab] = useState("Chart");
  const [timeframeValue, setTimeframeValue] = useState("1m");
  const [selectedCurrency, setSelectedCurrency] = useState({
    symbol: "TCS-EQ",
    name: "TCS",
    token: 11536,
    segment: "NSE",
    expiry: "",
  });
  const [fromDate, setFromDate] = useState("2026-03-01");
  const [toDate, setToDate] = useState("2026-05-07");
  const [selectedIndicator, setSelectedIndicator] = useState([]);
  const [rangeValue, setRangeValue] = useState("1000");
  const [chartType, setChartType] = useState("candlestick");
  const [isMarketOpen, setIsMarketOpen] = useState(true);
  const [liveOhlcv, setLiveOhlcv] = useState({});
  const [liveIndicatorData, setLiveIndicatorData] = useState({});

  const addStockToDetails = (stock) => {
    if (detailsList.find((s) => s.symbol === stock.symbol)) return;

    setDetailsList((prev) => [...prev, stock]);

    // Request 1d data to get High/Low/LTP
    if (socketRef.current) {
      socketRef.current.emit("getManualHistoricalData", {
        symbol: stock.name || stock.symbol,
        interval: "1d",
        fromDate: fromDate,
        toDate: toDate,
      });
    }
  };

  const removeStockFromDetails = (symbol) => {
    setDetailsList((prev) => prev.filter((s) => s.symbol !== symbol));
  };
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [indicatorProperty, setIndicatorProperty] = useState(false);
  const [indicatorLoading, setIndicatorLoading] = useState(false);
  const [mainChartLoading, setMainChartLoading] = useState(false);
  const [showSourcePanel, setShowSourcePanel] = useState(false);
  const [activeSourceIndicator, setActiveSourceIndicator] = useState(null);
  const [indicatorVisibility, setIndicatorVisibility] = useState({});
  const [activeBarIndicator, setActiveBarIndicator] = useState("");
  const [indicatorUpdateTrigger, setIndicatorUpdateTrigger] = useState(0);
  const prevTimeframeRef = useRef(timeframeValue);
  const prevCurrencyRef = useRef(selectedCurrency);
  const prevChartTypeRef = useRef(chartType);
  const currentCandleRef = useRef(null);
  const lastCandleTimeRef = useRef(null);
  const candlesRef = useRef([]);
  const seriesReadyRef = useRef(false);
  const selectedIndicatorRef = useRef(selectedIndicator);
  const ohlcvDisplayRef = useRef(null);
  const IST_OFFSET = 19800;
  useEffect(() => {
    selectedIndicatorRef.current = selectedIndicator;
  }, [selectedIndicator]);

  useEffect(() => {
    if (activeTab === "Alerts") {
      setIsWatchlistOpen(true);
    }
  }, [activeTab]);

  const [indicatorConfigs, setIndicatorConfigs] = useState(
    indicatorConfigDefault,
  );

  const [indicatorStyle, setIndicatorStyle] = useState(indicatorStyleDefault);
  const isUp = liveOhlcv?.close >= liveOhlcv?.open;
  const valueColor = isUp ? "text-green-500" : "text-red-500";
  const hasPaneIndicators = selectedIndicator.some((ind) =>
    PANE_INDICATORS.has(ind),
  );

  useEffect(() => {
    if (!selectedIndicator.length) return;

    const isContextChange =
      prevTimeframeRef.current !== timeframeValue ||
      prevCurrencyRef.current !== selectedCurrency ||
      prevChartTypeRef.current !== chartType;

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
        delete indicatorDataRef.current[indicator];
      });
    }

    setIndicatorLoading(true);
    fetchIndicatorData(indicatorsToFetch, selectedCurrency, timeframeValue)
      .then(() => {
        setIndicatorUpdateTrigger((v) => v + 1);
      })
      .finally(() => {
        setIndicatorLoading(false);
      });

    indicatorsToFetch.forEach((ind) => fetchedIndicatorsRef.current.add(ind));

    // update previous values
    prevTimeframeRef.current = timeframeValue;
    prevCurrencyRef.current = selectedCurrency;
    prevChartTypeRef.current = chartType;
  }, [
    selectedIndicator,
    selectedCurrency,
    timeframeValue,
    chartType,
    fromDate,
    toDate,
  ]);

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
    });
    chartRef.current = chart;
    attachSync(chart);

    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, []); // Run only once

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

      const data = indicatorDataRef.current?.[indicator];

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
      if (candle && ohlcvDisplayRef.current) {
        const el = ohlcvDisplayRef.current;
        const isUp = candle.close >= candle.open;
        const color = isUp ? "#22c55e" : "#ef4444";
        const o = el.querySelector("[data-o]");
        const h = el.querySelector("[data-h]");
        const l = el.querySelector("[data-l]");
        const c = el.querySelector("[data-c]");
        if (o) o.textContent = Number(candle.open).toFixed(2);
        if (h) h.textContent = Number(candle.high).toFixed(2);
        if (l) l.textContent = Number(candle.low).toFixed(2);
        if (c) c.textContent = Number(candle.close).toFixed(2);
        el.querySelectorAll("[data-val]").forEach(
          (s) => (s.style.color = color),
        );
      }
      // update indicators
      updateIndicatorValues(param);
    };

    chart.subscribeCrosshairMove(handler);
    return () => chart.unsubscribeCrosshairMove(handler);
  }, []);

  const { fetchIndicatorData } = useChartFunctions({
    indicatorSeriesRef,
    indicatorDataRef,
    latestIndicatorValuesRef,
    indicatorConfigs,
    fromDate,
    toDate,
    socketRef,
    candlesRef,
  });

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
    if (!selectedCurrency || !timeframeValue) return;
    let isMounted = true;
    console.log("Socket object:", socket);
    console.log("Connected:", socket.connected);
    console.log("Socket ID:", socket.id);

    socketRef.current = socket;

    const intervalSec = TIMEFRAME_TO_SECONDS[timeframeValue];

    const requestHistoricalData = () => {
      // 🔥 Match Chart.jsx emit style
      socket.emit("getManualHistoricalData", {
        symbol: selectedCurrency?.name,
        interval:
          TIMEFRAME_TO_SECONDS[timeframeValue] === 86400
            ? "ONE_DAY"
            : TIMEFRAME_TO_SECONDS[timeframeValue] === 3600
              ? "ONE_HOUR"
              : TIMEFRAME_TO_SECONDS[timeframeValue] === 900
                ? "FIFTEEN_MINUTE"
                : TIMEFRAME_TO_SECONDS[timeframeValue] === 300
                  ? "FIVE_MINUTE"
                  : "ONE_MINUTE",
        fromDate: fromDate,
        toDate: new Date().toISOString(), // Use current time for toDate like Chart.jsx
        exchange: selectedCurrency?.segment || "NSE",
      });
    };

    if (socket.connected) {
      requestHistoricalData();
    } else {
      socket.connect();
    }

    socket.on("connect", () => {
      console.log("✅ SOCKET CONNECTED", socket);
      requestHistoricalData();
    });

    // ✅ Historical data response — replaces loadChart / fetchDataByCurrency
    socket.on("historicalDataResponse", (response) => {
      if (!isMounted || !chartRef.current) return;

      console.log("HISTORICAL DATA RESPONSE", response);
      setMainChartLoading(false);

      // Remove previous series
      if (seriesRef.current) {
        try {
          chartRef.current.removeSeries(seriesRef.current);
        } catch {}
        seriesRef.current = null;
      }

      const raw = response?.data || [];
      const symbolFromResponse = raw[0]?.symbol;

      const data = raw
        .map((d) => ({
          time: Number(d.time) + IST_OFFSET,
          open: parseFloat(d.open),
          high: parseFloat(d.high),
          low: parseFloat(d.low),
          close: parseFloat(d.close),
          volume: parseFloat(d.volume || 0),
        }))
        .sort((a, b) => a.time - b.time); // ✅ Crucial sort like in Chart.jsx

      candlesRef.current = data;

      if (!Array.isArray(data) || !data.length) return;

      // 🔥 Update detailsList with fresh data for the specific stock in response
      const lastPoint = data[data.length - 1];
      const aggregateHigh = Math.max(...data.map((d) => d.high));
      const aggregateLow = Math.min(...data.map((d) => d.low));

      setDetailsList((prev) => {
        const existingIdx = prev.findIndex(
          (s) =>
            s.name === symbolFromResponse || s.symbol === symbolFromResponse,
        );
        if (existingIdx === -1) return prev; // Don't add if not in list (or we can add it, but usually it should be there)

        const newList = [...prev];
        newList[existingIdx] = {
          ...newList[existingIdx],
          ltp: lastPoint.close,
          high: aggregateHigh,
          low: aggregateLow,
        };
        return newList;
      });

      // 📈 ONLY update chart if the symbol matches the currently selected currency
      if (
        symbolFromResponse !== selectedCurrency.name &&
        symbolFromResponse !== selectedCurrency.symbol
      ) {
        console.log(
          `Skipping chart update for ${symbolFromResponse} (Active: ${selectedCurrency.name})`,
        );
        return;
      }

      switch (chartType) {
        case "line":
          seriesRef.current = chartRef.current.addSeries(
            LineSeries,
            chartSeriesStyles.line,
          );
          seriesRef.current.setData(
            data.map((d) => ({ time: d.time, value: Number(d.close) })),
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
            data.map((d) => ({ time: d.time, value: Number(d.close) })),
          );
          break;
        case "baseline":
          seriesRef.current = chartRef.current.addSeries(BaselineSeries, {
            ...chartSeriesStyles.baseline,
            baseValue: { type: "price", price: Number(data[0]?.close ?? 0) },
          });
          seriesRef.current.setData(
            data.map((d) => ({ time: d.time, value: Number(d.close) })),
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
          seriesReadyRef.current = true;
      }

      currentCandleRef.current = data[data.length - 1];

      // ✅ Populate OHLCV display on load
      setTimeout(() => {
        const last = data[data.length - 1];
        if (last && ohlcvDisplayRef.current) {
          const el = ohlcvDisplayRef.current;
          const isUp = last.close >= last.open;
          const color = isUp ? "#22c55e" : "#ef4444";
          const o = el.querySelector("[data-o]");
          const h = el.querySelector("[data-h]");
          const l = el.querySelector("[data-l]");
          const c = el.querySelector("[data-c]");
          if (o) o.textContent = Number(last.open).toFixed(2);
          if (h) h.textContent = Number(last.high).toFixed(2);
          if (l) l.textContent = Number(last.low).toFixed(2);
          if (c) c.textContent = Number(last.close).toFixed(2);
          el.querySelectorAll("[data-val]").forEach(
            (s) => (s.style.color = color),
          );
        }
        chartRef.current?.timeScale().fitContent();
      }, 150);
    });

    socket.on("historicalDataError", (err) => {
      toast.error(err.message || "Failed to fetch historical data");

      console.error("❌ Historical data error:", err);
      if (isMounted) setMainChartLoading(false);
    });

    const handleChartLiveTick = (tick) => {
      if (tick.symbol !== selectedCurrency?.name) return;
      if (!seriesRef.current) return;

      /* NORMALIZE TIME */
      let tickTime = Number(tick?.data?.time);

      // ISO string support
      if (!Number.isFinite(tickTime)) {
        tickTime = Math.floor(new Date(tick?.data?.time).getTime() / 1000);
      }

      // milliseconds -> seconds
      if (tickTime > 10000000000) {
        tickTime = Math.floor(tickTime / 1000);
      }

      if (!Number.isFinite(tickTime)) return;

      // ✅ Synchronize with historical data IST offset
      tickTime += IST_OFFSET;

      /* NORMALIZE CANDLE TIME */
      const normalizedTime = Math.floor(tickTime / intervalSec) * intervalSec;
      if (!Number.isFinite(normalizedTime) || normalizedTime <= 0) return;

      /* PRICE */
      const price = Number(tick.data.close ?? tick.data.price ?? tick.data.ltp);
      if (!Number.isFinite(price)) return;

      let updatedBar;

      /* NEW CANDLE or UPDATE EXISTING */
      if (
        !currentCandleRef.current ||
        normalizedTime > currentCandleRef.current.time
      ) {
        updatedBar = {
          time: normalizedTime,
          open: price,
          high: price,
          low: price,
          close: price,
          volume: Number(tick.data.volume || 0),
        };
      } else {
        updatedBar = {
          ...currentCandleRef.current,
          high: Math.max(currentCandleRef.current.high, price),
          low: Math.min(currentCandleRef.current.low, price),
          close: price,
          volume:
            Number(currentCandleRef.current.volume || 0) +
            Number(tick.data.volume || 0),
        };
      }

      /* SAVE AND UPDATE */
      currentCandleRef.current = updatedBar;
      const existingIndex = candlesRef.current.findIndex(
        (c) => c.time === updatedBar.time,
      );

      if (existingIndex >= 0) {
        candlesRef.current[existingIndex] = updatedBar;
      } else {
        candlesRef.current.push(updatedBar);
      }
      lastCandleTimeRef.current = normalizedTime;

      try {
        seriesRef.current.update(updatedBar);
      } catch (e) {
        console.warn("⚠️ series.update failed:", e.message);
        return;
      }

      /* UPDATE OHLC DISPLAY */
      if (ohlcvDisplayRef.current) {
        const el = ohlcvDisplayRef.current;
        const isUp = updatedBar.close >= updatedBar.open;
        const color = isUp ? "#22c55e" : "#ef4444";
        const o = el.querySelector("[data-o]");
        const h = el.querySelector("[data-h]");
        const l = el.querySelector("[data-l]");
        const c = el.querySelector("[data-c]");

        if (o) o.textContent = Number(updatedBar.open).toFixed(2);
        if (h) h.textContent = Number(updatedBar.high).toFixed(2);
        if (l) l.textContent = Number(updatedBar.low).toFixed(2);
        if (c) c.textContent = Number(updatedBar.close).toFixed(2);

        el.querySelectorAll("[data-val]").forEach(
          (s) => (s.style.color = color),
        );
      }

      /* LIVE INDICATORS */
      const activeIndicators = selectedIndicatorRef.current;
      if (activeIndicators?.length > 0) {
        activeIndicators.forEach((ind) => {
          socket.emit("getLiveIndicatorUpdate", {
            symbol: selectedCurrency?.name,
            interval:
              TIMEFRAME_TO_SECONDS[timeframeValue] === 86400
                ? "ONE_DAY"
                : TIMEFRAME_TO_SECONDS[timeframeValue] === 3600
                  ? "ONE_HOUR"
                  : TIMEFRAME_TO_SECONDS[timeframeValue] === 900
                    ? "FIFTEEN_MINUTE"
                    : TIMEFRAME_TO_SECONDS[timeframeValue] === 300
                      ? "FIVE_MINUTE"
                      : "ONE_MINUTE",

            token: selectedCurrency?.token,
            from: fromDate,
            to: toDate,
            type: ind,
            candles: candlesRef.current, // ✅ FULL SOURCE OF TRUTH
          });
        });
      }
    };
    socket.on("liveTick", handleChartLiveTick);

    const handleChartLiveIndicator = (payload) => {
      if (!payload?.success || !payload?.type) return;
      console.log(payload, "payload from liveIndicatorResponse");

      const indicatorType = payload.type;
      const seriesGroup = indicatorSeriesRef.current?.[indicatorType];
      if (!seriesGroup) return;
      const dataArray = payload.data;
      if (!Array.isArray(dataArray) || dataArray.length === 0) return;
      const lastPoint = dataArray[dataArray.length - 1];
      if (!lastPoint) return;
      const pointTime =
        currentCandleRef.current?.time ?? Number(lastPoint.time);
      Object.entries(seriesGroup).forEach(([lineName, series]) => {
        if (lineName.startsWith("_")) return;
        if (!series || typeof series.update !== "function") return;
        const value =
          lastPoint[lineName] ??
          lastPoint[lineName + "Band"] ?? // handle bbUpper vs bbUpperBand
          lastPoint.value ??
          lastPoint[indicatorType.toLowerCase()];
        if (value == null || !Number.isFinite(Number(value))) return;
        try {
          series.update({ time: pointTime, value: Number(value) });
        } catch (e) {
          console.warn(
            `⚠️ Indicator update failed [${indicatorType}][${lineName}]:`,
            e.message,
          );
        }
      });
    };
    socket.on("liveIndicatorResponse", handleChartLiveIndicator);
    
    socket.on("disconnect", () => console.log("❌ SOCKET DISCONNECTED"));
    socket.on("connect_error", (err) =>
      console.log("❌ SOCKET ERROR:", err.message),
    );

    // 🔥 Show loader immediately while waiting for socket data
    setMainChartLoading(true);

    return () => {
      isMounted = false;
      console.log("🧹 SOCKET CLEANUP");
      socket.off("connect");
      socket.off("historicalDataResponse");
      socket.off("historicalDataError");
      socket.off("liveTick", handleChartLiveTick);
      socket.off("liveIndicatorResponse", handleChartLiveIndicator);
      socket.off("disconnect");
      socket.off("connect_error");
      socketRef.current = null;
    };
  }, [selectedCurrency?.name, timeframeValue, chartType, fromDate, toDate]); // ✅ chartType added

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

  // useEffect(() => {
  //   if (!selectedCurrency || !timeframeValue) return;

  //   const socket = io("http://192.168.1.9:7000");
  //   socketRef.current = socket;

  //   const intervalSec = TIMEFRAME_TO_SECONDS[timeframeValue];

  //   socket.on("connect", () => {
  //     console.log("✅ SOCKET CONNECTED");
  //     socket.emit("getManualHistoricalData", {
  //       symbol: selectedCurrency?.symbol,
  //       interval: timeframeValue,
  //     });
  //   });

  //   socket.on("liveTick", (tick) => {
  //     if (tick.symbol !== selectedCurrency?.name) return;
  //     if (!seriesRef.current) return;

  //     let timeInSec = tick.data.time;

  //     if (typeof timeInSec === "string") {
  //       timeInSec = Math.floor(new Date(timeInSec).getTime() / 1000);
  //     } else if (typeof timeInSec === "number" && timeInSec > 1e12) {
  //       timeInSec = Math.floor(timeInSec / 1000);
  //     } else if (typeof timeInSec !== "number") {
  //       return;
  //     }

  //     if (!Number.isFinite(timeInSec)) return;

  //     // ✅ No IST offset — REST and socket are both in same timezone
  //     const normalizedTime = Math.floor(timeInSec / intervalSec) * intervalSec;
  //     if (!Number.isFinite(normalizedTime) || normalizedTime <= 0) return;

  //     // ✅ Skip if tick is older than current candle
  //     if (
  //       currentCandleRef.current?.time &&
  //       normalizedTime < currentCandleRef.current.time
  //     ) {
  //       return;
  //     }

  //     const candleData = {
  //       time: normalizedTime,
  //       open: Number(tick.data.open),
  //       high: Number(tick.data.high),
  //       low: Number(tick.data.low),
  //       close: Number(tick.data.close),
  //       volume: Number(tick.data.volume),
  //     };

  //     currentCandleRef.current = candleData;
  //     lastCandleTimeRef.current = normalizedTime;

  //     try {
  //       seriesRef.current.update(candleData);
  //     } catch (e) {
  //       console.warn("⚠️ series.update failed:", e.message);
  //       return;
  //     }

  //     // Direct DOM update — no React state, no flicker
  //     if (ohlcvDisplayRef.current) {
  //       const el = ohlcvDisplayRef.current;
  //       const isUp = candleData.close >= candleData.open;
  //       const color = isUp ? "#22c55e" : "#ef4444";
  //       const o = el.querySelector("[data-o]");
  //       const h = el.querySelector("[data-h]");
  //       const l = el.querySelector("[data-l]");
  //       const c = el.querySelector("[data-c]");
  //       if (o) o.textContent = Number(candleData.open).toFixed(2);
  //       if (h) h.textContent = Number(candleData.high).toFixed(2);
  //       if (l) l.textContent = Number(candleData.low).toFixed(2);
  //       if (c) c.textContent = Number(candleData.close).toFixed(2);
  //       el.querySelectorAll("[data-val]").forEach(
  //         (s) => (s.style.color = color),
  //       );
  //     }

  //     // ✅ Emit live indicator update on every tick
  //     const activeIndicators = selectedIndicatorRef.current;
  //     if (activeIndicators?.length > 0) {
  //       activeIndicators.forEach((ind) => {
  //         socket.emit("getLiveIndicatorUpdate", {
  //           symbol: selectedCurrency?.name,
  //           interval: timeframeValue,
  //           type: ind,
  //           fromdate: `${fromDate} 09:15`,
  //           todate: `${toDate} 15:30`,
  //           latestCandle: candleData,
  //         });
  //       });
  //     }
  //   });

  //   // ✅ Live indicator response — update last point only
  //   socket.on("liveIndicatorResponse", (payload) => {
  //     if (!payload?.success || !payload?.type) return;

  //     const indicatorType = payload.type;
  //     const seriesGroup = indicatorSeriesRef.current?.[indicatorType];
  //     if (!seriesGroup) return;

  //     const dataArray = payload.data;
  //     if (!Array.isArray(dataArray) || dataArray.length === 0) return;

  //     const lastPoint = dataArray[dataArray.length - 1];
  //     if (!lastPoint) return;

  //     // ✅ Use current candle time — guarantees alignment with chart
  //     const pointTime =
  //       currentCandleRef.current?.time ?? Number(lastPoint.time);

  //     Object.entries(seriesGroup).forEach(([lineName, series]) => {
  //       if (lineName.startsWith("_")) return;
  //       if (!series || typeof series.update !== "function") return;

  //       const value =
  //         lastPoint[lineName] ??
  //         lastPoint.value ??
  //         lastPoint[indicatorType.toLowerCase()];

  //       if (value == null || !Number.isFinite(Number(value))) return;

  //       try {
  //         series.update({
  //           time: pointTime, // ✅ always matches current candle
  //           value: Number(value),
  //         });
  //       } catch (e) {
  //         console.warn(
  //           `⚠️ Indicator update failed [${indicatorType}][${lineName}]:`,
  //           e.message,
  //         );
  //       }
  //     });
  //   });

  //   socket.on("disconnect", () => console.log("❌ SOCKET DISCONNECTED"));
  //   socket.on("connect_error", (err) =>
  //     console.log("❌ SOCKET ERROR:", err.message),
  //   );

  //   return () => {
  //     console.log("🧹 SOCKET CLEANUP");
  //     socket.off("liveTick");
  //     socket.off("liveIndicatorResponse");
  //     socket.disconnect();
  //     socketRef.current = null;
  //   };
  // }, [selectedCurrency?.name, timeframeValue]); // ✅ single dependency array

  return (
    <>
      <Navbar setSelectedCurrency={setSelectedCurrency} />
      <section
        className="trading-view-wrapper overflow-hidden"
        style={{
          background: "#131722",
          height: "calc(100vh - 60px)",
          display: "flex",
        }}
      >
        <div
          className="container-fluid p-0 m-0"
          style={{ display: "flex", width: "100%", height: "100%" }}
        >
          <div style={{ display: "flex", width: "100%", height: "100%" }}>
            {/* Left Panel (Watchlist or Details) */}
            <div
              style={{
                width: isWatchlistOpen || isDetailsOpen ? "300px" : "0px",
                opacity: isWatchlistOpen || isDetailsOpen ? 1 : 0,
                overflow: "hidden",
                height: "100%",
                transition:
                  "width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                flexShrink: 0,
              }}
            >
              <div style={{ width: "300px", height: "100%" }}>
                {activeTab === "Alerts" && (
                  <LeftAlertListing
                    onClose={() => setIsWatchlistOpen(false)}
                    alertResult={matchedCoins}
                    setAlertResult={clearAllCoins}
                    setSelectedCurrency={setSelectedCurrency}
                    setActiveTab={setActiveTab}
                  />
                )}
                {activeTab !== "Alerts" && isWatchlistOpen && (
                  <LeftWatchlist
                    onClose={() => setIsWatchlistOpen(false)}
                    setSelectedCurrency={setSelectedCurrency}
                    alertResult={matchedCoins}
                  />
                )}
                {activeTab !== "Alerts" && isDetailsOpen && (
                  <LeftDetail
                    onClose={() => setIsDetailsOpen(false)}
                    selectedCurrency={selectedCurrency}
                    detailsList={detailsList}
                    onAddStock={addStockToDetails}
                    onRemoveStock={removeStockFromDetails}
                    setSelectedCurrency={setSelectedCurrency}
                  />
                )}
              </div>
            </div>

            {/* Main Chart Area */}
            <div
              style={{
                flex: 1,
                minWidth: 0, // important to prevent flex items from overflowing
                borderLeft:
                  isWatchlistOpen || isDetailsOpen
                    ? "1px solid #2a2e39"
                    : "none",
                borderRight: "1px solid #2a2e39",
                display: "flex",
                flexDirection: "column",
                height: "100%",
                transition: "border-color 0.3s ease",
              }}
            >
              <ChartTabs activeTab={activeTab} setActiveTab={setActiveTab} />

              <div
                style={{
                  flex: 1,
                  display:
                    activeTab === "Chart" || activeTab === "Alerts"
                      ? "flex"
                      : "none",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                <div
                  className="trading-chart-header"
                  style={{ padding: 0, flexShrink: 0 }}
                >
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
                    alertResult={matchedCoins}
                    addAlert={addAlert}
                  />
                </div>

                {/* main chart */}
                <div
                  ref={containerRef}
                  style={{
                    width: "100%",
                    flex: 1,
                    position: "relative",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {mainChartLoading ? (
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
                  ) : (
                    indicatorLoading && (
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
                    )
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
                      {selectedCurrency?.symbol} : {timeframeValue}{" "}
                      {selectedCurrency?.segment}
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
                        style={{
                          background: isMarketOpen ? "#22c55e" : "#f87171",
                        }}
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
                    {/* OHLC Values - direct DOM, zero re-render */}
                    <div
                      className="d-flex align-items-center gap-1"
                      ref={ohlcvDisplayRef}
                    >
                      {SINGLE_VALUE_CHARTS.includes(chartType) ? (
                        <span
                          data-o=""
                          data-val=""
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: "#60a5fa",
                            padding: "2px 6px",
                          }}
                        >
                          --
                        </span>
                      ) : (
                        <>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 500,
                              padding: "2px 5px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <span style={{ color: "#64748b" }}>O: </span>
                            <span
                              data-o=""
                              data-val=""
                              style={{ color: "#22c55e" }}
                            >
                              --
                            </span>
                          </span>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 500,
                              padding: "2px 5px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <span style={{ color: "#64748b" }}>H: </span>
                            <span
                              data-h=""
                              data-val=""
                              style={{ color: "#22c55e" }}
                            >
                              --
                            </span>
                          </span>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 500,
                              padding: "2px 5px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <span style={{ color: "#64748b" }}>L: </span>
                            <span
                              data-l=""
                              data-val=""
                              style={{ color: "#22c55e" }}
                            >
                              --
                            </span>
                          </span>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 500,
                              padding: "2px 5px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <span style={{ color: "#64748b" }}>C: </span>
                            <span
                              data-c=""
                              data-val=""
                              style={{ color: "#22c55e" }}
                            >
                              --
                            </span>
                          </span>
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
                          const normalizedType = indicator.replace(
                            /[\s/%]+/g,
                            "",
                          );
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
                                <span
                                  style={{
                                    color: "#cbd5e1",
                                    fontWeight: 500,
                                  }}
                                >
                                  {indicator}
                                </span>
                                {" : "}
                                {indicatorConfigs?.[normalizedType]?.length ??
                                  ""}{" "}
                                {indicatorConfigs?.[normalizedType]?.source ??
                                  ""}
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
                                  onClick={() =>
                                    removeIndicator(normalizedType)
                                  }
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

                {/* Indicator Panes */}
                <div
                  ref={paneContainerRef}
                  style={{
                    position: "relative",
                    width: "100%",
                    height: hasPaneIndicators
                      ? getIndicatorChartProperties().height
                      : 0,
                    display: hasPaneIndicators ? "block" : "none",
                  }}
                ></div>

                {/* Render Indicators */}
                <React.Fragment>{renderIndicators()}</React.Fragment>
              </div>

              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  borderLeft: isWatchlistOpen ? "1px solid #2a2e39" : "none",
                  borderRight: "1px solid #2a2e39",
                  display: activeTab === "Overview" ? "flex" : "none",
                  flexDirection: "column",
                  height: "100%",
                }}
              >
                <Overview
                  key={selectedCurrency?.name}
                  selectedCurrency={selectedCurrency}
                />
              </div>

              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  borderLeft: isWatchlistOpen ? "1px solid #2a2e39" : "none",
                  borderRight: "1px solid #2a2e39",
                  display: activeTab === "Option Chain" ? "flex" : "none",
                  flexDirection: "column",
                  height: "100%",
                }}
              >
                <OptionChain
                  key={selectedCurrency?.name}
                  selectedCurrency={selectedCurrency}
                />
              </div>
            </div>

            {/* Right Sidebar */}
            <div style={{ width: "70px", height: "100%", flexShrink: 0 }}>
              <RightSidebar
                isWatchlistOpen={activeTab !== "Alerts" && isWatchlistOpen}
                toggleWatchlist={() => {
                  if (activeTab === "Alerts") {
                    setActiveTab("Chart");
                    setIsWatchlistOpen(true);
                  } else {
                    setIsWatchlistOpen(!isWatchlistOpen);
                  }
                  setIsDetailsOpen(false);
                }}
                isDetailsOpen={isDetailsOpen}
                toggleDetails={() => {
                  setIsDetailsOpen(!isDetailsOpen);
                  setIsWatchlistOpen(false);
                  if (activeTab === "Alerts") setActiveTab("Chart");
                }}
                isAlertsOpen={activeTab === "Alerts"}
                toggleAlerts={() => {
                  if (activeTab === "Alerts") {
                    setActiveTab("Chart");
                  } else {
                    setActiveTab("Alerts");
                  }
                }}
              />
            </div>
          </div>
        </div>
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
