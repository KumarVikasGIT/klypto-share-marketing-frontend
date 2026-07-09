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
    return `signal(${longEntry}, side="BUY", label="${longLabel}")\nsignal(${shortEntry}, side="EXIT", label="LONG EXIT")`;
  }
  if (mode === "short-only") {
    return `signal(${shortEntry}, side="SELL", label="${shortLabel}")\nsignal(${longEntry}, side="EXIT", label="SHORT EXIT")`;
  }
  return `signal(${longEntry}, side="BUY", label="${longLabel}")\nsignal(${shortEntry}, side="SELL", label="${shortLabel}")`;
}

function buildHeader(prompt, title, assumptions = []) {
  const safePrompt = String(prompt).replace(/\s+/g, " ").trim();
  const assumptionLines = assumptions.length
    ? assumptions.map((item) => `# - ${item}`).join("\n")
    : "# - Adjust parameters, labels, and colors before deploying.";

  return `# Auto-generated indicator strategy from your prompt.
# Strategy: ${title}
# Prompt: ${safePrompt}
# Python calculates. JSON describes. Frontend renders.
from chartlab import indicator, input_int, input_float, input_bool, input_color
from chartlab import plot, plot_histogram, hline, fill, signal
import pandas_ta as ta

# Context: ctx.open, ctx.high, ctx.low, ctx.close, ctx.volume, ctx.time
# Settings panel inputs can be added with input_int/input_float/input_bool/input_color.
# Assumptions:
${assumptionLines}

`;
}

function buildIndicatorFunction({ title, pane, body }) {
  return `@indicator(name="${title}", pane="${pane}")\ndef run_strategy(ctx):\n${body}\n`;
}

