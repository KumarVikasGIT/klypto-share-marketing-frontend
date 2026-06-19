import React, { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
);
import { io } from "socket.io-client";
import apiService from "../../services/apiServices";
import { SOCKET_URL } from "../../services/websocket/socket";

const customDataLabelsPlugin = {
  id: "customDataLabels",
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    ctx.font = "bold 11px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";

    chart.data.datasets.forEach((dataset, i) => {
      if (dataset.type === "line") return;

      const meta = chart.getDatasetMeta(i);
      meta.data.forEach((bar, index) => {
        const dataVal = dataset.data[index];
        if (dataVal > 0) {
          ctx.fillStyle = dataset.backgroundColor;
          const formatted = (dataVal / 100000).toFixed(1) + "L";
          ctx.fillText(formatted, bar.x, bar.y - 5);
        }
      });
    });
  },
};

const spotPriceLinePlugin = {
  id: "spotPriceLine",
  afterDraw(chart, args, pluginOptions) {
    const spotPrice = pluginOptions.spotPrice;
    if (!spotPrice) return;

    const {
      ctx,
      chartArea: { top, bottom },
      scales: { x },
    } = chart;
    const labels = chart.data.labels;
    let closestIndex = -1;
    let minDiff = Infinity;

    labels.forEach((label, i) => {
      const parsedLabel = parseFloat(label);
      if (isNaN(parsedLabel)) return;

      const diff = Math.abs(parsedLabel - spotPrice);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    });

    if (closestIndex !== -1) {
      const xCoord = x.getPixelForValue(closestIndex);
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([5, 5]);
      ctx.moveTo(xCoord, top);
      ctx.lineTo(xCoord, bottom);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "#eab308";
      ctx.stroke();
      ctx.restore();
    }
  },
};

