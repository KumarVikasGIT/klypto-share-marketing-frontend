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
import { createPortal } from "react-dom";
import { LuCirclePlus, LuCircleMinus } from "react-icons/lu";
import { RiResetRightLine } from "react-icons/ri";
import { useEffect, useRef, useState, useCallback } from "react";
import ChartHeader from "../components/tradingModals/ChartHeader";
import Navbar from "../components/layout/Navbar";
import LeftWatchlist from "../components/layout/LeftWatchlist";
import RightSidebar from "../components/layout/RightSidebar";
import ChartTabs from "../components/layout/ChartTabs";
import LeftDepth from "../components/layout/LeftDepth";
import useSocket from "../util/useSocket";
import EVENTS from "../services/websocket/socketEvent";
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
import { getStrategySocket } from "../services/websocket/socket";
import { toast } from "react-toastify";
import useAlerts from "../util/useAlerts";
import CodeEditorPanel from "../components/layout/CodeEditorPanel";
import OIAnalytics from "../components/tradingModals/OIAnalytics";
import Swal from "sweetalert2";
import apiService from "../services/apiServices";
import useDrawingTools from "../util/useDrawingTools";
import DrawingToolbar from "../components/tradingModals/DrawingToolbar";
import DrawingToolbox from "../components/tradingModals/DrawingToolbox";

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
  const lastDeployedMarkersRef = useRef(null);
  const scannerIntervalRef = useRef(null);
  const pyodideRef = useRef(null);
  const [isDeployed, setIsDeployed] = useState(false);
  const [isPyodideReady, setIsPyodideReady] = useState(false);

  const normalize = (s) => s?.replace(/\s+/g, " ").trim().toUpperCase();
  const isSameSymbolName = (s1, s2) => {
    if (!s1 || !s2) return false;
    const n1 = normalize(s1).split("-")[0];
    const n2 = normalize(s2).split("-")[0];
    return n1 === n2;
  };

  const isSameSymbol = (a, b) =>
    a?.symbol === b?.symbol && a?.token === b?.token;

  const { matchedCoins, addAlert, clearAllCoins, scanner, removeCoin } =
    useAlerts();

  const [isWatchlistOpen, setIsWatchlistOpen] = useState(true);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [predictionStatus, setPredictionStatus] = useState(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [isDepthOpen, setIsDepthOpen] = useState(false);
  const [predictResultData, setPredictResultData] = useState([]);
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
      name: "TCS",
      token: "11536",
      segment: "NSE",
      exchange: "NSE",
    };
  });

  const { 
    activeTool, 
    setActiveTool, 
    clearAllDrawings, 
    selectedLine, 
    toolboxPos, 
    updateLine,
    deleteLine, 
    closeToolbox,
    onDragLine,
    getAnchorY
  } = useDrawingTools({
    chartRef,
    seriesRef,
    containerRef,
    symbol: selectedCurrency?.symbol || selectedCurrency?.name,
    interval: timeframeValue,
  });

  const [activePropertyDialog, setActivePropertyDialog] = useState(null);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 7);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedIndicator, setSelectedIndicator] = useState([]);
  const [rangeValue, setRangeValue] = useState("1000");
  const [chartType, setChartType] = useState("candlestick");
  const [isMarketOpen, setIsMarketOpen] = useState(false);
  const [liveOhlcv, setLiveOhlcv] = useState({});
  const [liveIndicatorData, setLiveIndicatorData] = useState({});
  const [isCodeEditorOpen, setIsCodeEditorOpen] = useState(false);
  const [mainChartLoading, setMainChartLoading] = useState(false);
  const [symbolTransitioning, setSymbolTransitioning] = useState(false);
  const symbolTransitioningRef = useRef(false);
  const [noDataAvailable, setNoDataAvailable] = useState(false);
  const [editorCode, setEditorCode] = useState(
    `markers = []
# user strategy here
plot_markers(markers)`,
  );
  const [openScannerTrigger, setOpenScannerTrigger] = useState(0);
  const [customSignals, setCustomSignals] = useState([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [scannerProgressData, setScannerProgressData] = useState(null);
  const [dashboardSignals, setDashboardSignals] = useState([]);
  const [deployedStrategyCode, setDeployedStrategyCode] = useState(null);

  const handleStrategyClick = () => {
    setIsPredicting(true);
    setIsDepthOpen(true);
    setIsWatchlistOpen(false);
    setIsDetailsOpen(false);
    if (activeTab === "Alerts") setActiveTab("Chart");
    
    setPredictResultData([]);
    setPredictionStatus(null);
  };

  //code editor
  useEffect(() => {
    // Load Pyodide WebAssembly script dynamically
    if (window.loadPyodide) {
      if (!pyodideRef.current) {
        window
          .loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/",
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
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/",
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
    // Cleanup interval on unmount
    return () => {
      if (scannerIntervalRef.current) {
        clearInterval(scannerIntervalRef.current);
      }
    };
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
    lastDeployedMarkersRef.current = null;

    if (scannerIntervalRef.current) {
      clearInterval(scannerIntervalRef.current);
      scannerIntervalRef.current = null;
    }

    setCustomSignals([]);
    setDashboardSignals([]);
    setDeployedStrategyCode(null);
    setIsDeployed(false);
  }, []);

  // 1. Initial Dashboard Fetch (Replaces Polling)
  useEffect(() => {
    if (
      !isDeployed ||
      !deployedStrategyCode ||
      deployedStrategyCode === "API_PREDICTION"
    ) {
      return;
    }

    const fetchDashboard = async () => {
      try {
        const resp = await apiService.get(`/api/strategy/scanner-dashboard`);
        const data = Array.isArray(resp)
          ? resp
          : resp?.data?.data || resp?.data || [];
        setDashboardSignals(data);
      } catch (err) {
        console.error("Failed to fetch dashboard signals:", err);
      }
    };

    // Fetch immediately on deploy to show existing dashboard results
    fetchDashboard();
  }, [isDeployed, deployedStrategyCode]);

  // Dedicated Strategy Socket Handlers
  const signalBufferRef = useRef([]);
  const deploymentSignalsRef = useRef([]);

  // Flush buffer to state every 500ms to avoid freezing the UI on mass updates
  useEffect(() => {
    const flushInterval = setInterval(() => {
      if (signalBufferRef.current?.length > 0) {
        const newSignals = [...signalBufferRef.current];
        signalBufferRef.current = []; // Clear immediately

        setDashboardSignals((prev) => [...prev, ...newSignals]);
      }
    }, 500);

    return () => clearInterval(flushInterval);
  }, []);

  useEffect(() => {
    const strategySocket = getStrategySocket();

    const handleScannerProgress = (data) => {
      try {
        console.log(
          `[STRATEGY SOCKET] ${EVENTS.STRATEGY.PROGRESS} Payload:`,
          data,
        );
        setScannerProgressData(data);
        let percentage =
          data.total > 0 ? ((data.processed / data.total) * 100).toFixed(1) : 0;
        toast.update("compiling", {
          render: `Scanning... ${percentage}% completed. Current: ${data.current_stock || "..."}`,
          type: "info",
          isLoading: true,
        });
      } catch (err) {
        console.error(`[STRATEGY SOCKET ERROR] PROGRESS handler failed:`, err);
      }
    };

    const handleScannerComplete = (response) => {
      try {
        console.log(
          `[STRATEGY SOCKET] ${EVENTS.STRATEGY.COMPLETE} Payload:`,
          response,
        );
        toast.dismiss("compiling");
        toast.success(
          response?.message ||
            "Scanner triggered successfully! Waiting for results...",
        );
        setIsDeploying(false);
        console.log(
          "Scanner Execution Complete. All Signals:",
          deploymentSignalsRef.current,
        );
      } catch (err) {
        console.error(`[STRATEGY SOCKET ERROR] COMPLETE handler failed:`, err);
      }
    };

    const handleNewScannerSignal = (signalData) => {
      try {
        console.log(
          `[STRATEGY SOCKET] ${EVENTS.STRATEGY.NEW_SIGNAL} Payload:`,
          signalData,
        );
        signalBufferRef.current.push(signalData);
        deploymentSignalsRef.current.push(signalData);
      } catch (err) {
        console.error(
          `[STRATEGY SOCKET ERROR] NEW_SIGNAL handler failed:`,
          err,
        );
      }
    };

    const handleScannerError = (errPayload) => {
      try {
        console.error(
          `[STRATEGY SOCKET] ${EVENTS.STRATEGY.ERROR} Payload:`,
          errPayload,
        );
        toast.warn(
          `Error on ${errPayload?.symbol || "Unknown"}: ${errPayload?.error || "Scanning failed"}`,
          {
            autoClose: 3000,
            position: "top-right",
          },
        );
        setIsDeploying(false);
        toast.dismiss("compiling");
      } catch (err) {
        console.error(`[STRATEGY SOCKET ERROR] ERROR handler failed:`, err);
      }
    };

    const handleAiPredictionStatus = (data) => {
      console.log(`[STRATEGY SOCKET] ${EVENTS.STRATEGY.AI_PREDICTION_STATUS}:`, data);
      
      setPredictionStatus(data);
      if (data.status === "running") {
        setIsPredicting(true);
        setIsDepthOpen(true);
      } else if (data.status === "done") {
        setIsPredicting(false);
        // Optional: Add a toast notification here
      }
    };

    const handleAiTradeSignal = (tradeData) => {
      console.log(`[STRATEGY SOCKET] ${EVENTS.STRATEGY.AI_TRADE_SIGNAL}:`, tradeData);
      // Ensure Results pane is open
      setIsDepthOpen(true);

      const mappedSignal = {
        symbol: tradeData.symbol,
        response: {
          type: tradeData.trade_type,
          entry_time: tradeData.entry_time,
          entry_price: tradeData.entry_price,
          signal: tradeData.signal,
        },
        tick: {
          datetime: tradeData.entry_time,
        }
      };

      setPredictResultData((prev) => [mappedSignal, ...prev]);

      // Add to dashboardSignals so it plots on the chart
      let timeStr = tradeData.entry_time || tradeData.timestamp || new Date().toISOString();
      timeStr = timeStr.replace(" ", "T");
      setDashboardSignals((prev) => [
        ...prev,
        {
          symbol: tradeData.symbol,
          signalType: tradeData.trade_type,
          timestamp: timeStr,
          segment: "SCRIPT",
        }
      ]);
      
      setIsDeployed(true);
      setDeployedStrategyCode("API_PREDICTION");
      
      // Optional: play notification sound
      // playNotificationSound();
    };

    strategySocket.onAny((eventName, ...args) => {
      // console.log(`[STRATEGY SOCKET] ${eventName}:`, args);
    });
    
    strategySocket.on(EVENTS.STRATEGY.PROGRESS, handleScannerProgress);
    strategySocket.on(EVENTS.STRATEGY.COMPLETE, handleScannerComplete);
    strategySocket.on(EVENTS.STRATEGY.NEW_SIGNAL, handleNewScannerSignal);
    strategySocket.on(EVENTS.STRATEGY.ERROR, handleScannerError);
    strategySocket.on(EVENTS.STRATEGY.AI_PREDICTION_STATUS, handleAiPredictionStatus);
    strategySocket.on(EVENTS.STRATEGY.AI_TRADE_SIGNAL, handleAiTradeSignal);

    return () => {
      strategySocket.offAny();
      strategySocket.off(EVENTS.STRATEGY.PROGRESS, handleScannerProgress);
      strategySocket.off(EVENTS.STRATEGY.COMPLETE, handleScannerComplete);
      strategySocket.off(EVENTS.STRATEGY.NEW_SIGNAL, handleNewScannerSignal);
      strategySocket.off(EVENTS.STRATEGY.ERROR, handleScannerError);
      strategySocket.off(EVENTS.STRATEGY.AI_PREDICTION_STATUS, handleAiPredictionStatus);
      strategySocket.off(EVENTS.STRATEGY.AI_TRADE_SIGNAL, handleAiTradeSignal);
    };
  }, []);

  // 2. Reactive Plotting Effect
  useEffect(() => {
    if (!isDeployed) return;

    const markersToSet = [];
    const newSignals = [];

    if (dashboardSignals && dashboardSignals.length > 0) {
      console.log("Processing dashboardSignals for markers:", dashboardSignals);
      console.log("Currently selected stock:", selectedCurrency);

      dashboardSignals.forEach((item) => {
        let type = item.signalType || item.response?.type;
        if (!type) {
          type = "BUY";
        }
        let utcStr =
          item.timestamp ||
          item.createdAt ||
          item.updatedAt ||
          item.tick?.datetime ||
          item.response?.entry_time;
        if (utcStr && typeof utcStr === "string") {
          utcStr = utcStr.replace(" ", "T");
        }

        if (utcStr && type) {
          const isBuy =
            type.toUpperCase() === "BUY" || type.toUpperCase() === "CALL";

          // Use unix_timestamp if available, else convert ISO
          let utcTime;
          if (item.unix_timestamp) {
            utcTime = Number(item.unix_timestamp);
          } else {
            utcTime = Math.floor(new Date(utcStr).getTime() / 1000);
          }
          const chartTime = Number(utcTime) + 19800; // IST_OFFSET

          // Only plot marker if the signal is for the CURRENTLY selected stock
          const isCurrentStock =
            isSameSymbolName(item.symbol, selectedCurrency?.name) ||
            isSameSymbolName(item.symbol, selectedCurrency?.symbol);

          if (isCurrentStock) {
            markersToSet.push({
              time: chartTime,
              position: isBuy ? "belowBar" : "aboveBar",
              color: isBuy ? "#22c55e" : "#ef4444",
              shape: isBuy ? "arrowUp" : "arrowDown",
              text: type.toUpperCase(),
              size: 1,
            });
          } else {
            console.log(
              // `Skipped marker for ${item.symbol}: doesn't match selected ${selectedCurrency?.name} or ${selectedCurrency?.symbol}`,
            );
          }

          newSignals.unshift({
            symbol: item.symbol || selectedCurrency?.name || "STOCK",
            name: item.symbol || selectedCurrency?.name || "STOCK",
            token: item.symbol,
            signalType: type.toUpperCase(),
            timestamp: new Date(utcStr).toLocaleString(),
            segment: "SCRIPT",
          });
        }
      });
      markersToSet.sort((a, b) => a.time - b.time);
      console.log("Final markersToSet to plot on chart:", markersToSet);

      // Auto-open Alerts panel if we have signals
      if (newSignals?.length > 0 && deployedStrategyCode !== "API_PREDICTION") {
        if (typeof setActiveTab === "function") {
          setActiveTab("Alerts");
        }
      }
    }

    lastDeployedMarkersRef.current = markersToSet;

    if (markersToSet?.length > 0 && seriesRef.current) {
      if (!customScriptMarkersRef.current) {
        customScriptMarkersRef.current = createSeriesMarkers(
          seriesRef.current,
          markersToSet,
        );
        seriesRef.current.attachPrimitive(customScriptMarkersRef.current);
      } else {
        customScriptMarkersRef.current.setMarkers(markersToSet);
      }
    } else if (customScriptMarkersRef.current) {
      customScriptMarkersRef.current.setMarkers([]);
    }

    setCustomSignals(newSignals);
  }, [dashboardSignals, isDeployed, selectedCurrency]);

  const handleDeployCode = useCallback(
    async (code) => {
      if (!chartRef.current) return;

      // 1. Clear previous
      handleClearCode();
      deploymentSignalsRef.current = [];

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

      // Detect if user has only left the default boilerplate template with no real logic
      const BOILERPLATE_LINES = new Set([
        "markers = []",
        "# user strategy here",
        "plot_markers(markers)",
      ]);
      const meaningfulLines = code
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !BOILERPLATE_LINES.has(l));

      if (meaningfulLines.length === 0) {
        Swal.fire({
          icon: "warning",
          title: "No Strategy Found",
          text: "Please write your strategy logic before deploying. The editor only contains the default template.",
          background: "var(--bg-secondary)",
          color: "var(--text-primary)",
        });
        return;
      }

      // Require that the strategy actually references financial data variables.
      // A strategy with only print() / comments isn't a valid signal generator.
      const STRATEGY_VARIABLES = /\b(close|open|high|low|volume|df)\b/;
      const hasStrategyLogic = meaningfulLines.some((l) =>
        STRATEGY_VARIABLES.test(l),
      );
      if (!hasStrategyLogic) {
        Swal.fire({
          icon: "warning",
          title: "No Strategy Logic Detected",
          text: "Your code must use at least one market data variable (close, open, high, low, volume, or df) to generate signals.",
          background: "var(--bg-secondary)",
          color: "var(--text-primary)",
        });
        return;
      }

      setIsDeploying(true);
      setScannerProgressData(null);

      // 1.2 Basic Frontend Security Check (Warning: This is NOT a substitute for backend sandboxing)
      const dangerousPatterns = [
        /\beval\s*\(/,
        /\bexec\s*\(/,
        /\b__import__\s*\(/,
        /\bopen\s*\(/,
        /import\s+os\b/,
        /import\s+subprocess\b/,
        /import\s+sys\b/,
        /from\s+os\b/,
        /from\s+subprocess\b/,
      ];

      for (let pattern of dangerousPatterns) {
        if (pattern.test(code)) {
          Swal.fire({
            icon: "error",
            title: "Security Violation",
            text: "Your code contains restricted keywords or functions (e.g., eval, exec, os).",
            background: "var(--bg-secondary)",
            color: "var(--text-primary)",
          });
          setIsDeploying(false);
          return;
        }
      }

      // 1.5 Validate Python Syntax on Frontend before API Call
      if (!pyodideRef.current) {
        Swal.fire({
          icon: "warning",
          title: "Engine Loading",
          text: "The Python validation engine is still loading. Please wait a moment before deploying.",
          background: "var(--bg-secondary)",
          color: "var(--text-primary)",
        });
        setIsDeploying(false);
        return;
      }

      try {
        const sanitizedCode = code.replace(/\u00A0/g, " ");
        pyodideRef.current.globals.set("__code_to_validate", sanitizedCode);
        const resultJson = await pyodideRef.current.runPythonAsync(`
import ast
import json
import sys
import traceback

result = { "success": True, "error_type": None, "error_message": None, "output": "", "markers": [] }

try:
    ast.parse(__code_to_validate)
except SyntaxError as e:
    result["success"] = False
    result["error_type"] = "SyntaxError"
    exc_type, exc_value, exc_traceback = sys.exc_info()
    tb_lines = traceback.format_exception(exc_type, exc_value, exc_traceback)
    result["error_message"] = "".join(tb_lines).strip()

json.dumps(result)
        `);

        const result = JSON.parse(resultJson);
        const capturedOutput = result.output;

        if (capturedOutput && capturedOutput.trim() !== "") {
          Swal.fire({
            toast: true,
            position: "bottom-end",
            icon: "info",
            title: "Console Output",
            html: `<pre style="text-align: left; background: var(--bg-primary); padding: 5px; border-radius: 5px; color: var(--text-primary); max-height: 200px; overflow-y: auto;">${capturedOutput}</pre>`,
            showConfirmButton: false,
            timer: 5000,
            background: "var(--bg-secondary)",
            color: "var(--text-primary)",
          });
        }

        if (!result.success) {
          Swal.fire({
            icon: "error",
            title: `Execution Error (${result.error_type})`,
            text: result.error_message,
            background: "var(--bg-secondary)",
            color: "var(--text-primary)",
          });
          setIsDeploying(false);
          return;
        }

        const markersList = result.markers || [];
        const isStructurallyValid = markersList.every(
          (m) =>
            typeof m === "object" &&
            m !== null &&
            "time" in m &&
            "text" in m &&
            "position" in m,
        );

        if (markersList?.length > 0 && !isStructurallyValid) {
          Swal.fire({
            icon: "warning",
            title: "Invalid Markers",
            text: "Your strategy ran successfully, but the markers generated were invalid. Ensure you append valid dictionaries containing 'time', 'text', and 'position'.",
            background: "var(--bg-secondary)",
            color: "var(--text-primary)",
          });
          setIsDeploying(false);
          return;
        }
      } catch (err) {
        console.error("Syntax Validation Error:", err);
        const lines = err.message ? err.message.split("\n") : [];
        // Extract the last few lines which contain the actual SyntaxError
        const shortError =
          lines.slice(-4).join("\n").trim() || "Invalid Python syntax.";

        Swal.fire({
          icon: "error",
          title: "Syntax Error",
          text: shortError,
          background: "var(--bg-secondary)",
          color: "var(--text-primary)",
        });
        setIsDeploying(false);
        return;
      }

      try {
        const closes = candlesRef?.current?.map((c) => c.close) || [];
        if (closes?.length < 4) {
          Swal.fire({
            icon: "warning",
            title: "Insufficient Data",
            text: "Not enough candle data to plot indicator.",
            background: "var(--bg-secondary)",
            color: "var(--text-primary)",
          });
          return;
        }

        toast.info("Evaluating Python script...", {
          autoClose: 2000,
          toastId: "compiling",
        });

        // Close Code Editor if open
        if (typeof setIsCodeEditorOpen === "function") {
          setIsCodeEditorOpen(false);
        }

        const payload = {
          strategy_code: `${code}`,
          use_historical_only: !isMarketOpen,
        };
        const localUser = JSON.parse(localStorage.getItem("session") || "{}");
        const userId = localUser?.user?.id || localUser?.user?._id || "123";

        console.log("🚀 [API] Triggering run-scanner API...");
        console.log("📦 [API] Payload:", payload);
        console.log("👤 Active User ID (from auth):", userId);

        // Guard: do not call the API if code is effectively empty
        if (!code || !code.trim()) {
          setIsDeploying(false);
          return;
        }

        const response = await apiService.post(
          `/api/strategy/run-scanner`,
          payload,
        );

        // Decoupled: We don't fetch and plot here anymore. The useEffect handles it.
        setDeployedStrategyCode(code);
        setIsDeployed(true);
      } catch (err) {
        console.error("Python Execution Error:", err);
        Swal.fire({
          icon: "error",
          title: "Python Execution Error",
          text: err?.message || "An error occurred",
          background: "var(--bg-secondary)",
          color: "var(--text-primary)",
        });
        setIsDeploying(false);
      }
    },
    [handleClearCode, selectedCurrency, timeframeValue],
  );

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

    // Update every 5 minute
    const interval = setInterval(checkMarketStatus, 300000);

    return () => clearInterval(interval);
  }, []);

  // Update fromDate dynamically to optimize load times when timeframe changes
  useEffect(() => {
    const d = new Date();
    if (["1m", "3m", "5m"].includes(timeframeValue)) {
      d.setDate(d.getDate() - 90); // 3 months for 1m-5m
    } else if (["15m", "30m"].includes(timeframeValue)) {
      d.setDate(d.getDate() - 120); // 4 months for 15m-30m
    } else if (
      ["1h", "2h", "4h", "60m", "120m", "240m"].includes(timeframeValue)
    ) {
      d.setDate(d.getDate() - 365); // 1 year for hourly
    } else {
      d.setFullYear(d.getFullYear() - 5); // 5 years for daily/weekly
    }
    setFromDate(d.toISOString().split("T")[0]);
  }, [timeframeValue]);

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
  // eslint-disable-next-line no-unused-expressions
  void indicatorUpdateTrigger; // keep this — forces re-eval when data arrives (ref reads don't re-render)
  const hasPaneIndicators = selectedIndicator.some(
    (ind) =>
      PANE_INDICATORS.has(typeof ind === "object" ? ind.type : ind) &&
      indicatorDataRef.current?.[typeof ind === "object" ? ind.id : ind] !==
        undefined,
  );

  const fetchStrategyMarkers = async () => {
    try {
      console.log("fetchStrategyMarkers: enter");
      console.log(
        "fetchStrategyMarkers: seriesRef.current exists?",
        !!seriesRef.current,
      );

      const symbol = selectedCurrencyRef.current?.name;
      console.log("fetchStrategyMarkers: active symbol:", symbol);
      if (!symbol) {
        console.log("fetchStrategyMarkers: no active symbol, aborting");
        return;
      }

      const apiSymbol = encodeURIComponent(symbol);
      console.log("fetchStrategyMarkers: requesting markers for:", apiSymbol);
      const response = await apiService.get(
        `/api/strategy/markers?symbol=BOSCHLTD&months=6`,
      );
      console.log("strategy markers response:", response);

      if (!response?.success || !Array.isArray(response?.markers)) {
        console.warn("No markers returned");
        return;
      }

      // If API returned a symbol, ensure it matches the currently selected symbol.
      if (response.symbol) {
        const normalizeStr = (s) =>
          String(s || "")
            .replace(/[^a-z0-9]/gi, "")
            .toUpperCase();
        if (normalizeStr(response.symbol) !== normalizeStr(symbol)) {
          console.log(
            `Received markers for ${response.symbol} but active is ${symbol} — skipping`,
          );
          return;
        }
      }

      const markers = response?.markers
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

      console.log("Strategy markers:", markers?.length);

      if (!strategyMarkersRef.current) {
        strategyMarkersRef.current = createSeriesMarkers(
          seriesRef.current,
          markers,
        );
        seriesRef.current.attachPrimitive(strategyMarkersRef.current);
      } else {
        strategyMarkersRef?.current.setMarkers(markers);
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
    if (!selectedIndicator?.length) return;

    const isContextChange =
      prevTimeframeRef.current !== timeframeValue ||
      prevCurrencyRef.current !== selectedCurrency?.name ||
      prevChartTypeRef.current !== chartType;

    let indicatorsToFetch = selectedIndicator;

    if (!isContextChange) {
      // ✅ Only fetch newly added instances
      indicatorsToFetch = selectedIndicator.filter(
        (ind) => !fetchedIndicatorsRef.current.has(ind.id),
      );

      if (indicatorsToFetch?.length === 0) return;
    } else {
      // 🔥 Reset on timeframe / currency / chartType change
      fetchedIndicatorsRef.current.clear();
      // We purposefully DO NOT clear indicatorSeriesRef or indicatorDataRef here.
      // They will be overwritten with new data once the fetch completes,
      // avoiding a visual glitch where indicators disappear during loading or disconnects.
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
    prevCurrencyRef.current = selectedCurrency?.name;
    prevChartTypeRef.current = chartType;
    // NOTE: fromDate and toDate are intentionally excluded — they affect candle data,
    // not indicator fetching. Including them caused an infinite loop when GoToDate
    // updated fromDate, which re-triggered this effect and set state repeatedly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndicator, selectedCurrency?.name, timeframeValue, chartType]);

  const toggleIndicatorVisibility = (indicator) => {
    const currentVisible = indicatorVisibility[indicator] ?? true;
    const newVisibility = !currentVisible;
    const seriesGroup = indicatorSeriesRef.current?.[indicator];
    if (seriesGroup) {
      if (typeof seriesGroup.applyOptions === "function") {
        seriesGroup.applyOptions({ visible: newVisibility });
      } else {
        Object.values(seriesGroup).forEach((series) => {
          if (series?.applyOptions) {
            series.applyOptions({ visible: newVisibility });
          }
        });
        if (seriesGroup._priceLines) {
          Object.values(seriesGroup._priceLines).forEach((line) => {
            if (line?.applyOptions) {
              line.applyOptions({ visible: newVisibility });
            }
          });
        }
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
    const match = instanceId.match(/^([A-Z0-9_]+?)_\d/);
    return match ? match[1] : instanceId;
  };

  const getPaneIndex = (indicator) => {
    const baseType = getBaseTypeFromId(indicator);
    // overlay indicators → always main pane
    if (!PANE_INDICATORS.has(baseType)) return 0;

    if (paneIndexRef.current[indicator] !== undefined) {
      return paneIndexRef.current[indicator];
    }

    const nextPane = Object.keys(paneIndexRef.current)?.length + 1;
    paneIndexRef.current[indicator] = nextPane;

    return nextPane;
  };

  const closeAlert = () => {
    setShowAlertForm(false);
  };

  //  ADD SERIES
  const addSeries = (
    indicator,
    SeriesType,
    options = {},
    explicitPaneKey = null,
  ) => {
    if (!chartRef.current) return null;

    const paneKey = explicitPaneKey || indicator;
    const paneIndex = getPaneIndex(paneKey);

    // Force visibility to match the master toggle state if it's explicitly set to false
    const isVisible =
      indicatorVisibility[paneKey] !== false && options.visible !== false;

    const finalOptions = { ...options, visible: isVisible };
    if (paneIndex !== 0 && !finalOptions.priceFormat) {
      finalOptions.priceFormat = {
        type: "custom",
        minMove: 0.0001,
        formatter: (price) => {
          if (price === undefined || price === null) return "";
          const absPrice = Math.abs(price);
          if (absPrice >= 1e9) {
            return price.toExponential(2);
          }
          if (absPrice >= 1e6) {
            return (price / 1e6).toFixed(2) + "M";
          }
          return Number(price.toFixed(4)).toString();
        },
      };
    }

    const series = chartRef.current.addSeries(
      SeriesType,
      finalOptions,
      paneIndex,
    );

    if (paneIndex !== 0) {
      try {
        series.priceScale().applyOptions({
          autoScale: true,
          mode: 0, // Explicitly set Normal mode to override global Logarithmic mode
          visible: true,
          position: "right",
          minimumWidth: 85,
          scaleMargins: {
            top: 0.1,
            bottom: 0.1,
          },
        });
      } catch (err) {
        console.warn(
          "Could not configure price scale for pane",
          paneIndex,
          err,
        );
      }
    }

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
      ...Object.values(panesRef.current)?.map((p) => p.chart),
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

    // In Lightweight Charts v5, removing all series from a pane automatically removes the pane
    // and its splitter. Manual DOM manipulation here causes the library to lose track of
    // elements and leaves orphan splitters/blank spaces behind.
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

  const renderValue = (id, type, value) => {
    const emptySymbol = "Ø";
    if (value == null) return emptySymbol;

    const showPercent = type === "AROON"; // Only show % for Aroon

    /* ================= NUMBER VALUES ================= */
    if (typeof value === "number") {
      const style =
        indicatorStyle?.[id]?.sma ||
        indicatorStyle?.[id]?.ma ||
        indicatorStyle?.[id]?.[type?.toLowerCase()] ||
        indicatorStyle?.[type]?.sma ||
        indicatorStyle?.[type]?.ma ||
        indicatorStyle?.[type]?.[type?.toLowerCase()];

      if (style?.visible === false) return null;

      const color = style?.color || "#333";

      return (
        <span style={{ color }} title={type}>
          {Number(value).toFixed(2)}
          {showPercent ? "%" : ""}
        </span>
      );
    }

    /* ================= OBJECT VALUES ================= */
    if (typeof value === "object") {
      let keysToShow;

      switch (type) {
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
          break;

        default:
          keysToShow = Object.keys(value);
      }

      return keysToShow
        .filter((key) => {
          const style =
            indicatorStyle?.[id]?.[key] || indicatorStyle?.[type]?.[key];
          if (style?.visible === false) return false;
          return value[key] != null;
        })
        .map((key) => {
          const val = value[key];
          const color =
            indicatorStyle?.[id]?.[key]?.color ||
            indicatorStyle?.[type]?.[key]?.color ||
            "#333";

          return (
            <span key={key} style={{ marginRight: 8, color }} title={key}>
              {Number.isFinite(val)
                ? `${Number(val).toFixed(2)}${showPercent ? "%" : ""}`
                : emptySymbol}
            </span>
          );
        });
    }

    return emptySymbol;
  };

  const renderIndicators = () => {
    return selectedIndicator?.map((ind) => {
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
          if (prop === type || prop === id) {
            // instance-specific style takes priority; fall back to type default
            const baseStyle = target[id] ?? target[type];

            // Force visible: false deeply if the master toggle is off
            if (indicatorVisibility[id] === false && baseStyle) {
              const overrideStyle = JSON.parse(JSON.stringify(baseStyle));
              const forceVisibleFalse = (obj) => {
                for (let k in obj) {
                  if (typeof obj[k] === "object" && obj[k] !== null) {
                    forceVisibleFalse(obj[k]);
                  } else if (k === "visible") {
                    obj[k] = false;
                  }
                }
                // also force root level properties if any sub-components use them directly
                if (!obj.hasOwnProperty("visible")) {
                  obj.visible = false;
                }
              };
              forceVisibleFalse(overrideStyle);
              return overrideStyle;
            }

            return baseStyle;
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
          indicatorVisibility={indicatorVisibility}
          containerRef={containerRef.current}
          chart={chartRef.current}
          container={containerRef}
          panesRef={panesRef}
          indicatorConfigs={indicatorConfigs}
          pane={seriesRef.current}
          mainSeriesRef={seriesRef}
          candlesRef={candlesRef}
          timeframeValue={timeframeValue}
          selectedCurrency={selectedCurrency}
        />
      );
    });
  };

  // SYNC CROSSHAIR
  const lastIndicatorUpdateRef = useRef(0);

  const updateIndicatorValues = (param) => {
    const now = Date.now();
    if (now - lastIndicatorUpdateRef.current < 50) return;

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

      if (Object.keys(indicatorValues)?.length === 1) {
        updates[indicator] = Object.values(indicatorValues)[0];
      } else if (Object.keys(indicatorValues)?.length > 0) {
        updates[indicator] = indicatorValues;
      }
    });

    if (Object.keys(updates)?.length > 0) {
      lastIndicatorUpdateRef.current = now;
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
        ...Object.values(panesRef.current)?.map((p) => p.chart),
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
    const detachHandlers = charts?.map((c) => attachCrosshair(c));

    return () => detachHandlers.forEach((d) => d());
  }, [indicatorSeriesRef.current, timeframeValue]);

  // Define dynamic vars used by handlers
  const intervalSec = TIMEFRAME_TO_SECONDS[timeframeValue];

  const emitRef = useRef(null);

  const requestHistoricalData = useCallback(() => {
    if (!selectedCurrency || !timeframeValue) return;
    setNoDataAvailable(false);
    const historicalPayload = {
      symbol: selectedCurrency?.name,
      interval: timeframeValue,
      fromDate: fromDate,
      toDate: toDate,
    };
    console.log("📬 getManualHistoricalData Payload:", historicalPayload);
    if (emitRef.current) {
      emitRef.current(EVENTS.CHART.GET, historicalPayload);
    }
  }, [selectedCurrency, timeframeValue, fromDate, toDate]);

  // ── Central Socket Hook ──
  const { emit, once, connect, connected, id, off } = useSocket({
    handleConnect: () => {
      console.log("✅ SOCKET CONNECTED", connected);
      requestHistoricalData();

      if (
        selectedIndicatorRef.current &&
        selectedIndicatorRef.current.length > 0
      ) {
        fetchIndicatorData(
          selectedIndicatorRef.current,
          selectedCurrency,
          timeframeValue,
        );
      }
    },
    handleHistoricalData: (response) => {
      console.log("HISTORICAL DATA RESPONSE", response?.data);
      if (!chartRef.current) return;

      const raw = response?.data || [];

      if (raw.length === 0) {
        setNoDataAvailable(true);
        setMainChartLoading(false);
        if (seriesRef.current) {
          try {
            chartRef.current.removeSeries(seriesRef.current);
          } catch {}
          seriesRef.current = null;
        }
        return;
      }

      setNoDataAvailable(false);

      const symbolFromResponse =
        response?.symbol || raw[0]?.symbol || selectedCurrency?.name;

      const parsedData = new Array(raw?.length);
      for (let i = 0; i < raw.length; i++) {
        const d = raw[i];
        parsedData[i] = {
          time: Number(d.time) + IST_OFFSET,
          open: parseFloat(d.open),
          high: parseFloat(d.high),
          low: parseFloat(d.low),
          close: parseFloat(d.close),
          volume: parseFloat(d.volume || 0),
        };
      }
      parsedData.sort((a, b) => a.time - b.time);

      const data = [];
      let aggregateHigh = -Infinity;
      let aggregateLow = Infinity;

      for (let i = 0; i < parsedData.length; i++) {
        const d = parsedData[i];
        // Only keep the last tick for a given timestamp
        if (i === parsedData.length - 1 || d.time !== parsedData[i + 1].time) {
          data.push(d);
          if (d.high > aggregateHigh) aggregateHigh = d.high;
          if (d.low < aggregateLow) aggregateLow = d.low;
        }
      }

      candlesRef.current = data;

      if (!data.length) {
        setMainChartLoading(false);
        toast.error(`No historical data found for ${symbolFromResponse}`);
        return;
      }

      const lastPoint = data[data.length - 1];

      setDetailsList((prev) => {
        const existingIdx = prev.findIndex(
          (s) =>
            s.name === symbolFromResponse || s.symbol === symbolFromResponse,
        );
        if (existingIdx === -1) return prev;

        const newList = [...prev];
        newList[existingIdx] = {
          ...newList[existingIdx],
          ltp: lastPoint.close,
          high: aggregateHigh,
          low: aggregateLow,
        };
        return newList;
      });

      if (
        !isSameSymbolName(symbolFromResponse, selectedCurrency?.name) &&
        !isSameSymbolName(symbolFromResponse, selectedCurrency?.symbol)
      ) {
        console.log(
          `Skipping chart update for ${symbolFromResponse} (Active: ${selectedCurrency?.name})`,
        );
        return;
      }

      if (
        seriesRef.current &&
        seriesRef.current.customChartType !== chartType
      ) {
        try {
          chartRef.current.removeSeries(seriesRef.current);
        } catch {}
        seriesRef.current = null;
        customScriptMarkersRef.current = null;
        strategyMarkersRef.current = null;
      }

      // Reset price scale so Y-axis re-adapts to the new symbol's price range.
      // Without this, switching from e.g. a ₹50 stock to a ₹5000 stock keeps
      // the old Y range and the new candles appear off-screen.
      try {
        chartRef.current.priceScale("right").applyOptions({ autoScale: true });
      } catch {}

      switch (chartType) {
        case "line":
          if (!seriesRef.current) {
            seriesRef.current = chartRef.current.addSeries(
              LineSeries,
              chartSeriesStyles.line,
            );
            seriesRef.current.customChartType = "line";
          }
          seriesRef.current.setData(
            data?.map((d) => ({ time: d.time, value: Number(d.close) })),
          );
          fetchStrategyMarkers();
          break;
        case "bar":
          if (!seriesRef.current) {
            seriesRef.current = chartRef.current.addSeries(
              BarSeries,
              chartSeriesStyles.bar,
            );
            seriesRef.current.customChartType = "bar";
          }
          seriesRef.current.setData(data);
          fetchStrategyMarkers();
          break;
        case "area":
          if (!seriesRef.current) {
            seriesRef.current = chartRef.current.addSeries(
              AreaSeries,
              chartSeriesStyles.area,
            );
            seriesRef.current.customChartType = "area";
          }
          seriesRef.current.setData(
            data?.map((d) => ({ time: d.time, value: Number(d.close) })),
          );
          break;
        case "baseline":
          if (!seriesRef.current) {
            seriesRef.current = chartRef.current.addSeries(BaselineSeries, {
              ...chartSeriesStyles.baseline,
              baseValue: { type: "price", price: Number(data[0]?.close ?? 0) },
            });
            seriesRef.current.customChartType = "baseline";
          } else {
            seriesRef.current.applyOptions({
              baseValue: { type: "price", price: Number(data[0]?.close ?? 0) },
            });
          }
          seriesRef.current.setData(
            data?.map((d) => ({ time: d.time, value: Number(d.close) })),
          );
          break;
        case "histogram":
          if (!seriesRef.current) {
            seriesRef.current = chartRef.current.addSeries(
              HistogramSeries,
              chartSeriesStyles.histogram,
            );
            seriesRef.current.customChartType = "histogram";
          }
          seriesRef.current.setData(
            data?.map((d, index, arr) => {
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
          if (!seriesRef.current) {
            seriesRef.current = chartRef.current.addSeries(
              CandlestickSeries,
              chartSeriesStyles.candlestick,
            );
            seriesRef.current.customChartType = "heikinashi";
          }
          seriesRef.current.setData(convertToHeikinAshi(data));
          break;
        case "hollowcandles":
          if (!seriesRef.current) {
            seriesRef.current = chartRef.current.addSeries(
              CandlestickSeries,
              chartSeriesStyles.hollowcandles,
            );
            seriesRef.current.customChartType = "hollowcandles";
          }
          seriesRef.current.setData(data);
          break;
        default:
          if (!seriesRef.current) {
            seriesRef.current = chartRef.current.addSeries(
              CandlestickSeries,
              chartSeriesStyles.candlestick,
            );
            seriesRef.current.customChartType = chartType;
          }
          seriesRef.current.setData(data);
      }

      seriesReadyRef.current = true;

      if (
        selectedIndicatorRef.current &&
        selectedIndicatorRef.current.length > 0
      ) {
        fetchIndicatorData(
          selectedIndicatorRef.current,
          selectedCurrencyRef.current,
          timeframeValue,
        )
          .then(() => {
            setIndicatorUpdateTrigger((v) => v + 1);
            // Defer overlay removal: give React one full render cycle + a
            // small buffer so indicator Plot useEffects (SSL, RSI, etc.)
            // complete their series.setData() calls before the overlay lifts.
            setTimeout(() => {
              setMainChartLoading(false);
              symbolTransitioningRef.current = false;
              setSymbolTransitioning(false);
            }, 300);
          })
          .catch(() => {
            // Even on error, lift the overlay
            setMainChartLoading(false);
            symbolTransitioningRef.current = false;
            setSymbolTransitioning(false);
          });
      }

      if (
        lastDeployedMarkersRef.current &&
        lastDeployedMarkersRef.current?.length > 0 &&
        seriesRef.current
      ) {
        if (!customScriptMarkersRef.current) {
          customScriptMarkersRef.current = createSeriesMarkers(
            seriesRef.current,
            lastDeployedMarkersRef.current,
          );
          seriesRef.current.attachPrimitive(customScriptMarkersRef.current);
        } else {
          customScriptMarkersRef.current.setMarkers(
            lastDeployedMarkersRef.current,
          );
        }
      }

      currentCandleRef.current = data[data?.length - 1];

      setTimeout(() => {
        const last = data[data?.length - 1];
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

        // If there are indicators, keep overlay until they load too
        if (selectedIndicatorRef.current?.length > 0) {
          // overlay lifted by indicator fetch .finally() below
        } else {
          // No indicators — lift overlay now
          setMainChartLoading(false);
          symbolTransitioningRef.current = false;
          setSymbolTransitioning(false);
        }
      }, 150);
    },
    handleHistoricalError: (err) => {
      toast.error(err.message || "Failed to fetch historical data");
      console.error("❌ Historical data error:", err);
      setMainChartLoading(false);
    },
    handleLiveTick: (tickOrArray) => {
      const ticks = Array.isArray(tickOrArray) ? tickOrArray : [tickOrArray];

      ticks.forEach((tick) => {
        const activeSymbol = normalize(selectedCurrency?.name);
        const tickSymbol = normalize(tick.symbol);

        if (!isSameSymbolName(tickSymbol, activeSymbol)) return;
        if (!seriesRef.current || !seriesReadyRef.current) return;

        let rawTickTime = tick?.data?.time;
        let tickTime = Number(rawTickTime);

        if (!Number.isFinite(tickTime)) {
          tickTime = Math.floor(new Date(rawTickTime).getTime() / 1000);
        }
        if (tickTime > 10000000000) tickTime = Math.floor(tickTime / 1000);
        if (!Number.isFinite(tickTime)) return;

        // Block ticks after 3:30 PM IST (930 minutes)
        const dateObj = new Date(tickTime * 1000);
        const istTime = new Date(
          dateObj.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
        );
        const currentMinutes = istTime.getHours() * 60 + istTime.getMinutes();
        if (currentMinutes > 930) return;

        const adjustedTime = tickTime + IST_OFFSET;
        const normalizedTime =
          Math.floor(adjustedTime / intervalSec) * intervalSec;

        if (!Number.isFinite(normalizedTime) || normalizedTime <= 0) return;

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

        const activeIndicators = selectedIndicatorRef.current;
        if (activeIndicators?.length > 0) {
          const sentTypes = new Set();
          activeIndicators.forEach((ind) => {
            const indType = typeof ind === "object" ? ind.type : ind;
            if (sentTypes.has(indType)) return;
            sentTypes.add(indType);
            emit(EVENTS.INDICATOR.LIVE, {
              symbol: selectedCurrency?.name,
              interval: timeframeValue,
              type: indType,
              exchange: selectedCurrency?.segment,
            });
          });
        }
      });
    },
    // Note: We've combined liveTick logic into a single handleLiveTick,
    // so we don't need a separate array-specific handler if the new centralized one supports both (and it does not need to care, as it just passes through).
    handleLiveIndicator: (payload) => {
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
            if (!e.message.includes("oldest data")) {
              console.warn(
                `Indicator update failed [${indicatorType}][${instId}]:`,
                e.message,
              );
            }
          }
        });
      });
    },
  });

  // Keep emitRef and socketRef up to date
  useEffect(() => {
    emitRef.current = emit;
    socketRef.current = { emit, once, off, connected };
  }, [emit, once, off, connected]);

  // Main useEffect for chart type/data changes
  useEffect(() => {
    if (!selectedCurrency || !timeframeValue) return;

    seriesReadyRef.current = false; // Prevent live ticks from squishing the old chart data

    // Show transition overlay whenever symbol/timeframe/chartType changes
    symbolTransitioningRef.current = true;
    setSymbolTransitioning(true);

    if (connected && selectedCurrency && timeframeValue) {
      emit(EVENTS.CHART.GET, {
        symbol: selectedCurrency?.name,
        interval: timeframeValue,
        fromDate: fromDate,
        toDate: toDate,
      });
    }

    setMainChartLoading(true);

    const timeout = setTimeout(() => {
      setMainChartLoading(false);
    }, 10000);

    return () => clearTimeout(timeout);
  }, [selectedCurrency, timeframeValue, chartType, fromDate, toDate]);

  const zoomCharts = (delta) => {
    const charts = [
      chartRef.current,
      ...Object.values(panesRef.current)?.map((p) => p.chart),
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

  const zoomIn = () => zoomCharts(10);
  const zoomOut = () => zoomCharts(-10);
  const resetZoom = () => {
    const charts = [
      chartRef.current,
      ...Object.values(panesRef.current)?.map((p) => p.chart),
    ].filter(Boolean);
    charts.forEach((chart) => chart.timeScale().fitContent());
  };

  const pendingGoToDateRef = useRef(null);

  useEffect(() => {
    if (!mainChartLoading && pendingGoToDateRef.current) {
      const targetDate = pendingGoToDateRef.current;
      pendingGoToDateRef.current = null;
      // Slight delay to ensure chart has plotted the new series data
      setTimeout(() => {
        handleGoToDate(targetDate);
      }, 100);
    }
  }, [mainChartLoading]);

  const handleGoToDate = (targetDate) => {
    if (!chartRef.current) return;

    // Check if the target date is earlier than our currently fetched fromDate
    const targetTimeMs = targetDate.getTime();
    const currentFromTimeMs = new Date(fromDate).getTime();

    if (targetTimeMs < currentFromTimeMs) {
      // Need to fetch older data first
      pendingGoToDateRef.current = targetDate;

      // Update fromDate to 30 days before the target date just to be safe
      const newFrom = new Date(targetDate);
      newFrom.setDate(newFrom.getDate() - 30);
      setFromDate(newFrom.toISOString().split("T")[0]);
      return; // The useEffect above will call handleGoToDate again once loaded
    }

    if (!candlesRef.current?.length) return;

    const targetTimeSec = Math.floor(targetTimeMs / 1000);

    // Find the closest candle
    let closestIndex = 0;
    let minDiff = Infinity;

    for (let i = 0; i < candlesRef.current.length; i++) {
      const candle = candlesRef.current[i];
      const diff = Math.abs(candle.time - targetTimeSec);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    }

    // Calculate logical range to put the candle in the center
    const fromIndex = Math.max(0, closestIndex - 25);
    const toIndex = Math.min(candlesRef.current.length - 1, closestIndex + 25);

    chartRef.current.timeScale().setVisibleLogicalRange({
      from: fromIndex,
      to: toIndex,
    });
  };

  return (
    <>
      <Navbar
        setSelectedCurrency={setSelectedCurrency}
        predictCount={predictResultData?.length}
      />
      <section
        className="trading-view-wrapper overflow-x-hidden"
        style={{
          background: "var(--bg-primary)",
          height: "calc(100vh - 60px)",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        <div
          className="container-fluid p-0 m-0"
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            flex: 1,
            minHeight: "fit-content",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              width: "100%",
              flex: 1,
              minHeight: "fit-content",
            }}
          >
            <style>{`
              @media (max-width: 768px) {
                .left-panel-mobile.is-open {
                  position: absolute !important;
                  left: 0;
                  top: 0;
                  z-index: 1000;
                  background: var(--bg-primary);
                  width: 100% !important;
                  height: 100% !important;
                  box-shadow: 2px 0 10px rgba(0,0,0,0.5);
                }
                .right-sidebar-mobile {
                  width: 60px !important;
                }
                .mobile-scrollable-chart {
                  min-width: 600px !important;
                }
                .buy-sell-btn {
                  padding: 4px 8px !important;
                  font-size: 0.85rem !important;
                }
              }
            `}</style>
            {/* Left Panel (Watchlist or Details) */}
            <div
              className={`left-panel-mobile ${isWatchlistOpen || isDetailsOpen || isDepthOpen ? "is-open" : ""}`}
              style={{
                width:
                  isWatchlistOpen || isDetailsOpen || isDepthOpen
                    ? "300px"
                    : "0px",
                opacity:
                  isWatchlistOpen || isDetailsOpen || isDepthOpen ? 1 : 0,
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
                <div
                  style={{
                    display:
                      activeTab !== "Alerts" && isDepthOpen ? "block" : "none",
                    height: "100%",
                  }}
                >
                  <LeftDepth
                    onClose={() => setIsDepthOpen(false)}
                    predictResults={predictResultData}
                    setSelectedCurrency={setSelectedCurrency}
                    isPredicting={isPredicting}
                    predictionStatus={predictionStatus}
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
                  isWatchlistOpen || isDetailsOpen || isDepthOpen
                    ? "1px solid var(--border-color)"
                    : "none",
                borderRight: "1px solid var(--border-color)",
                display: "flex",
                flexDirection: "column",
                minHeight: "100%",
                transition: "border-color 0.3s ease",
              }}
            >
              <ChartTabs
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onCodeClick={() => setIsCodeEditorOpen((prev) => !prev)}
                onStrategyClick={handleStrategyClick}
                onGoToDate={handleGoToDate}
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

                <div
                  style={{
                    display: "flex",
                    flex: 1,
                    overflowX: "auto",
                    overflowY: "hidden",
                  }}
                >
                  <DrawingToolbar 
                    activeTool={activeTool} 
                    setActiveTool={setActiveTool} 
                    clearAllDrawings={clearAllDrawings} 
                  />
                  <div
                    className="chart-and-panes-wrapper mobile-scrollable-chart"
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
                        minHeight: 450,
                      }}
                    >
                      <DrawingToolbox
                        selectedLine={selectedLine}
                        position={toolboxPos}
                        onUpdate={updateLine}
                        onDelete={deleteLine}
                        onClose={closeToolbox}
                      />
                      {/* Unified chart transition overlay — covers during symbol/timeframe change */}
                      {(symbolTransitioning ||
                        mainChartLoading ||
                        indicatorLoading) &&
                        !isDeploying && (
                          <div
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              zIndex: 55,
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              background: "transparent",
                              backdropFilter: "none",
                              pointerEvents:
                                symbolTransitioning || mainChartLoading
                                  ? "auto"
                                  : "none",
                              transition: "opacity 0.25s ease",
                            }}
                          >
                            <Spinner />
                          </div>
                        )}
                      {/* Strategy scanner overlay */}
                      {isDeploying && (
                        <div
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 60,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "rgba(0, 0, 0, 0.7)",
                            backdropFilter: "blur(6px)",
                            color: "var(--text-primary)",
                          }}
                        >
                          <Spinner />
                          <div
                            style={{
                              marginTop: "1rem",
                              fontWeight: "bold",
                              fontSize: "1.1rem",
                            }}
                          >
                            Running Strategy Scanner...
                          </div>
                          {scannerProgressData &&
                            scannerProgressData.total > 0 && (
                              <div
                                style={{
                                  marginTop: "0.5rem",
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  fontSize: "0.9rem",
                                  color: "var(--text-secondary)",
                                }}
                              >
                                <div>
                                  {Math.round(
                                    (scannerProgressData.processed /
                                      scannerProgressData.total) *
                                      100,
                                  )}
                                  %
                                </div>
                                {scannerProgressData.current_stock && (
                                  <div
                                    style={{
                                      marginTop: "0.25rem",
                                      fontSize: "0.8rem",
                                      opacity: 0.8,
                                    }}
                                  >
                                    Processing:{" "}
                                    {scannerProgressData.current_stock}
                                  </div>
                                )}
                              </div>
                            )}
                        </div>
                      )}
                      {/* No data overlay */}
                      {noDataAvailable &&
                        !symbolTransitioning &&
                        !mainChartLoading && (
                          <div
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              zIndex: 40,
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              background: "rgba(0, 0, 0, 0.6)",
                              backdropFilter: "blur(4px)",
                              color: "var(--text-primary)",
                              textAlign: "center",
                              padding: "20px",
                            }}
                          >
                            <div
                              style={{
                                fontSize: "1.25rem",
                                fontWeight: "bold",
                                marginBottom: "8px",
                              }}
                            >
                              No Data Available
                            </div>
                            <div
                              style={{
                                fontSize: "0.875rem",
                                color: "var(--text-secondary)",
                              }}
                            >
                              There is no chart data available for{" "}
                              {selectedCurrency?.name || "this symbol"} in the
                              selected timeframe.
                            </div>
                          </div>
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
                            className="d-none d-md-flex align-items-center gap-1"
                            ref={ohlcvDisplayRef}
                            style={{
                              opacity: currentCandleRef.current ? 1 : 0,
                              transition: "opacity 0.2s ease-in-out",
                            }}
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
                          style={{
                            display: "flex",
                            gap: "8px",
                            opacity: currentCandleRef.current ? 1 : 0,
                            transition: "opacity 0.2s ease-in-out",
                          }}
                          ref={actionButtonsRef}
                        >
                          <button
                            className="buy-sell-btn"
                            onClick={() => {
                              const price = currentCandleRef.current?.close;
                              const state = {
                                stock: selectedCurrency?.name,
                                action: "BUY",
                                price: price,
                              };
                              const key = `trade_${Date.now()}`;
                              sessionStorage.setItem(
                                key,
                                JSON.stringify(state),
                              );
                              window.open(
                                `/dashboard?tradeKey=${key}`,
                                "_blank",
                              );
                            }}
                            style={{
                              padding: "4px 8px",
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

                          <button
                            className="buy-sell-btn"
                            onClick={() => {
                              const price = currentCandleRef.current?.close;
                              const state = {
                                stock: selectedCurrency?.name,
                                action: "SELL",
                                price: price,
                              };
                              const key = `trade_${Date.now()}`;
                              sessionStorage.setItem(
                                key,
                                JSON.stringify(state),
                              );
                              window.open(
                                `/dashboard?tradeKey=${key}`,
                                "_blank",
                              );
                            }}
                            style={{
                              padding: "4px 8px",
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
                        </div>
                      </div>

                      {/* -----------------INDICATOR BAR------------------- */}

                      {selectedIndicator?.length > 0 && (
                        <>
                          {/* Main Chart Indicators */}
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
                            {selectedIndicator
                              .filter((ind) => getPaneIndex(ind.id) === 0)
                              .map((ind) => {
                                const { id, type } = ind;
                                const value = liveIndicatorData[id];
                                return (
                                  <IndicatorBar
                                    key={id}
                                    indicator={id}
                                    type={type}
                                    timeframeValue={timeframeValue}
                                    value={value}
                                    renderValue={(indId, val) =>
                                      renderValue(indId, type, val)
                                    }
                                    indicatorVisibility={indicatorVisibility}
                                    toggleIndicatorVisibility={
                                      toggleIndicatorVisibility
                                    }
                                    removeIndicator={removeIndicator}
                                    setActiveBarIndicator={() =>
                                      setActiveBarIndicator({ id, type })
                                    }
                                    setIndicatorProperty={setIndicatorProperty}
                                    setActiveSourceIndicator={() =>
                                      setActiveSourceIndicator(type)
                                    }
                                    setShowSourcePanel={setShowSourcePanel}
                                    indicatorConfigDefault={
                                      indicatorConfigDefault
                                    }
                                    indicatorConfigs={indicatorConfigs}
                                  />
                                );
                              })}
                          </div>

                          {/* Pane Indicators (Portals) */}
                          {selectedIndicator
                            .filter((ind) => getPaneIndex(ind.id) !== 0)
                            .map((ind) => {
                              const { id, type } = ind;
                              const value = liveIndicatorData[id];
                              const paneDiv =
                                panesRef.current[id]?.pane?.getHTMLElement();

                              if (!paneDiv) return null;
                              const portalTarget =
                                paneDiv.tagName?.toLowerCase() === "tr"
                                  ? paneDiv.querySelector("td") || paneDiv
                                  : paneDiv;

                              portalTarget.style.position = "relative"; // Ensure the pane is a positioning context

                              return createPortal(
                                <div
                                  style={{
                                    position: "absolute",
                                    top: 5,
                                    left: 8,
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 4,
                                    zIndex: 50,
                                  }}
                                >
                                  <IndicatorBar
                                    indicator={id}
                                    type={type}
                                    timeframeValue={timeframeValue}
                                    value={value}
                                    renderValue={(indId, val) =>
                                      renderValue(indId, type, val)
                                    }
                                    indicatorVisibility={indicatorVisibility}
                                    toggleIndicatorVisibility={
                                      toggleIndicatorVisibility
                                    }
                                    removeIndicator={removeIndicator}
                                    setActiveBarIndicator={() =>
                                      setActiveBarIndicator({ id, type })
                                    }
                                    setIndicatorProperty={setIndicatorProperty}
                                    setActiveSourceIndicator={() =>
                                      setActiveSourceIndicator(type)
                                    }
                                    setShowSourcePanel={setShowSourcePanel}
                                    indicatorConfigDefault={
                                      indicatorConfigDefault
                                    }
                                    indicatorConfigs={indicatorConfigs}
                                  />
                                </div>,
                                portalTarget,
                              );
                            })}
                        </>
                      )}

                      {/* -----------------OLD INDICATOR BAR (COMMENTED)------------------- */}
                      {/*
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
                                        cfg?.length ?? cfg.baseLen ?? "";
                                      const src = cfg.source ?? "";
                                      return `${len}${src ? " " + src : ""}`;
                                    })()}
                                    <span style={{ display: "flex", gap: 6 }}>
                                      {renderValue(id, type, value)}
                                    </span>
                                  </span>

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
                                      title="Settings"
                                      onClick={() => {
                                        setActiveBarIndicator({ id, type });
                                        setIndicatorProperty((prev) => !prev);
                                      }}
                                    >
                                      <IoSettingsOutline size={14} />
                                    </button>

                                    <button
                                      className="ind-btn"
                                      title="Source code"
                                      onClick={() => {
                                        setActiveSourceIndicator(type);
                                        setShowSourcePanel(true);
                                      }}
                                    >
                                      <FaCode size={14} />
                                    </button>

                                    <button
                                      className="ind-btn"
                                      title="Remove"
                                      onClick={() => removeIndicator(id)}
                                    >
                                      <IoCloseSharp size={16} />
                                    </button>

                                    <button
                                      className="ind-btn"
                                      title="More"
                                      style={{ marginLeft: 4 }}
                                    >
                                      <FiMoreHorizontal size={16} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
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
                      */}
                      {/* {selectedIndicator?.map((indicator, index) => {
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

                  {isCodeEditorOpen && (
                    <CodeEditorPanel
                      onClose={() => setIsCodeEditorOpen(false)}
                      onDeploy={handleDeployCode}
                      onClear={handleClearCode}
                      onEdit={() => setIsDeployed(false)}
                      editorCode={editorCode}
                      setEditorCode={setEditorCode}
                      isDeployed={isDeployed}
                      isDeploying={isDeploying}
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
                  minHeight: "100%",
                }}
              >
                <Overview
                  key={selectedCurrency?.name}
                  selectedCurrency={selectedCurrency}
                  onBack={() => setActiveTab("Chart")}
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
                <OptionChain onBack={() => setActiveTab("Chart")} />
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
                }}
              >
                {activeTab === "OI Analytics" && (
                  <OIAnalytics
                    selectedCurrency={selectedCurrency}
                    onBack={() => setActiveTab("Chart")}
                  />
                )}
              </div>
            </div>

            {/* Right Sidebar */}
            <div
              className="right-sidebar-mobile"
              style={{
                width: "70px",
                height: "100%",
                flexShrink: 0,
                borderLeft: "1px solid var(--border-color)",
                zIndex: 50,
              }}
            >
              <RightSidebar
                isWatchlistOpen={activeTab !== "Alerts" && isWatchlistOpen}
                toggleWatchlist={() => {
                  const willOpen =
                    activeTab === "Alerts" ? true : !isWatchlistOpen;
                  if (activeTab === "Alerts") setActiveTab("Chart");
                  setIsWatchlistOpen(willOpen);
                  if (willOpen) {
                    setIsDetailsOpen(false); // close others
                    setIsDepthOpen(false);
                  }
                }}
                isDetailsOpen={isDetailsOpen}
                toggleDetails={() => {
                  setIsDetailsOpen((prev) => !prev);
                  if (!isDetailsOpen) {
                    setIsWatchlistOpen(false);
                    setIsDepthOpen(false);
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
                    setIsDepthOpen(false);
                  }
                }}
                isDepthOpen={activeTab !== "Alerts" && isDepthOpen}
                toggleDepth={() => {
                  const willOpen = !isDepthOpen;
                  if (activeTab === "Alerts") setActiveTab("Chart");
                  setIsDepthOpen(willOpen);
                  if (willOpen) {
                    setIsWatchlistOpen(false);
                    setIsDetailsOpen(false);
                  }
                }}
              />
            </div>
          </div>
        </div>
        {/* <SourceCodePanel
          show={showSourcePanel}
          indicator={activeSourceIndicator}
          onClose={() => setShowSourcePanel(false)}
        /> */}
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
