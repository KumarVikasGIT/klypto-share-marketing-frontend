// import "bootstrap/dist/css/bootstrap.min.css"; //this is for temp
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  BarSeries,
  AreaSeries,
  HistogramSeries,
  BaselineSeries,
  createSeriesMarkers,
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
import { Link } from "react-router-dom";
import CodeEditorPanel from "../components/layout/CodeEditorPanel";
import OIAnalytics from "../components/tradingModals/OIAnalytics";
import { FaPlay } from "react-icons/fa";
import Swal from "sweetalert2";
import apiService from "../services/apiServices";

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
  const chartIndicatorHandlerRef = useRef(null);
  const customScriptSeriesRef = useRef(null);
  const customScriptMarkersRef = useRef(null);
  const pyodideRef = useRef(null);
  const [isDeployed, setIsDeployed] = useState(false);
  const [isPyodideReady, setIsPyodideReady] = useState(false);

  useEffect(() => {
    // Load Pyodide WebAssembly script dynamically
    if (window.loadPyodide) {
      if (!pyodideRef.current) {
        window
          .loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/",
          })
          .then(async (pyodide) => {
            try {
              await pyodide.loadPackage("pandas");
            } catch (e) {
              console.error(e);
            }
            pyodideRef.current = pyodide;
            setIsPyodideReady(true);
          });
      }
    } else {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js";
      script.onload = () => {
        window
          .loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/",
          })
          .then(async (pyodide) => {
            try {
              await pyodide.loadPackage("pandas");
            } catch (e) {
              console.error(e);
            }
            pyodideRef.current = pyodide;
            setIsPyodideReady(true);
          });
      };
      document.head.appendChild(script);
    }
  }, []);

  const handleClearCode = useCallback(() => {
    if (customScriptSeriesRef.current && chartRef.current) {
      if (Array.isArray(customScriptSeriesRef.current)) {
        customScriptSeriesRef.current.forEach((series) => {
          try {
            chartRef.current.removeSeries(series);
          } catch (e) {}
        });
      } else {
        try {
          chartRef.current.removeSeries(customScriptSeriesRef.current);
        } catch (e) {}
      }
      customScriptSeriesRef.current = null;
    }
    if (customScriptMarkersRef.current) {
      try {
        customScriptMarkersRef.current.setMarkers([]);
      } catch (e) {}
    }
    setCustomSignals([]);
    setIsDeployed(false);
  }, []);

  const handleDeployCode = useCallback(
    async (code) => {
      if (!chartRef.current) return;

      // 1. Clear previous
      handleClearCode();

      if (!pyodideRef.current || !isPyodideReady) {
        Swal.fire({
          icon: "warning",
          title: "Not Ready",
          text: "The Python compiler is downloading in the background. Please wait a few seconds and try again.",
          background: "var(--bg-secondary)",
          color: "var(--text-primary)",
        });
        return;
      }

      if (!code || code.trim() === "") {
        Swal.fire({
          icon: "warning",
          title: "Empty Code",
          text: "Please write some code before deploying.",
          background: "var(--bg-secondary)",
          color: "var(--text-primary)",
        });
        return;
      }

      setIsDeploying(true);
      // 2. Plot using real Python WebAssembly engine
      try {
        const closes = candlesRef?.current?.map((c) => c.close) || [];
        if (closes.length < 4) {
          Swal.fire({
            icon: "warning",
            title: "Insufficient Data",
            text: "Not enough candle data to plot indicator.",
            background: "var(--bg-secondary)",
            color: "var(--text-primary)",
          });
          return;
        }

        toast.info("Compiling Python script...", {
          autoClose: 2000,
          toastId: "compiling",
        });

        const pyodide = pyodideRef.current;

        // Ensure required packages are fully loaded before execution
        await pyodide.loadPackagesFromImports(code);

        // Inject close prices as a global Javascript array into Python
        pyodide.globals.set("close", closes);
        const opens = candlesRef?.current?.map((c) => c.open) || [];
        const highs = candlesRef?.current?.map((c) => c.high) || [];
        const lows = candlesRef?.current?.map((c) => c.low) || [];
        const volumes = candlesRef?.current?.map((c) => c.volume || 0) || [];
        const timestamps = candlesRef?.current?.map((c) => c.time) || [];

        pyodide.globals.set("open", opens);
        pyodide.globals.set("high", highs);
        pyodide.globals.set("low", lows);
        pyodide.globals.set("close", closes);
        pyodide.globals.set("volume", volumes);
        pyodide.globals.set("datetime", timestamps);

        // Setup the plotting bridge to catch the output
        const pythonSetup = `
import js

_plotted_series = []
_plotted_markers = []

def plot(name, data):
    try:
        if isinstance(data, list):
            _plotted_series.append({
                "name": name,
                "data": data
            })
        else:
            _plotted_series.append({
                "name": name,
                "data": data.tolist()
            })
    except Exception:
        pass


def plot_markers(markers):
    try:
        if isinstance(markers, list):
            _plotted_markers.extend(markers)
    except Exception:
        pass


def buy(index):
    _plotted_markers.append({
        "index": int(index),
        "type": "BUY"
    })


def sell(index):
    _plotted_markers.append({
        "index": int(index),
        "type": "SELL"
    })


def signal(signal_type, index):
    _plotted_markers.append({
        "index": int(index),
        "type": str(signal_type).upper()
    })
`;
        await pyodide.runPythonAsync(pythonSetup);

        // Execute User's actual code
        await pyodide.runPythonAsync(code);

        // Fetch the plotted results back into Javascript
        const plottedSeriesProxy = pyodide.globals.get("_plotted_series");
        const plottedSeries = plottedSeriesProxy
          ? plottedSeriesProxy.toJs()
          : [];

        const plottedMarkersProxy = pyodide.globals.get("_plotted_markers");
        const plottedMarkers = plottedMarkersProxy
          ? plottedMarkersProxy.toJs()
          : [];

        if (
          (!plottedSeries || plottedSeries.length === 0) &&
          (!plottedMarkers || plottedMarkers.length === 0)
        ) {
          Swal.fire({
            icon: "warning",
            title: "No Plot Data",
            text: 'Script executed successfully but did not call plot(). Make sure you end your script with plot("Name", data) or plot_markers(data)',
            background: "var(--bg-secondary)",
            color: "var(--text-primary)",
          });
          return;
        }

        // Map Python list values back to Unix timestamps and plot each series
        customScriptSeriesRef.current = [];
        const colors = [
          "var(--accent-color)",
          "var(--danger-color)",
          "#22ab94",
          "#ff9800",
          "#9c27b0",
          "#e91e63",
        ];

        if (plottedSeries && plottedSeries.length > 0) {
          plottedSeries.forEach((seriesMap, seriesIndex) => {
            const seriesName =
              seriesMap.get("name") || `Indicator ${seriesIndex + 1}`;
            const seriesDataArray = seriesMap.get("data");

            const indicatorData = candlesRef.current
              .map((candle, index) => {
                const val = seriesDataArray[index];
                return {
                  time: candle.time,
                  value: typeof val === "number" ? val : null,
                };
              })
              .filter((x) => x.value !== null && !isNaN(x.value));

            if (indicatorData.length > 0) {
              const lineSeries = chartRef.current.addSeries(LineSeries, {
                title: seriesName,
                color: colors[seriesIndex % colors.length],
                lineWidth: 2,
              });

              lineSeries.setData(indicatorData);
              customScriptSeriesRef.current.push(lineSeries);
            }
          });
        }

        if (plottedMarkers && plottedMarkers.length > 0) {
          const markersToSet = [];
          const newSignals = [];
          plottedMarkers.forEach((markerMap) => {
            const idx = markerMap.get("index");
            const type = markerMap.get("type");
            const candle = candlesRef.current[idx];
            if (candle && type) {
              const isBuy = type.toUpperCase() === "BUY";
              markersToSet.push({
                time: candle.time,
                position: isBuy ? "belowBar" : "aboveBar",
                color: isBuy ? "#22ab94" : "var(--danger-color)",
                shape: isBuy ? "arrowUp" : "arrowDown",
                text: isBuy ? "BUY" : "SELL",
                size: 1,
              });

              let ts = candle.time;
              if (typeof ts === "object" && ts.year) {
                ts = new Date(ts.year, ts.month - 1, ts.day).getTime();
              } else if (typeof ts === "number" && ts < 10000000000) {
                ts = (ts - 19800) * 1000;
              }

              const d = new Date(ts);
              const dateStr = d.toLocaleDateString("en-IN", {
                timeZone: "Asia/Kolkata",
              });
              const timeStr = d.toLocaleTimeString("en-IN", {
                timeZone: "Asia/Kolkata",
              });

              newSignals.unshift({
                symbol: selectedCurrency?.name || "STOCK",
                name: selectedCurrency?.name || "STOCK",
                token: selectedCurrency?.token,
                signalType: isBuy ? "BUY" : "SELL",
                timestamp: `${dateStr} ${timeStr}`,
                segment: "SCRIPT",
              });
            }
          });

          if (markersToSet.length > 0 && seriesRef.current) {
            if (!customScriptMarkersRef.current) {
              customScriptMarkersRef.current = createSeriesMarkers(
                seriesRef.current,
                markersToSet,
              );
            } else {
              customScriptMarkersRef.current.setMarkers(markersToSet);
            }
          }
          setCustomSignals(newSignals);
        } else {
          setCustomSignals([]);
        }

        if (
          customScriptSeriesRef.current.length > 0 ||
          (plottedMarkers && plottedMarkers.length > 0)
        ) {
          setIsDeployed(true);
          toast.success("Python compiled and plotted successfully!", {
            toastId: "script-success",
          });
        } else {
          toast.error("No valid indicator data calculated.", {
            toastId: "script-error",
          });
        }
      } catch (err) {
        console.error("Pyodide execution error:", err);
        Swal.fire({
          icon: "error",
          title: "Python Execution Error",
          text: err.message,
          background: "var(--bg-secondary)",
          color: "var(--text-primary)",
        });
      } finally {
        setIsDeploying(false);
      }
    },
    [handleClearCode, isPyodideReady],
  );

  const { matchedCoins, addAlert, clearAllCoins, scanner, removeCoin } =
    useAlerts();

  const [isWatchlistOpen, setIsWatchlistOpen] = useState(true);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailsList, setDetailsList] = useState([]);
  const [activeTab, setActiveTab] = useState("Chart");
  const [timeframeValue, setTimeframeValue] = useState("5m");
  const [selectedCurrency, setSelectedCurrency] = useState(() => {
    try {
      const raw = localStorage.getItem("selectedCurrency");
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn("Failed to read selectedCurrency from localStorage", e);
    }
    return {
      symbol: "ADANIPORTS-EQ",
      name: "ADANIPORTS",
      token: 15083,
      segment: "NSE",
      expiry: "",
    };
  });
  const [fromDate, setFromDate] = useState("2026-01-09");
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedIndicator, setSelectedIndicator] = useState([]);
  const [rangeValue, setRangeValue] = useState("1000");
  const [chartType, setChartType] = useState("candlestick");
  const [isMarketOpen, setIsMarketOpen] = useState(false);
  const [liveOhlcv, setLiveOhlcv] = useState({});
  const [liveIndicatorData, setLiveIndicatorData] = useState({});
  const [isCodeEditorOpen, setIsCodeEditorOpen] = useState(false);
  const [editorCode, setEditorCode] = useState(
    "import pandas as pd\n\n# Example user code\n",
  );
  const [openScannerTrigger, setOpenScannerTrigger] = useState(0);
  const [customSignals, setCustomSignals] = useState([]);
  const [isDeploying, setIsDeploying] = useState(false);

  useEffect(() => {
    const checkMarketStatus = () => {
      const now = new Date();

      // IST time
      const istTime = new Date(
        now.toLocaleString("en-US", {
          timeZone: "Asia/Kolkata",
        }),
      );

      const day = istTime.getDay(); // 0 = Sunday, 6 = Saturday
      const hours = istTime.getHours();
      const minutes = istTime.getMinutes();

      const currentMinutes = hours * 60 + minutes;

      // Market timings: 9:15 AM to 3:30 PM
      const marketStart = 9 * 60 + 15;
      const marketEnd = 15 * 60 + 30;

      const isWeekday = day >= 1 && day <= 5;

      const open =
        isWeekday &&
        currentMinutes >= marketStart &&
        currentMinutes <= marketEnd;

      setIsMarketOpen(open);
    };

    // Initial check
    checkMarketStatus();

    // Update every minute
    const interval = setInterval(checkMarketStatus, 60000);

    return () => clearInterval(interval);
  }, []);

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
  const actionButtonsRef = useRef(null);
  const strategyMarkersRef = useRef(null); //ref for markers
  const markersLoadedRef = useRef(false);
  // ✅ Always-current refs so persistent handlers never capture stale closures
  const selectedCurrencyRef = useRef(selectedCurrency);
  const intervalSecRef = useRef(TIMEFRAME_TO_SECONDS[timeframeValue] ?? 60);
  const IST_OFFSET = 19800;

  useEffect(() => {
    selectedIndicatorRef.current = selectedIndicator;
  }, [selectedIndicator]);

  useEffect(() => {
    selectedCurrencyRef.current = selectedCurrency;
  }, [selectedCurrency]);

  // Persist selectedCurrency so it survives page refresh
  useEffect(() => {
    try {
      localStorage.setItem(
        "selectedCurrency",
        JSON.stringify(selectedCurrency),
      );
    } catch (e) {
      console.warn("Failed to save selectedCurrency to localStorage", e);
    }
  }, [selectedCurrency]);

  useEffect(() => {
    intervalSecRef.current = TIMEFRAME_TO_SECONDS[timeframeValue] ?? 60;
  }, [timeframeValue]);

  useEffect(() => {
    if (activeTab === "Alerts") {
      setIsWatchlistOpen(true);
    }
  }, [activeTab]);

  const [indicatorConfigs, setIndicatorConfigs] = useState({}); // keyed by instance id

  const [indicatorStyle, setIndicatorStyle] = useState(indicatorStyleDefault);
  const indicatorStyleRef = useRef(indicatorStyle);

  useEffect(() => {
    indicatorStyleRef.current = indicatorStyle;
  }, [indicatorStyle]);
  const isUp = liveOhlcv?.close >= liveOhlcv?.open;
  const valueColor = isUp ? "text-green-500" : "text-red-500";
  const hasPaneIndicators = selectedIndicator.some((ind) =>
    PANE_INDICATORS.has(typeof ind === "object" ? ind.type : ind),
  );

  const fetchStrategyMarkers = async () => {
  try {
    console.log("fetchStrategyMarkers: enter");
    console.log("fetchStrategyMarkers: seriesRef.current exists?", !!seriesRef.current);

    const symbol = selectedCurrencyRef.current?.name;
    console.log("fetchStrategyMarkers: active symbol:", symbol);
    if (!symbol) {
      console.log("fetchStrategyMarkers: no active symbol, aborting");
      return;
    }

    const apiSymbol = encodeURIComponent(symbol);
    console.log("fetchStrategyMarkers: requesting markers for:", apiSymbol);
    const response = await apiService.get(
      `/api/strategy/markers?symbol=BOSCHLTD&months=6`
    );
    console.log("strategy markers response:", response);

    if (!response?.success || !Array.isArray(response?.markers)) {
      console.warn("No markers returned");
      return;
    }

    // If API returned a symbol, ensure it matches the currently selected symbol.
    if (response.symbol) {
      const normalizeStr = (s) =>
        String(s || "").replace(/[^a-z0-9]/gi, "").toUpperCase();
      if (normalizeStr(response.symbol) !== normalizeStr(symbol)) {
        console.log(
          `Received markers for ${response.symbol} but active is ${symbol} — skipping`,
        );
        return;
      }
    }

    const markers = response.markers
      .map((marker) => ({
        // marker.datetimeUTC is in seconds (UTC) — align with candle times (which use IST_OFFSET)
        time: Number(marker.datetimeUTC) + IST_OFFSET,
        position: marker.type === "BUY" ? "belowBar" : "aboveBar",
        color: marker.type === "BUY" ? "#22ab94" : "#ef4444",
        shape: marker.type === "BUY" ? "arrowUp" : "arrowDown",
        text: marker.type,
        size: 2,
      }))
      .filter((m) => Number.isFinite(m.time));

    console.log("Strategy markers:", markers.length);

    if (!strategyMarkersRef.current) {
      strategyMarkersRef.current = createSeriesMarkers(
        seriesRef.current,
        markers
      );
    } else {
      strategyMarkersRef.current.setMarkers(markers);
    }
  } catch (error) {
    console.error("Failed to fetch strategy markers:", error);
  }
};

