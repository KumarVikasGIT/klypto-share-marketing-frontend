const PROMPT_SUGGESTIONS = [
  "EMA 9/21 crossover with long and short signals",
  "RSI 14 mean reversion using 30 and 70 levels",
  "Bollinger Bands 20,2 reversal strategy",
  "MACD crossover strategy with histogram plot",
  "VWAP crossover strategy for intraday trading",
];

function clampNumber(value, fallback, min = 1, max = 500) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function extractMatches(prompt, regex) {
  return [...prompt.matchAll(regex)].map((match) => clampNumber(match[1], 0));
}

function extractSlashPair(prompt, fallbackFast, fallbackSlow) {
  const pair = prompt.match(/(\d+)\s*\/\s*(\d+)/);
  if (!pair) return [fallbackFast, fallbackSlow];
  return [
    clampNumber(pair[1], fallbackFast),
    clampNumber(pair[2], fallbackSlow),
  ];
}

function inferTradeMode(normalizedPrompt) {
  if (
    normalizedPrompt.includes("long only") ||
    normalizedPrompt.includes("only long") ||
    normalizedPrompt.includes("buy only") ||
    normalizedPrompt.includes("no short")
  ) {
    return "long-only";
  }
  if (
    normalizedPrompt.includes("short only") ||
    normalizedPrompt.includes("only short") ||
    normalizedPrompt.includes("sell only") ||
    normalizedPrompt.includes("no long")
  ) {
    return "short-only";
  }
  return "long-short";
}

function buildSignalBlock({ longEntry, shortEntry, mode, longLabel, shortLabel }) {
  if (mode === "long-only") {
    return `buy(${longEntry}, label="${longLabel}")\nexit(${shortEntry}, label="LONG EXIT")`;
  }
  if (mode === "short-only") {
    return `sell(${shortEntry}, label="${shortLabel}")\nexit(${longEntry}, label="SHORT EXIT")`;
  }
  return `buy(${longEntry}, label="${longLabel}")\nsell(${shortEntry}, label="${shortLabel}")`;
}

function buildHeader(prompt, title, assumptions = []) {
  const safePrompt = String(prompt).replace(/\s+/g, " ").trim();
  const assumptionLines = assumptions.length
    ? assumptions.map((item) => `# - ${item}`).join("\n")
    : "# - Adjust parameters, labels, and colors before deploying.";

  return `# Auto-generated strategy from your prompt.\n# Strategy: ${title}\n# Prompt: ${safePrompt}\n# Preloaded: ta, np, pd, df, const(), open, high, low, close, volume, time\n# Assumptions:\n${assumptionLines}\n\n`;
}

function buildEmaSmaStrategy(prompt, normalizedPrompt) {
  const emaValues = extractMatches(normalizedPrompt, /ema\s*(\d+)/g);
  const smaValues = extractMatches(normalizedPrompt, /sma\s*(\d+)/g);
  const [pairFast, pairSlow] = extractSlashPair(normalizedPrompt, 9, 21);

  let fastKind = "ema";
  let slowKind = "ema";
  let fastLength = pairFast;
  let slowLength = pairSlow;

  if (emaValues.length > 0 && smaValues.length > 0) {
    fastKind = "ema";
    slowKind = "sma";
    fastLength = emaValues[0];
    slowLength = smaValues[0];
  } else if (emaValues.length >= 2) {
    fastLength = emaValues[0];
    slowLength = emaValues[1];
  } else if (smaValues.length >= 2) {
    fastKind = "sma";
    slowKind = "sma";
    fastLength = smaValues[0];
    slowLength = smaValues[1];
  } else if (smaValues.length === 1 && emaValues.length === 0) {
    fastKind = "sma";
    slowKind = "sma";
    fastLength = smaValues[0];
    slowLength = clampNumber(smaValues[0] * 2, 21);
  } else if (emaValues.length === 1 && smaValues.length === 0) {
    fastLength = emaValues[0];
    slowLength = clampNumber(emaValues[0] * 2, 21);
  }

  if (fastLength > slowLength) {
    [fastLength, slowLength] = [slowLength, fastLength];
    [fastKind, slowKind] = [slowKind, fastKind];
  }

  const mode = inferTradeMode(normalizedPrompt);
  const fastFn = fastKind === "sma" ? "ta.sma" : "ta.ema";
  const slowFn = slowKind === "sma" ? "ta.sma" : "ta.ema";
  const fastName = `${fastKind.toUpperCase()} ${fastLength}`;
  const slowName = `${slowKind.toUpperCase()} ${slowLength}`;
  const title = `${fastName} / ${slowName} crossover`;

  const code = `${buildHeader(prompt, title, [
    "Generated a crossover strategy from the moving-average keywords in your prompt.",
    "Long entries trigger when the fast line crosses above the slow line.",
    "Short entries trigger when the fast line crosses below the slow line.",
  ])}def run_strategy():
    fast_line = ${fastFn}(close, length=${fastLength})
    slow_line = ${slowFn}(close, length=${slowLength})

    long_entry = ta.crossover(fast_line, slow_line)
    short_entry = ta.crossunder(fast_line, slow_line)

    plot("${fastName}", fast_line, color="#22c55e", pane="overlay")
    plot("${slowName}", slow_line, color="#f59e0b", pane="overlay")

    ${buildSignalBlock({
      longEntry: "long_entry",
      shortEntry: "short_entry",
      mode,
      longLabel: "LONG",
      shortLabel: "SHORT",
    }).replace(/\n/g, "\n    ")}

run_strategy()
`;

  return {
    title,
    code,
    reply: `I generated a ${title} strategy and loaded it into the editor. Fast/slow lengths are ${fastLength}/${slowLength}.`,
  };
}

