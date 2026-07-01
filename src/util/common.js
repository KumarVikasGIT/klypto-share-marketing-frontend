import { useEffect, useState } from "react";
import { FiBarChart2, FiActivity } from "react-icons/fi";
// import * as XLSX from "xlsx";

import {
  MdCandlestickChart,
  MdShowChart,
  MdStackedLineChart,
  MdWaterfallChart,
} from "react-icons/md";
// import { toast } from "react-toastify";

export const ChartProprties = {
  autoSize: true,
  layout: {
    background: { type: "solid", color: "transparent" },
    textColor: "#787b86", // neutral gray works on both
    fontSize: 12,
    fontFamily: "Inter, sans-serif",
  },
  rightPriceScale: {
    minimumWidth: 85,
  },
  timeScale: {
    timeVisible: true,
    secondsVisible: false,
    borderColor: "rgba(120, 123, 134, 0.4)",
    rightBarStaysOnScroll: true,
    rightBarStaysOnScale: true,
    rightBarSpacing: 80,
    barSpacing: 10,
    minBarSpacing: 5,
    fixLeftEdge: false,
    fixRightEdge: false,
    lockVisibleTimeRangeOnResize: true,
    rightEdgeStaysOnScroll: true,
  },
  handleScroll: {
    mouseWheel: true,
    pressedMouseMove: true,
    horzTouchDrag: true,
    vertTouchDrag: true,
  },
  handleScale: {
    mouseWheel: true,
    pinch: true,
    axisPressedMouseMove: true,
    axisDoubleClickReset: true,
  },
  kineticScroll: {
    mouse: true,
    touch: true,
  },
  rightPriceScale: {
    autoScale: true,
    mode: 1,
    scaleMargins: {
      top: 0.2,
      bottom: 0.2,
    },
    borderColor: "rgba(120, 123, 134, 0.4)",
  },
  grid: {
    vertLines: {
      visible: true,
      color: "rgba(120, 123, 134, 0.4)",
      style: 0,
    },
    horzLines: {
      visible: true,
      color: "rgba(120, 123, 134, 0.4)",
      style: 0,
    },
  },
  crosshair: {
    mode: 1,
    vertLine: {
      visible: true,
      labelVisible: true,
      color: "rgba(120, 123, 134, 0.4)",
      width: 1,
      style: 2,
    },
    horzLine: {
      visible: true,
      labelVisible: true,
      color: "var(--border-color)",
      width: 1,
      style: 2,
    },
  },
  attributionLogo: false,
  interaction: {
    mode: 0,
  },
};
export function getIndicatorChartProperties() {
  return {
    ...ChartProprties,
    // height: 0,
    layout: { ...ChartProprties.layout },

    timeScale: {
      ...ChartProprties.timeScale,
      visible: false,
      borderVisible: false,
    },

    rightPriceScale: {
      ...ChartProprties.rightPriceScale,
      visible: true,
      // scaleMargins: { top: 0.1, bottom: 0.1 },
    },

    grid: { ...ChartProprties.grid },
    crosshair: { ...ChartProprties.crosshair },
  };
}

export const MiniChartProprties = {
  width: 620, // small footprint for hover
  height: 280,

  layout: {
    background: { type: "solid", color: "transparent" },
    textColor: "#787b86",
    fontSize: 11,
    fontFamily: "Inter, sans-serif",
  },

  grid: {
    vertLines: { visible: false },
    horzLines: { visible: false },
  },

  crosshair: {
    mode: 0, // Normal crosshair (can disable entirely if desired)
  },

  rightPriceScale: {
    visible: false, // hide price scale
    borderVisible: false,
  },

  leftPriceScale: {
    visible: false,
    borderVisible: false,
  },

  timeScale: {
    visible: false, // hide time axis
    borderVisible: false,
    secondsVisible: false,
  },

  handleScroll: false, // 🔴 disable interactions
  handleScale: false,

  kineticScroll: {
    mouse: false,
    touch: false,
  },

  trackingMode: {
    exitMode: 0,
  },

  rightPriceScale: {
    minimumWidth: 85,
  },
};

export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Set a timer to update the debounced value after a delay
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup function to clear the timeout if the value changes again within the delay
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]); // Rerun effect if value or delay changes

  return debouncedValue;
}

export const TIMEFRAME_TO_SECONDS = {
  "1m": 60,
  "3m": 180,
  "5m": 300,
  "15m": 900,
  "30m": 1800,
  "1h": 3600,
  "2h": 7200,
  "4h": 14400,
  "6h": 21600,
  "1d": 86400,
  "1w": 604800,
};
export const SINGLE_VALUE_CHARTS = ["line", "area", "baseline", "histogram"];

export const chartOptions = [
  { value: "candlestick", label: "Candlestick", icon: MdCandlestickChart },
  { value: "line", label: "Line", icon: MdShowChart },
  { value: "bar", label: "Bar", icon: FiBarChart2 },
  { value: "area", label: "Area", icon: MdStackedLineChart },
  { value: "baseline", label: "Baseline", icon: FiActivity },
  { value: "hollowcandles", label: "Hollow Candles", icon: MdWaterfallChart },
  { value: "heikinashi", label: "Heikin Ashi", icon: MdCandlestickChart },
  { value: "histogram", label: "Histogram", icon: FiBarChart2 },
];

export const getTimeframeLabel = (tf) => {
  if (!tf) return "Daily";

  const value = tf.toLowerCase();

  // 🔥 HANDLE "_ago" FORMAT FIRST
  if (value.includes("_ago")) {
    if (value.includes("m_ago")) return "Monthly";
    if (value.includes("w_ago")) return "Weekly";
    if (value.includes("d_ago")) return "Daily";
    if (value.includes("q_ago")) return "Quarterly";
    if (value.includes("y_ago")) return "Yearly";
  }

  // ⏱️ MINUTES / HOURS (ONLY if NOT _ago)
  if (value.endsWith("m")) return tf; // 1m, 5m → keep same
  if (value.endsWith("h")) return tf; // 1h, 2h → keep same

  // 📅 NORMAL FORMAT
  if (value.includes("mo")) return "Monthly";
  if (value.includes("w")) return "Weekly";
  if (value.includes("d")) return "Daily";
  if (value.includes("q")) return "Quarterly";
  if (value.includes("y")) return "Yearly";

  return tf;
};

