const IST_OFFSET = 19800;

export default function SUPERSMOOTHERInput(
  response,
  indicatorSeriesRef,
  latestIndicatorValuesRef,
  instanceId
) {
  const rows = Array.isArray(response?.data) ? response.data : [];

  const oscillator = rows
    .filter((d) => d.oscillator != null)
    .map((d) => ({
      time: Number(d.time) + IST_OFFSET,
      value: Number(d.oscillator),
    }));

  const signalLine = rows
    .filter((d) => d.signalLine != null)
    .map((d) => ({
      time: Number(d.time) + IST_OFFSET,
      value: Number(d.signalLine),
    }));

  const histogram = rows
    .filter((d) => d.histogram != null)
    .map((d) => ({
      time: Number(d.time) + IST_OFFSET,
      value: Number(d.histogram),
      color: d.histogramColor,
    }));

  const buySignals = rows.filter((d) => d.bullishSignal);
  const sellSignals = rows.filter((d) => d.bearishSignal);
  const strongBuySignals = rows.filter((d) => d.strongBullishSignal);
  const strongSellSignals = rows.filter((d) => d.strongBearishSignal);

  const indicatorId = instanceId || "SUPERSMOOTHER";
  const series = indicatorSeriesRef.current?.[indicatorId];

  if (!series) return;

  series.oscillator?.setData(oscillator);
  series.signalLine?.setData(signalLine);
  series.histogram?.setData(histogram);

  latestIndicatorValuesRef.current[indicatorId] = {
    oscillator: oscillator.at(-1)?.value ?? null,
    signalLine: signalLine.at(-1)?.value ?? null,
    histogram: histogram.at(-1)?.value ?? null,
  };
}