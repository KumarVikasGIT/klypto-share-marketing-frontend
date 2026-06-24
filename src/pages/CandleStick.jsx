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
import LeftDepth from "../components/layout/LeftDepth";
import useSocket from "../util/useSocket";
import EVENTS from "../services/websocket/socketEvent";
import { METADATA_API_URL } from "../services/websocket/socket";

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
import { getStrategySocket } from "../services/websocket/socket";
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
  const [isDepthOpen, setIsDepthOpen] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
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
      symbol: "ADANIPORTS-EQ",
      name: "ADANIPORTS",
      token: 15083,
      segment: "NSE",
      expiry: "",
    };
  });
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90); // At least 3 months default for 5m
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
  const [editorCode, setEditorCode] = useState(
    `markers = []
# user strategy here
plot_markers(markers)`,
  );
  const [openScannerTrigger, setOpenScannerTrigger] = useState(0);
  const [customSignals, setCustomSignals] = useState([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [dashboardSignals, setDashboardSignals] = useState([]);
  const [deployedStrategyCode, setDeployedStrategyCode] = useState(null);

  const handleStrategyClick = async () => {
    try {
      setIsPredicting(true);
      // Immediately open Results tab to show the spinner
      setIsDepthOpen(true);
      setIsWatchlistOpen(false);
      setIsDetailsOpen(false);
      if (activeTab === "Alerts") setActiveTab("Chart");

      const apiUrl =
        import.meta.env.VITE_STRATEGY_API_URL || "http://192.168.1.6:3000";
      const resp = await apiService.get(`${apiUrl}/api/predictResult`);
      console.log("predictResult API Raw Response:", resp);

      const data = Array.isArray(resp) ? resp : resp?.signals || [];
      const filtered = data.filter((item) => item.symbol && item.response);
      console.log("Filtered predictResult Data:", filtered);

      setPredictResultData(filtered);

      // Plot markers by adding them to dashboardSignals
      const mappedSignals = filtered.map((f) => {
        let timeStr =
          f.tick?.datetime ||
          f.response?.entry_time ||
          new Date().toISOString();
        timeStr = timeStr.replace(" ", "T"); // Fix parsing for 'YYYY-MM-DD HH:mm:ss'

        return {
          symbol: f.symbol,
          signalType:
            f.response?.type === "CALL"
              ? "BUY"
              : f.response?.type === "PUT"
                ? "SELL"
                : "BUY",
          timestamp: timeStr,
          segment: "SCRIPT",
        };
      });
      console.log("Mapped Signals for Dashboard:", mappedSignals);

      setDashboardSignals((prev) => [...prev, ...mappedSignals]);

      // We must set isDeployed to true so the markers useEffect triggers and plots them
      setIsDeployed(true);
      setDeployedStrategyCode("API_PREDICTION");
    } catch (err) {
      console.error("Failed to fetch predict result:", err);
    } finally {
      setIsPredicting(false);
    }
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
      } catch (err) {
        console.error(`[STRATEGY SOCKET ERROR] ERROR handler failed:`, err);
      }
    };

    strategySocket.on(EVENTS.STRATEGY.PROGRESS, handleScannerProgress);
    strategySocket.on(EVENTS.STRATEGY.COMPLETE, handleScannerComplete);
    strategySocket.on(EVENTS.STRATEGY.NEW_SIGNAL, handleNewScannerSignal);
    strategySocket.on(EVENTS.STRATEGY.ERROR, handleScannerError);

    return () => {
      strategySocket.off(EVENTS.STRATEGY.PROGRESS, handleScannerProgress);
      strategySocket.off(EVENTS.STRATEGY.COMPLETE, handleScannerComplete);
      strategySocket.off(EVENTS.STRATEGY.NEW_SIGNAL, handleNewScannerSignal);
      strategySocket.off(EVENTS.STRATEGY.ERROR, handleScannerError);
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
        const type = item.signalType;
        const utcStr = item.timestamp || item.createdAt || item.updatedAt;

        if (utcStr && type) {
          const isBuy = type.toUpperCase() === "BUY";

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
              text: isBuy ? "BUY" : "SELL",
              size: 1,
            });
          } else {
            console.log(
              `Skipped marker for ${item.symbol}: doesn't match selected ${selectedCurrency?.name} or ${selectedCurrency?.symbol}`,
            );
          }

          newSignals.unshift({
            symbol: item.symbol || selectedCurrency?.name || "STOCK",
            name: item.symbol || selectedCurrency?.name || "STOCK",
            token: item.symbol,
            signalType: isBuy ? "BUY" : "SELL",
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
import pandas as pd
import numpy as np
import sys
import io
import time
import ast
import json
import traceback

result = { "success": True, "error_type": None, "error_message": None, "output": "", "markers": [] }

class StrategyValidator(ast.NodeVisitor):
    def __init__(self):
        self.used_vars = set()
        self.overridden_vars = set()
        self.forbidden_imports = set()
        self.reserved = {'df', 'open', 'high', 'low', 'close', 'volume', 'datetime', 'plot_markers'}
        
    def visit_Name(self, node):
        if isinstance(node.ctx, ast.Load) and node.id in self.reserved:
            self.used_vars.add(node.id)
        elif isinstance(node.ctx, ast.Store) and node.id in self.reserved:
            self.overridden_vars.add(node.id)
        self.generic_visit(node)
        
    def visit_Import(self, node):
        for alias in node.names:
            if alias.name in ['os', 'sys', 'subprocess']:
                self.forbidden_imports.add(alias.name)
        self.generic_visit(node)
        
    def visit_ImportFrom(self, node):
        if node.module in ['os', 'sys', 'subprocess']:
            self.forbidden_imports.add(node.module)
        self.generic_visit(node)

# Step 1: AST Validation
try:
    tree = ast.parse(__code_to_validate)
    validator = StrategyValidator()
    validator.visit(tree)
    
    if len(validator.used_vars) == 0:
        raise ValueError("Invalid Strategy: You must use at least one engine variable (df, open, high, low, close, volume, datetime, plot_markers).")
    
    if len(validator.overridden_vars) > 0:
        raise ValueError(f"Security Error: You are not allowed to override engine variables or functions: {', '.join(validator.overridden_vars)}")
        
    if len(validator.forbidden_imports) > 0:
        raise ValueError(f"Security Error: Forbidden imports detected: {', '.join(validator.forbidden_imports)}")
except Exception as e:
    result["success"] = False
    result["error_type"] = type(e).__name__
    if isinstance(e, SyntaxError):
        exc_type, exc_value, exc_traceback = sys.exc_info()
        tb_lines = traceback.format_exception(exc_type, exc_value, exc_traceback)
        result["error_message"] = "".join(tb_lines).strip()
    else:
        result["error_message"] = str(e)

if result["success"]:
    # Step 2: Setup Globals
    np.random.seed(42)
    closes = np.random.normal(0, 1, 300).cumsum() + 100
    df = pd.DataFrame({
        'open': closes + np.random.normal(0, 0.5, 300),
        'high': closes + np.random.uniform(0.1, 1.5, 300),
        'low': closes - np.random.uniform(0.1, 1.5, 300),
        'close': closes,
        'volume': np.random.randint(100, 1000, 300),
        'datetime': pd.date_range(start='1/1/2026', periods=300, freq='D')
    })
    open = df['open']
    high = df['high']
    low = df['low']
    close = df['close']
    volume = df['volume']
    datetime = df['datetime']
    def plot_markers(m): pass

    # Step 3: Execution and Sandboxing
    old_stdout = sys.stdout
    new_stdout = io.StringIO()
    sys.stdout = new_stdout

    sys.setrecursionlimit(100)
    start_time = time.time()

    def trace_calls(frame, event, arg):
        if time.time() - start_time > 300.0:
            raise TimeoutError("Execution timed out (infinite loop or heavy computation detected). Limit is 5 minutes.")
        return trace_calls

    try:
        sys.settrace(trace_calls)
        exec(__code_to_validate)
        sys.settrace(None)
        
        # Extract markers
        if 'markers' in globals() and isinstance(markers, list):
            # Only keep dict markers to avoid json.dumps crashing
            clean_markers = [m for m in markers if isinstance(m, dict)]
            result["markers"] = clean_markers
        else:
            result["markers"] = []

    except Exception as e:
        sys.settrace(None)
        result["success"] = False
        result["error_type"] = type(e).__name__
        exc_type, exc_value, exc_traceback = sys.exc_info()
        tb_lines = traceback.format_exception(exc_type, exc_value, exc_traceback)
        result["error_message"] = "".join(tb_lines[-2:]).strip()
    finally:
        sys.stdout = old_stdout
        result["output"] = new_stdout.getvalue()

def json_default(obj):
    if hasattr(obj, 'isoformat'): return obj.isoformat()
    if isinstance(obj, np.integer): return int(obj)
    if isinstance(obj, np.floating): return float(obj)
    if isinstance(obj, np.ndarray): return obj.tolist()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

json.dumps(result, default=json_default)
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

        if (markersList?.length === 0 || !isStructurallyValid) {
          Swal.fire({
            icon: "warning",
            title: "Invalid Markers",
            text: "Your strategy ran successfully, but it did not generate any valid markers. Ensure you append valid dictionaries containing 'time', 'text', and 'position'.",
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

        const response = await apiService.post(
          `/api/strategy/run-scanner`,
          JSON.stringify(payload),
        );

        // Decoupled: We don't fetch and plot here anymore. The useEffect handles it.
        setDeployedStrategyCode(code);
        setIsDeployed(true);
        // Note: toast success and setIsDeploying(false) are now handled in handleScannerComplete socket event
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
  const hasPaneIndicators = selectedIndicator.some((ind) =>
    PANE_INDICATORS.has(typeof ind === "object" ? ind.type : ind),
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
      prevCurrencyRef.current !== selectedCurrency ||
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
      if (typeof seriesGroup.applyOptions === 'function') {
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
  const addSeries = (indicator, SeriesType, options = {}) => {
    if (!chartRef.current) return null;

    const paneIndex = getPaneIndex(indicator);

    const series = chartRef.current.addSeries(
      SeriesType,
      {
        ...(paneIndex !== 0 && { priceScaleId: `pane_${paneIndex}` }),
        ...options,
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
    if (value == null) return "--";

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
        <span style={{ color }}>
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

      if (Object.keys(indicatorValues)?.length === 1) {
        updates[indicator] = Object.values(indicatorValues)[0];
      } else if (Object.keys(indicatorValues)?.length > 0) {
        updates[indicator] = indicatorValues;
      }
    });

    if (Object.keys(updates)?.length > 0) {
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
  const { emit, once, connect, connected, id } = useSocket({
    handleConnect: () => {
      console.log("✅ SOCKET CONNECTED", connected);
      requestHistoricalData();
    },
    handleHistoricalData: (response) => {
      console.log("HISTORICAL DATA RESPONSE", response?.data);
      if (!chartRef.current) return;

      const raw = response?.data || [];
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

      if (seriesRef.current) {
        try {
          chartRef.current.removeSeries(seriesRef.current);
        } catch {}
        seriesRef.current = null;
        customScriptMarkersRef.current = null;
        strategyMarkersRef.current = null;
      }

      switch (chartType) {
        case "line":
          seriesRef.current = chartRef.current.addSeries(
            LineSeries,
            chartSeriesStyles.line,
          );
          seriesRef.current.setData(
            data?.map((d) => ({ time: d.time, value: Number(d.close) })),
          );
          fetchStrategyMarkers();
          break;
        case "bar":
          seriesRef.current = chartRef.current.addSeries(
            BarSeries,
            chartSeriesStyles.bar,
          );
          seriesRef.current.setData(data);
          fetchStrategyMarkers();
          break;
        case "area":
          seriesRef.current = chartRef.current.addSeries(
            AreaSeries,
            chartSeriesStyles.area,
          );
          seriesRef.current.setData(
            data?.map((d) => ({ time: d.time, value: Number(d.close) })),
          );
          break;
        case "baseline":
          seriesRef.current = chartRef.current.addSeries(BaselineSeries, {
            ...chartSeriesStyles.baseline,
            baseValue: { type: "price", price: Number(data[0]?.close ?? 0) },
          });
          seriesRef.current.setData(
            data?.map((d) => ({ time: d.time, value: Number(d.close) })),
          );
          break;
        case "histogram":
          seriesRef.current = chartRef.current.addSeries(
            HistogramSeries,
            chartSeriesStyles.histogram,
          );
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

      seriesReadyRef.current = true;

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

        // Remove loader ONLY after chart is fully rendered and fit to content
        setMainChartLoading(false);
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
        const istTime = new Date(dateObj.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
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
    socketRef.current = { emit, once };
  }, [emit, once]);

  // Main useEffect for chart type/data changes
  useEffect(() => {
    if (!selectedCurrency || !timeframeValue) return;

    seriesReadyRef.current = false; // Prevent live ticks from squishing the old chart data

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
  }, [
    selectedCurrency,
    timeframeValue,
    chartType,
    connected,
    fromDate,
    toDate,
  ]);

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
          style={{ display: "flex", flexDirection: "column", width: "100%", flex: 1, minHeight: "fit-content" }}
        >
          <div style={{ display: "flex", flexDirection: "row", width: "100%", flex: 1, minHeight: "fit-content" }}>
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
                  padding: 6px 12px !important;
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

                <div style={{ display: "flex", flex: 1, overflowX: "auto", overflowY: "hidden" }}>
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
                      {mainChartLoading || isDeploying ? (
                        <div
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            zIndex: 50,
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
                              zIndex: 50,
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
                                        cfg?.length ?? cfg.baseLen ?? "";
                                      const src = cfg.source ?? "";
                                      return `${len}${src ? " " + src : ""}`;
                                    })()}
                                    <span style={{ display: "flex", gap: 6 }}>
                                      {renderValue(id, type, value)}
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
                                      // onClick={() => {
                                      //   setActiveSourceIndicator(type);
                                      //   setShowSourcePanel(true);
                                      // }}
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
            <div className="right-sidebar-mobile" style={{ width: "70px", height: "100%", flexShrink: 0, borderLeft: "1px solid var(--border-color)", zIndex: 50 }}>
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