function indent(lines) {
  return lines
    .trim()
    .split("\n")
    .map((line) => `    ${line}`)
    .join("\n");
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
  const fastName = `${fastKind.toUpperCase()} ${fastLength}`;
  const slowName = `${slowKind.toUpperCase()} ${slowLength}`;
  const title = `${fastName} / ${slowName} crossover`;
  const body = indent(`
fast_line = ctx.ta.${fastKind}(ctx.close, length=${fastLength})
slow_line = ctx.ta.${slowKind}(ctx.close, length=${slowLength})

long_entry = ctx.ta.crossover(fast_line, slow_line)
short_entry = ctx.ta.crossunder(fast_line, slow_line)

plot(fast_line, title="${fastName}", color="#22c55e", width=2)
plot(slow_line, title="${slowName}", color="#f59e0b", width=2)

${buildSignalBlock({
  longEntry: "long_entry",
  shortEntry: "short_entry",
  mode,
  longLabel: "LONG",
  shortLabel: "SHORT",
})}
`);

  return {
    title,
    code:
      buildHeader(prompt, title, [
        "Generated a crossover strategy from the moving-average keywords in your prompt.",
        "Fast/slow lines render on the price chart as overlays.",
      ]) + buildIndicatorFunction({ title, pane: "overlay", body }),
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
  const longEntry = useTrendLevel
    ? "ctx.ta.crossover(rsi_value, 50)"
    : `ctx.ta.crossover(rsi_value, ${oversold})`;
  const shortEntry = useTrendLevel
    ? "ctx.ta.crossunder(rsi_value, 50)"
    : `ctx.ta.crossunder(rsi_value, ${overbought})`;
  const body = indent(`
rsi_value = ctx.ta.rsi(ctx.close, length=${rsiLength})

long_entry = ${longEntry}
short_entry = ${shortEntry}

plot(rsi_value, title="RSI ${rsiLength}", color="#3b82f6", width=2)
hline(${overbought}, "Overbought", color="#ef4444")
hline(50, "Middle", color="#9ca3af")
hline(${oversold}, "Oversold", color="#22c55e")
fill(rsi_value, 50, color_top="rgba(59,130,246,0.28)", color_bottom="rgba(59,130,246,0.02)")

${buildSignalBlock({
  longEntry: "long_entry",
  shortEntry: "short_entry",
  mode,
  longLabel: "RSI LONG",
  shortLabel: "RSI SHORT",
})}
`);

  return {
    title,
    code:
      buildHeader(prompt, title, [
        "Generated an RSI strategy from the momentum keywords in your prompt.",
        useTrendLevel
          ? "This version uses the 50 level as the trend pivot."
          : `This version uses ${oversold}/${overbought} as oversold/overbought thresholds.`,
      ]) + buildIndicatorFunction({ title, pane: "oscillator", body }),
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
  const body = indent(`
bb_middle = ctx.ta.sma(ctx.close, length=${length})
bb_std = ctx.ta.stdev(ctx.close, length=${length})
bb_upper = bb_middle + (bb_std * ${std})
bb_lower = bb_middle - (bb_std * ${std})

long_entry = ctx.ta.crossover(ctx.close, bb_lower)
short_entry = ctx.ta.crossunder(ctx.close, bb_upper)

plot(bb_upper, title="BB Upper", color="#ef4444", width=1)
plot(bb_middle, title="BB Middle", color="#f59e0b", width=1)
plot(bb_lower, title="BB Lower", color="#22c55e", width=1)

${buildSignalBlock({
  longEntry: "long_entry",
  shortEntry: "short_entry",
  mode,
  longLabel: "BB LONG",
  shortLabel: "BB SHORT",
})}
`);

  return {
    title,
    code:
      buildHeader(prompt, title, [
        "Generated a Bollinger Bands reversal strategy from your prompt.",
        "Bands are calculated with SMA and rolling standard deviation inside the sandbox.",
      ]) + buildIndicatorFunction({ title, pane: "overlay", body }),
    reply: `I generated a ${title} strategy and loaded it into the editor using lower/upper band cross signals.`,
  };
}

function buildMacdStrategy(prompt, normalizedPrompt) {
  const values = extractSlashPair(normalizedPrompt, 12, 26);
  const signalMatch = normalizedPrompt.match(/signal\s*(\d+)/);
  const fast = clampNumber(values[0], 12);
  const slow = clampNumber(values[1], 26);
  const signalLength = clampNumber(signalMatch?.[1], 9);
  const mode = inferTradeMode(normalizedPrompt);
  const title = `MACD ${fast}/${slow}/${signalLength}`;
  const body = indent(`
macd_data = ctx.ta.macd(ctx.close, fast=${fast}, slow=${slow}, signal=${signalLength})
macd_line = macd_data["macd"]
signal_line = macd_data["signal"]
histogram = macd_data["histogram"]

long_entry = ctx.ta.crossover(macd_line, signal_line)
short_entry = ctx.ta.crossunder(macd_line, signal_line)

plot(macd_line, title="MACD", color="#3b82f6", width=2)
plot(signal_line, title="MACD Signal", color="#f59e0b", width=2)
plot_histogram(histogram, title="MACD Histogram", color="#22c55e")
hline(0, "Zero", color="#9ca3af")

${buildSignalBlock({
  longEntry: "long_entry",
  shortEntry: "short_entry",
  mode,
  longLabel: "MACD LONG",
  shortLabel: "MACD SHORT",
})}
`);

  return {
    title,
    code:
      buildHeader(prompt, title, [
        "Generated a MACD crossover strategy from your prompt.",
        "MACD, signal, and histogram render together in a momentum pane.",
      ]) + buildIndicatorFunction({ title, pane: "momentum", body }),
    reply: `I generated a ${title} strategy and loaded it into the editor with MACD, signal, and histogram plots.`,
  };
}

function buildVwapStrategy(prompt, normalizedPrompt) {
  const mode = inferTradeMode(normalizedPrompt);
  const title = "VWAP crossover";
  const body = indent(`
vwap_line = ta.vwap(ctx.high, ctx.low, ctx.close, ctx.volume)

long_entry = ctx.ta.crossover(ctx.close, vwap_line)
short_entry = ctx.ta.crossunder(ctx.close, vwap_line)

plot(vwap_line, title="VWAP", color="#8b5cf6", width=2)

${buildSignalBlock({
  longEntry: "long_entry",
  shortEntry: "short_entry",
  mode,
  longLabel: "VWAP LONG",
  shortLabel: "VWAP SHORT",
})}
`);

  return {
    title,
    code:
      buildHeader(prompt, title, [
        "Generated a VWAP crossover strategy from your prompt.",
        "VWAP renders on the price chart as an overlay.",
      ]) + buildIndicatorFunction({ title, pane: "overlay", body }),
    reply: "I generated a VWAP crossover strategy and loaded it into the editor.",
  };
}

function buildSupertrendStrategy(prompt, normalizedPrompt) {
  const lengthMatch = normalizedPrompt.match(/supertrend.*?(\d+)/);
  const multiplierMatch = normalizedPrompt.match(/multiplier\s*(?:=|of)?\s*(\d+(?:\.\d+)?)/);
  const length = clampNumber(lengthMatch?.[1], 10);
  const multiplier = Number(multiplierMatch?.[1] || 3);
  const mode = inferTradeMode(normalizedPrompt);
  const title = `Supertrend ${length}, ${multiplier}`;
  const body = indent(`
supertrend_data = ta.supertrend(ctx.high, ctx.low, ctx.close, length=${length}, multiplier=${multiplier})
trend_line = supertrend_data["supertrend"]
direction = supertrend_data["direction"]

long_entry = ctx.ta.crossover(direction, 0)
short_entry = ctx.ta.crossunder(direction, 0)

plot(trend_line, title="Supertrend", color="#22c55e", width=2)

${buildSignalBlock({
  longEntry: "long_entry",
  shortEntry: "short_entry",
  mode,
  longLabel: "ST LONG",
  shortLabel: "ST SHORT",
})}
`);

  return {
    title,
    code:
      buildHeader(prompt, title, [
        "Generated a Supertrend strategy from your prompt.",
        "Entries use direction flips across zero.",
      ]) + buildIndicatorFunction({ title, pane: "overlay", body }),
    reply: `I generated a ${title} strategy and loaded it into the editor using Supertrend direction flips.`,
  };
}

function buildBreakoutStrategy(prompt, normalizedPrompt) {
  const lookbackMatch = normalizedPrompt.match(/(\d+)\s*(?:bar|candle|period)?\s*breakout/);
  const lookback = clampNumber(lookbackMatch?.[1], 20);
  const mode = inferTradeMode(normalizedPrompt);
  const title = `${lookback}-bar breakout`;
  const body = indent(`
breakout_high = ctx.ta.highest(ctx.high, ${lookback})
breakout_low = ctx.ta.lowest(ctx.low, ${lookback})

long_entry = ctx.ta.crossover(ctx.close, breakout_high)
short_entry = ctx.ta.crossunder(ctx.close, breakout_low)

plot(breakout_high, title="Breakout High", color="#ef4444", width=1)
plot(breakout_low, title="Breakout Low", color="#22c55e", width=1)

${buildSignalBlock({
  longEntry: "long_entry",
  shortEntry: "short_entry",
  mode,
  longLabel: "BO LONG",
  shortLabel: "BO SHORT",
})}
`);

  return {
    title,
    code:
      buildHeader(prompt, title, [
        "Generated a price breakout strategy from your prompt.",
        "Entries use rolling highest high and lowest low levels.",
      ]) + buildIndicatorFunction({ title, pane: "overlay", body }),
    reply: `I generated a ${title} strategy and loaded it into the editor using rolling breakout levels.`,
  };
}

function buildFallbackStrategy(prompt) {
  return buildEmaSmaStrategy(prompt, "ema 9/21 crossover");
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