// export const symbols = [
//   { label: "BTCUSDT", value: "BTCUSDT" },
//   { label: "ETHUSDT", value: "ETHUSDT" },
//   { label: "BNBUSDT", value: "BNBUSDT" },
//   { label: "SOLUSDT", value: "SOLUSDT" },
//   { label: "XRPUSDT", value: "XRPUSDT" },

//   { label: "ADAUSDT", value: "ADAUSDT" },
//   { label: "DOGEUSDT", value: "DOGEUSDT" },
//   { label: "DOTUSDT", value: "DOTUSDT" },
//   { label: "MATICUSDT", value: "MATICUSDT" },
//   { label: "LTCUSDT", value: "LTCUSDT" },

//   { label: "TRXUSDT", value: "TRXUSDT" },
//   { label: "AVAXUSDT", value: "AVAXUSDT" },
//   { label: "LINKUSDT", value: "LINKUSDT" },
//   { label: "ATOMUSDT", value: "ATOMUSDT" },
//   { label: "UNIUSDT", value: "UNIUSDT" },

//   { label: "ETCUSDT", value: "ETCUSDT" },
//   { label: "FILUSDT", value: "FILUSDT" },
//   { label: "ICPUSDT", value: "ICPUSDT" },
//   { label: "APTUSDT", value: "APTUSDT" },
//   { label: "ARBUSDT", value: "ARBUSDT" },
// ];

export const getSeriesColor = (series) => {
  if (!series || !series.options) return "#999";

  return series.options().color || "#999";
};

export const smartPriceFormatter = (price) => {
  if (price === undefined || price === null) return "";
  const absPrice = Math.abs(price);
  if (absPrice >= 1e9) return price.toExponential(2);
  if (absPrice >= 1e6) return (price / 1e6).toFixed(2) + 'M';
  
  if (absPrice > 0 && absPrice < 0.0001) {
    return Number(price).toFixed(12).replace(/\.?0+$/, "");
  }
  return Number(price).toFixed(2);
};

export const defaultPriceFormat = {
  type: 'custom',
  minMove: 0.00000001,
  formatter: smartPriceFormatter,
};

export const chartSeriesStyles = {
  candlestick: {
    upColor: "#22c55e",
    downColor: "#ef4444",
    borderUpColor: "#22c55e",
    borderDownColor: "#ef4444",
    wickUpColor: "#22c55e",
    wickDownColor: "#ef4444",
    priceFormat: defaultPriceFormat,
  },

  hollowcandles: {
    upColor: "transparent",
    downColor: "#ef4444",
    borderUpColor: "#22c55e",
    borderDownColor: "#ef4444",
    wickUpColor: "#22c55e",
    wickDownColor: "#ef4444",
  },

  line: {
    color: "#fffc50",
  },

  bar: {
    upColor: "#22c55e",
    downColor: "#ef4444",
  },

  area: {
    topColor: "rgba(56, 189, 248, 0.4)",
    bottomColor: "rgba(56, 189, 248, 0.0)",
    lineColor: "#38bdf8",
    priceFormat: defaultPriceFormat,
  },

  baseline: {
    topLineColor: "rgba(34,197,94,1)",
    topFillColor1: "rgba(34,197,94,0.4)",
    topFillColor2: "rgba(34,197,94,0.05)",

    bottomLineColor: "rgba(239,68,68,1)",
    bottomFillColor1: "rgba(239,68,68,0.4)",
    bottomFillColor2: "rgba(239,68,68,0.05)",
    priceFormat: defaultPriceFormat,
  },

  histogram: {
    color: "#22c55e",

    priceFormat: { type: "volume" },
    priceScaleId: "volume",
    scaleMargins: {
      top: 0.7,
      bottom: 0,
    },
    lastValueVisible: true,
  },
};

export const OPERATORS = [
  { label: "Select Operation", value: "" },
  { label: "+", value: "+" },
  { label: "-", value: "-" },
  { label: "*", value: "*" },
  { label: "/", value: "/" },
  { label: "Greater Than (>)", value: ">" },
  { label: "Less Than (<)", value: "<" },
  { label: "Greater Than or Equal (≥)", value: ">=" },
  { label: "Less Than or Equal (≤)", value: "<=" },
  { label: "Equal (=)", value: "==" },
  { label: "Not Equal (≠)", value: "!=" },
  { label: "Crosses Above ⤴", value: "cross_above" },
  { label: "Crosses Below ⤵", value: "cross_below" },
];

export const convertToHeikinAshi = (data) => {
  if (!data || data.length === 0) return [];

  // console.log(data, "dataaaaaaaaaaaaa")
  let prevOpen;
  let prevClose;

  return data?.map((candle, i) => {
    const { open, high, low, close, time } = candle;

    const haClose = (open + high + low + close) / 4;

    let haOpen;

    if (i === 0) {
      // first candle
      haOpen = (open + close) / 2;
    } else {
      haOpen = (prevOpen + prevClose) / 2;
    }

    const haHigh = Math.max(high, haOpen, haClose);
    const haLow = Math.min(low, haOpen, haClose);

    prevOpen = haOpen;
    prevClose = haClose;

    return {
      time,
      open: haOpen,
      high: haHigh,
      low: haLow,
      close: haClose,
    };
  });
};

export const timeframeMap = {
  // ================= MINUTES =================
  "1 minute ago": "1m_ago",
  "one minute ago": "1m_ago",
  "minute ago": "1m_ago",
  "minutes ago": "1m_ago",

  "2 minutes ago": "2m_ago",
  "three minutes ago": "3m_ago",
  "3 minutes ago": "3m_ago",
  "5 minutes ago": "5m_ago",
  "10 minutes ago": "10m_ago",
  "15 minutes ago": "15m_ago",
  "30 minutes ago": "30m_ago",

  // ================= HOURS =================
  "1 hour ago": "1h_ago",
  "one hour ago": "1h_ago",
  "hour ago": "1h_ago",
  "hours ago": "1h_ago",

  "2 hours ago": "2h_ago",
  "3 hours ago": "3h_ago",
  "4 hours ago": "4h_ago",
  "6 hours ago": "6h_ago",
  "8 hours ago": "8h_ago",
  "12 hours ago": "12h_ago",

  // ================= DAYS =================
  "1 day ago": "1d_ago",
  "one day ago": "1d_ago",
  "day ago": "1d_ago",
  "days ago": "1d_ago",

  "2 days ago": "2d_ago",
  "3 day ago": "3d_ago",
  "3 days ago": "3d_ago",

  // ================= WEEKS =================
  "1 week ago": "1w_ago",
  "one week ago": "1w_ago",
  "week ago": "1w_ago",
  "weeks ago": "1w_ago",

  "2 weeks ago": "2w_ago",
  "3 weeks ago": "3w_ago",
  "4 weeks ago": "4w_ago",

  // ================= MONTHS =================
  "1 month ago": "1mth_ago",
  "one month ago": "1mth_ago",
  "month ago": "1mth_ago",
  "months ago": "1mth_ago",

  "2 months ago": "2mth_ago",
  "3 months ago": "3mth_ago",
  "6 months ago": "6mth_ago",
  "12 months ago": "12mth_ago",
};