const OIAnalytics = ({ selectedCurrency }) => {
  const [theme, setTheme] = useState(
    document.documentElement.getAttribute("data-theme") || "dark",
  );
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        if (m.attributeName === "data-theme") {
          setTheme(
            document.documentElement.getAttribute("data-theme") || "dark",
          );
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  const gridColor = theme === "light" ? "#e2e8f0" : "#2e3347";

  const [data, setData] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState(true);

  let currentSymbol = selectedCurrency?.name || selectedCurrency;
  if (currentSymbol) {
    currentSymbol =
      typeof currentSymbol === "string" ? currentSymbol : currentSymbol.name;
  } else {
    currentSymbol = "NIFTY";
  }

  useEffect(() => {
    if (!currentSymbol) return;

    const cacheKey = `oiAnalytics_${currentSymbol}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.data) setData(parsed.data);
        if (parsed.metrics) setMetrics(parsed.metrics);
        setLoading(false);
      } else {
        setData([]);
        setMetrics({});
        setLoading(true);
      }
    } catch (e) {
      setData([]);
      setMetrics({});
      setLoading(true);
    }

    const s = io(SOCKET_URL);

    const fetchAndSubscribe = async () => {
      try {
        const response = await apiService.get("/options/chain", {
          symbol: currentSymbol,
        });
        const expiries = response?.allExpiries ?? response?.expiries ?? [];

        if (expiries && expiries.length > 0) {
          const firstExpiry = expiries[0];
          console.log(
            `Subscribing to option chain for ${currentSymbol} at expiry ${firstExpiry}`,
          );
          s.emit("set-filters", {
            symbol: currentSymbol,
            expiry: firstExpiry,
          });
        } else {
          console.warn("No expiries found for symbol", currentSymbol);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching options/chain for OI Analytics:", error);
        setLoading(false);
      }
    };

    s.on("connect", () => {
      fetchAndSubscribe();
    });

    const handleOptionChainData = (response) => {
      setLoading(false);
      if (response && response.data && response.data.length > 0) {
        let chainData = response.data;
        if (response.symbol === "ALL") {
          chainData = chainData.filter((item) => {
            const symMatch =
              item.symbol === currentSymbol || item.name === currentSymbol;
            return symMatch;
          });
        }
        if (chainData.length === 0) return;

        let formattedData = [];

        if (chainData[0]?.option_type) {
          const grouped = {};
          let highestCall = { strike: "-", value: 0 };
          let highestPut = { strike: "-", value: 0 };
          let totalCallOI = 0;
          let totalPutOI = 0;

          chainData.forEach((item) => {
            const strike = Number(item.strike_price || item.strike);
            if (!grouped[strike])
              grouped[strike] = {
                strikePrice: strike,
                callOI: 0,
                putOI: 0,
                pcr: 0,
              };

            const oiValue = Number(item.oi || 0);
            if (item.option_type === "CE") {
              grouped[strike].callOI = oiValue;
              totalCallOI += oiValue;
              if (oiValue > highestCall.value) {
                highestCall = { strike: `${strike} CE`, value: oiValue };
              }
            } else if (item.option_type === "PE") {
              grouped[strike].putOI = oiValue;
              totalPutOI += oiValue;
              if (oiValue > highestPut.value) {
                highestPut = { strike: `${strike} PE`, value: oiValue };
              }
            }
          });

          Object.values(grouped).forEach((g) => {
            g.pcr = g.callOI > 0 ? Number((g.putOI / g.callOI).toFixed(2)) : 0;
          });

          const overallPCR =
            totalCallOI > 0 ? (totalPutOI / totalCallOI).toFixed(2) : 0;

          formattedData = Object.values(grouped).sort(
            (a, b) => a.strikePrice - b.strikePrice,
          );

          setMetrics((prev) => {
            const newMetrics = {
              ...prev,
              highestCallOI: {
                strike: highestCall.strike,
                value: (highestCall.value / 100000).toFixed(1) + "L",
              },
              highestPutOI: {
                strike: highestPut.strike,
                value: (highestPut.value / 100000).toFixed(1) + "L",
              },
              totalOICE: (totalCallOI / 100000).toFixed(2) + " L",
              totalOIPE: (totalPutOI / 100000).toFixed(2) + " L",
              pcrOI: overallPCR,
              expiryDate: chainData[0]?.expiry_date || "-",
              spotPrice:
                response.spotPrice || chainData[0]?.ltp || prev.spotPrice || "-",
              ...response.metrics,
            };

            try {
              localStorage.setItem(`oiAnalytics_${currentSymbol}`, JSON.stringify({
                data: formattedData,
                metrics: newMetrics
              }));
            } catch (e) {
              console.warn("Failed to cache OI Analytics data", e);
            }

            return newMetrics;
          });
        } else {
          formattedData = chainData.map((item) => ({
            strikePrice:
              item.strikePrice || item.strike || item.STRIKE_PRC || 0,
            callOI: item.callOI || item.CE_OI || item.ce_oi || 0,
            putOI: item.putOI || item.PE_OI || item.pe_oi || 0,
            pcr: item.pcr || item.PCR || 0,
          }));

          setMetrics((prev) => {
            try {
              localStorage.setItem(`oiAnalytics_${currentSymbol}`, JSON.stringify({
                data: formattedData,
                metrics: prev
              }));
            } catch (e) {}
            return prev;
          });
        }

        setData(formattedData);
      }
    };

    s.on("option-chain-data", handleOptionChainData);

    return () => {
      s.disconnect();
    };
  }, [currentSymbol]);

  const styles = {
    container: {
      display: "flex",
      flexDirection: "column",
      height: "100%",
      backgroundColor: "var(--bg-primary)",
      color: "var(--text-primary)",
      padding: "20px",
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      overflowY: "auto",
    },
    headerRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "20px",
    },
    title: {
      fontSize: "1.2rem",
      fontWeight: 600,
      color: "var(--text-primary)",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
    },
    rightInfo: {
      display: "flex",
      gap: "20px",
      alignItems: "center",
      backgroundColor: "var(--bg-secondary)",
      padding: "8px 16px",
      borderRadius: "6px",
      border: "1px solid var(--border-color)",
    },
    metricsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(5, 1fr)",
      gap: "12px",
      marginBottom: "24px",
    },
    metricCard: {
      backgroundColor: "var(--bg-secondary)",
      border: "1px solid var(--border-color)",
      borderRadius: "8px",
      padding: "16px 12px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
    },
    metricLabel: {
      fontSize: "0.8rem",
      color: "var(--text-secondary)",
      fontWeight: 500,
    },
    metricValue: {
      fontSize: "1.1rem",
      fontWeight: 600,
      color: "var(--text-primary)",
    },
    chartContainer: {
      width: "100%",
      minHeight: "500px",
      backgroundColor: "var(--bg-secondary)",
      border: "1px solid var(--border-color)",
      borderRadius: "8px",
      padding: "20px",
      marginBottom: "24px",
      boxSizing: "border-box",
    },
    chartHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "20px",
    },
    dominantBadge: (type) => ({
      padding: "6px 12px",
      borderRadius: "4px",
      border: `1px solid ${type === "CALL" ? "#ef4444" : "#22ab94"}`,
      color: type === "CALL" ? "#ef4444" : "#22ab94",
      fontSize: "0.75rem",
      fontWeight: 600,
      letterSpacing: "0.5px",
    }),
    bottomGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(2, 1fr)",
      gap: "16px",
    },
    bottomCard: {
      backgroundColor: "var(--bg-secondary)",
      border: "1px solid var(--border-color)",
      borderRadius: "8px",
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "10px",
    },
  };

  // Custom Tooltip for Recharts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            backgroundColor: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            padding: "12px",
            borderRadius: "6px",
          }}
        >
          <p
            style={{
              margin: "0 0 8px 0",
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            Strike: {label}
          </p>
          {payload.map((entry, index) => (
            <p
              key={index}
              style={{
                color: entry.color,
                margin: "4px 0",
                fontSize: "0.9rem",
              }}
            >
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.headerRow}>
        <div style={styles.title}>Option Chain - Bar Graph View</div>
        <div style={styles.rightInfo}>
          <span style={{ fontWeight: 600 }}>{currentSymbol}</span>
          <span style={{ color: "#ef4444", fontWeight: 600 }}>
            {metrics?.spotPrice || "-"}
          </span>
        </div>
      </div>

      {/* Top Metrics Grid */}
      <div style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <span style={styles.metricLabel}>Spot Price</span>
          <span style={{ ...styles.metricValue, color: "#ef4444" }}>
            {metrics?.spotPrice || "-"}
          </span>
        </div>

        <div style={styles.metricCard}>
          <span style={styles.metricLabel}>PCR (OI)</span>
          <span style={{ ...styles.metricValue, color: "#ef4444" }}>
            {metrics?.pcrOI || "-"}
          </span>
        </div>
        {/* <div style={styles.metricCard}>
          <span style={styles.metricLabel}>Max Pain</span>
          <span style={styles.metricValue}>{metrics?.maxPain || "-"}</span>
        </div> */}
        <div style={styles.metricCard}>
          <span style={styles.metricLabel}>Total OI (CE)</span>
          <span style={{ ...styles.metricValue, color: "#ef4444" }}>
            {metrics?.totalOICE || "-"}
          </span>
        </div>
        <div style={styles.metricCard}>
          <span style={styles.metricLabel}>Total OI (PE)</span>
          <span style={{ ...styles.metricValue, color: "#22ab94" }}>
            {metrics?.totalOIPE || "-"}
          </span>
        </div>
        <div style={styles.metricCard}>
          <span style={styles.metricLabel}>Expiry Date</span>
          <span style={styles.metricValue}>{metrics?.expiryDate || "-"}</span>
        </div>
      </div>

      {/* Chart Section */}
      <div style={styles.chartContainer}>
        <div style={styles.chartHeader}>
          <div style={styles.dominantBadge("CALL")}>CALLS DOMINANT</div>
          <div
            style={{ color: "#eab308", fontWeight: 600, fontSize: "0.9rem" }}
          >
            Spot Price: {metrics?.spotPrice || "-"}
          </div>
          <div style={styles.dominantBadge("PUT")}>PUTS DOMINANT</div>
        </div>

        <div
          style={{
            width: "100%",
            height: "400px",
            background: "transparent",
            position: "relative",
          }}
        >
          {loading ? (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: "10px",
                color: "var(--text-secondary)",
                zIndex: 10,
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  border: "3px solid var(--border-color)",
                  borderTop: "3px solid var(--accent-color)",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              />
              <div>Loading OI Analytics...</div>
              <style>
                {`
                  @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                  }
                `}
              </style>
            </div>
          ) : (
            <div style={{ width: "100%", height: "400px" }}>
              <Bar
                data={{
                  labels: data.map((d) => d.strikePrice),
                  datasets: [
                    {
                      type: "bar",
                      label: "Call OI",
                      data: data.map((d) => d.callOI),
                      backgroundColor: "#ef4444",
                      borderRadius: 2,
                      maxBarThickness: 20,
                      yAxisID: "y",
                    },
                    {
                      type: "bar",
                      label: "Put OI",
                      data: data.map((d) => d.putOI),
                      backgroundColor: "#22ab94",
                      borderRadius: 2,
                      maxBarThickness: 20,
                      yAxisID: "y",
                    },
                    {
                      type: "line",
                      label: "PCR (OI)",
                      data: data.map((d) => d.pcr),
                      borderColor: "#7e57c2",
                      backgroundColor: "#7e57c2",
                      borderDash: [4, 4],
                      pointRadius: 4,
                      pointBackgroundColor: "#7e57c2",
                      yAxisID: "y1",
                      tension: 0.2,
                    },
                  ],
                }}
                plugins={[customDataLabelsPlugin, spotPriceLinePlugin]}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      labels: { color: "var(--text-primary)" },
                    },
                    tooltip: {
                      callbacks: {
                        label: (ctx) =>
                          `${ctx.dataset.label}: ${ctx.dataset.type === "line" ? ctx.parsed.y : ctx.parsed.y.toLocaleString()}`,
                      },
                    },
                    spotPriceLine: {
                      spotPrice: metrics?.spotPrice
                        ? parseFloat(
                            metrics.spotPrice.toString().replace(/,/g, ""),
                          )
                        : null,
                    },
                  },
                  scales: {
                    x: {
                      ticks: { color: "var(--text-primary)", fontSize: 12 },
                      grid: { color: gridColor },
                      title: {
                        display: true,
                        text: "Strike Price",
                        color: "var(--text-primary)",
                      },
                    },
                    y: {
                      type: "linear",
                      position: "left",
                      ticks: {
                        color: "var(--text-primary)",
                        callback: function (value) {
                          return (value / 100000).toFixed(0) + "L";
                        },
                      },
                      grid: { color: gridColor },
                      title: {
                        display: true,
                        text: "Open Interest (OI)",
                        color: "var(--text-primary)",
                      },
                    },
                    y1: {
                      type: "linear",
                      position: "right",
                      ticks: { color: "var(--text-primary)" },
                      grid: { drawOnChartArea: false },
                      title: {
                        display: true,
                        text: "PCR (OI)",
                        color: "var(--text-primary)",
                      },
                    },
                  },
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Metrics Grid */}
      <div style={styles.bottomGrid}>
        <div style={styles.bottomCard}>
          <span
            style={{ color: "#ef4444", fontWeight: 600, fontSize: "0.85rem" }}
          >
            HIGHEST OI (CALL)
          </span>
          <span
            style={{
              fontSize: "1.2rem",
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            {metrics?.highestCallOI?.strike || "-"}
          </span>
          <span style={{ color: "#ef4444", fontWeight: 600 }}>
            {metrics?.highestCallOI?.value || "-"}
          </span>
        </div>
        <div style={styles.bottomCard}>
          <span
            style={{ color: "#22ab94", fontWeight: 600, fontSize: "0.85rem" }}
          >
            HIGHEST OI (PUT)
          </span>
          <span
            style={{ fontSize: "1.2rem", fontWeight: 700, color: "#22ab94" }}
          >
            {metrics?.highestPutOI?.strike || "-"}
          </span>
          <span style={{ color: "#22ab94", fontWeight: 600 }}>
            {metrics?.highestPutOI?.value || "-"}
          </span>
        </div>
        {/* <div style={styles.bottomCard}>
          <span
            style={{ color: "#eab308", fontWeight: 600, fontSize: "0.85rem" }}
          >
            MAX PAIN STRIKE
          </span>
          <span
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "#eab308",
              marginTop: "10px",
            }}
          >
            {metrics?.maxPain || "-"}
          </span>
        </div> */}
      </div>

      <div
        style={{
          marginTop: "20px",
          fontSize: "0.75rem",
          color: "var(--text-secondary)",
        }}
      >
        Note: OI = Open Interest | PCR = Put Call Ratio
      </div>
    </div>
  );
};

export default OIAnalytics;
