const DEFAULT_MAIN_SCALE_MARGINS = {
  top: 0.2,
  bottom: 0.2,
};

const PLOTLY_INSPIRED_PALETTE = [
  "#636EFA",
  "#EF553B",
  "#00CC96",
  "#AB63FA",
  "#FFA15A",
  "#19D3F3",
  "#FF6692",
  "#B6E880",
];

const FAMILY_PALETTES = {
  overlay: ["#00CC96", "#19D3F3", "#FFA15A", "#AB63FA", "#FF6692"],
  oscillator: ["#636EFA", "#00CC96", "#EF553B", "#FECB52", "#19D3F3"],
  momentum: ["#AB63FA", "#FFA15A", "#19D3F3", "#EF553B", "#00CC96"],
  volume: ["#00CC96", "#19D3F3", "#B6E880", "#636EFA", "#FFA15A"],
  volatility: ["#FFA15A", "#EF553B", "#FECB52", "#AB63FA", "#19D3F3"],
  top: ["#AB63FA", "#FF6692", "#FFA15A", "#19D3F3", "#00CC96"],
  reference: ["rgba(148, 163, 184, 0.9)", "#9CA3AF", "#94A3B8"],
};

const OVERLAY_HINT = /(ema|sma|wma|hma|dema|tema|kama|vwap|bollinger|bb|supertrend|sar|ichimoku|donchian|keltner|cloud|moving average|baseline|trend|support|resistance|channel|stop|target|upper band|lower band|bb upper|bb lower|bb middle|vwap|price)/i;
const OSCILLATOR_HINT = /(rsi|stoch|stochastic|mfi|wpr|cci|cmo|aroon|fisher|ft|uo|ultimate|chop|overbought|oversold|percent|%b)/i;
const MOMENTUM_HINT = /(macd|hist|histogram|signal|zero|momentum|oscillator|roc|trix|ao|adx|pvo|ppo|cmf)/i;
const VOLUME_HINT = /(volume|obv|accumulation|distribution|ad line|nvi|pvi|eom|kvo)/i;
const VOLATILITY_HINT = /(atr|std|stdev|stddev|variance|volatility|range|bbw)/i;
const REFERENCE_HINT = /(overbought|oversold|middle|mid|zero|signal|reference|threshold|level|band|upper|lower)/i;