export const operatorMap = {
  ">": ">",
  "<": "<",
  ">=": ">=",
  "<=": "<=",
  "=": "=",

  "greater than": ">",
  "is greater than": ">",
  "less than": "<",
  "is less than": "<",
  above: ">",
  below: "<",
  equals: "=",
  "is equal to": "=",

  /* ================= ARITHMETIC ================= */
  "+": "+",
  "-": "-",
  "*": "*",
  "/": "/",

  add: "+",
  plus: "+",
  "added to": "+",

  subtract: "-",
  minus: "-",
  "less by": "-",

  multiply: "*",
  multiplied: "*",
  "multiplied by": "*",
  times: "*",

  divide: "/",
  divided: "/",
  "divided by": "/",
};

export const scanCategories = [
  { id: 1, key: "range_breakouts", label: "Range Breakouts scan" },
  { id: 2, key: "fundamental", label: "Fundamental Scans" },
  { id: 3, key: "bullish", label: "Bullish scan" },
  { id: 4, key: "bearish", label: "Bearish scan" },
  { id: 5, key: "intraday_bullish", label: "Intraday Bullish scan" },
  { id: 6, key: "intraday_bearish", label: "Intraday Bearish scan" },
  { id: 7, key: "crossover", label: "Crossover" },
  { id: 8, key: "other", label: "Other Scans" },
];

export const normalizeData = (data) => {
  if (!data || typeof data !== "object") return [];

  const result = [];

  Object.entries(data).forEach(([tf, symbols]) => {
    if (!symbols || typeof symbols !== "object") return;

    Object.entries(symbols).forEach(([symbol, rows]) => {
      if (!Array.isArray(rows)) return;

      rows.forEach((row) => {
        result.push({
          timeframe: tf,
          symbol,
          ...row,
        });
      });
    });
  });

  return result;
};

// export const handleExcelDownload = (data) => {
//   const flat = normalizeData(data);

//   if (!flat.length) {
//     alert("No data available");
//     return;
//   }

//   const worksheet = XLSX.utils.json_to_sheet(flat);
//   const workbook = XLSX.utils.book_new();

//   XLSX.utils.book_append_sheet(workbook, worksheet, "Data");

//   XLSX.writeFile(workbook, "data.xlsx");
// };

// export const handleCSVDownload = (data) => {
//   const flat = normalizeData(data);

//   if (!flat.length) {
//     alert("No data available");
//     return;
//   }

//   const headers = Object.keys(flat[0]);

//   const csv = [
//     headers.join(","),
//     ...flat.map((row) => headers.map((key) => row[key]).join(",")),
//   ].join("\n");

//   const blob = new Blob([csv], { type: "text/csv" });
//   const url = URL.createObjectURL(blob);

//   const a = document.createElement("a");
//   a.href = url;
//   a.download = "data.csv";
//   a.click();
// };

// export const handleCopy = async (data) => {
//   const flat = normalizeData(data);

//   if (!flat.length) {
//     toast.error("No data available");
//     return;
//   }

//   const text = flat.map((row) => Object.values(row).join("\t")).join("\n");

//   try {
//     await navigator.clipboard.writeText(text);
//     toast.success("Copied to clipboard ✅");
//   } catch (err) {
//     console.error(err);
//     toast.error("Failed to copy");
//   }
// };

