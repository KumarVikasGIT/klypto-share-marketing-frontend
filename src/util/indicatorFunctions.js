export function resolvePaneKey(type) {
  const baseType = type.startsWith("CUSTOM_")
    ? type.replace("CUSTOM_", "")
    : type;

  switch (baseType) {
    case "RSI":
    case "MACD":
    case "ATR":
    case "AROON":
    case "ADX":
    case "CCI":
    case "ROC":
    case "MFI":
    case "WPR":
    case "AO":
    case "CHOP":
    case "FT":
    case "EOM":
    case "MOM":
    case "UO":
    case "PVI":
    case "NVI":
    case "STOCHRSI":
    case "STOCH":
    case "CMO":
    case "HV":
    case "PVO":
    case "OBV":
    case "STDDEV":
    case "AD":
    case "TRIX":
    case "VP":
    case "BBW":
    case "KVO":
    case "AWO":
    case "BBPERB":
    case "SUPERSMOOTHER":
    case "HEALTHY_BOX":
    case "HMA60_BOX_DISTANCE":
    case "BODY915DNA":
    case "TR":
      return type; // Return full type to keep panes separate
    default:
      return "Main"; // Plot overlay indicators on the main chart
  }
}
export const PANE_INDICATORS = new Set([
  "RSI",
  "FT",
  "MACD",
  "STDDEV",
  "CCI",
  "ROC",
  "WPR",
  "UO",
  "AROON",
  "HV",
  "AO",
  "CMO",
  "TRIX",
  "VP",
  "KO",
  "ATR",
  "ADX",
  "MFI",
  "EOM",
  "PVI",
  "NVI",
  "CHOP",
  "STOCHRSI",
  "STOCH",
  "MOM",
  "PVO",
  "AD",
  "OBV",
  "BBW",
  "CMF",
  "KVO",
  "AWO",
  "BBPERB",
  "TR",
  "SUPERSMOOTHER",
  "HEALTHY_BOX",
  "BODY915DNA",
  "HMA60_BOX_DISTANCE",
]);