useEffect(() => {
  markersLoadedRef.current = false;

  if (strategyMarkersRef.current) {
    strategyMarkersRef.current.setMarkers([]);
  }
}, [selectedCurrency?.name]);

  useEffect(() => {
    if (!selectedIndicator.length) return;

    const isContextChange =
      prevTimeframeRef.current !== timeframeValue ||
      prevCurrencyRef.current !== selectedCurrency ||
      prevChartTypeRef.current !== chartType;

    let indicatorsToFetch = selectedIndicator;

    if (!isContextChange) {
      // ✅ Only fetch newly added instances
      indicatorsToFetch = selectedIndicator.filter(
        (ind) => !fetchedIndicatorsRef.current.has(ind.id),
      );

      if (indicatorsToFetch.length === 0) return;
    } else {
      // 🔥 Reset on timeframe / currency / chartType change
      fetchedIndicatorsRef.current.clear();

      // Clear existing indicator chart series
      selectedIndicator.forEach((ind) => {
        const { id } = ind;
        const entry = indicatorSeriesRef.current[id];
        if (!entry) return;

        const paneKey = id; // each instance has its own pane key
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
        delete indicatorSeriesRef.current[id];
        delete indicatorDataRef.current[id];
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

    indicatorsToFetch.forEach((ind) =>
      fetchedIndicatorsRef.current.add(ind.id),
    );

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
  // Instance ids look like "RSI_1747xxx_abc12" — extract base type for pane check
  const getBaseTypeFromId = (instanceId) => {
    const match = instanceId.match(/^([A-Z_]+?)_\d/);
    return match ? match[1] : instanceId;
  };

  const getPaneIndex = (indicator) => {
    const baseType = getBaseTypeFromId(indicator);
    // overlay indicators → always main pane
    if (!PANE_INDICATORS.has(baseType)) return 0;

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

    // ✅ Populate panesRef for sub-pane indicators using instanceId as key
    if (paneIndex !== 0) {
      const tryPopulate = () => {
        if (!chartRef.current) return;
        const panes = chartRef.current.panes();
        const paneObj = panes[paneIndex];
        if (paneObj) {
          const div = paneObj.getHTMLElement();
          if (div) {
            console.log(
              "💎 Populating panesRef for",
              indicator,
              "at index",
              paneIndex,
            );
            panesRef.current[indicator] = {
              chart: chartRef.current,
              pane: paneObj,
              div: div,
            };
            return true;
          }
        }
        return false;
      };

      if (!tryPopulate()) {
        setTimeout(tryPopulate, 100);
      }
    }

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

    // Each instance id is its own pane key — just check if still in use
    const stillUsed = Object.keys(indicatorSeriesRef.current).some(
      (key) => key === paneKey,
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

  //  ✅ INDICATOR REMOVAL — accepts instance id
  const removeIndicator = useCallback((instanceId) => {
    const entry = indicatorSeriesRef.current[instanceId];
    if (!entry) return;

    const paneKey = instanceId; // each instance has its own pane key
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

    delete indicatorSeriesRef.current[instanceId];
    delete latestIndicatorValuesRef.current[instanceId];
    fetchedIndicatorsRef.current.delete(instanceId);
    delete paneIndexRef.current[instanceId];

    cleanupPane(paneKey);

    setSelectedIndicator((prev) => prev.filter((i) => i.id !== instanceId));
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

  // kept for compatibility — ListingModal now directly calls setSelectedIndicator
  const toggleIndicator = useCallback((type) => {
    const id = `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newInst = { id, type };

    // Initialize instance-specific config from defaults
    setIndicatorConfigs((prev) => ({
      ...prev,
      [id]: { ...indicatorConfigDefault[type] },
    }));

    setSelectedIndicator((prev) => [...prev, newInst]);
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
    return selectedIndicator.map((ind) => {
      const { id, type } = ind;
      const Component = indicatorComponents[type];
      if (!Component) return null;

      const data = indicatorDataRef.current?.[id];

      // Scoped proxy: plot components write indicatorSeriesRef.current[type]
      // but we remap it to indicatorSeriesRef.current[id] so each instance is independent
      const scopedSeriesRef = {
        current: new Proxy(indicatorSeriesRef.current, {
          get(target, prop) {
            if (prop === type) return target[id];
            return target[prop];
          },
          set(target, prop, value) {
            if (prop === type) {
              target[id] = value;
            } else {
              target[prop] = value;
            }
            return true;
          },
        }),
      };

      // Scoped indicatorStyle: plot components read indicatorStyle[type] (e.g. indicatorStyle.RSI)
      // but we remap to the instance's id-keyed style so each instance is visually independent
      const scopedIndicatorStyle = new Proxy(indicatorStyle, {
        get(target, prop) {
          if (prop === type) {
            // instance-specific style takes priority; fall back to type default
            return target[id] ?? target[type];
          }
          return target[prop];
        },
      });

      // Scoped addSeries: routes pane creation under the instance id
      const scopedAddSeries = (indicatorKey, SeriesType, options = {}) => {
        return addSeries(id, SeriesType, options);
      };

      return (
        <Component
          key={id}
          id={id}
          result={data?.result}
          rows={data?.rows}
          indicatorStyle={scopedIndicatorStyle}
          indicatorSeriesRef={scopedSeriesRef}
          addSeries={scopedAddSeries}
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

  const normalize = (s) => s?.replace(/\s+/g, " ").trim().toUpperCase();

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
      const historicalPayload = {
        symbol: selectedCurrency?.name,
        interval: timeframeValue,
        // TIMEFRAME_TO_SECONDS[timeframeValue] === 86400
        //   ? "ONE_DAY"
        //   : TIMEFRAME_TO_SECONDS[timeframeValue] === 3600
        //     ? "ONE_HOUR"
        //     : TIMEFRAME_TO_SECONDS[timeframeValue] === 900
        //       ? "FIFTEEN_MINUTE"
        //       : TIMEFRAME_TO_SECONDS[timeframeValue] === 300
        //         ? "FIVE_MINUTE"
        //         : "ONE_MINUTE",
        fromDate: fromDate,
        toDate: toDate,
        // exchange: selectedCurrency?.segment || "NSE",
      };

      console.log("📬 getManualHistoricalData Payload:", historicalPayload);

      socket.emit("getManualHistoricalData", historicalPayload);
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
      console.log("HISTORICAL DATA RESPONSE", response?.data);

      if (!isMounted || !chartRef.current) return;

      // NOTE: don't remove the existing chart series until we've verified
      // the incoming response belongs to the currently selected symbol.

      // const raw = response?.data || [];
      // const symbolFromResponse = raw[0]?.symbol;

      // const data = raw
      //   .map((d) => ({
      //     time: Number(d.time) + IST_OFFSET,
      //     open: parseFloat(d.open),
      //     high: parseFloat(d.high),
      //     low: parseFloat(d.low),
      //     close: parseFloat(d.close),
      //     volume: parseFloat(d.volume || 0),
      //   }))
      //   .sort((a, b) => a.time - b.time); // ✅ Crucial sort like in Chart.jsx

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
        .sort((a, b) => a.time - b.time)
        // ✅ Remove duplicate timestamps — keep last occurrence
        .filter(
          (d, idx, arr) =>
            idx === arr.length - 1 || d.time !== arr[idx + 1].time,
        );

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

      // ONLY update chart if the symbol matches the currently selected currency
      if (
        symbolFromResponse !== selectedCurrency.name &&
        symbolFromResponse !== selectedCurrency.symbol
      ) {
        console.log(
          `Skipping chart update for ${symbolFromResponse} (Active: ${selectedCurrency.name})`,
        );
        return;
      }

      // Now it's safe: remove previous series and mark loading false
      setMainChartLoading(false);
      if (seriesRef.current) {
        try {
          chartRef.current.removeSeries(seriesRef.current);
        } catch {}
        seriesRef.current = null;
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
          // Plot markers after series is created and data is set
          fetchStrategyMarkers();
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
          // Plot markers after series is created and data is set
          fetchStrategyMarkers();
          // Plot markers after series is created and data is set
          fetchStrategyMarkers();
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
        if (last && actionButtonsRef.current) {
          const buyPrice =
            actionButtonsRef.current.querySelector("[data-buy-price]");
          const sellPrice =
            actionButtonsRef.current.querySelector("[data-sell-price]");
          const formattedClose = Number(last.close).toFixed(2);
          if (buyPrice) buyPrice.textContent = formattedClose;
          if (sellPrice) sellPrice.textContent = formattedClose;
        }

        chartRef.current?.timeScale().fitContent();
      }, 150);
    });

    socket.on("historicalDataError", (err) => {
      toast.error(err.message || "Failed to fetch historical data");
      console.error("❌ Historical data error:", err);
      if (isMounted) setMainChartLoading(false);
    });

    const handleChartLiveTick = (tickOrArray) => {
      const ticks = Array.isArray(tickOrArray) ? tickOrArray : [tickOrArray];

      ticks.forEach((tick) => {
        const activeSymbol = normalize(selectedCurrency?.name);
        const tickSymbol = normalize(tick.symbol);

        if (tickSymbol !== activeSymbol) return;
        if (!seriesRef.current) return;

        /* NORMALIZE TIME */
        let rawTickTime = tick?.data?.time;
        let tickTime = Number(rawTickTime);

        if (!Number.isFinite(tickTime)) {
          tickTime = Math.floor(new Date(rawTickTime).getTime() / 1000);
        }
        if (tickTime > 10000000000) tickTime = Math.floor(tickTime / 1000);
        if (!Number.isFinite(tickTime)) return;

        // Apply IST Offset if needed (19800s = 5.5h)
        const adjustedTime = tickTime + IST_OFFSET;
        const normalizedTime =
          Math.floor(adjustedTime / intervalSec) * intervalSec;

        if (!Number.isFinite(normalizedTime) || normalizedTime <= 0) return;

        /* PRICE */
        const price = Number(
          tick.data.close ?? tick.data.price ?? tick.data.ltp,
        );
        if (!Number.isFinite(price)) return;

        let updatedBar;
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

        // console.log(
        //   `[LiveTick] RawTime: ${rawTickTime}, Normalized: ${normalizedTime} (${new Date(normalizedTime * 1000).toLocaleTimeString()})`,
        // );

        currentCandleRef.current = updatedBar;
        const existingIndex = candlesRef.current.findIndex(
          (c) => c.time === updatedBar.time,
        );
        if (existingIndex >= 0) candlesRef.current[existingIndex] = updatedBar;
        else candlesRef.current.push(updatedBar);
        lastCandleTimeRef.current = normalizedTime;

        try {
          seriesRef.current.update(updatedBar);
        } catch (e) {
          console.warn("[LiveTick] Series update failed:", e.message);
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
          if (c) c.style.color = color;
        }

        if (actionButtonsRef.current) {
          const buyPrice =
            actionButtonsRef.current.querySelector("[data-buy-price]");
          const sellPrice =
            actionButtonsRef.current.querySelector("[data-sell-price]");
          const formattedClose = Number(updatedBar.close).toFixed(2);
          if (buyPrice) buyPrice.textContent = formattedClose;
          if (sellPrice) sellPrice.textContent = formattedClose;
        }

        /* LIVE INDICATORS — emit once per type per tick */
        const activeIndicators = selectedIndicatorRef.current;
        if (activeIndicators?.length > 0) {
          const sentTypes = new Set();
          activeIndicators.forEach((ind) => {
            const indType = typeof ind === "object" ? ind.type : ind;
            if (sentTypes.has(indType)) return;
            sentTypes.add(indType);
            socket.emit("getLiveIndicatorUpdate", {
              symbol: selectedCurrency?.name,
              interval: timeframeValue,
              type: indType,

              exchange: selectedCurrency?.segment,
            });
          });
        }
      });
    };

    const handleChartLiveIndicator = (payload) => {
      if (!payload?.success || !payload?.type) return;

      console.log(`[LiveIndicator] Payload:`, payload);

      const indicatorType = payload.type;
      const dataArray = payload.data;
      if (!Array.isArray(dataArray) || dataArray.length === 0) return;
      const lastPoint = dataArray[dataArray.length - 1];
      if (!lastPoint) return;

      const pointTime = Number(
        currentCandleRef.current?.time ?? lastPoint.time,
      );
      if (isNaN(pointTime)) return;

      selectedIndicatorRef.current.forEach((inst) => {
        const instType = typeof inst === "object" ? inst.type : inst;
        const instId = typeof inst === "object" ? inst.id : inst;
        if (instType !== indicatorType) return;
        const seriesGroup = indicatorSeriesRef.current?.[instId];
        if (!seriesGroup) return;

        const staticKeys = [
          "upper",
          "middle",
          "lower",
          "overboughtFill",
          "oversoldFill",
          "bandBackground",
        ];

        Object.entries(seriesGroup).forEach(([lineName, series]) => {
          if (lineName.startsWith("_")) return;
          if (!series || typeof series.update !== "function") return;

          let value;
          if (staticKeys.includes(lineName)) {
            const style =
              indicatorStyleRef.current?.[instId] ||
              indicatorStyleRef.current?.[instType];
            if (
              lineName === "upper" ||
              lineName === "overboughtFill" ||
              lineName === "bandBackground"
            ) {
              value = style?.upper?.value ?? 70;
            } else if (lineName === "middle") {
              value = style?.middle?.value ?? 50;
            } else if (lineName === "lower" || lineName === "oversoldFill") {
              value = style?.lower?.value ?? 30;
            }
          } else {
            value =
              lastPoint[lineName] ??
              lastPoint[lineName + "Band"] ??
              lastPoint.value ??
              lastPoint[indicatorType.toLowerCase()];
          }

          if (value == null || !Number.isFinite(Number(value))) return;

          try {
            series.update({ time: pointTime, value: Number(value) });
          } catch (e) {
            // Silent catch for 'oldest data' errors to prevent console spam when backend lags
            if (!e.message.includes("oldest data")) {
              console.warn(
                `Indicator update failed [${indicatorType}][${instId}]:`,
                e.message,
              );
            }
          }
        });
      });
    };

    socket.on("liveTick", handleChartLiveTick);
    socket.on("liveticks", handleChartLiveTick);
    socket.on("liveIndicatorResponse", handleChartLiveIndicator);

    socket.on("connect_error", (err) =>
      console.log("❌ SOCKET ERROR:", err.message),
    );

    // 🔥 Show loader immediately while waiting for socket data
    setMainChartLoading(true);

    return () => {
      isMounted = false;
      console.log("🧹 SOCKET CLEANUP");
      // ✅ Remove ALL listeners added in this effect to prevent stale handlers
      // from firing after symbol/timeframe changes (which caused chart to disappear)
      socket.off("connect", requestHistoricalData);
      socket.off("historicalDataResponse");
      socket.off("historicalDataError");
      socket.off("liveTick", handleChartLiveTick);
      socket.off("liveticks", handleChartLiveTick);
      socket.off("liveIndicatorResponse", handleChartLiveIndicator);
      socket.off("connect_error");
      socketRef.current = null;
    };
  }, [selectedCurrency?.name, timeframeValue, chartType, fromDate, toDate]);

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
      <Navbar setSelectedCurrency={setSelectedCurrency} />
      <section
        className="trading-view-wrapper overflow-hidden"
        style={{
          background: "var(--bg-primary)",
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
                <div
                  style={{
                    display: activeTab === "Alerts" ? "block" : "none",
                    height: "100%",
                  }}
                >
                  <LeftAlertListing
                    onClose={() => setIsWatchlistOpen(false)}
                    alertResult={customSignals}
                    setAlertResult={setCustomSignals}
                    setSelectedCurrency={setSelectedCurrency}
                    setActiveTab={setActiveTab}
                  />
                </div>
                <div
                  style={{
                    display:
                      activeTab !== "Alerts" && isWatchlistOpen
                        ? "block"
                        : "none",
                    height: "100%",
                  }}
                >
                  <LeftWatchlist
                    onClose={() => setIsWatchlistOpen(false)}
                    setSelectedCurrency={setSelectedCurrency}
                  />
                </div>
                <div
                  style={{
                    display:
                      activeTab !== "Alerts" && isDetailsOpen
                        ? "block"
                        : "none",
                    height: "100%",
                  }}
                >
                  <LeftDetail
                    onClose={() => setIsDetailsOpen(false)}
                    selectedCurrency={selectedCurrency}
                    detailsList={detailsList}
                    onAddStock={addStockToDetails}
                    onRemoveStock={removeStockFromDetails}
                    setSelectedCurrency={setSelectedCurrency}
                    addAlert={addAlert}
                    clearAllCoins={clearAllCoins}
                    scanner={scanner}
                    matchedCoins={matchedCoins}
                    removeCoin={removeCoin}
                    activeIndicators={selectedIndicator}
                    openScannerTrigger={openScannerTrigger}
                  />
                </div>
              </div>
            </div>

            {/* Main Chart Area */}
            <div
              style={{
                flex: 1,
                minWidth: 0, // important to prevent flex items from overflowing
                borderLeft:
                  isWatchlistOpen || isDetailsOpen
                    ? "1px solid var(--border-color)"
                    : "none",
                borderRight: "1px solid var(--border-color)",
                display: "flex",
                flexDirection: "column",
                height: "100%",
                transition: "border-color 0.3s ease",
              }}
            >
              <ChartTabs
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onCodeClick={() => setIsCodeEditorOpen((prev) => !prev)}
              />

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
                    onOpenScanner={() => {
                      // Open details panel, close watchlist
                      setIsDetailsOpen(true);
                      setIsWatchlistOpen(false);
                      if (activeTab === "Alerts") setActiveTab("Chart");
                      setOpenScannerTrigger((prev) => prev + 1);
                    }}
                  />
                </div>

                <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
                  <div
                    className="chart-and-panes-wrapper"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      flex: 1,
                      minWidth: 0,
                      overflow: "hidden",
                      position: "relative",
                    }}
                  >
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
                      {mainChartLoading || isDeploying ? (
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
                        className="position-absolute top-0 start-0"
                        style={{
                          zIndex: 10,
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                          padding: "8px",
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

                        <div className="d-flex align-items-center gap-2">
                          {/* Symbol + Timeframe */}
                          <span
                            style={{
                              fontSize: 13,
                              color: "var(--text-secondary)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {selectedCurrency?.name} : {timeframeValue}{" "}
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
                                background: isMarketOpen
                                  ? "#22c55e"
                                  : "#f87171",
                              }}
                            />
                            <span
                              style={{
                                display: "block",
                                width: 12,
                                height: 12,
                                borderRadius: "50%",
                                background: isMarketOpen
                                  ? "#22c55e"
                                  : "#f87171",
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
                                  color: "var(--text-primary)",
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
                                  <span
                                    style={{ color: "var(--text-secondary)" }}
                                  >
                                    O:{" "}
                                  </span>
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
                                  <span
                                    style={{ color: "var(--text-secondary)" }}
                                  >
                                    H:{" "}
                                  </span>
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
                                  <span
                                    style={{ color: "var(--text-secondary)" }}
                                  >
                                    L:{" "}
                                  </span>
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
                                  <span
                                    style={{ color: "var(--text-secondary)" }}
                                  >
                                    C:{" "}
                                  </span>
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

                        <div
                          style={{ display: "flex", gap: "10px" }}
                          ref={actionButtonsRef}
                        >
                          <Link
                            to="/dashboard"
                            state={{
                              stock: selectedCurrency?.name,
                              action: "BUY",
                            }}
                            style={{ textDecoration: "none" }}
                          >
                            <button
                              style={{
                                padding: "10px 20px",
                                border: "1px solid green",
                                background: "rgba(16, 185, 129, 0.15)",
                                color: "green",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontWeight: "600",
                              }}
                            >
                              Buy @<span data-buy-price>--</span>
                            </button>
                          </Link>

                          <Link
                            to="/dashboard"
                            state={{
                              stock: selectedCurrency?.name,
                              action: "SELL",
                            }}
                            style={{ textDecoration: "none" }}
                          >
                            <button
                              style={{
                                padding: "10px 20px",
                                border: "1px solid red",
                                background: "rgba(239, 68, 68, 0.15)",
                                color: "red",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontWeight: "600",
                              }}
                            >
                              Sell @<span data-sell-price>--</span>
                            </button>
                          </Link>
                        </div>
                      </div>

                      {/* -----------------INDICATOR BAR------------------- */}

                      {selectedIndicator?.length > 0 && (
                        <div
                          style={{
                            position: "absolute",
                            top: 90,
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
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      transition: color 0.15s;
    }
    .ind-btn:hover { color: var(--text-primary); }
  `}</style>

                          {selectedIndicator &&
                            selectedIndicator.map((ind) => {
                              const { id, type } = ind;
                              const value = liveIndicatorData[id];
                              return (
                                <div
                                  key={id}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 12,
                                    background: "var(--bg-secondary)",
                                    border: "1px solid var(--border-color)",
                                    color: "var(--text-primary)",
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
                                      color: "var(--text-secondary)",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 6,
                                    }}
                                  >
                                    <span
                                      style={{
                                        color: "var(--text-primary)",
                                        fontWeight: 500,
                                      }}
                                    >
                                      {type}
                                    </span>
                                    {" : "}
                                    {(() => {
                                      const cfg = {
                                        ...(indicatorConfigDefault[type] || {}),
                                        ...(indicatorConfigs?.[id] || {}),
                                      };
                                      const len =
                                        cfg.length ?? cfg.baseLen ?? "";
                                      const src = cfg.source ?? "";
                                      return `${len}${src ? " " + src : ""}`;
                                    })()}
                                    <span style={{ display: "flex", gap: 6 }}>
                                      {renderValue(type, value)}
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
                                        indicatorVisibility[id] === false
                                          ? "Show Indicator"
                                          : "Hide Indicator"
                                      }
                                      onClick={() =>
                                        toggleIndicatorVisibility(id)
                                      }
                                    >
                                      {indicatorVisibility[id] === false ? (
                                        <IoEyeOffOutline size={15} />
                                      ) : (
                                        <IoEyeOutline size={15} />
                                      )}
                                    </button>

                                    <button
                                      className="ind-btn"
                                      title="Indicator Settings"
                                      onClick={() => {
                                        setActiveBarIndicator({ id, type });
                                        setIndicatorProperty((prev) => !prev);
                                      }}
                                    >
                                      <IoSettingsOutline size={15} />
                                    </button>

                                    <button
                                      className="ind-btn"
                                      title="Source Code"
                                      onClick={() => {
                                        setActiveSourceIndicator(type);
                                        setShowSourcePanel(true);
                                      }}
                                    >
                                      <FaCode size={15} />
                                    </button>

                                    <button
                                      className="ind-btn"
                                      title="Remove"
                                      onClick={() => removeIndicator(id)}
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

                    {/* ZOOM OVERLAY */}
                    <div className="chart-zoom-overlay">
                      <style>{`
                    .chart-and-panes-wrapper .chart-zoom-overlay {
                       opacity: 0;
                       visibility: hidden;
                       transition: all 0.2s ease;
                    }
                    .chart-and-panes-wrapper:hover .chart-zoom-overlay {
                       opacity: 1;
                       visibility: visible;
                    }
                    .chart-zoom-overlay {
                       position: absolute;
                       bottom: 24px;
                       left: 50%;
                       transform: translateX(-50%);
                       z-index: 50;
                       display: flex;
                       align-items: center;
                       gap: 8px;
                       padding: 6px 10px;
                       background: var(--bg-secondary); opacity: 0.9;
                       backdrop-filter: blur(4px);
                       border-radius: 8px;
                       border: 1px solid var(--border-color);
                    }
                    .chart-zoom-overlay .zoom-btn {
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      width: 32px;
                      height: 32px;
                      border-radius: 6px;
                      border: none;
                      background: transparent;
                      color: var(--text-primary);
                      cursor: pointer;
                      transition: all 0.15s ease;
                    }
                    .chart-zoom-overlay .zoom-btn:hover {
                      background: var(--border-color);
                      color: var(--text-primary);
                    }
                    .chart-zoom-overlay .zoom-btn:active {
                      transform: scale(0.95);
                    }
                    .chart-zoom-overlay .zoom-divider {
                      width: 1px;
                      height: 18px;
                      background: var(--border-color);
                    }
                  `}</style>
                      <button
                        onClick={zoomOut}
                        title="Zoom out"
                        className="zoom-btn"
                      >
                        <LuCircleMinus size={18} />
                      </button>
                      <div className="zoom-divider" />
                      <button
                        onClick={resetZoom}
                        title="Reset zoom"
                        className="zoom-btn"
                      >
                        <RiResetRightLine size={18} />
                      </button>
                      <div className="zoom-divider" />
                      <button
                        onClick={zoomIn}
                        title="Zoom in"
                        className="zoom-btn"
                      >
                        <LuCirclePlus size={18} />
                      </button>
                    </div>
                  </div>

                  {/* CODE EDITOR SIDE PANEL */}
                  {isCodeEditorOpen && (
                    <CodeEditorPanel
                      onClose={() => setIsCodeEditorOpen(false)}
                      onDeploy={handleDeployCode}
                      onClear={handleClearCode}
                      onEdit={() => setIsDeployed(false)}
                      editorCode={editorCode}
                      setEditorCode={setEditorCode}
                      isDeployed={isDeployed}
                    />
                  )}
                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  borderLeft: isWatchlistOpen
                    ? "1px solid var(--border-color)"
                    : "none",
                  borderRight: "1px solid var(--border-color)",
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
                  borderLeft: isWatchlistOpen
                    ? "1px solid var(--border-color)"
                    : "none",
                  borderRight: "1px solid var(--border-color)",
                  display: activeTab === "Option Chain" ? "flex" : "none",
                  flexDirection: "column",
                  height: "100%",
                }}
              >
                <OptionChain
                  onSymbolChange={useCallback((sym) => {
                    setSelectedCurrency((prev) => {
                      if (prev?.name !== sym) {
                        return { ...prev, name: sym, symbol: sym };
                      }
                      return prev;
                    });
                  }, [])}
                />
              </div>

              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  borderLeft: isWatchlistOpen
                    ? "1px solid var(--border-color)"
                    : "none",
                  borderRight: "1px solid var(--border-color)",
                  display: activeTab === "OI Analytics" ? "flex" : "none",
                  flexDirection: "column",
                  height: "100%",
                  overflow: "hidden",
                }}
              >
                {activeTab === "OI Analytics" && (
                  <OIAnalytics
                    key={selectedCurrency?.name}
                    selectedCurrency={selectedCurrency}
                  />
                )}
              </div>
            </div>

            {/* Right Sidebar */}
            <div style={{ width: "70px", height: "100%", flexShrink: 0 }}>
              <RightSidebar
                isWatchlistOpen={activeTab !== "Alerts" && isWatchlistOpen}
                toggleWatchlist={() => {
                  const willOpen =
                    activeTab === "Alerts" ? true : !isWatchlistOpen;
                  if (activeTab === "Alerts") setActiveTab("Chart");
                  setIsWatchlistOpen(willOpen);
                  if (willOpen) setIsDetailsOpen(false); // close others
                }}
                isDetailsOpen={isDetailsOpen}
                toggleDetails={() => {
                  const willOpen = !isDetailsOpen;
                  setIsDetailsOpen(willOpen);
                  if (willOpen) {
                    setIsWatchlistOpen(false); // close others
                    if (activeTab === "Alerts") setActiveTab("Chart");
                  }
                }}
                isAlertsOpen={activeTab === "Alerts"}
                toggleAlerts={() => {
                  if (activeTab === "Alerts") {
                    setActiveTab("Chart");
                  } else {
                    setActiveTab("Alerts");
                    // Close left panels when alerts opens
                    setIsWatchlistOpen(false);
                    setIsDetailsOpen(false);
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
        setIndicatorLoading={setIndicatorLoading}
      />
    </>
  );
}
