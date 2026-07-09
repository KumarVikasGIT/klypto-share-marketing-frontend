import { AreaSeries, BaselineSeries } from "lightweight-charts";
import { normalizeData } from "./seriesUtils";

const TRANSPARENT = "rgba(0, 0, 0, 0)";

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseColor(color) {
  if (typeof color !== "string") return null;

  const rgbaMatch = color.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([\d.]+))?\s*\)$/i,
  );
  if (rgbaMatch) {
    return {
      r: Number(rgbaMatch[1]),
      g: Number(rgbaMatch[2]),
      b: Number(rgbaMatch[3]),
      a:
        rgbaMatch[4] !== undefined ? Number(rgbaMatch[4]) : 1,
    };
  }

  const hex = color.replace("#", "").trim();
  if (hex.length === 3 || hex.length === 6) {
    const expanded =
      hex.length === 3
        ? hex
            .split("")
            .map((token) => `${token}${token}`)
            .join("")
        : hex;

    return {
      r: Number.parseInt(expanded.slice(0, 2), 16),
      g: Number.parseInt(expanded.slice(2, 4), 16),
      b: Number.parseInt(expanded.slice(4, 6), 16),
      a: 1,
    };
  }

  return null;
}

function withAlpha(color, alpha) {
  const parsed = parseColor(color);
  if (!parsed) return color;

  const nextAlpha = Math.max(0, Math.min(1, alpha));
  return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${nextAlpha})`;
}

function gradientStops(color, fallbackStrong = 0.22, fallbackSoft = 0.03) {
  const parsed = parseColor(color);
  if (!parsed) {
    return {
      strong: color,
      soft: color,
    };
  }

  const baseAlpha = Math.max(parsed.a ?? 1, fallbackStrong);
  return {
    strong: withAlpha(color, baseAlpha),
    soft: withAlpha(color, Math.min(baseAlpha * 0.18, fallbackSoft)),
  };
}

function inferConstantValue(data = []) {
  const normalized = normalizeData(data);
  const firstPoint = normalized.find((point) => Number.isFinite(point?.value));
  if (!firstPoint) return null;

  const baseline = Number(firstPoint.value);
  const tolerance = Math.max(0.000001, Math.abs(baseline) * 0.00001);

  const isConstant = normalized.every((point) => {
    if (!Number.isFinite(point?.value)) return true;
    return Math.abs(Number(point.value) - baseline) <= tolerance;
  });

  return isConstant ? baseline : null;
}

export function renderGradientFill(chart, plot) {
  const fill = plot?.style?.gradientFill;
  if (!fill?.enabled) return null;

  const data = normalizeData(plot?.data);
  if (!data.length) return null;

  const topStops = gradientStops(fill.from || "rgba(59, 130, 246, 0.22)");
  const bottomStops = gradientStops(fill.to || "rgba(59, 130, 246, 0.02)");

  const series = chart.addSeries(AreaSeries, {
    lineColor: TRANSPARENT,
    topColor: topStops.strong,
    bottomColor: bottomStops.soft,
    priceLineVisible: false,
    lastValueVisible: false,
  });

  series.setData(data);
  return series;
}

export function renderContractFills(chart, contract, plotsById = new Map()) {
  const fills = Array.isArray(contract?.fills) ? contract.fills : [];

  return fills
    .map((fill, index) => {
      const sourcePlot = plotsById.get(fill?.from);
      if (!sourcePlot) return null;

      const data = normalizeData(sourcePlot?.data);
      if (!data.length) return null;

      let baseValue = toNumber(fill?.toValue);

      if (baseValue === null && typeof fill?.to === "string") {
        const targetPlot = plotsById.get(fill.to);
        baseValue = inferConstantValue(targetPlot?.data);
      }

      if (baseValue === null) return null;

      const topColor =
        fill?.colorTop || fill?.color || "rgba(124, 58, 237, 0.24)";
      const bottomColor =
        fill?.colorBottom || fill?.color || "rgba(124, 58, 237, 0.04)";

      const topStops = gradientStops(topColor);
      const bottomStops = gradientStops(bottomColor, 0.14, 0.02);

      const series = chart.addSeries(BaselineSeries, {
        baseValue: { type: "price", price: baseValue },
        topFillColor1: topStops.strong,
        topFillColor2: topStops.soft,
        bottomFillColor1: bottomStops.strong,
        bottomFillColor2: bottomStops.soft,
        topLineColor: TRANSPARENT,
        bottomLineColor: TRANSPARENT,
        lineVisible: false,
        priceLineVisible: false,
        lastValueVisible: false,
        title: fill?.title || `Fill ${index + 1}`,
      });

      series.setData(data);
      return series;
    })
    .filter(Boolean);
}
