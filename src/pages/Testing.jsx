import React, { useEffect, useRef, useState } from "react";
import {
  CandlestickSeries,
  createChart,
  createSeriesMarkers,
} from "lightweight-charts";
import Papa from "papaparse";
import CodeEditorPanel from "../components/layout/CodeEditorPanel";

export default function CSVChart() {
  const chartContainerRef = useRef(null);

  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const markerApiRef = useRef(null);
  const pyodideRef = useRef(null);

  const [csvRows, setCsvRows] = useState([]);
  const [editorCode, setEditorCode] = useState("");
  const [isDeployed, setIsDeployed] = useState(false);
  const [pyodideReady, setPyodideReady] = useState(false);

  // =============================
  // PYODIDE INIT
  // =============================
  useEffect(() => {
    const initPyodide = async () => {
      try {
        if (!window.loadPyodide) {
          console.error("Pyodide CDN not loaded");
          return;
        }

        const pyodide = await window.loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/",
        });

        await pyodide.loadPackage(["numpy", "pandas"]);

        pyodideRef.current = pyodide;
        setPyodideReady(true);
      } catch (err) {
        console.error("Pyodide Init Error:", err);
      }
    };

    initPyodide();
  }, []);

  // =============================
  // CHART INIT
  // =============================
  useEffect(() => {
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 700,

      layout: {
        background: { color: "#ffffff" },
        textColor: "#333",
      },

      grid: {
        vertLines: { color: "#f0f3fa" },
        horzLines: { color: "#f0f3fa" },
      },

      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries);
    candleSeriesRef.current = candleSeries;

    Papa.parse("/BOSLIM.csv", {
      download: true,
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,

      complete: ({ data }) => {
        setCsvRows(data);

        const candles = data
          .filter(
            (row) =>
              row.datetime &&
              row.open != null &&
              row.high != null &&
              row.low != null &&
              row.close != null
          )
          .map((row) => ({
            // ✅ FIX: proper UNIX timestamp (SECONDS)
            time: Math.floor(new Date(row.datetime).getTime() / 1000),

            open: Number(row.open),
            high: Number(row.high),
            low: Number(row.low),
            close: Number(row.close),
          }));

        candleSeries.setData(candles);
        chart.timeScale().fitContent();
      },
    });

    const handleResize = () => {
      chart.applyOptions({
        width: chartContainerRef.current.clientWidth,
      });
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, []);

  // =============================
  // DEPLOY STRATEGY
  // =============================
  const handleDeploy = async (pythonCode) => {
    try {
      if (!pyodideReady) {
        alert("Pyodide is still loading...");
        return;
      }

      const pyodide = pyodideRef.current;

      pyodide.globals.set("rows_json", JSON.stringify(csvRows));

      await pyodide.runPythonAsync(`
import pandas as pd
import numpy as np
import json

rows = json.loads(rows_json)
df = pd.DataFrame(rows)

df["datetime"] = pd.to_datetime(df["datetime"])
`);

      await pyodide.runPythonAsync(pythonCode);

      const tradesJson = await pyodide.runPythonAsync(`
import json
trades = run_trade_engine_on_all(df)
json.dumps(trades, default=str)
      `);

      const trades = JSON.parse(tradesJson || "[]");

      const markers = trades.map((trade) => ({
        // ✅ FIX: same timestamp logic
        time: Math.floor(new Date(trade.Entry_Time).getTime() / 1000),

        position: trade.Type === "CALL" ? "belowBar" : "aboveBar",
        shape: trade.Type === "CALL" ? "arrowUp" : "arrowDown",
        color: trade.Type === "CALL" ? "#22ab94" : "#ef4444",
        text: trade.Type,
      }));

      if (!markerApiRef.current) {
        markerApiRef.current = createSeriesMarkers(
          candleSeriesRef.current,
          markers
        );
      } else {
        markerApiRef.current.setMarkers(markers);
      }

      setIsDeployed(true);
    } catch (err) {
      console.error(err);
      alert(err.message || "Strategy execution failed");
    }
  };

  // =============================
  // CLEAR
  // =============================
  const handleClear = () => {
    if (markerApiRef.current) {
      markerApiRef.current.setMarkers([]);
    }
    setIsDeployed(false);
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <div
        ref={chartContainerRef}
        style={{ flex: 1, height: "100%" }}
      />

      <CodeEditorPanel
        editorCode={editorCode}
        setEditorCode={setEditorCode}
        isDeployed={isDeployed}
        onDeploy={handleDeploy}
        onClear={handleClear}
        onEdit={() => setIsDeployed(false)}
        onClose={() => {}}
      />
    </div>
  );
}