function buildRsiStrategy(prompt, normalizedPrompt) {
  const rsiMatch = normalizedPrompt.match(/rsi\s*(\d+)/);
  const levelMatches = extractMatches(normalizedPrompt, /\b(10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90)\b/g);
  const rsiLength = clampNumber(rsiMatch?.[1], 14);
  let oversold = 30;
  let overbought = 70;

  if (levelMatches.length >= 2) {
    const sorted = [...levelMatches].sort((left, right) => left - right);
    oversold = sorted[0];
    overbought = sorted[sorted.length - 1];
  }

  const useTrendLevel = normalizedPrompt.includes("trend") || normalizedPrompt.includes("50 level");
  const mode = inferTradeMode(normalizedPrompt);
  const title = useTrendLevel
    ? `RSI ${rsiLength} 50-level trend`
    : `RSI ${rsiLength} mean reversion`;

  const signalLogic = useTrendLevel
    ? {
        longEntry: "ta.crossover(rsi_value, middle_line)",
        shortEntry: "ta.crossunder(rsi_value, middle_line)",
      }
    : {
        longEntry: "ta.crossover(rsi_value, oversold_line)",
        shortEntry: "ta.crossunder(rsi_value, overbought_line)",
      };

  const code = `${buildHeader(prompt, title, [
    "Generated an RSI strategy from the momentum keywords in your prompt.",
    useTrendLevel
      ? "This version uses the 50 level as the trend pivot."
      : `This version uses ${oversold}/${overbought} as oversold/overbought thresholds.`,
    "Reference levels are created with const() so plots stay chart-length safe.",
  ])}def run_strategy():
    rsi_value = ta.rsi(close, length=${rsiLength})
    overbought_line = const(${overbought})
    middle_line = const(50)
    oversold_line = const(${oversold})

    long_entry = ${signalLogic.longEntry}
    short_entry = ${signalLogic.shortEntry}

    plot("RSI ${rsiLength}", rsi_value, color="#3b82f6", pane="oscillator")
    plot("Overbought", overbought_line, color="#ef4444", pane="oscillator")
    plot("Middle", middle_line, color="#9ca3af", pane="oscillator")
    plot("Oversold", oversold_line, color="#22c55e", pane="oscillator")

    ${buildSignalBlock({
      longEntry: "long_entry",
      shortEntry: "short_entry",
      mode,
      longLabel: "RSI LONG",
      shortLabel: "RSI SHORT",
    }).replace(/\n/g, "\n    ")}

run_strategy()
`;

  return {
    title,
    code,
    reply: `I generated an ${title} strategy and loaded it into the editor with ${oversold}/${overbought} reference levels.`,
  };
}

function buildBollingerStrategy(prompt, normalizedPrompt) {
  const lengthMatch = normalizedPrompt.match(/bollinger(?:\s+bands)?(?:\s+|.*?length\s*=)(\d+)/);
  const stdMatch = normalizedPrompt.match(/(?:std|deviation|multiplier)\s*(?:=|of)?\s*(\d+(?:\.\d+)?)/);
  const length = clampNumber(lengthMatch?.[1], 20);
  const std = Number(stdMatch?.[1] || 2);
  const mode = inferTradeMode(normalizedPrompt);
  const title = `Bollinger Bands ${length}, ${std}`;

  const code = `${buildHeader(prompt, title, [
    "Generated a Bollinger Bands reversal strategy from your prompt.",
    "Long entries trigger on lower-band crosses and short entries on upper-band crosses.",
    "Bands are plotted on the main price chart.",
  ])}def run_strategy():
    bb = ta.bbands(close, length=${length}, std=${std})
    bb_upper = bb["BBU_${length}_${Number(std).toFixed(1)}"]
    bb_middle = bb["BBM_${length}_${Number(std).toFixed(1)}"]
    bb_lower = bb["BBL_${length}_${Number(std).toFixed(1)}"]

    long_entry = ta.crossover(close, bb_lower)
    short_entry = ta.crossunder(close, bb_upper)

    plot("BB Upper", bb_upper, color="#ef4444", pane="overlay")
    plot("BB Middle", bb_middle, color="#f59e0b", pane="overlay")
    plot("BB Lower", bb_lower, color="#22c55e", pane="overlay")

    ${buildSignalBlock({
      longEntry: "long_entry",
      shortEntry: "short_entry",
      mode,
      longLabel: "BB LONG",
      shortLabel: "BB SHORT",
    }).replace(/\n/g, "\n    ")}

run_strategy()
`;

  return {
    title,
    code,
    reply: `I generated a ${title} strategy and loaded it into the editor using lower/upper band cross signals.`,
  };
}