export const getRowsByIndicator = (indicator, maType, indicatorConfigs) => {
  const baseIndicator = indicator.startsWith("CUSTOM_")
    ? indicator.replace("CUSTOM_", "")
    : indicator;

  switch (baseIndicator) {
    case "SMA": {
      const rows = [{ key: "sma", label: "SMA", type: "line" }];

      if (maType !== "none") {
        rows.push({
          key: "smoothingMA",
          label: "SMA-Based MA",
          type: "line",
        });
      }

      if (maType === "SMA + Bollinger Bands") {
        rows.push(
          {
            key: "bbUpper",
            label: "BB Upper",
            type: "line",
          },
          {
            key: "bbLower",
            label: "BB Lower",
            type: "line",
          },
          {
            key: "bbFill",
            label: "BB Background",
            type: "fill",
          },
        );
      }

      return rows;
    }
    case "EMA": {
      const rows = [{ key: "ema", label: "EMA", type: "line" }];

      if (maType !== "none") {
        rows.push({
          key: "smoothingMA",
          label: "EMA-Based MA",
          type: "line",
        });
      }

      if (maType === "SMA + Bollinger Bands") {
        rows.push(
          {
            key: "bbUpper",
            label: "BB Upper",
            type: "line",
          },
          {
            key: "bbLower",
            label: "BB Lower",
            type: "line",
          },
          {
            key: "bbFill",
            label: "BB Background",
            type: "fill",
            upperKey: "bbUpper",
            lowerKey: "bbLower",
          },
        );
      }

      return rows;
    }
    case "RSI": {
      const rows = [
        { key: "rsi", label: "RSI", type: "line" },
        {
          key: "upper",
          label: "RSI Upper Band",
          value: 70,
        },
        {
          key: "middle",
          label: "RSI Middle Band",
          value: 50,
        },
        {
          key: "lower",
          label: "RSI Lower Band",
          value: 30,
        },
        {
          key: "bandFill",
          label: "RSI Background Fill",
          type: "fill",
          topFillColor1: "rgba(140,120,255,0.05)",
          topFillColor2: "rgba(140,120,255,0.05)",
        },
        {
          key: "obFill",
          label: "Overbought Gradient Fill",
          type: "fill",
        },
        {
          key: "osFill",
          label: "Oversold Gradient Fill",
          type: "fill",
        },
      ];
      if (maType !== "none") {
        rows.push({
          key: "smoothingMA",
          label: "RSI-Based MA",
          type: "line",
        });
      }
      if (maType === "SMA + Bollinger Bands") {
        rows.push(
          {
            key: "bbUpper",
            label: "BB Upper Band",
            type: "line",
            width: 1,
          },
          {
            key: "bbLower",
            label: "BB Lower Band",
            type: "line",
            width: 1,
          },
          {
            key: "bbFill",
            label: "BB Fill Area",
            type: "fill",
          },
        );
      }

      return rows;
    }
    case "WMA":
      return [{ key: "wma", label: "WMA", type: "line" }];
    case "HMA":
      return [{ key: "hma", label: "HMA", type: "line" }];

    case "DEMA":
      return [{ key: "dema", label: "DEMA", type: "line" }];

    case "TEMA":
      return [{ key: "tema", label: "TEMA", type: "line" }];
    case "KAMA":
      return [{ key: "kama", label: "KAMA", type: "line" }];
    case "ICHIMOKU":
      return [
        { key: "conversionLine", label: "Conversion Line", type: "line" },
        { key: "baseLine", label: "Base Line", type: "line" },

        { key: "leadLine1", label: "Leading Span A", type: "line" },
        { key: "leadLine2", label: "Leading Span B", type: "line" },

        { key: "laggingSpan", label: "Lagging Span", type: "line" },

        { key: "kumoCloudUpper", label: "Kumo Cloud Upper Line", type: "line" },
        { key: "kumoCloudLower", label: "Kumo Cloud Lower Line", type: "line" },

        {
          key: "cloudFillBullish",
          label: "Cloud Fill Color ",
          type: "fill",
        },

        // {
        //   key: "cloudFillBearish",
        //   label: "Cloud Fill Color 2",
        //   type: "fill",
        // },
      ];

    case "PSAR":
      return [{ key: "parabolicSAR", label: "Parabolic SAR", type: "line" }];

    case "SUPERTREND":
      return [
        { key: "upTrend", label: "Up Trend", type: "line" },
        {
          key: "downTrend",
          label: "Down Trend",
          type: "line",
        },
        {
          key: "bodyMiddle",
          label: "Body Middle",
          type: "line",
        },
        {
          key: "upTrendBg",
          label: "Up Trend Background",
          type: "fill",
        },
        {
          key: "downTrendBg",
          label: "Down Trend Background",
          type: "fill",
        },
      ];

    case "AROON":
      return [
        { key: "aroonUp", label: "Aroon Up", type: "line" },
        {
          key: "aroonDown",
          label: "Aroon Down",
          type: "line",
        },
      ];
    case "AO":
      return [
        {
          key: "oscillator",
          label: "Oscillator",
          type: "checkbox",
          children: [
            {
              key: "up",
              parent: "oscillator",
              label: "Bullish Color",
              type: "line",
            },
            {
              key: "down",
              parent: "oscillator",
              label: "Bearish Color",
              type: "line",
            },
          ],
        },
        {
          key: "center",
          label: "Center Line",
          type: "line",
          showValue: true,
          value: 0,
        },
        {
          key: "upperLevel",
          label: "Upper Level",
          type: "line",
          showValue: true,
          value: 90,
        },
        {
          key: "lowerLevel",
          label: "Lower Level",
          type: "line",
          showValue: true,
          value: -90,
        },
        {
          key: "oscillatorFill",
          label: "Oscillator Fill",
          type: "checkbox",
          children: [
            {
              key: "topFillColor1",
              parent: "oscillatorFill",
              label: "Bullish Fill",
              type: "fill",
            },
            {
              key: "topFillColor2",
              parent: "oscillatorFill",
              label: "Bearish Fill",
              type: "fill",
            },
          ],
        },
      ];

    case "ADX":
      return [{ key: "adx", label: "ADX", type: "line" }];

    case "CKS":
      return [
        {
          key: "longStop",
          label: "Long Stop",
          type: "line",
          color: "#26a69a", // green
        },
        {
          key: "shortStop",
          label: "Short Stop",
          type: "line",
          color: "#ef5350", // red
        },

        {
          key: "fillArea",
          label: "CKS Fill Area",
          type: "fill",
          color0: "rgba(38,166,154,0.08)", // green light
          color1: "rgba(239,83,80,0.08)", // red light
        },
      ];
    case "TR":
      return [
        {
          key: "trLine",
          label: "True Range",
          type: "line",
        },
      ];
    case "VWMA":
      return [
        {
          key: "vwmaLine",
          label: "VWMA",
          type: "line",
        },
      ];
    case "TMA":
      return [
        {
          key: "tmaLine",
          label: "TMA",
          type: "line",
        },
      ];
    case "STOCH":
      return [
        {
          key: "k",
          label: "%K",
          type: "line",
          visible: true,
        },
        {
          key: "d",
          label: "%D",
          type: "line",
          visible: true,
        },

        {
          key: "upperBand",
          label: "Upper Band",
          type: "band",
          showValue: true,
          value: 80,
          visible: true,
        },

        {
          key: "middleBand",
          label: "Middle Band",
          type: "band",
          showValue: true,
          value: 50,
          visible: true,
        },
        {
          key: "lowerBand",
          label: "Lower Band",
          type: "band",
          showValue: true,
          value: 20,
          visible: true,
        },
        {
          key: "bgFill",
          label: "Background Fill",
          type: "fill",
          visible: true,
        },
      ];
    case "STOCHRSI":
      return [
        { key: "kLine", label: "%K", type: "line" },
        { key: "dLine", label: "%D", type: "line" },

        {
          key: "upperBand",
          label: "Upper Band",
          type: "band",
          showValue: true,
          value: 80,
        },
        {
          key: "middleBand",
          label: "Middle Band",
          type: "band",
          showValue: true,
          value: 50,
        },
        {
          key: "lowerBand",
          label: "Lower Band",
          type: "band",
          showValue: true,
          value: 20,
        },
        {
          key: "bgFill",
          label: "StochRSI Background Fill",
          type: "fill",
        },
      ];

    case "MACD":
      return [
        {
          key: "macd",
          label: "MACD Line",
          type: "line",
          color: "#26a69a",
        },

        {
          key: "signal",
          label: "Signal Line",
          type: "line",
          color: "#ff9800",
        },

        {
          key: "histogram",
          label: "Histogram",
          type: "histogram",

          children: [
            {
              key: "pr",
              parent: "histogram",
              label: "Positive Rising",
              type: "fill",
            },

            {
              key: "pf",
              parent: "histogram",
              label: "Positive Falling",
              type: "fill",
            },

            {
              key: "nf",
              parent: "histogram",
              label: "Negative Falling",
              type: "fill",
            },

            {
              key: "nr",
              parent: "histogram",
              label: "Negative Rising",
              type: "fill",
            },
          ],
        },

        {
          key: "zeroLine",
          label: "Zero Line",
          type: "line",
          value: 0,
        },
      ];

    case "CCI": {
      const rows = [{ key: "cciLine", label: "CCI", type: "line" }];

      if (maType !== "none") {
        rows.push({ key: "cciMa", label: "Smoothing MA", type: "line" });
      }

      rows.push(
        {
          key: "upperBand",
          label: "Upper Level",
          type: "line",
          value: 100,
        },
        {
          key: "middleBand",
          label: "Middle Level",
          type: "line",
          value: 0,
        },
        {
          key: "lowerBand",
          label: "Lower Level",
          type: "line",
          value: -100,
        },
        {
          key: "bgFill",
          label: "Band Fill",
          type: "fill",
        },
      );

      if (maType === "SMA + Bollinger Bands") {
        rows.push(
          { key: "bbUpper", label: "BB Upper", type: "line" },
          { key: "bbLower", label: "BB Lower", type: "line" },
          { key: "bbFill", label: "BB Fill", type: "fill" },
        );
      }

      return rows;
    }
    case "MOM":
      return [{ key: "momentum", label: "Momentum", type: "line" }];

    case "ROC":
      return [
        { key: "roc", label: "ROC", type: "line" },

        {
          key: "zeroLine",
          label: "Zero Line",
          type: "line",
          showValue: false,
          value: 0,
          color: "#9e9e9e",
        },
      ];

    case "WPR":
      return [
        // Lines
        { key: "r", label: "%R", type: "line", color: "#26a69a" },

        // Bands
        {
          key: "upperBand",
          label: "Upper Band",
          type: "band",
          showValue: true,
          value: -20,
          color: "#ef5350",
        },
        {
          key: "middleBand",
          label: "Middle Band",
          type: "band",
          showValue: true,
          value: -50,
          color: "#9e9e9e",
        },
        {
          key: "lowerBand",
          label: "Lower Band",
          type: "band",
          showValue: true,
          value: -80,
          color: "#26a69a",
        },

        // Background
        {
          key: "bg",
          label: "Background",
          type: "fill",
          color0: "rgba(38,166,154,0.05)",
          color1: "rgba(38,166,154,0.05)",
        },
      ];
    case "UO":
      return [
        {
          key: "uoLine",
          label: "Ultimate Oscillator",
          type: "line",
        },
      ];

    case "CMO":
      return [
        { key: "cmoLine", label: "CMO", type: "line", color: "#26A69A" },
        {
          key: "zeroLine",
          label: "Zero Line",
          type: "line",
          value: 0,
          showValue: true,
        },
      ];

    case "TRIX":
      return [
        { key: "trixLine", label: "TRIX", type: "line", color: "#26a69a" },
        {
          key: "zeroLine",
          label: "Zero ",
          type: "line",
          value: 0,
          showValue: true,
          color: "#9e9e9e",
        },
      ];
    case "FT":
      return [
        {
          key: "fisherLine",
          label: "Fisher",
          type: "line",
          color: "#26a69a",
        },
        {
          key: "triggerLine",
          label: "Trigger",
          type: "line",
          color: "#ff9800",
        },
        {
          key: "level1_5",
          label: "Level 1.5",
          type: "line",
          value: 1.5,
          color: "#ef5350",
        },
        {
          key: "level0_75",
          label: "Level 0.75",
          type: "line",
          value: 0.75,
          color: "#ffb74d",
        },
        {
          key: "level0",
          label: "Level 0",
          type: "line",
          value: 0,
          color: "#9e9e9e",
        },
        {
          key: "level_minus0_75",
          label: "Level -0.75",
          type: "line",
          value: -0.75,
          color: "#81c784",
        },
        {
          key: "level_minus1_5",
          label: "Level -1.5",
          type: "line",
          value: -1.5,
          color: "#26a69a",
        },
      ];

    case "KVO":
      return [
        {
          key: "kvoLine",
          label: "Klinger Oscillator",
          type: "line",
          width: 1,
          lineStyle: 0,
          visible: true,
        },

        {
          key: "signalLine",
          label: "Signal Line",
          type: "line",
          width: 1,
          lineStyle: 0,
          visible: true,
        },
      ];
    case "ATR":
      return [{ key: "atr", label: "ATR", type: "line" }];

    case "KC":
      return [
        {
          key: "upper",
          label: "Upper Channel",
          type: "line",
        },
        { key: "middle", label: "Basis Line", type: "line" },
        {
          key: "lower",
          label: "Lower Channel",
          type: "line",
        },
        {
          key: "bbFill",
          label: "Background ",
          type: "fill",
        },
      ];

    case "BB":
      return [
        {
          key: "upper",
          label: "Upper Channel",
          type: "line",
          color: "#ef5350",
        },
        { key: "basis", label: "Basis Line", type: "line", color: "#26a69a" },
        {
          key: "lower",
          label: "Lower Channel",
          type: "line",
          color: "#26a69a",
        },
        {
          key: "bbFill",
          label: "Background ",
          type: "fill",
        },
      ];

    case "BBW":
      return [
        {
          key: "bbwLine",
          label: "Bollinger Band Width",
          type: "line",
        },
        {
          key: "highest",
          label: "Highest Expansion",
          type: "line",
        },
        {
          key: "lowest",
          label: "Lowest Contraction",
          type: "line",
        },
      ];
    case "BBPERB":
      return [
        {
          key: "percentB",
          label: "Bollinger Bands %B",
          type: "line",
        },
        {
          key: "overbought",
          label: "Overbought",
          type: "line",
          value: 1,
        },
        {
          key: "middleBand",
          label: "Middle Band",
          type: "line",
          value: 0.5,
        },
        {
          key: "oversold",
          label: "Oversold",
          type: "line",
          value: 0,
        },
        {
          key: "middleBg",
          label: "Middle Background",
          type: "fill",
        },
        {
          key: "overboughtBg",
          label: "Overbought Background",
          type: "fill",
        },
        {
          key: "oversoldBg",
          label: "Oversold Background",
          type: "fill",
        },
      ];
    case "RMA":
      return [
        {
          key: "rmaLine",
          label: "RMA",
          type: "line",
        },
      ];
    case "DC":
      return [
        // Lines
        {
          key: "upper",
          label: "Upper Channel",
          type: "line",
        },
        { key: "basis", label: "Basis Line", type: "line" },
        {
          key: "lower",
          label: "Lower Channel",
          type: "line",
        },
        {
          key: "bbFill",
          label: "Background ",
          type: "fill",
        },
      ];

    case "CHOP":
      return [
        {
          key: "chopLine",
          label: "Chop",
          type: "line",
        },
        {
          key: "upper",
          label: "Upper Band",
          type: "line",
          showValue: true,
          value: 61.8,
        },
        {
          key: "middle",
          label: "Middle Band",
          type: "line",
          showValue: true,
          value: 50,
        },
        {
          key: "lower",
          label: "Lower Band",
          type: "line",
          showValue: true,
          value: 38.2,
        },
        {
          key: "bg",
          label: "Background ",
          type: "fill",
          color: "rgba(38,166,154,0.1)",
        },
      ];

    case "STDDEV":
      return [
        {
          key: "stddev",
          label: "Plot",
          type: "line",
          color: "#ef5350",
        },
      ];

    case "AWO":
      return [
        {
          key: "awoBars",
          label: "AWO Bars",
          type: "checkbox",
          children: [
            {
              key: "up",
              parent: "awoBars",
              label: "Positive AO",
              type: "fill",
            },
            {
              key: "down",
              parent: "awoBars",
              label: "Negative AO",
              type: "fill",
            },
          ],
        },
      ];

    case "VOL":
      return [
        {
          key: "volumeBars",
          label: "Volume Bars",
          type: "checkbox",
          children: [
            {
              key: "up",
              parent: "volumeBars",
              label: "Growing Volume",
              type: "fill",
            },
            {
              key: "down",
              parent: "volumeBars",
              label: "Falling Volume",
              type: "fill",
            },
          ],
        },
        {
          key: "volumeMA",
          label: "Volume MA",
          type: "line",
          width: 2,
          lineStyle: 0,
          visible: true,
        },
      ];
    case "HV":
      return [
        {
          key: "hv",
          label: "HV",
          type: "line",
          visible: false,
        },
      ];

    case "OBV": {
      const rows = [
        {
          key: "obv",
          label: "On Balance Volume",
          type: "line",
        },
      ];
      if (maType !== "none") {
        rows.push({
          key: "smoothingMA",
          label: "OBV MA",
          type: "line",
        });
      }
      if (maType === "SMA + Bollinger Bands") {
        rows.push(
          {
            key: "bbUpper",
            label: "BB Upper",
            type: "line",
          },
          {
            key: "bbLower",
            label: "BB Lower",
            type: "line",
          },
          {
            key: "bbFill",
            label: "BB Background",
            type: "fill",
          },
        );
      }

      return rows;
    }

    case "PVO":
      return [
        // Histogram with multiple color states
        {
          key: "histogram",
          label: "Histogram",
          type: "histogram",
          children: [
            {
              key: "color0",
              parent: "histogram",
              label: "Positive Rising",
              type: "fill",
            },
            {
              key: "color1",
              parent: "histogram",
              label: "Positive Falling",
              type: "fill",
            },
            {
              key: "color2",
              parent: "histogram",
              label: "Negative Falling",
              type: "fill",
            },
            {
              key: "color3",
              parent: "histogram",
              label: "Negative Rising",
              type: "fill",
            },
          ],
        },

        // PVO Line
        {
          key: "pvo",
          label: "PVO Line",
          type: "line",
        },

        // Signal Line
        {
          key: "signal",
          label: "Signal Line",
          type: "line",
        },

        // Zero Line
        {
          key: "zero",
          label: "Zero Line",
          type: "line",
        },
      ];
    case "AD":
      return [
        {
          key: "accumulationDistribution",
          label: "Accumulation / Distribution",
          type: "line",
          width: 2,
          visible: true,
        },
      ];

    case "CMF":
      return [
        {
          key: "cmfLine",
          label: "CMF",
          type: "line",
          visible: true,
        },
        {
          key: "zeroLine",
          label: "Zero Line",
          type: "line",
          value: 0,
          visible: true,
        },
      ];

    case "MFI":
      return [
        {
          key: "mfiLine",
          label: "MFI",
          type: "line",
          color: "var(--accent-color)",
          width: 2,
          visible: true,
        },

        {
          key: "upperBand",
          label: "Overbought",
          type: "band",
          value: 80,
          showValue: true,
          color: "#EF5350",
        },
        {
          key: "middleBand",
          label: "Middle Band",
          type: "band",
          value: 50,
          showValue: true,
        },
        {
          key: "lowerBand",
          label: "Oversold",
          type: "band",
          value: 20,
          showValue: true,
        },
        {
          key: "bgFill",
          label: "Background",
          type: "fill",
          visible: true,
          topColor: "rgba(239,83,80,0.08)", // overbought zone
          bottomColor: "rgba(38,166,154,0.08)", // oversold zone
        },
      ];
    case "EOM":
      return [
        {
          key: "eom",
          label: "EOM",
          type: "line",
          visible: true,
        },
      ];
    case "NVI":
      return [
        {
          key: "nvi",
          label: "NVI",
          type: "line",
          visible: true,
        },
        {
          key: "nviEma",
          label: "NVI Based EMA",
          type: "line",
          visible: true,
        },
      ];
    case "PVI":
      return [
        {
          key: "pvi",
          label: "PVI",
          type: "line",
          color: "var(--accent-color)",
          visible: true,
        },
        {
          key: "pviEma",
          label: "PVI Based EMA",
          type: "line",
          visible: true,
        },
      ];

    case "VWAP": {
      const config = indicatorConfigs?.[indicator] || {};

      const rows = [
        {
          key: "vwap",
          label: "VWAP",
          type: "line",
          visible: true,
        },
      ];

      /* -------- BAND 1 -------- */

      if (config?.band1?.enabled) {
        rows.push(
          {
            key: "upperBand1",
            label: "Upper Band #1",
            type: "line",
            visible: true,
          },
          {
            key: "lowerBand1",
            label: "Lower Band #1",
            type: "line",
            visible: true,
          },
          {
            key: "bandFill1",
            label: "Bands Fill #1",
            type: "fill",
            visible: true,
            upperKey: "upperBand1",
            lowerKey: "lowerBand1",
          },
        );
      }

      /* -------- BAND 2 -------- */

      if (config?.band2?.enabled) {
        rows.push(
          {
            key: "upperBand2",
            label: "Upper Band #2",
            type: "line",
            visible: true,
          },
          {
            key: "lowerBand2",
            label: "Lower Band #2",
            type: "line",
            visible: true,
          },
          {
            key: "bandFill2",
            label: "Bands Fill #2",
            type: "fill",
            visible: true,
            upperKey: "upperBand2",
            lowerKey: "lowerBand2",
          },
        );
      }

      /* -------- BAND 3 -------- */

      if (config?.band3?.enabled) {
        rows.push(
          {
            key: "upperBand3",
            label: "Upper Band #3",
            type: "line",
            visible: true,
          },
          {
            key: "lowerBand3",
            label: "Lower Band #3",
            type: "line",
            visible: true,
          },
          {
            key: "bandFill3",
            label: "Bands Fill #3",
            type: "fill",
            visible: true,
            upperKey: "upperBand3",
            lowerKey: "lowerBand3",
          },
        );
      }

      return rows;
    }
    case "ZIGZAG":
      return [
        {
          key: "z",
          label: "Zig Zag Line",
          type: "line",
          visible: true,
        },
      ];

    case "VP":
      return [
        {
          key: "vp",
          label: "Volume Profile",
          type: "custom",
        },
        {
          key: "poc",
          label: "POC",
          type: "line",
          showValue: true,
        },
        {
          key: "vah",
          label: "VAH",
          type: "line",
          showValue: true,
        },
        {
          key: "val",
          label: "VAL",
          type: "line",
          showValue: true,
        },
      ];

    case "SSL_HYBRID": {
      return [
        {
          key: "baseline",
          label: "Baseline",
          type: "line",
        },
        {
          key: "upperChannel",
          label: "Upper Channel",
          type: "line",
        },
        {
          key: "lowerChannel",
          label: "Lower Channel",
          type: "line",
        },
        {
          key: "ssl1",
          label: "SSL1",
          type: "line",
        },
        {
          key: "ssl2",
          label: "SSL2",
          type: "line",
        },
        {
          key: "atrUpper",
          label: "+ATR",
          type: "line",
        },
        {
          key: "atrLower",
          label: "-ATR",
          type: "line",
        },
        // {
        //   key: "exitArrows",
        //   label: "Exit Arrows",
        //   type: "marker",
        // },
        // {
        //   key: "signalDiamonds",
        //   label: "Signal Diamonds",
        //   type: "marker",
        // },
        // {
        //   key: "baselineFill",
        //   label: "Baseline Background",
        //   type: "fill",
        // },
      ];
    }
    case "MA_RIBBON":
      return [
        {
          key: "ma1",
          label: "MA #1",
          type: "line",
        },
        {
          key: "ma2",
          label: "MA #2",
          type: "line",
        },
        {
          key: "ma3",
          label: "MA #3",
          type: "line",
        },
        {
          key: "ma4",
          label: "MA #4",
          type: "line",
        },
      ];

    case "SUPERSMOOTHER":
      return [
        {
          key: "oscillator",
          label: "Oscillator",
          type: "line",
          showValue: true,
        },
        {
          key: "signalLine",
          label: "Signal Line",
          type: "line",
          showValue: true,
        },
        {
          key: "histogram",
          label: "Histogram",
          type: "histogram",
          children: [
            {
              key: "pr",
              parent: "histogram",
              label: "Rising",
              type: "fill",
            },
            {
              key: "pf",
              parent: "histogram",
              label: "Falling",
              type: "fill",
            },
          ]
        },
        {
          key: "buySignals",
          label: "Buy Signals",
          type: "marker",
        },
        {
          key: "sellSignals",
          label: "Sell Signals",
          type: "marker",
        },
        {
          key: "strongBuySignals",
          label: "Strong Buy Signals",
          type: "marker",
        },
        {
          key: "strongSellSignals",
          label: "Strong Sell Signals",
          type: "marker",
        },
        {
          key: "zeroLine",
          label: "Zero Line",
          type: "line",
        },
      ];

    case "HEALTHY_BOX":
      return [
        { key: "bullSignals", label: "Healthy Bull Candle", type: "marker" },
        { key: "bearSignals", label: "Healthy Bear Candle", type: "marker" },
        { key: "zeroLine", label: "Zero Line", type: "line", showValue: true },
        {
          key: "strongHealthyLine",
          label: "Strong Healthy Candle",
          type: "line",
          showValue: true,
        },
        {
          key: "healthyLine",
          label: "Healthy Candle",
          type: "line",
          showValue: true,
        },
        {
          key: "healthyBearLine",
          label: "Healthy Bear Candle",
          type: "line",
          showValue: true,
        },
        {
          key: "strongBearLine",
          label: "Strong Bear Candle",
          type: "line",
          showValue: true,
        },
      ];

    case "BODY915DNA":
      return [
        {
          key: "directionalBodyBoxes",
          label: "9:15 Body Boxes",
          type: "line",
          showValue: true,
        },
        {
          key: "avgBoxes",
          label: "Average Body Boxes",
          type: "line",
          showValue: true,
        },
        {
          key: "maxBoxes",
          label: "Past Maximum Body Boxes",
          type: "line",
          showValue: true,
        },
        {
          key: "minBoxes",
          label: "Past Minimum Body Boxes",
          type: "line",
          showValue: true,
        },
        {
          key: "bodyPercentile",
          label: "9:15 Body Percentile",
          type: "line",
          showValue: true,
        },
        {
          key: "expansionScore",
          label: "Body Expansion Score",
          type: "line",
          showValue: true,
        },
        { key: "bullSignals", label: "Healthy Bull 9:15 Body", type: "marker" },
        { key: "bearSignals", label: "Healthy Bear 9:15 Body", type: "marker" },
        { key: "monsterSignals", label: "Monster 9:15 Body", type: "marker" },
        { key: "zeroLine", label: "Zero Line", type: "line", showValue: true },
        {
          key: "avgZone",
          label: "Average 9:15 Body Zone",
          type: "line",
          showValue: true,
        },
        {
          key: "avgZoneBearish",
          label: "Average 9:15 Body Zone Bearish",
          type: "line",
          showValue: true,
        },
      ];

    case "HMA60_BOX_DISTANCE":
      return [
        {
          key: "highToHmaBoxes",
          label: "High → HMA60 Distance",
          type: "line",
          showValue: true,
        },

        {
          key: "lowToHmaBoxes",
          label: "Low → HMA60 Distance",
          type: "line",
          showValue: true,
        },

        {
          key: "closeToHmaBoxes",
          label: "Close → HMA60 Distance",
          type: "line",
          showValue: true,
        },
        {
          key: "upperZone",
          label: "Upper Extreme Zone",
          type: "line",
          showValue: true,
          value: 5,
        },

        {
          key: "lowerZone",
          label: "Lower Extreme Zone",
          type: "line",
          showValue: true,
          value: -5,
        },
        {
          key: "zeroLine",
          label: "Zero Line",
          type: "line",
          showValue: true,
          value: 0,
        },
      ];
    default:
      return [];
  }
};