export let indicatorConfigDefault = {
  SMA: {
    length: 9,
    source: "close",
    offset: 0,
    maType: "none",
    maLength: 14,
    bbStdDev: 2,
  },
  EMA: {
    length: 9,
    source: "close",
    offset: 0,
    maType: "none",
    maLength: 14,
    bbStdDev: 2,
  },
  WMA: {
    length: 9,
    source: "close",
    offset: 0,
  },
  HMA: {
    length: 9,
    source: "close",
  },
  DEMA: {
    length: 9,
    source: "close",
  },
  TEMA: {
    length: 9,
  },
  AD: {
    length: 14,
  },
  KAMA: {
    ERlength: 10,
    fastLength: 2,
    slowLength: 30,
    source: "close",
  },
  ICHIMOKU: {
    conversionLength: 9,
    baseLength: 26,
    spanBLength: 52,
    laggingSpan: 26,
  },
  PSAR: {
    start: 0.02,
    increment: 0.02,
    maxValue: 0.02,
  },
  SUPERTREND: {
    atrLength: 10,
    factor: 3,
  },
  AROON: {
    length: 14,
  },
  VWMA: {
    length: 20,
    source: "close",
    offset: 0,
  },
  AO: {
    length: 14,
  },
  ADX: {
    smoothing: 14,
    diLength: 14,
  },
  CKS: {
    atrLength: 10,
    atrCoefficient: 1,
    stopLength: 9,
  },
  RSI: {
    length: 14,
    source: "close",
    maType: "SMA",
    maLength: 14,
    bbStdDev: 2,
  },
  STOCH: {
    kLength: 14,
    kSmoothing: 1,
    dSmoothing: 3,
  },
  STOCHRSI: {
    lengthRSI: 14,
    source: "close",
    length: 14,
    kSmoothing: 3,
    dSmoothing: 3,
  },
  MACD: {
    source: "close",
    fastLength: 12,
    slowLength: 26,
    signalLength: 9,
    oscillatorMAType: "EMA",
    signalMAType: "EMA",
  },
  CCI: {
    length: 20,
    source: "hlc3",
    maType: "SMA",
    maLength: 14,
    bbStdDev: 2,
  },
  MOM: {
    length: 10,
    source: "close",
  },
  ROC: {
    length: 9,
    source: "close",
  },
  WPR: {
    length: 14,
    source: "close",
  },
  UO: {
    fastLength: 7,
    middleLength: 14,
    slowLength: 28,
  },
  CMO: {
    length: 9,
    source: "close",
  },
  TRIX: {
    length: 18,
  },
  FT: {
    length: 9,
  },
  ATR: {
    length: 14,
    smoothing: "RMA",
  },

  VP: {
    maType: "SMA", // or "none"
    maLength: 14,
  },
  BB: {
    length: 20,
    maType: "SMA",
    stdDev: 2,
    source: "close",
    offset: 0,
  },
  BBW: {
    length: 20,
    stdDev: 2,
    source: "close",
    highestExpansionLength: 125,
    lowestContractionLength: 125,
  },
  BBPERB: {
    length: 20,
    stdDev: 2,
    source: "close",
  },
  KC: {
    length: 20,
    source: "close",
    multiplier: 2,
    atrLength: 10,
    bandsStyle: "Average True Range",
    useEMA: true,
  },
  DC: {
    length: 20,
    offset: 0,
  },
  CHOP: {
    length: 14,
    offset: 0,
  },
  STDDEV: {
    length: 20,
    source: "close",
  },
  VOL: {
    maLength: 20,
    colorByPrevious: false,
  },
  HV: {
    length: 10,
  },
  TMA: {
    length: 20,
    source: "close",
  },
  OBV: {
    maType: "none",
    maLength: 14,
    bbStdDev: 2,
  },
  KVO: {
    fastLength: 34,
    slowLength: 55,
    signalLength: 13,
  },
  PVO: {
    fastLength: 12,
    slowLength: 26,
    signalLength: 9,
    oscMaType: "EMA",
    signalMaType: "EMA",
  },
  CMF: {
    length: 20,
  },
  MFI: {
    length: 14,
  },
  EOM: {
    length: 14,
    divisor: 10000,
  },
  RMA: {
    length: 14,
  },
  TR: {
    length: 14,
  },
  NVI: {
    emaLength: 255,
  },
  PVI: {
    emaLength: 255,
  },
  VWAP: {
    hideOnDailyOrAbove: true,
    anchorPeriod: "daily",
    source: "hlc3",
    offset: 0,
    bandMode: "STD",
    band1: { enabled: true, multiplier: 1 },
    band2: { enabled: false, multiplier: 2 },
    band3: { enabled: false, multiplier: 3 },
  },
  ZIGZAG: {
    deviation: 5,
    depth: 10,
  },
  SSL_HYBRID: {
    type: "SSL_HYBRID",
    maType: "HMA",
    baseLen: 60,
    src: "close",
    multy: 0.2,
    useTrueRange: true,
    ssl2Type: "JMA",
    ssl2Len: 5,
    atrCrit: 0.9,
    ssl3Type: "HMA",
    ssl3Len: 15,
    atrLen: 14,
    atrMult: 1.0,
    atrSmoothing: "WMA",
    showAtrBands: true,
    riskLookback: 100,
    riskSensitivity: 2.0,
    enableRiskGradient: true,
    phase: 3,
    power: 1,
    kijunDivider: 1,
    volatilityLookback: 10,
    beta: 0.8,
    feedback: false,
    feedbackWeighting: 0.5,
    superSmootherLength: 20,
    superSmootherPoles: 2,
    displayMode: "FULL_DISPLAY",
  },
  MA_RIBBON: {
    ma1: {
      enabled: true,
      type: "EMA",
      source: "close",
      length: 20,
    },
    ma2: {
      enabled: true,
      type: "SMA",
      source: "hl2",
      length: 50,
    },
    ma3: {
      enabled: true,
      type: "WMA",
      source: "close",
      length: 100,
    },
    ma4: {
      enabled: true,
      type: "VWMA",
      source: "close",
      length: 200,
    },
  },
  SUPERSMOOTHER: {
    smoothingLength: 5,
    fastLength: 20,
    slowLength: 50,
    source: "close",
    atrLength: 20,
    atrMultiplier: 1.2,
    signalSensitivity: 0.03,
  },
  HEALTHY_BOX: {
    atrLength: 14,
    atrMultiplier: 0.25,
    minBodyBox: 1.5,
    maxWickBody: 0.6,
    maxOneWick: 0.45,
  },
  BODY915DNA: {
    lookback915: 60,
    boxDivisor: 10.0,
    marketHour: 9,
    marketMinute: 15,
    showTable: true,
  },
  HMA60_BOX_DISTANCE: {
    hullLength: 60,
    atrLength: 14,
    boxAtrMult: 0.25,
    minTick: 0.05,
    upperZone: 5.0,
    lowerZone: -5.0,
  },
  
};