const LOWER_FAMILY_ORDER = [
  "oscillator",
  "momentum",
  "volume",
  "volatility",
  "lower",
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toNumber(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "default";
}

function getSeriesStats(seriesData) {
  if (!Array.isArray(seriesData) || seriesData.length === 0) return null;

  let min = Infinity;
  let max = -Infinity;
  let last = null;
  let validCount = 0;

  seriesData.forEach((point) => {
    const value = toNumber(point?.value);
    if (value === null) return;
    validCount += 1;
    if (value < min) min = value;
    if (value > max) max = value;
    last = value;
  });

  if (validCount === 0) return null;

  const range = max - min;
  return {
    min,
    max,
    last,
    validCount,
    range,
    mid: (min + max) / 2,
    constant: range <= Math.max(1e-9, Math.abs(max || 0) * 1e-5),
    bounded01: min >= -0.2 && max <= 1.2,
    bounded100: min >= -5 && max <= 105,
    crossesZero: min < 0 && max > 0,
  };
}

function getPriceStats(candles) {
  if (!Array.isArray(candles) || candles.length === 0) return null;

  let min = Infinity;
  let max = -Infinity;
  let last = null;

  candles.forEach((candle) => {
    const low = toNumber(candle?.low);
    const high = toNumber(candle?.high);
    const close = toNumber(candle?.close);

    if (low !== null && low < min) min = low;
    if (high !== null && high > max) max = high;
    if (close !== null) last = close;
  });

  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;

  return {
    min,
    max,
    last,
    range: max - min,
    mid: (min + max) / 2,
  };
}

function normalizeExplicitPane(pane) {
  const normalized = String(pane || "").trim().toLowerCase();

  if (!normalized || normalized === "overlay" || normalized === "main" || normalized === "price") {
    return { placement: "overlay", family: "overlay", key: "overlay" };
  }

  if (/(top|upper)/.test(normalized)) {
    return { placement: "top", family: "top", key: slugify(normalized) };
  }

  if (/(oscillator|indicator|momentum|volume|volatility|lower|bottom|subpane|pane)/.test(normalized)) {
    if (normalized.includes("momentum")) {
      return { placement: "bottom", family: "momentum", key: "momentum" };
    }
    if (normalized.includes("volume")) {
      return { placement: "bottom", family: "volume", key: "volume" };
    }
    if (normalized.includes("volatility")) {
      return { placement: "bottom", family: "volatility", key: "volatility" };
    }
    if (normalized.includes("oscillator")) {
      return { placement: "bottom", family: "oscillator", key: "oscillator" };
    }
    return { placement: "bottom", family: "lower", key: slugify(normalized) };
  }

  return { placement: "bottom", family: "lower", key: slugify(normalized) };
}

function getValueRatios(stats, priceStats) {
  if (!stats || !priceStats) {
    return {
      priceAligned: false,
      lastRatio: 1,
      rangeRatio: 1,
      centerDistanceRatio: Infinity,
      lastDistanceRatio: Infinity,
    };
  }

  const priceRange = Math.max(priceStats.range || 0, 1);
  const priceReference = Math.max(Math.abs(priceStats.last ?? priceStats.mid ?? 0), 1);
  const plotReference = Math.abs(stats.last ?? stats.mid ?? 0);
  const centerDistanceRatio = Math.abs((stats.mid ?? 0) - (priceStats.mid ?? 0)) / priceRange;
  const lastDistanceRatio = Math.abs((stats.last ?? 0) - (priceStats.last ?? 0)) / priceRange;
  const rangeRatio = Math.abs(stats.range || 0) / priceRange;
  const lastRatio = plotReference / priceReference;
  const priceAligned =
    lastRatio > 0.45 &&
    lastRatio < 2.5 &&
    (centerDistanceRatio < 1 || lastDistanceRatio < 1.25);

  return {
    priceAligned,
    lastRatio,
    rangeRatio,
    centerDistanceRatio,
    lastDistanceRatio,
  };
}

function inferFamilyFromName(name) {
  if (OSCILLATOR_HINT.test(name)) return "oscillator";
  if (MOMENTUM_HINT.test(name)) return "momentum";
  if (VOLUME_HINT.test(name)) return "volume";
  if (VOLATILITY_HINT.test(name)) return "volatility";
  if (OVERLAY_HINT.test(name)) return "overlay";
  return null;
}

function classifyPlotEntry(entry, priceStats) {
  const name = String(entry.plot?.name || "");
  const normalizedName = name.toLowerCase();
  const explicit = normalizeExplicitPane(entry.plot?.pane);
  const stats = entry.stats;
  const ratios = getValueRatios(stats, priceStats);
  const nameFamily = inferFamilyFromName(normalizedName);
  const isReference =
    entry.plot?.type === "horizontal_line" ||
    Boolean(stats?.constant) ||
    REFERENCE_HINT.test(normalizedName);

  if (!stats) {
    return {
      ...entry,
      family: explicit.family,
      placement: explicit.placement,
      groupKey: explicit.key,
      isReference,
      styleKind: isReference ? "reference" : explicit.family,
      ratios,
    };
  }

  if (String(entry.plot?.pane || "").trim()) {
    return {
      ...entry,
      family: explicit.family,
      placement: explicit.placement,
      groupKey: explicit.key,
      isReference,
      styleKind: isReference ? "reference" : explicit.family,
      ratios,
    };
  }

  if (nameFamily === "overlay" && ratios.priceAligned) {
    return {
      ...entry,
      family: "overlay",
      placement: "overlay",
      groupKey: "overlay",
      isReference,
      styleKind: isReference ? "reference" : "overlay",
      ratios,
    };
  }

  if (nameFamily === "oscillator" || stats.bounded100 || stats.bounded01) {
    return {
      ...entry,
      family: "oscillator",
      placement: "bottom",
      groupKey: "oscillator",
      isReference,
      styleKind: isReference ? "reference" : "oscillator",
      ratios,
    };
  }

  if (nameFamily === "momentum" || stats.crossesZero) {
    return {
      ...entry,
      family: "momentum",
      placement: "bottom",
      groupKey: "momentum",
      isReference,
      styleKind: isReference ? "reference" : "momentum",
      ratios,
    };
  }

  if (nameFamily === "volume") {
    return {
      ...entry,
      family: "volume",
      placement: "bottom",
      groupKey: "volume",
      isReference,
      styleKind: isReference ? "reference" : "volume",
      ratios,
    };
  }

  if (nameFamily === "volatility" && (!ratios.priceAligned || ratios.lastRatio < 0.5)) {
    return {
      ...entry,
      family: "volatility",
      placement: "bottom",
      groupKey: "volatility",
      isReference,
      styleKind: isReference ? "reference" : "volatility",
      ratios,
    };
  }

  if (ratios.priceAligned || nameFamily === "overlay") {
    return {
      ...entry,
      family: "overlay",
      placement: "overlay",
      groupKey: "overlay",
      isReference,
      styleKind: isReference ? "reference" : "overlay",
      ratios,
    };
  }

  if (ratios.lastRatio > 2.8 && ratios.centerDistanceRatio > 1.25) {
    return {
      ...entry,
      family: "top",
      placement: "top",
      groupKey: "top",
      isReference,
      styleKind: isReference ? "reference" : "top",
      ratios,
    };
  }

  if (ratios.lastRatio < 0.35 || ratios.rangeRatio < 0.2) {
    return {
      ...entry,
      family: "lower",
      placement: "bottom",
      groupKey: "lower",
      isReference,
      styleKind: isReference ? "reference" : "lower",
      ratios,
    };
  }

  return {
    ...entry,
    family: "overlay",
    placement: "overlay",
    groupKey: "overlay",
    isReference,
    styleKind: isReference ? "reference" : "overlay",
    ratios,
  };
}

function attachReferenceFamilies(entries) {
  const lowerFamilies = new Set(
    entries
      .filter((entry) => entry.placement === "bottom" && !entry.isReference)
      .map((entry) => entry.family),
  );

  return entries.map((entry) => {
    if (!entry.isReference || entry.placement !== "bottom") return entry;

    const normalizedName = String(entry.plot?.name || "").toLowerCase();

    if ((entry.stats?.bounded100 || entry.stats?.bounded01) && lowerFamilies.has("oscillator")) {
      return { ...entry, family: "oscillator", groupKey: "oscillator" };
    }

    if ((normalizedName.includes("zero") || normalizedName.includes("signal")) && lowerFamilies.has("momentum")) {
      return { ...entry, family: "momentum", groupKey: "momentum" };
    }

    if (lowerFamilies.has("oscillator")) {
      return { ...entry, family: "oscillator", groupKey: "oscillator" };
    }

    if (lowerFamilies.has("momentum")) {
      return { ...entry, family: "momentum", groupKey: "momentum" };
    }

    return entry;
  });
}

function normalizeLowerFamilies(entries) {
  const presentFamilies = LOWER_FAMILY_ORDER.filter((family) =>
    entries.some((entry) => entry.placement === "bottom" && entry.groupKey === family),
  );

  if (presentFamilies.length <= 3) return entries;

  const keepFamilies = new Set(presentFamilies.slice(0, 3));
  const fallbackFamily = presentFamilies[2];

  return entries.map((entry) => {
    if (entry.placement !== "bottom" || keepFamilies.has(entry.groupKey)) return entry;
    return {
      ...entry,
      family: fallbackFamily,
      groupKey: fallbackFamily,
      styleKind: entry.isReference ? "reference" : fallbackFamily,
    };
  });
}

function buildBottomBandLayout(groupKeys) {
  const count = groupKeys.length;
  if (count === 0) return { scaleMap: {}, reserved: 0 };

  const heights =
    count === 1 ? [0.2] : count === 2 ? [0.15, 0.15] : [0.12, 0.12, 0.12];
  const gap = count > 1 ? 0.02 : 0;
  const bottomPadding = 0.02;
  const contentHeight = heights.reduce((sum, value) => sum + value, 0) + gap * (count - 1);
  let cursorTop = 1 - bottomPadding - contentHeight;

  const scaleMap = {};
  groupKeys.forEach((groupKey, index) => {
    const height = heights[index];
    const top = clamp(cursorTop, 0.02, 0.92);
    const bottom = clamp(1 - top - height, 0.02, 0.92);
    scaleMap[groupKey] = {
      top,
      bottom,
    };
    cursorTop += height + gap;
  });

  return {
    scaleMap,
    reserved: bottomPadding + contentHeight,
  };
}

function buildTopBandLayout(groupKeys) {
  const count = groupKeys.length;
  if (count === 0) return { scaleMap: {}, reserved: 0 };

  const heights = count === 1 ? [0.16] : [0.14, 0.14];
  const gap = count > 1 ? 0.02 : 0;
  const topPadding = 0.02;
  let cursorTop = topPadding;

  const scaleMap = {};
  groupKeys.forEach((groupKey, index) => {
    const height = heights[index];
    const top = clamp(cursorTop, 0.02, 0.92);
    const bottom = clamp(1 - top - height, 0.02, 0.92);
    scaleMap[groupKey] = {
      top,
      bottom,
    };
    cursorTop += height + gap;
  });

  return {
    scaleMap,
    reserved: cursorTop - gap,
  };
}

function getPaletteColor(family, index) {
  const palette = FAMILY_PALETTES[family] || PLOTLY_INSPIRED_PALETTE;
  return palette[index % palette.length];
}

function buildStyleOptions(entry, groupIndex) {
  const family = entry.styleKind || entry.family || "overlay";
  const baseColor =
    entry.plot?.color && String(entry.plot.color).trim()
      ? entry.plot.color
      : getPaletteColor(family, groupIndex ?? entry.index ?? 0);

  if (entry.isReference) {
    return {
      color: baseColor,
      lineWidth: 1,
      lineStyle: 2,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
      priceLineVisible: false,
    };
  }

  const familyWidth = {
    overlay: 2,
    oscillator: 2,
    momentum: 2,
    volume: 2,
    volatility: 2,
    top: 2,
    lower: 2,
  };

  return {
    color: baseColor,
    lineWidth: entry.plot?.type === "horizontal_line" ? 1 : familyWidth[entry.family] || 2,
    lineStyle: entry.plot?.type === "horizontal_line" ? 2 : 0,
    lastValueVisible: true,
    crosshairMarkerVisible: true,
    priceLineVisible: false,
  };
}

export function analyzeSmartPlotLayout({ plotEntries, candles }) {
  const priceStats = getPriceStats(candles);
  const classifiedEntries = attachReferenceFamilies(
    normalizeLowerFamilies(
      plotEntries.map((entry) => ({
        ...entry,
        stats: entry.stats || getSeriesStats(entry.seriesData),
      })).map((entry) => classifyPlotEntry(entry, priceStats)),
    ),
  );

  const lowerGroups = LOWER_FAMILY_ORDER.filter((family) =>
    classifiedEntries.some((entry) => entry.placement === "bottom" && entry.groupKey === family),
  );
  const topGroups = [...new Set(
    classifiedEntries
      .filter((entry) => entry.placement === "top")
      .map((entry) => entry.groupKey),
  )].slice(0, 2);

  const bottomLayout = buildBottomBandLayout(lowerGroups);
  const topLayout = buildTopBandLayout(topGroups);

  let mainTop = topGroups.length > 0 ? topLayout.reserved + 0.05 : DEFAULT_MAIN_SCALE_MARGINS.top;
  let mainBottom =
    lowerGroups.length > 0 ? bottomLayout.reserved + 0.05 : DEFAULT_MAIN_SCALE_MARGINS.bottom;

  if (mainTop + mainBottom > 0.76) {
    const overflow = mainTop + mainBottom - 0.76;
    const reducibleTop = Math.max(0, mainTop - 0.12);
    const reducibleBottom = Math.max(0, mainBottom - 0.12);
    const totalReducible = reducibleTop + reducibleBottom;
    if (totalReducible > 0) {
      const topReduction = overflow * (reducibleTop / totalReducible);
      const bottomReduction = overflow * (reducibleBottom / totalReducible);
      mainTop -= topReduction;
      mainBottom -= bottomReduction;
    }
  }

  const groupStyleIndex = {};
  const plans = classifiedEntries.map((entry) => {
    const groupKey = `${entry.placement}:${entry.groupKey}`;
    const nextIndex = groupStyleIndex[groupKey] || 0;
    groupStyleIndex[groupKey] = nextIndex + 1;

    if (entry.placement === "overlay") {
      return {
        ...entry,
        styleOptions: buildStyleOptions(entry, nextIndex),
        priceScaleId: "right",
        priceScaleOptions: null,
      };
    }

    const scaleMargins =
      entry.placement === "top"
        ? topLayout.scaleMap[entry.groupKey]
        : bottomLayout.scaleMap[entry.groupKey];

    return {
      ...entry,
      styleOptions: buildStyleOptions(entry, nextIndex),
      priceScaleId: `smart-${entry.placement}-${entry.groupKey}`,
      priceScaleOptions: scaleMargins
        ? {
            autoScale: true,
            mode: 0,
            visible: true,
            position: "right",
            minimumWidth: 85,
            scaleMargins,
          }
        : null,
    };
  });

  return {
    plans,
    mainPriceScaleOptions:
      lowerGroups.length > 0 || topGroups.length > 0
        ? {
            autoScale: true,
            mode: 0,
            scaleMargins: {
              top: clamp(mainTop, 0.08, 0.62),
              bottom: clamp(mainBottom, 0.08, 0.62),
            },
          }
        : {
            autoScale: true,
            mode: 0,
            scaleMargins: DEFAULT_MAIN_SCALE_MARGINS,
          },
    theme: {
      palette: PLOTLY_INSPIRED_PALETTE,
      lowerGroups,
      topGroups,
    },
  };
}

export { DEFAULT_MAIN_SCALE_MARGINS, PLOTLY_INSPIRED_PALETTE };