export const RANGE_INTERVAL_MAPPING = {
  "1D": "1m",
  "5D": "5m",
  "1M": "30m",
  "3M": "1h",
  "6M": "4h",
  YTD: "1d",
  "1Y": "1d",
  "5Y": "1w",
  All: "1d",
};

export const normalizeIndicator = (ind) => {
  if (!ind) return "";

  ind = ind.toLowerCase();

  if (ind.includes("macd")) return "macd";
  if (ind.includes("adx")) return "adx";
  if (ind.includes("bollinger")) return "bb";
  if (ind.includes("donchian")) return "dc";
  if (ind.includes("keltner")) return "kc";
  if (ind.includes("ichimoku")) return "ichimoku";
  if (ind.includes("klinger")) return "kvo";

  return ind;
};

export const INDICATOR_DAYS_MAP = {
  // 🔴 FULL HISTORY (cumulative) → ALWAYS MAX
  obv: 4000,
  ad: 4000,
  nvi: 4000,
  pvi: 4000,

  // 🟡 Volume / session based (need deep history)
  vwap: 2000,
  svp: 2000,
  frvp: 2000,
  volume: 3000,
  "volume oscillator": 500,

  // 🟢 Trend / MA based (buffer added)
  // sma: 200,
  // ema: 200,
  // wma: 200,
  // vwma: 200,
  // hma: 200,
  // rma: 200,
  // tema: 200,
  // tma: 200,
  // kama: 200,

  // // 🟢 Volatility
  // atr: 150,
  // tr: 150,
  // stddev: 150,

  // // 🟢 Momentum
  // rsi: 150,
  // cci: 150,
  // cmo: 150,
  // mom: 150,
  // roc: 150,
  // trix: 200,
  // ft: 200,

  // // 🟢 Volume indicators (non cumulative)
  // cmf: 200,
  // eom: 200,
  // mfi: 200,

  // // 🟢 MACD family
  // macd: 200,

  // // 🟢 ADX family
  // adx: 200,

  // // 🟢 Oscillators
  // ao: 150,
  // awo: 150,
  // aroon: 150,
  // stoch: 150,
  // stochrsi: 150,
  // wpr: 150,

  // // 🟢 Bands / Channels
  // bb: 150,
  // bbw: 150,
  // dc: 150,
  // kc: 150,

  // // 🟢 Supertrend / PSAR
  // supertrend: 200,
  // psar: 150,

  // // 🟢 Ichimoku (IMPORTANT → max 52 lagging span)
  // ichimoku: 200,

  // // 🟢 KVO (long EMA = 55 → needs more buffer)
  // kvo: 250,

  // 🟢 Pivot (daily based, no history needed but safe buffer)
  pivot: 50,

  // 🟢 Misc
  "pivot point": 50,
  "pivot r1": 50,
  "pivot r2": 50,
  "pivot s1": 50,
  "pivot s2": 50,

  // 🟢 Default fallback
  default: 365,
};