function buildMacdStrategy(prompt, normalizedPrompt) {
  const values = extractSlashPair(normalizedPrompt, 12, 26);
  const signalMatch = normalizedPrompt.match(/signal\s*(\d+)/);
  const fast = clampNumber(values[0], 12);
  const slow = clampNumber(values[1], 26);
  const signal = clampNumber(signalMatch?.[1], 9);
  const mode = inferTradeMode(normalizedPrompt);
  const title = `MACD ${fast}/${slow}/${signal}`;

  const code = `${buildHeader(prompt, title, [
    "Generated a MACD crossover strategy from your prompt.",
    "Signals use MACD line crossovers against the signal line.",
    "Histogram is plotted for quick momentum context.",
  ])}def run_strategy():
    macd_data = ta.macd(close, fast=${fast}, slow=${slow}, signal=${signal})
    macd_line = macd_data["MACD_${fast}_${slow}_${signal}"]
    signal_line = macd_data["MACDs_${fast}_${slow}_${signal}"]
    histogram = macd_data["MACDh_${fast}_${slow}_${signal}"]

    long_entry = ta.crossover(macd_line, signal_line)
    short_entry = ta.crossunder(macd_line, signal_line)

    plot("MACD", macd_line, color="#3b82f6", pane="momentum")
    plot("MACD Signal", signal_line, color="#f59e0b", pane="momentum")
    plot("MACD Histogram", histogram, color="#22c55e", pane="momentum")

    ${buildSignalBlock({
      longEntry: "long_entry",
      shortEntry: "short_entry",
      mode,
      longLabel: "MACD LONG",
      shortLabel: "MACD SHORT",
    }).replace(/\n/g, "\n    ")}

run_strategy()
`;

  return {
    title,
    code,
    reply: `I generated a ${title} strategy and loaded it into the editor with MACD, signal, and histogram plots.`,
  };
}

function buildVwapStrategy(prompt, normalizedPrompt) {
  const mode = inferTradeMode(normalizedPrompt);
  const title = "VWAP crossover";

  const code = `${buildHeader(prompt, title, [
    "Generated a VWAP crossover strategy from your prompt.",
    "Long entries trigger when price crosses above VWAP.",
    "Short entries trigger when price crosses below VWAP.",
  ])}def run_strategy():
    vwap_line = ta.vwap(high, low, close, volume)

    long_entry = ta.crossover(close, vwap_line)
    short_entry = ta.crossunder(close, vwap_line)

    plot("VWAP", vwap_line, color="#8b5cf6", pane="overlay")

    ${buildSignalBlock({
      longEntry: "long_entry",
      shortEntry: "short_entry",
      mode,
      longLabel: "VWAP LONG",
      shortLabel: "VWAP SHORT",
    }).replace(/\n/g, "\n    ")}

run_strategy()
`;

  return {
    title,
    code,
    reply: "I generated a VWAP crossover strategy and loaded it into the editor.",
  };
}

function buildSupertrendStrategy(prompt, normalizedPrompt) {
  const lengthMatch = normalizedPrompt.match(/supertrend.*?(\d+)/);
  const multiplierMatch = normalizedPrompt.match(/multiplier\s*(?:=|of)?\s*(\d+(?:\.\d+)?)/);
  const length = clampNumber(lengthMatch?.[1], 10);
  const multiplier = Number(multiplierMatch?.[1] || 3);
  const multiplierLabel = Number(multiplier).toFixed(1);
  const mode = inferTradeMode(normalizedPrompt);
  const title = `Supertrend ${length}, ${multiplier}`;

  const code = `${buildHeader(prompt, title, [
    "Generated a Supertrend strategy from your prompt.",
    "Entries use Supertrend direction flips across zero.",
    "The trend line is plotted on the price chart.",
  ])}def run_strategy():
    supertrend_data = ta.supertrend(high, low, close, length=${length}, multiplier=${multiplier})
    trend_line = supertrend_data["SUPERT_${length}_${multiplierLabel}"]
    direction = supertrend_data["SUPERTd_${length}_${multiplierLabel}"]

    long_entry = ta.crossover(direction, 0)
    short_entry = ta.crossunder(direction, 0)

    plot("Supertrend", trend_line, color="#22c55e", pane="overlay")

    ${buildSignalBlock({
      longEntry: "long_entry",
      shortEntry: "short_entry",
      mode,
      longLabel: "ST LONG",
      shortLabel: "ST SHORT",
    }).replace(/\n/g, "\n    ")}

run_strategy()
`;

  return {
    title,
    code,
    reply: `I generated a ${title} strategy and loaded it into the editor using Supertrend direction flips.`,
  };
}