export let indicatorStyleDefault = {
  RSI: {
    rsi: {
      color: "rgba(38,166,154,1)",
      width: 2,
      visible: true,
    },
    smoothingMA: {
      color: "rgba(255,193,7,1)",
      width: 2,
      visible: true,
    },
    bbUpper: {
      color: "rgba(255,152,0,1)",
      width: 1,
      visible: true,
    },
    bbLower: {
      color: "rgba(255,152,0,1)",
      width: 1,
      visible: true,
    },
    bandFill: {
      visible: true,
      topFillColor1: "rgba(140,120,255,0.05)",
      topFillColor2: "rgba(140,120,255,0.05)",
    },

    obFill: {
      visible: true,
      topFillColor1: "rgba(38,166,106,0.1)",
      topFillColor2: "rgba(38,166,106,0.2)",
    },

    osFill: {
      visible: true,
      bottomFillColor1: "rgba(239,83,80,0.1)",
      bottomFillColor2: "rgba(239,83,80,0.4)",
    },

    bbFill: {
      visible: true,
      topFillColor1: "rgba(76,175,80,0.2)",
      bottomFillColor1: "rgba(76,175,80,0.05)",
    },
  },
  KVO: {
    kvoLine: {
      color: "rgba(33,150,243,1)", // blue
      width: 2,
      lineStyle: 0,
      visible: true,
    },
    signalLine: {
      color: "rgba(255,152,0,1)", // orange
      width: 2,
      lineStyle: 0,
      visible: true,
    },
  },
  SMA: {
    sma: {
      color: "rgba(0, 140, 255, 1)",
      width: 2,
      lineStyle: 0,
      visible: true,
    },
    smoothingMA: {
      visible: true,
      color: "rgba(255,202,28,1)",
      width: 1,
      lineStyle: 0,
    },
    bbUpper: {
      visible: true,
      color: "rgba(239,83,80,1)",
      width: 1,
      lineStyle: 0,
    },
    bbLower: {
      visible: true,
      color: "rgba(38,166,154,1)",
      width: 1,
      lineStyle: 0,
    },
    bbFill: {
      visible: true,
      topFillColor1: "rgba(76,175,80,0.2)",
      bottomFillColor1: "rgba(76,175,80,0.05)",
    },
  },
  TMA: {
    tmaLine: {
      color: "rgba(156,39,176,1)",
      width: 2,
      lineStyle: 0,
      visible: true,
    },
  },
  RMA: {
    rmaLine: {
      color: "rgba(33,150,243,1)",
      width: 2,
      lineStyle: 0,
      visible: true,
    },
  },
  TR: {
    trLine: {
      color: "rgba(33,150,243,1)",
      width: 2,
      lineStyle: 0,
      visible: true,
    },
  },

  BBW: {
    bbwLine: {
      color: "rgba(33,150,243,1)",
      width: 2,
      lineStyle: 0,
      visible: true,
    },
    highest: {
      color: "rgba(244,67,54,1)",
      width: 1,
      lineStyle: 2,
      visible: true,
    },

    lowest: {
      color: "rgba(0,200,83,1)",
      width: 1,
      lineStyle: 2,
      visible: true,
    },
  },
  BBPERB: {
    percentB: {
      color: "rgba(33,150,243,1)",
      width: 2,
      lineStyle: 0,
      visible: true,
    },
    overbought: {
      color: "rgba(244,67,54,1)",
      width: 1,
      lineStyle: 2,
      visible: true,
    },
    middleBand: {
      color: "rgba(255,193,7,1)",
      width: 1,
      lineStyle: 1,
      visible: true,
    },
    oversold: {
      color: "rgba(0,200,83,1)",
      width: 1,
      lineStyle: 2,
      visible: true,
    },
    middleBg: {
      color: "rgba(255,193,7,0.1)",
      visible: true,
    },
    overboughtBg: {
      color: "rgba(244,67,54,0.1)",
      visible: true,
    },
    oversoldBg: {
      color: "rgba(0,200,83,0.1)",
      visible: true,
    },
  },

  STDDEV: {
    stddev: {
      color: "rgba(33,150,243,1)",
      width: 2,
      lineStyle: 0,
      visible: true,
    },
  },

  OBV: {
    obv: {
      color: "rgba(156,39,176,1)",
      width: 1,
      lineStyle: 0,
      visible: true,
    },
    smoothingMA: {
      color: "rgba(255,193,7,1)",
      width: 1,
      lineStyle: 0,
      visible: true,
    },
    bbUpper: {
      color: "rgba(0,200,83,1)",
      width: 1,
      lineStyle: 0,
      visible: true,
    },
    bbLower: {
      color: "rgba(255,82,82,1)",
      width: 1,
      lineStyle: 0,
      visible: true,
    },
    bbFill: {
      visible: true,
      topFillColor1: "rgba(76,175,80,0.2)",
      bottomFillColor1: "rgba(76,175,80,0.05)",
    },
  },

  ICHIMOKU: {
    conversionLine: {
      color: "rgba(41,98,255,1)",
      width: 1,
      lineStyle: 0,
      visible: true,
    },
    baseLine: {
      color: "rgba(255,109,0,1)",
      width: 1,
      lineStyle: 0,
      visible: true,
    },
    leadLine1: {
      color: "rgba(63,81,181,1)",
      width: 1,
      lineStyle: 0,
      visible: true,
    },
    leadLine2: {
      color: "rgba(216,27,96,1)",
      width: 1,
      lineStyle: 0,
      visible: true,
    },
    laggingSpan: {
      color: "rgba(156,39,176,1)",
      width: 1,
      lineStyle: 0,
      visible: true,
    },
    kumoCloudUpper: {
      color: "rgba(130, 132, 141,1)",
      width: 1,
      lineStyle: 0,
      visible: true,
    },
    kumoCloudLower: {
      color: "rgba(130, 132, 141,1)",
      width: 1,
      lineStyle: 0,
      visible: true,
    },
    cloudFillBullish: {
      color: "rgba(67,160,71,0.35)",
      opacity: 35,
      visible: true,
    },
    cloudFillBearish: {
      color: "rgba(244,67,54,0.35)",
      opacity: 35,
      visible: true,
    },
  },
  CHOP: {
    chopLine: {
      visible: true,
      color: "rgba(33,150,243,1)",
      width: 1,
      lineStyle: 0,
    },

    upper: {
      value: 61.8,
      visible: true,
      color: "rgba(239,83,80,1)",
      width: 1,
      lineStyle: 2,
    },

    middle: {
      value: 50,
      visible: true,
      color: "rgba(38,166,154,1)",
      width: 1,
      lineStyle: 2,
    },

    lower: {
      value: 38.2,
      visible: true,
      color: "rgba(38,166,154,1)",
      width: 1,
      lineStyle: 2,
    },

    bg: {
      visible: true,
      topFillColor1: "rgba(38,166,154,0.15)",
      topFillColor2: "rgba(38,166,154,0.05)",
    },
  },
  ZIGZAG: {
    z: {
      color: "rgba(38,166,154,1)",
      width: 2,
      lineStyle: 0,
      opacity: 100,
      visible: true,
    },
  },
  EMA: {
    ema: {
      color: "rgba(255, 255, 255, 1)",
      width: 1,
      lineStyle: 0,
      opacity: 100,
      visible: true,
    },
    smoothingMA: {
      visible: true,
      color: "rgba(255, 202, 28,1)",
      width: 1,
      lineStyle: 0,
      opacity: 100,
    },
    bbUpper: {
      visible: true,
      color: "rgba(239,83,80,1)",
      width: 1,
      lineStyle: 0,
      opacity: 100,
    },

    bbLower: {
      visible: true,
      color: "rgba(38,166,154,1)",
      width: 1,
      lineStyle: 0,
      opacity: 100,
    },
    bbFill: {
      visible: true,
      topFillColor1: "rgba(76,175,80,0.2)",
      bottomFillColor1: "rgba(76,175,80,0.05)",
    },
  },
  WMA: {
    wma: {
      color: "rgba(255, 255, 255, 1)",
      width: 1,
      lineStyle: 0,
      opacity: 100,
      visible: true,
    },
  },
  HMA: {
    hma: {
      visible: true,
      color: "rgba(0,0,255,1)",
      width: 1,
      lineStyle: 0,
      opacity: 100,
    },
  },
  DEMA: {
    dema: {
      color: "rgba(255, 255, 255, 1)",
      width: 1,
      lineStyle: 0,
      opacity: 100,
      visible: true,
    },
  },
  TEMA: {
    tema: {
      color: "rgba(255, 255, 255, 1)",
      width: 1,
      lineStyle: 0,
      opacity: 100,
      visible: true,
    },
  },
  SUPERTREND: {
    upTrend: {
      color: "rgba(38,166,154,1)",
      width: 1,
      lineStyle: 0,
      visible: true,
      opacity: 100,
    },
    downTrend: {
      color: "rgba(239,83,80,1)",
      width: 1,
      lineStyle: 0,
      visible: true,
      opacity: 100,
    },
    bodyMiddle: {
      color: "rgba(100, 16, 236,1)",
      width: 1,
      lineStyle: 0,
      visible: true,
      opacity: 100,
    },
    upTrendBg: {
      topFillColor1: "rgba(38,166,154,0.2)",
      topFillColor2: "rgba(38,166,154,0.05)",
      visible: true,
    },
    downTrendBg: {
      topFillColor1: "rgba(239,83,80,0.2)",
      topFillColor2: "rgba(239,83,80,0.05)",
      visible: true,
    },
  },
  AROON: {
    aroonUp: {
      color: "rgba(38,166,154,1)",
      width: 1,
      lineStyle: 0,
      visible: true,
      opacity: 100,
    },
    aroonDown: {
      color: "rgba(239,83,80,1)",
      width: 1,
      lineStyle: 0,
      visible: true,
      opacity: 100,
    },
  },
  AO: {
    oscillator: {
      visible: true,
      palette: {
        up: "rgba(38,166,154,1)", // bullish
        down: "rgba(239,83,80,1)", // bearish
      },
      width: 1,
      lineStyle: 0,
      opacity: 100,
    },
    center: {
      visible: true,
      value: 0,
      color: "rgba(158,158,158,1)",
      width: 1,
      lineStyle: 2,
      opacity: 100,
    },
    upperLevel: {
      visible: true,
      value: 90,
      color: "rgba(158,158,158,1)",
      width: 1,
      lineStyle: 2,
      opacity: 100,
    },
    lowerLevel: {
      visible: true,
      value: -90,
      color: "rgba(158,158,158,1)",
      width: 1,
      lineStyle: 2,
      opacity: 100,
    },

    oscillatorFill: {
      visible: true,
      palette: {
        topFillColor1: "rgba(38,166,154,0.25)",
        topFillColor2: "rgba(239,83,80,0.25)",
      },
    },
  },
  VWMA: {
    vwmaLine: {
      color: "rgba(33,150,243,1)",
      width: 2,
      lineStyle: 0,
      visible: true,
    },
  },
  ADX: {
    adx: {
      color: "rgba(250, 35, 6, 1)",
      width: 1,
      lineStyle: 0,
      visible: true,
      opacity: 100,
    },
  },
  CCI: {
    cciLine: {
      color: "rgba(38,166,154,1)",
      width: 1,
      lineStyle: 0,
      visible: true,
      opacity: 100,
    },

    cciMa: {
      color: "rgba(255,152,0,1)",
      width: 1,
      lineStyle: 0,
      visible: true,
      opacity: 100,
    },

    upperBand: {
      color: "rgba(38,166,154,1)",
      width: 1,
      lineStyle: 2,
      visible: true,
      value: 100,
    },

    middleBand: {
      color: "rgba(158,158,158,1)",
      width: 1,
      lineStyle: 2,
      visible: true,
      value: 0,
    },

    lowerBand: {
      color: "rgba(38,166,154,1)",
      width: 1,
      lineStyle: 2,
      visible: true,
      value: -100,
    },

    bgFill: {
      topFillColor1: "rgba(38,166,154,0.05)",
      topFillColor2: "rgba(38,166,154,0.05)",
      visible: true,
    },

    bbUpper: {
      color: "rgba(33,150,243,1)",
      width: 1,
      lineStyle: 0,
      visible: true,
    },

    bbLower: {
      color: "rgba(33,150,243,1)",
      width: 1,
      lineStyle: 0,
      visible: true,
    },

    bbFill: {
      topFillColor1: "rgba(33,150,243,0.15)",
      topFillColor2: "rgba(33,150,243,0.05)",
      visible: true,
    },
  },
  MOM: {
    momentum: {
      visible: true,
      color: "rgba(33, 150, 243, 1)",
      width: 1,
      lineStyle: 0,
      opacity: 100,
    },
  },
  ROC: {
    roc: {
      color: "rgba(33,150,243,1)",
      width: 2,
      lineStyle: 0,
      visible: true,
      opacity: 100,
    },
    zeroLine: {
      color: "rgba(158,158,158,1)",
      width: 1,
      lineStyle: 2,
      visible: true,
      value: 0,
    },
  },
  WPR: {
    r: {
      visible: true,
      color: "rgba(38,166,154,1)",
      width: 2,
      lineStyle: 0,
      opacity: 100,
    },

    upperBand: {
      visible: true,
      color: "rgba(239,83,80,1)",
      width: 1,
      lineStyle: 2,
      value: -20,
    },
    middleBand: {
      visible: true,
      color: "rgba(158,158,158,1)",
      width: 1,
      lineStyle: 2,
      value: -50,
    },
    lowerBand: {
      visible: true,
      color: "rgba(38,166,154,1)",
      width: 1,
      lineStyle: 2,
      value: -80,
    },
    bg: {
      visible: true,
      topFillColor1: "rgba(38,166,154,0.08)",
      topFillColor2: "rgba(38,166,154,0.02)",
    },
  },
  ATR: {
    atr: {
      visible: true,
      color: "rgba(255, 165, 255,1)",
      width: 2,
      lineStyle: 0,
      opacity: 100,
    },
  },
  STOCH: {
    k: {
      visible: true,
      color: "rgba(38,166,154,1)",
      width: 1,
      lineStyle: 0,
      opacity: 100,
    },
    d: {
      visible: true,
      color: "rgba(255,152,0,1)",
      width: 1,
      lineStyle: 0,
      opacity: 100,
    },
    upperBand: {
      value: 80,
      visible: true,
      color: "rgba(120,123,134,0.6)",
      width: 1,
      lineStyle: 2,
    },
    middleBand: {
      value: 50,
      visible: true,
      color: "rgba(120,123,134,0.5)",
      width: 1,
      lineStyle: 2,
    },
    lowerBand: {
      value: 20,
      visible: true,
      color: "rgba(120,123,134,0.6)",
      width: 1,
      lineStyle: 2,
    },
    bgFill: {
      visible: true,
      topFillColor1: "rgba(41,98,255,0.12)",
      topFillColor2: "rgba(41,98,255,0.05)",
    },
  },
  MFI: {
    mfiLine: {
      color: "rgba(41, 98, 255, 1)",
      width: 2,
      lineStyle: 0,
      visible: true,
      opacity: 1,
    },

    upperBand: {
      value: 80,
      color: "rgba(120, 123, 134, 0.8)",
      width: 1,
      lineStyle: 2,
      visible: true,
    },

    middleBand: {
      value: 50,
      color: "rgba(120, 123, 134, 0.6)",
      width: 1,
      lineStyle: 2,
      visible: true,
    },

    lowerBand: {
      value: 20,
      color: "rgba(120, 123, 134, 0.8)",
      width: 1,
      lineStyle: 2,
      visible: true,
    },
    bgFill: {
      visible: true,
      topFillColor1: "rgba(41, 98, 255, 0.25)",
      topFillColor2: "rgba(41, 98, 255, 0.08)",
    },
  },
  AWO: {
    awoBars: {
      visible: true,
      palette: {
        up: "rgba(38,166,154,0.6)",
        down: "rgba(239,83,80,0.6)",
      },
    },
  },
  VOL: {
    volumeBars: {
      visible: true,
      palette: {
        up: "rgba(38,166,154,0.6)",
        down: "rgba(239,83,80,0.6)",
      },
    },
    volumeMA: {
      color: "rgba(255,193,7,1)",
      width: 2,
      lineStyle: 0,
      visible: true,
    },
  },
  VP: {
    volume: {
      color: "rgba(38,166,154,1)",
      visible: true,
    },
    volumeMA: {
      color: "rgba(255,193,7,1)",
      width: 2,
      visible: true,
    },
  },
  PSAR: {
    psar: {
      visible: true,
      color: "rgba(41, 98, 255, 1)",
      width: 1,
      opacity: 100,
    },
  },
  PVO: {
    histogram: {
      visible: true,
      palette: {
        color0: "rgba(0, 150, 136, 1)",
        color1: "rgba(178, 223, 219, 1)",
        color2: "rgba(244, 67, 54, 1)",
        color3: "rgba(239, 83, 80, 1)",
      },
    },

    pvo: {
      visible: true,
      color: "rgba(33, 150, 243, 1)",
      width: 1,
      lineStyle: 0,
    },
    signal: {
      visible: true,
      color: "rgba(255, 152, 0, 1)",
      width: 1,
      lineStyle: 0,
    },
    zero: {
      visible: true,
      value: 0,
      color: "rgba(120, 120, 120, 0.6)",
      width: 1,
      lineStyle: 2,
    },
  },
  AD: {
    ad: {
      color: "rgba(156,39,176,1)",
      width: 1,
      lineStyle: 0,
      visible: true,
    },
  },
  DC: {
    upper: {
      visible: true,
      color: "rgba(239,83,80,1)", // red
      width: 1,
      lineStyle: 0, // solid
    },
    basis: {
      visible: true,
      color: "rgba(38,166,154,1)", // teal
      width: 1,
      lineStyle: 0, // solid
    },
    lower: {
      visible: true,
      color: "rgba(38,166,154,1)", // teal
      width: 1,
      lineStyle: 0, // solid
    },
    bbFill: {
      visible: true,
      topFillColor1: "rgba(76,175,80,0.2)",
      bottomFillColor1: "rgba(76,175,80,0.05)",
    },
  },
  KC: {
    upper: {
      color: "rgba(33,150,243,1)",
      width: 1,
      lineStyle: 0,
      visible: true,
    },
    middle: {
      color: "rgba(33,150,243,1)",
      width: 1,
      lineStyle: 0,
      visible: true,
    },
    lower: {
      color: "rgba(33,150,243,1)",
      width: 1,
      lineStyle: 0,
      visible: true,
    },
    bbFill: {
      visible: true,
      topFillColor1: "rgba(76,175,80,0.2)",
      bottomFillColor1: "rgba(76,175,80,0.05)",
    },
  },

  EOM: {
    eom: {
      color: "rgba(38, 166, 154, 1)",
      width: 1,
      lineStyle: 0,
      visible: true,
    },
  },
  BB: {
    upper: {
      color: "rgba(33,150,243,1)",
      width: 1,
      lineStyle: 0,
      visible: true,
    },
    lower: {
      color: "rgba(244,67,54,1)",
      width: 1,
      lineStyle: 0,
      visible: true,
    },
    basis: {
      color: "rgba(6, 150, 14, 1)",
      width: 1,
      lineStyle: 0,
      visible: true,
    },
    bbFill: {
      visible: true,
      topFillColor1: "rgba(76,175,80,0.2)",
      bottomFillColor1: "rgba(76,175,80,0.05)",
    },
  },
  UO: {
    uoLine: {
      color: "rgba(33,150,243,1)", // blue
      width: 2,
      lineStyle: 0,
      visible: true,
    },
  },
  PVI: {
    pvi: {
      color: "rgba(41,98,255,1)",
      width: 2,
      lineStyle: 0,
      visible: true,
    },
    pviEma: {
      color: "rgb(153, 166, 38)",
      width: 1,
      lineStyle: 0,
      visible: true,
    },
  },
  MACD: {
    macd: {
      visible: true,
      color: "rgba(33,150,243,1)",
      width: 1,
      lineStyle: 0,
    },

    signal: {
      visible: true,
      color: "rgba(255,193,7,1)",
      width: 1,
      lineStyle: 0,
    },

    histogram: {
      visible: true,
      palette: {
        pr: "rgba(38,166,154,1)",
        pf: "rgba(129,199,132,1)",
        nf: "rgba(239,83,80,1)",
        nr: "rgba(255,138,128,1)",
      },
    },

    zeroLine: {
      visible: true,
      color: "rgba(150,150,150,0.5)",
      width: 1,
      value: 0,
      lineStyle: 2,
    },
  },
  VWAP: {
    vwap: {
      color: "rgba(255, 193, 7, 1)",
      width: 1,
      lineStyle: 0,
      visible: true,
    },

    upperBand1: {
      color: "rgba(33,150,243,1)",
      width: 1,
      lineStyle: 0,
      visible: true,
    },

    lowerBand1: {
      color: "rgba(33,150,243,1)",
      width: 1,
      lineStyle: 0,
      visible: true,
    },

    bandFill1: {
      color: "rgba(33,150,243,0.15)",
      visible: true,
    },

    upperBand2: {
      color: "rgba(156,39,176,1)",
      width: 1,
      lineStyle: 0,
      visible: true,
    },

    lowerBand2: {
      color: "rgba(156,39,176,1)",
      width: 1,
      lineStyle: 0,
      visible: true,
    },

    bandFill2: {
      color: "rgba(156,39,176,0.12)",
      visible: true,
    },

    upperBand3: {
      color: "rgba(244,67,54,1)",
      width: 1,
      lineStyle: 0,
      visible: true,
    },

    lowerBand3: {
      color: "rgba(244,67,54,1)",
      width: 1,
      lineStyle: 0,
      visible: true,
    },

    bandFill3: {
      color: "rgba(244,67,54,0.10)",
      visible: true,
    },
  },
  CKS: {
    long: {
      color: "rgba(33,150,243,1)",
      width: 2,
      lineStyle: 0,
      visible: true,
    },
    short: {
      color: "rgba(244,67,54,1)",
      width: 2,
      lineStyle: 0,
      visible: true,
    },
  },
  HV: {
    hv: {
      visible: true,
      color: "rgba(255,152,0,1)",
      width: 2,
      lineStyle: 0,
    },
  },
  CMF: {
    cmfLine: {
      color: "rgba(255,193,7,1)",
      width: 2,
      lineStyle: 0,
      visible: true,
    },
    zeroLine: {
      color: "rgba(158,158,158,1)",
      width: 1,
      lineStyle: 2,
      visible: true,
      value: 0,
    },
  },
  NVI: {
    nvi: {
      color: "rgba(41,98,255,1)",
      width: 2,
      lineStyle: 0,
      visible: true,
    },
    nviEma: {
      color: "rgba(38,166,154,1)",
      width: 1,
      lineStyle: 0,
      visible: true,
    },
  },
  STOCHRSI: {
    kLine: {
      visible: true,
      color: "rgba(38,166,154,1)",
      width: 1,
      lineStyle: 0,
      opacity: 100,
    },
    dLine: {
      visible: true,
      color: "rgba(255,152,0,1)",
      width: 1,
      lineStyle: 0,
      opacity: 100,
    },

    upperBand: {
      value: 80,
      visible: true,
      color: "rgba(120,123,134,0.6)",
      width: 1,
      lineStyle: 2,
    },

    middleBand: {
      value: 50,
      visible: true,
      color: "rgba(120,123,134,0.5)",
      width: 1,
      lineStyle: 2,
    },

    lowerBand: {
      value: 20,
      visible: true,
      color: "rgba(120,123,134,0.6)",
      width: 1,
      lineStyle: 2,
    },

    bgFill: {
      visible: true,
      topFillColor1: "rgba(41,98,255,0.12)",
      topFillColor2: "rgba(41,98,255,0.05)",
    },
  },
  CMO: {
    cmoLine: {
      color: "rgba(38,166,154,1)",
      width: 2,
      lineStyle: 0,
      visible: true,
    },
    zeroLine: {
      value: 0,
      color: "rgba(158,158,158,1)",
      width: 1,
      lineStyle: 2,
      visible: true,
    },
  },
  TRIX: {
    trixLine: {
      color: "rgba(33,150,243,1)",
      width: 2,
      lineStyle: 0,
      visible: true,
    },

    zeroLine: {
      value: 0,
      color: "rgba(158,158,158,1)",
      width: 1,
      lineStyle: 2,
      visible: true,
    },
  },
  FT: {
    fisherLine: {
      color: "rgba(38,166,154,1)",
      width: 2,
      lineStyle: 0,
      visible: true,
    },
    triggerLine: {
      color: "rgba(255,152,0,1)",
      width: 2,
      lineStyle: 0,
      visible: true,
    },
    level1_5: {
      color: "rgba(239,83,80,1)",
      width: 1,
      lineStyle: 2,
      visible: true,
      value: 1.5,
    },
    level0_75: {
      color: "rgba(255,183,77,1)",
      width: 1,
      lineStyle: 2,
      visible: true,
      value: 0.75,
    },
    level0: {
      color: "rgba(158,158,158,1)",
      width: 1,
      lineStyle: 2,
      visible: true,
      value: 0,
    },
    level_minus0_75: {
      color: "rgba(129,199,132,1)",
      width: 1,
      lineStyle: 2,
      visible: true,
      value: -0.75,
    },
    level_minus1_5: {
      color: "rgba(38,166,154,1)",
      width: 1,
      lineStyle: 2,
      visible: true,
      value: -1.5,
    },
  },
  SSL_HYBRID: {
    baseline: {
      visible: true,
      color: "rgba(0, 140, 255, 1)",
      width: 2,
      lineStyle: 0,
    },
    upperChannel: {
      visible: true,
      color: "rgba(38,166,154,1)",
      width: 1,
      lineStyle: 2,
    },
    lowerChannel: {
      visible: true,
      color: "rgba(239,83,80,1)",
      width: 1,
      lineStyle: 2,
    },
    ssl1: {
      visible: true,
      color: "rgba(76,175,80,1)",
      width: 2,
      lineStyle: 0,
    },
    ssl2: {
      visible: true,
      color: "rgba(244,67,54,1)",
      width: 2,
      lineStyle: 0,
    },
    atrUpper: {
      visible: false,
      color: "rgba(0,200,83,1)",
      width: 1,
      lineStyle: 1,
    },
    atrLower: {
      visible: false,
      color: "rgba(213,0,0,1)",
      width: 1,
      lineStyle: 1,
    },
    exitArrows: {
      visible: true,
      upColor: "rgba(76,175,80,1)",
      downColor: "rgba(244,67,54,1)",
    },
    signalDiamonds: {
      visible: true,
      bullishColor: "rgba(0,200,83,1)",
      bearishColor: "rgba(213,0,0,1)",
    },
    baselineFill: {
      visible: true,
      topFillColor1: "rgba(33,150,243,0.15)",
      bottomFillColor1: "rgba(33,150,243,0.03)",
    },
  },
  MA_RIBBON: {
    ma1: {
      color: "rgba(255,255,255,1)",
      width: 1,
      lineStyle: 0,
      opacity: 100,
      visible: true,
    },
    ma2: {
      color: "rgba(255,202,28,1)",
      width: 1,
      lineStyle: 0,
      opacity: 100,
      visible: true,
    },
    ma3: {
      color: "rgba(38,166,154,1)",
      width: 1,
      lineStyle: 0,
      opacity: 100,
      visible: true,
    },
    ma4: {
      color: "rgba(239,83,80,1)",
      width: 1,
      lineStyle: 0,
      opacity: 100,
      visible: true,
    },
  },
  SUPERSMOOTHER: {
    oscillator: {
      color: "rgba(1,255,0,1)",
      width: 2,
      visible: true,
    },

    signalLine: {
      color: "rgba(255,107,53,1)",
      width: 1,
      visible: true,
    },

    histogram: {
      color: "rgba(255,20,147,0.28)",
      visible: true,
      palette: {
        pr: "rgba(0,255,127,0.7)",
        pf: "rgba(255, 0, 140, 0.7)",
      },
    },

    buySignals: {
      color: "rgba(0,255,0,1)",
      visible: true,
    },

    sellSignals: {
      color: "rgba(255,0,0,1)",
      visible: true,
    },

    strongBuySignals: {
      color: "rgba(124,252,0,1)",
      visible: true,
    },

    strongSellSignals: {
      color: "rgba(128,0,0,1)",
      visible: true,
    },

    zeroLine: {
      color: "rgba(128,128,128,1)",
      width: 1,
      visible: true,
    },
  },
  HEALTHY_BOX: {
    directionalScore: {
      color: "rgba(255,165,0,1)",
      width: 1,
      visible: true,
    },
    bodyBoxes: {
      color: "rgba(33,150,243,1)", // blue
      width: 2,
      visible: true,
    },
    totalWickBoxes: {
      color: "rgba(255,235,59,1)", // yellow
      width: 2,
      visible: true,
    },
    bullSignals: {
      color: "rgba(0,255,0,1)",
      visible: true,
    },
    bearSignals: {
      color: "rgba(255,0,0,1)",
      visible: true,
    },
    zeroLine: {
      color: "rgba(128,128,128,1)",
      width: 1,
      visible: true,
      value: 0,
    },
    strongHealthyLine: {
      color: "rgba(76,175,80,1)", // green
      width: 1,
      visible: true,
      value: 80,
    },
    healthyLine: {
      color: "rgba(255,152,0,1)", // orange
      width: 1,
      visible: true,
      value: 60,
    },
    healthyBearLine: {
      color: "rgba(255,152,0,1)", // orange
      width: 1,
      visible: true,
      value: -60,
    },
    strongBearLine: {
      color: "rgba(244,67,54,1)", // red
      width: 1,
      visible: true,
      value: -80,
    },
  },
  BODY915DNA: {
    directionalBodyBoxes: {
      color: "rgba(128,128,128,1)", // changes dynamically in markers
      visible: true,
    },

    avgBoxes: {
      color: "rgba(255,255,0,1)", // Yellow
      width: 2,
      visible: true,
    },

    maxBoxes: {
      color: "rgba(0,255,0,1)", // Green
      width: 2,
      visible: true,
    },

    minBoxes: {
      color: "rgba(255,0,0,1)", // Red
      width: 2,
      visible: true,
    },

    bodyPercentile: {
      color: "rgba(0,255,255,1)", // Aqua
      width: 2,
      visible: true,
    },

    expansionScore: {
      color: "rgba(128,0,128,1)", // Purple
      width: 2,
      visible: true,
    },

    zScore: {
      color: "rgba(255,165,0,1)", // Orange
      width: 2,
      visible: true,
    },

    bullSignals: {
      color: "rgba(0,255,0,1)", // Lime
      visible: true,
    },

    bearSignals: {
      color: "rgba(255,0,0,1)", // Red
      visible: true,
    },

    monsterSignals: {
      color: "rgba(255,0,255,1)", // Fuchsia
      visible: true,
    },

    zeroLine: {
      color: "rgba(128,128,128,1)",
      width: 1,
      visible: true,
      value: 0,
    },

    avgZone: {
      color: "rgba(255,165,0,1)",
      width: 1,
      visible: true,
      value: 10,
    },

    avgZoneBearish: {
      color: "rgba(255,165,0,1)",
      width: 1,
      visible: true,
      value: -10,
    },
  },
  HMA60_BOX_DISTANCE: {
    highToHmaBoxes: {
      color: "rgba(0,255,0,1)", // Green
      width: 2,
      visible: true,
    },

    lowToHmaBoxes: {
      color: "rgba(255,0,0,1)", // Red
      width: 2,
      visible: true,
    },

    closeToHmaBoxes: {
      color: "rgba(0,102,255,1)", // Blue
      width: 1,
      visible: true,
    },

    upperZone: {
      color: "rgba(0,255,0,0.4)",
      width: 1,
      visible: true,
    },

    lowerZone: {
      color: "rgba(255,0,0,0.4)",
      width: 1,
      visible: true,
    },

    upperSignals: {
      color: "rgba(0,255,0,1)",
      visible: true,
    },

    lowerSignals: {
      color: "rgba(255,0,0,1)",
      visible: true,
    },

    zeroLine: {
      color: "rgba(128,128,128,1)",
      width: 1,
      visible: true,
    },
  },
  VOLATILITY_MOMENTUM_PRO: {
    openingRangeHigh: {
      color: "rgba(0,200,83,1)",
      width: 2,
      visible: true,
    },

    openingRangeLow: {
      color: "rgba(244,67,54,1)",
      width: 2,
      visible: true,
    },

    upperChannel: {
      color: "rgba(255,152,0,1)",
      width: 2,
      visible: true,
    },

    lowerChannel: {
      color: "rgba(255,152,0,1)",
      width: 2,
      visible: true,
    },

    channelFill: {
      visible: true,
      topFillColor1: "rgba(255,152,0,0.12)",
      bottomFillColor1: "rgba(255,152,0,0.12)",
    },

    sharpUpSignals: {
      color: "rgba(0,200,83,1)",
      visible: true,
    },

    sharpDownSignals: {
      color: "rgba(244,67,54,1)",
      visible: true,
    },

    extremeUpSignals: {
      color: "rgba(124,252,0,1)",
      visible: true,
    },

    extremeDownSignals: {
      color: "rgba(128,0,0,1)",
      visible: true,
    },

    highMoveBackground: {
      color: "rgba(255,152,0,0.12)",
      visible: true,
    },

    is915Markers: {
      color: "rgba(255,165,0,1)", // Orange like the image
      visible: true,
    },
  },
};