export const tfToMinutes = (tf = "") => {
  const clean = tf.toLowerCase();

  const value = parseInt(clean);

  if (clean.includes("y") || clean.includes("yr")) return value * 60 * 24 * 365;
  if (clean.includes("q")) return value * 60 * 24 * 90;
  if (
    clean.includes("M") ||
    clean.includes("mth") ||
    clean.includes("month") ||
    tf === "1M"
  )
    return value * 60 * 24 * 30;
  if (clean.includes("w")) return value * 60 * 24 * 7;
  if (clean.includes("d")) return value * 60 * 24;
  if (clean.includes("h")) return value * 60;
  if (clean.includes("m")) return value;

  return 0;
};

export const getAllTimeframes = (rules = []) => {
  const tfs = [];

  rules.forEach((rule) => {
    if (rule.object1?.timeframe) tfs.push(rule.object1.timeframe);
    if (rule.object2?.timeframe) tfs.push(rule.object2.timeframe);
    if (rule.object3?.timeframe) tfs.push(rule.object3.timeframe);
  });

  return tfs;
};

export const comparisonOps = new Set([
  ">",
  "<",
  ">=",
  "<=",
  "==",
  "!=",
  "cross_above",
  "cross_below",
]);

export const getMaxTimeframe = (tfs = []) => {
  if (!tfs.length) return null;

  return tfs.reduce((max, curr) => {
    return tfToMinutes(curr) > tfToMinutes(max) ? curr : max;
  });
};