function buildBreakoutStrategy(prompt, normalizedPrompt) {
  const lookbackMatch = normalizedPrompt.match(/(\d+)\s*(?:bar|candle|period)?\s*breakout/);
  const lookback = clampNumber(lookbackMatch?.[1], 20);
  const mode = inferTradeMode(normalizedPrompt);
  const title = `${lookback}-bar breakout`;

  const code = `${buildHeader(prompt, title, [
    "Generated a price breakout strategy from your prompt.",
    "Entries use the rolling highest high and lowest low.",
    "This works well as a baseline momentum template.",
  ])}def run_strategy():
    breakout_high = ta.highest(high, ${lookback})
    breakout_low = ta.lowest(low, ${lookback})

    long_entry = ta.crossover(close, breakout_high)
    short_entry = ta.crossunder(close, breakout_low)

    plot("Breakout High", breakout_high, color="#ef4444", pane="overlay")
    plot("Breakout Low", breakout_low, color="#22c55e", pane="overlay")

    ${buildSignalBlock({
      longEntry: "long_entry",
      shortEntry: "short_entry",
      mode,
      longLabel: "BO LONG",
      shortLabel: "BO SHORT",
    }).replace(/\n/g, "\n    ")}

run_strategy()
`;

  return {
    title,
    code,
    reply: `I generated a ${title} strategy and loaded it into the editor using rolling breakout levels.`,
  };
}

function buildFallbackStrategy(prompt) {
  const title = "EMA 9/21 crossover";
  const code = `${buildHeader(prompt, title, [
    "I did not detect a specific indicator family, so I used a safe default crossover template.",
    "You can keep the structure and swap indicators or lengths quickly.",
    "If you want a different style, mention RSI, MACD, Bollinger, VWAP, Supertrend, or breakout.",
  ])}def run_strategy():
    fast_line = ta.ema(close, length=9)
    slow_line = ta.ema(close, length=21)

    long_entry = ta.crossover(fast_line, slow_line)
    short_entry = ta.crossunder(fast_line, slow_line)

    plot("EMA 9", fast_line, color="#22c55e", pane="overlay")
    plot("EMA 21", slow_line, color="#f59e0b", pane="overlay")

    buy(long_entry, label="LONG")
    sell(short_entry, label="SHORT")

run_strategy()
`;

  return {
    title,
    code,
    reply: "I generated a default EMA 9/21 crossover strategy and loaded it into the editor. Mention a specific indicator to make it more targeted.",
  };
}

export function generateStrategyFromPrompt(prompt) {
  const cleanedPrompt = String(prompt || "").trim();
  const normalizedPrompt = cleanedPrompt.toLowerCase();

  if (!cleanedPrompt) {
    return buildFallbackStrategy(
      "Create a default EMA crossover strategy with editable parameters.",
    );
  }

  if (
    normalizedPrompt.includes("bollinger") ||
    normalizedPrompt.includes("bbands") ||
    normalizedPrompt.includes("band")
  ) {
    return buildBollingerStrategy(cleanedPrompt, normalizedPrompt);
  }

  if (normalizedPrompt.includes("macd")) {
    return buildMacdStrategy(cleanedPrompt, normalizedPrompt);
  }

  if (normalizedPrompt.includes("supertrend")) {
    return buildSupertrendStrategy(cleanedPrompt, normalizedPrompt);
  }

  if (normalizedPrompt.includes("vwap")) {
    return buildVwapStrategy(cleanedPrompt, normalizedPrompt);
  }

  if (normalizedPrompt.includes("breakout") || normalizedPrompt.includes("highest high")) {
    return buildBreakoutStrategy(cleanedPrompt, normalizedPrompt);
  }

  if (normalizedPrompt.includes("rsi")) {
    return buildRsiStrategy(cleanedPrompt, normalizedPrompt);
  }

  if (
    normalizedPrompt.includes("ema") ||
    normalizedPrompt.includes("sma") ||
    normalizedPrompt.includes("moving average") ||
    normalizedPrompt.includes("crossover")
  ) {
    return buildEmaSmaStrategy(cleanedPrompt, normalizedPrompt);
  }

  return buildFallbackStrategy(cleanedPrompt);
}

export { PROMPT_SUGGESTIONS };