export const s = {
  sectionTitle: {
    fontSize: "0.7rem",
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "var(--text-secondary)",
    marginBottom: 10,
    marginTop: 20,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  sectionBar: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 18,
    height: 18,
    borderRadius: 4,
    background: "linear-gradient(135deg,#7c3aed,var(--accent-color))",
    color: "#fff",
    fontSize: "0.6rem",
    fontWeight: 700,
    flexShrink: 0,
  },
  card: {
    background: "var(--bg-primary)",
    border: "1px solid var(--bg-secondary)",
    borderRadius: 10,
    padding: "14px 16px",
    marginBottom: 4,
  },
  label: {
    fontSize: "0.67rem",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--text-secondary)",
    marginBottom: 5,
    display: "block",
  },
  select: {
    background: "var(--bg-secondary)",
    border: "1px solid var(--border-color)",
    borderRadius: 6,
    color: "var(--text-primary)",
    padding: "7px 30px 7px 10px",
    fontSize: "0.85rem",
    width: "100%",
    appearance: "none",
    cursor: "pointer",
    boxSizing: "border-box",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%236b7280' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 10px center",
  },
  input: {
    background: "var(--bg-secondary)",
    border: "1px solid var(--border-color)",
    borderRadius: 6,
    color: "var(--text-secondary)",
    padding: "7px 10px",
    fontSize: "0.85rem",
    width: "100%",
    boxSizing: "border-box",
  },
};

export const formatIST = (timestamp) => {
  if (!timestamp) return "—";

  return new Date(timestamp).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};
