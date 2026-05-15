import apiService from "../services/apiServices";
import { getRowsByIndicator } from "./common";

const IST_OFFSET = 19800;

export default function useChartFunctions({
  indicatorSeriesRef,
  indicatorDataRef,
  latestIndicatorValuesRef,
  indicatorConfigs,
  fromDate,
  toDate,
  socketRef,
  candlesRef,
}) {
  /* ================= FETCH INDICATORS ================= */
  async function fetchIndicatorData(
    selectedIndicator,
    selectedCurrency,
    timeframeValue,
  ) {
    if (!selectedIndicator?.length) return;

    await Promise.all(
      selectedIndicator.map(async (indItem) => {
        // Support both {id, type} objects and legacy plain strings
        const id   = typeof indItem === "object" ? indItem.id   : indItem;
        const type = typeof indItem === "object" ? indItem.type : indItem;
        try {
          const result = await fetchDataForIndicators(
            candlesRef.current,
            selectedCurrency,
            type,
            timeframeValue,
            fromDate,
            toDate,
            socketRef,
          );
          processIndicatorResponse(id, type, result);
        } catch (error) {
          console.log(error, "Indicator loading error");
        }
      }),
    );
  }

  // id = unique instance key, type = base indicator type (e.g. "RSI", "SMA")
  function processIndicatorResponse(id, type, result) {
    if (!result) return;

    const config = indicatorConfigs?.[id] || indicatorConfigs?.[type] || {};
    const { maType } = config;
    const rows = getRowsByIndicator(type, maType, indicatorConfigs);

    switch (type) {
      case "RSI": {
        const rsiData = result?.data?.rsi ?? [];
        const smoothingMA = result?.data?.smoothingMA ?? [];
        const bbUpperData = result?.data?.bbUpperBand ?? result?.data?.bbUpper ?? [];
        const bbLowerData = result?.data?.bbLowerBand ?? result?.data?.bbLower ?? [];
        indicatorDataRef.current[id] = {
          result: { ...result, data: { ...result.data, bbUpper: bbUpperData, bbLower: bbLowerData } },
          rows,
        };
        latestIndicatorValuesRef.current[id] = {
          rsi: rsiData[rsiData.length - 1]?.value,
          smoothingMA: smoothingMA[smoothingMA.length - 1]?.value,
          bbUpper: bbUpperData[bbUpperData.length - 1]?.value,
          bbLower: bbLowerData[bbLowerData.length - 1]?.value,
        };
        break;
      }
      case "BBW": {
        const bbwData = result?.data?.bbw ?? [];
        const highestData = result?.data?.highest ?? [];
        const lowestData = result?.data?.lowest ?? [];
        indicatorDataRef.current[id] = { result, rows };
        latestIndicatorValuesRef.current[id] = {
          bbw: bbwData[bbwData.length - 1]?.value ?? null,
          highest: highestData.length > 0 ? highestData[highestData.length - 1]?.value : null,
          lowest: lowestData.length > 0 ? lowestData[lowestData.length - 1]?.value : null,
        };
        break;
      }
      case "MACD": {
        const macdData = result?.data?.macd ?? [];
        const signalData = result?.data?.signal ?? [];
        const histogramData = result?.data?.histogram ?? [];
        indicatorDataRef.current[id] = { result, rows };
        latestIndicatorValuesRef.current[id] = {
          macd: macdData[macdData.length - 1]?.value ?? null,
          signal: signalData[signalData.length - 1]?.value ?? null,
          histogram: histogramData[histogramData.length - 1]?.value ?? null,
        };
        break;
      }
      case "BBPERB": {
        const percentBData = result?.data?.percentB ?? [];
        indicatorDataRef.current[id] = { result, rows };
        latestIndicatorValuesRef.current[id] = {
          percentB: percentBData.length > 0 ? percentBData[percentBData.length - 1]?.value : null,
        };
        break;
      }
      case "VWAP": {
        const vwapData = result?.data?.vwap ?? [];
        const upper1Data = result?.data?.upper1 ?? [];
        const lower1Data = result?.data?.lower1 ?? [];
        const upper2Data = result?.data?.upper2 ?? [];
        const lower2Data = result?.data?.lower2 ?? [];
        const upper3Data = result?.data?.upper3 ?? [];
        const lower3Data = result?.data?.lower3 ?? [];
        indicatorDataRef.current[id] = { result, rows };
        latestIndicatorValuesRef.current[id] = {
          vwap: vwapData[vwapData.length - 1]?.value ?? null,
          upper1: upper1Data[upper1Data.length - 1]?.value ?? null,
          lower1: lower1Data[lower1Data.length - 1]?.value ?? null,
          upper2: upper2Data[upper2Data.length - 1]?.value ?? null,
          lower2: lower2Data[lower2Data.length - 1]?.value ?? null,
          upper3: upper3Data[upper3Data.length - 1]?.value ?? null,
          lower3: lower3Data[lower3Data.length - 1]?.value ?? null,
        };
        break;
      }
      case "CKS": {
        const longData = result?.data?.long ?? [];
        const shortData = result?.data?.short ?? [];
        indicatorDataRef.current[id] = { result, rows };
        latestIndicatorValuesRef.current[id] = {
          long: longData[longData.length - 1]?.value ?? null,
          short: shortData[shortData.length - 1]?.value ?? null,
        };
        break;
      }
      case "HV": {
        const hvData = result?.data?.hv ?? [];
        indicatorDataRef.current[id] = { result, rows };
        latestIndicatorValuesRef.current[id] = { hvLine: hvData[hvData.length - 1]?.value ?? null };
        break;
      }
      case "CMF": {
        const cmfData = result?.data?.cmf ?? [];
        indicatorDataRef.current[id] = { result, rows };
        latestIndicatorValuesRef.current[id] = { cmfLine: cmfData[cmfData.length - 1]?.value ?? null };
        break;
      }
      case "SMA": {
        const smaData = result?.data?.sma ?? [];
        const smoothingData = result?.data?.smoothingMA ?? [];
        const bbUpper = result?.data?.bbUpper ?? [];
        const bbLower = result?.data?.bbLower ?? [];
        indicatorDataRef.current[id] = { result, rows };
        latestIndicatorValuesRef.current[id] = {
          sma: smaData[smaData.length - 1]?.value,
          smoothingMA: smoothingData[smoothingData.length - 1]?.value,
          bbUpper: bbUpper[bbUpper.length - 1]?.value,
          bbLower: bbLower[bbLower.length - 1]?.value,
        };
        break;
      }
      case "SSL_HYBRID": {
        const baseline = result?.data?.baseline ?? [];
        const upperChannel = result?.data?.upperChannel ?? [];
        const lowerChannel = result?.data?.lowerChannel ?? [];
        const ssl1 = result?.data?.ssl1 ?? [];
        const ssl2 = result?.data?.ssl2 ?? [];
        const atrUpper = result?.data?.atrUpper ?? [];
        const atrLower = result?.data?.atrLower ?? [];
        indicatorDataRef.current[id] = { result, rows };
        latestIndicatorValuesRef.current[id] = {
          baseline: baseline[baseline.length - 1]?.value,
          upperChannel: upperChannel[upperChannel.length - 1]?.value,
          lowerChannel: lowerChannel[lowerChannel.length - 1]?.value,
          ssl1: ssl1[ssl1.length - 1]?.value,
          ssl2: ssl2[ssl2.length - 1]?.value,
          atrUpper: atrUpper[atrUpper.length - 1]?.value,
          atrLower: atrLower[atrLower.length - 1]?.value,
        };
        break;
      }
      case "ICHIMOKU": {
        indicatorDataRef.current[id] = { result, rows };
        const conversionLine = result?.data?.conversionLine;
        const baseLine = result?.data?.baseLine;
        const leadLine1 = result?.data?.leadLine1;
        const leadLine2 = result?.data?.leadLine2;
        const laggingSpan = result?.data?.laggingSpan;
        latestIndicatorValuesRef.current[id] = {
          conversionLine: conversionLine?.[conversionLine.length - 1]?.value,
          baseLine: baseLine?.[baseLine.length - 1]?.value,
          leadLine1: leadLine1?.[leadLine1.length - 1]?.value,
          leadLine2: leadLine2?.[leadLine2.length - 1]?.value,
          laggingSpan: laggingSpan?.[laggingSpan.length - 1]?.value,
        };
        break;
      }
      case "EMA": {
        const emaData = result?.data?.ema ?? [];
        const smoothingData = result?.data?.smoothingMA ?? [];
        const bbUpperData = result?.data?.bbUpper ?? [];
        const bbLowerData = result?.data?.bbLower ?? [];
        indicatorDataRef.current[id] = { result, rows };
        latestIndicatorValuesRef.current[id] = {
          ema: emaData[emaData.length - 1]?.value ?? null,
          smoothingMA: smoothingData[smoothingData.length - 1]?.value ?? null,
          bbUpper: bbUpperData[bbUpperData.length - 1]?.value ?? null,
          bbLower: bbLowerData[bbLowerData.length - 1]?.value ?? null,
        };
        break;
      }
      case "WMA": {
        const wmaData = result?.data?.wma ?? [];
        indicatorDataRef.current[id] = { result, rows };
        latestIndicatorValuesRef.current[id] = { wma: wmaData[wmaData.length - 1]?.value };
        break;
      }
      case "HMA": {
        const hmaData = result?.data?.hma ?? [];
        indicatorDataRef.current[id] = { result, rows };
        latestIndicatorValuesRef.current[id] = { hma: hmaData[hmaData.length - 1]?.value };
        break;
      }
      case "DEMA": {
        const demaData = result?.data?.dema ?? [];
        indicatorDataRef.current[id] = { result, rows };
        latestIndicatorValuesRef.current[id] = { dema: demaData[demaData.length - 1]?.value };
        break;
      }
      case "TEMA": {
        const temaData = result?.data?.tema ?? [];
        indicatorDataRef.current[id] = { result, rows };
        latestIndicatorValuesRef.current[id] = { tema: temaData[temaData.length - 1]?.value };
        break;
      }
      case "KAMA": {
        const kamaData = result?.data?.kama ?? [];
        indicatorDataRef.current[id] = { result, rows };
        latestIndicatorValuesRef.current[id] = { kama: kamaData[kamaData.length - 1]?.value };
        break;
      }
      case "SUPERTREND": {
        const upTrend = result?.data?.upTrend ?? [];
        const downTrend = result?.data?.downTrend ?? [];
        const bodyMiddle = result?.data?.bodyMiddle ?? [];
        indicatorDataRef.current[id] = { result, rows };
        latestIndicatorValuesRef.current[id] = {
          upTrend: upTrend[upTrend.length - 1]?.value ?? null,
          downTrend: downTrend[downTrend.length - 1]?.value ?? null,
          bodyMiddle: bodyMiddle[bodyMiddle.length - 1]?.value ?? null,
        };
        break;
      }
      case "AROON": {
        const aroonUp = result?.data?.aroonUp ?? [];
        const aroonDown = result?.data?.aroonDown ?? [];
        indicatorDataRef.current[id] = { result, rows };
        latestIndicatorValuesRef.current[id] = {
          aroonUp: aroonUp[aroonUp.length - 1]?.value,
          aroonDown: aroonDown[aroonDown.length - 1]?.value,
        };
        break;
      }
      case "AO": {
        const osc = result?.data ?? [];
        indicatorDataRef.current[id] = { result, rows };
        latestIndicatorValuesRef.current[id] = { oscillator: osc[osc.length - 1]?.value };
        break;
      }
      case "ADX": {
        indicatorDataRef.current[id] = { result, rows };
        const adx = result?.data?.adx ?? [];
        latestIndicatorValuesRef.current[id] = { adx: adx[adx.length - 1]?.value };
        break;
      }
      case "CCI": {
        const cciLine = result?.data?.cciLine ?? [];
        const cciMa = result?.data?.cciMa ?? [];
        const bbUpper = result?.data?.bbUpper ?? [];
        const bbLower = result?.data?.bbLower ?? [];
        indicatorDataRef.current[id] = { result, rows };
        latestIndicatorValuesRef.current[id] = {
          cci: cciLine[cciLine.length - 1]?.value,
          cciMa: cciMa[cciMa.length - 1]?.value,
          bbUpper: bbUpper[bbUpper.length - 1]?.value,
          bbLower: bbLower[bbLower.length - 1]?.value,
        };
        break;
      }
      case "CMO": {
        const cmoData = result?.data?.cmo ?? [];
        indicatorDataRef.current[id] = { result, rows };
        latestIndicatorValuesRef.current[id] = { cmo: cmoData[cmoData.length - 1]?.value ?? null };
        break;
      }
      case "MOM": {
        const momentum = result?.data?.MOM ?? [];
        indicatorDataRef.current[id] = { result, rows };
        latestIndicatorValuesRef.current[id] = { MOM: momentum[momentum.length - 1]?.value };
        break;
      }
      case "ROC": {
        indicatorDataRef.current[id] = { result, rows };
        const roc = result?.data?.roc ?? [];
        latestIndicatorValuesRef.current[id] = { roc: roc[roc.length - 1]?.value };
        break;
      }
      case "WPR": {
        indicatorDataRef.current[id] = { result, rows };
        const r = result?.data?.r ?? [];
        latestIndicatorValuesRef.current[id] = { r: r[r.length - 1]?.value };
        break;
      }
      case "TR": {
        const trData = result?.data?.tr ?? [];
        indicatorDataRef.current[id] = { result, rows };
        latestIndicatorValuesRef.current[id] = { tr: trData.length > 0 ? trData[trData.length - 1]?.value : null };
        break;
      }
      case "VWMA": {
        const vwmaData = result?.data?.vwma ?? [];
        indicatorDataRef.current[id] = { result, rows };
        latestIndicatorValuesRef.current[id] = { vwma: vwmaData.length > 0 ? vwmaData[vwmaData.length - 1]?.value : null };
        break;
      }
      case "TMA": {
        const tmaData = result?.data?.tma ?? [];
        indicatorDataRef.current[id] = { result, rows };
        latestIndicatorValuesRef.current[id] = { tma: tmaData.length > 0 ? tmaData[tmaData.length - 1]?.value : null };
        break;
      }
      case "RMA": {
        const rmaData = result?.data?.rma ?? [];
        indicatorDataRef.current[id] = { result, rows };
        latestIndicatorValuesRef.current[id] = { rma: rmaData.length > 0 ? rmaData[rmaData.length - 1]?.value : null };
        break;
      }
      case "ATR": {
        indicatorDataRef.current[id] = { result, rows };
        const atr = result?.data?.atr ?? [];
        latestIndicatorValuesRef.current[id] = { atr: atr[atr.length - 1]?.value };
        break;
      }
      case "MFI": {
        const mfiData = result?.data?.mfi ?? [];
        indicatorDataRef.current[id] = { result, rows };
        latestIndicatorValuesRef.current[id] = { mfi: mfiData[mfiData.length - 1]?.value ?? null };
        break;
      }
      case "PSAR": {
        indicatorDataRef.current[id] = { result, rows };
        latestIndicatorValuesRef.current[id] = { psar: result?.[result.length - 1]?.value };
        break;
      }
      case "EOM": {
        const eomData = result?.data?.eom ?? [];
        indicatorDataRef.current[id] = { result, rows };
        latestIndicatorValuesRef.current[id] = { eom: eomData[eomData.length - 1]?.value };
        break;
      }
      case "KC": {
        const upperData = result?.data?.upper ?? [];
        const lowerData = result?.data?.lower ?? [];
        const middleData = result?.data?.middle ?? [];
        indicatorDataRef.current[id] = { result, rows };
        latestIndicatorValuesRef.current[id] = {
          upper: upperData[upperData.length - 1]?.value ?? null,
          lower: lowerData[lowerData.length - 1]?.value ?? null,
          middle: middleData[middleData.length - 1]?.value ?? null,
        };
        break;
      }
      case "DC": {
        const upperData = result?.data?.upper ?? [];
        const lowerData = result?.data?.lower ?? [];
        const basisData = result?.data?.basis ?? [];
        indicatorDataRef.current[id] = { result, rows };
        latestIndicatorValuesRef.current[id] = {
          upper: upperData[upperData.length - 1]?.value ?? null,
          lower: lowerData[lowerData.length - 1]?.value ?? null,
          basis: basisData[basisData.length - 1]?.value ?? null,
        };
        break;
      }
      case "PVO": {
        const pvoData = result?.data?.pvo ?? [];
        const signalData = result?.data?.signal ?? [];
        const histData = result?.data?.hist ?? [];
        indicatorDataRef.current[id] = { result, rows };
        latestIndicatorValuesRef.current[id] = {
          pvo: pvoData[pvoData.length - 1]?.value,
          signal: signalData[signalData.length - 1]?.value,
          hist: histData[histData.length - 1]?.value,
        };
        break;
      }
      case "UO": {
        const uoData = result?.data?.uo ?? [];
        indicatorDataRef.current[id] = { result, rows };
        latestIndicatorValuesRef.current[id] = { uo: uoData[uoData.length - 1]?.value ?? null };
        break;
      }
      case "PVI": {
        const pviData = result?.data?.pvi ?? [];
        const pviEmaData = result?.data?.pviEma ?? [];
        indicatorDataRef.current[id] = { result, rows };
        latestIndicatorValuesRef.current[id] = {
          pvi: pviData[pviData.length - 1]?.value ?? null,
          pviEma: pviEmaData[pviEmaData.length - 1]?.value ?? null,
        };
        break;
      }
      case "NVI": {
        const nviData = result?.data?.nvi ?? [];
        const nviEmaData = result?.data?.pviEma ?? [];
        indicatorDataRef.current[id] = { result, rows };
        latestIndicatorValuesRef.current[id] = {
          nvi: nviData[nviData.length - 1]?.value ?? null,
          nviEma: nviEmaData[nviEmaData.length - 1]?.value ?? null,
        };
        break;
      }
      case "STOCHRSI": {
        const kData = result?.data?.kLine ?? [];
        const dData = result?.data?.dLine ?? [];
        indicatorDataRef.current[id] = { result, rows };
        latestIndicatorValuesRef.current[id] = {
          kLine: kData[kData.length - 1]?.value ?? null,
          dLine: dData[dData.length - 1]?.value ?? null,
        };
        break;
      }
      case "STOCH": {
        const k = result?.data?.k ?? [];
        const d = result?.data?.d ?? [];
        indicatorDataRef.current[id] = { result, rows };
        latestIndicatorValuesRef.current[id] = {
          k: k.length ? k[k.length - 1].value : null,
          d: d.length ? d[d.length - 1].value : null,
        };
        break;
      }
      case "TRIX": {
        const trixData = result?.data?.trix ?? [];
        indicatorDataRef.current[id] = { result, rows };
        latestIndicatorValuesRef.current[id] = { trix: trixData[trixData.length - 1]?.value ?? null };
        break;
      }
      case "FT": {
        const ftRows = result?.data?.candles ?? [];
        indicatorDataRef.current[id] = { result, rows: ftRows };
        latestIndicatorValuesRef.current[id] = {
          fisherLine: ftRows[ftRows.length - 1]?.fish ?? null,
          triggerLine: ftRows[ftRows.length - 1]?.trigger ?? null,
        };
        break;
      }
      case "ZIGZAG": {
        const lineData = result?.data?.zigzagLine ?? [];
        const pivots = result?.data?.paneLabels ?? [];
        indicatorDataRef.current[id] = { result, rows };
        latestIndicatorValuesRef.current[id] = {
          zigzagLine: lineData[lineData.length - 1]?.value ?? null,
          lastPivotType: pivots[pivots.length - 1]?.type ?? null,
        };
        break;
      }
      case "VP": {
        const volume = result?.data?.volume ?? [];
        const volumeMA = result?.data?.volumeMA ?? [];
        indicatorDataRef.current[id] = { result, rows };
        latestIndicatorValuesRef.current[id] = {
          volume: volume.at(-1)?.value,
          volumeMA: volumeMA.at(-1)?.value,
        };
        break;
      }
      case "OBV": {
        const obv = result?.data?.obv ?? [];
        const ma = result?.data?.smoothingMA ?? [];
        const bbUpper = result?.data?.bbUpper ?? [];
        const bbLower = result?.data?.bbLower ?? [];
        indicatorDataRef.current[id] = { result, rows };
        latestIndicatorValuesRef.current[id] = {
          obv: obv.at(-1)?.value ?? null,
          smoothingMA: ma.at(-1)?.value ?? null,
          bbUpper: bbUpper.at(-1)?.value ?? null,
          bbLower: bbLower.at(-1)?.value ?? null,
        };
        break;
      }
      case "VOL": {
        const volData = result?.data?.volume ?? [];
        const maData = result?.data?.volumeMA ?? [];
        indicatorDataRef.current[id] = { result, rows };
        latestIndicatorValuesRef.current[id] = {
          volume: volData[volData.length - 1]?.value ?? null,
          volumeMA: maData[maData.length - 1]?.value ?? null,
        };
        break;
      }
      case "CHOP": {
        const chopData = result?.data?.chopLine ?? [];
        indicatorDataRef.current[id] = { result, rows };
        latestIndicatorValuesRef.current[id] = { chop: chopData[chopData.length - 1]?.value ?? null };
        break;
      }
      case "STDDEV": {
        const stddevData = result?.data ?? [];
        indicatorDataRef.current[id] = { result, rows };
        latestIndicatorValuesRef.current[id] = { value: stddevData.at(-1)?.value };
        break;
      }
      case "BB": {
        const upperData = result?.data?.upper ?? [];
        const lowerData = result?.data?.lower ?? [];
        const basisData = result?.data?.basis ?? [];
        indicatorDataRef.current[id] = { result, rows };
        latestIndicatorValuesRef.current[id] = {
          upper: upperData[upperData.length - 1]?.value ?? null,
          lower: lowerData[lowerData.length - 1]?.value ?? null,
          basis: basisData[basisData.length - 1]?.value ?? null,
        };
        break;
      }
      case "AD": {
        const adData = result?.data ?? [];
        indicatorDataRef.current[id] = { result, rows };
        latestIndicatorValuesRef.current[id] = { value: adData.at(-1)?.value };
        break;
      }
      case "KVO": {
        const kvoData = result?.data?.kvo ?? [];
        const signalData = result?.data?.signal ?? [];
        indicatorDataRef.current[id] = { result, rows };
        latestIndicatorValuesRef.current[id] = {
          kvo: kvoData[kvoData.length - 1]?.value ?? null,
          signal: signalData[signalData.length - 1]?.value ?? null,
        };
        break;
      }
      case "AWO": {
        const awoRows = result?.data?.series ?? [];
        indicatorDataRef.current[id] = { result, rows: awoRows };
        const awoData = awoRows.filter((d) => d.ao != null && d.time != null);
        latestIndicatorValuesRef.current[id] = {
          awo: awoData.length ? awoData[awoData.length - 1].ao : null,
        };
        break;
      }
      default:
        indicatorDataRef.current[id] = { result, rows };
        break;
    }
  }




  return {
    // fetchDataByCurrency,
    fetchIndicatorData,
    processIndicatorResponse,
  };
}
async function fetchDataForIndicators(
  candles,
  selectedCurrency,
  type,
  timeframeValue,
  fromDate,
  toDate,
  socketRef,
) {
  try {
    const response = await new Promise((resolve, reject) => {
      if (!socketRef.current) return reject(new Error("No socket"));

      socketRef.current?.emit("getIndicatorDetails", {
        symbol: selectedCurrency?.name,
        interval: timeframeValue,
        fromDate: fromDate,
        toDate: toDate,
        type,
        candles, 
      });
      socketRef.current?.once("indicatorDetailsResponse", (data) => {
        console.log(data, "===========================");
        resolve(data);
      });
      socketRef.current?.once("indicatorDetailsError", (err) => reject(err));
    });

    console.log("Raw indicator data for", type, ":", response);
    console.log("Raw first point:", response?.data?.[0]);
    console.log(
      "Raw last point:",
      response?.data?.[response?.data?.length - 1],
    );

    const mapLine = (arr, field) =>
      arr
        ?.map((d) => ({
          time: Number(d.time) + IST_OFFSET,
          value: d[field] != null ? Number(d[field]) : null,
        }))
        .filter((d) => d.value !== null) ?? [];

    console.log("mapped conversion", response.data, "conversionLine");

    switch (type) {
      /* ---------------- SINGLE VALUE ---------------- */

      case "VWAP": {
        const rows = Array.isArray(response.data) ? response.data : [];

        return {
          type: "multi",
          data: {
            vwap: rows
              .filter((d) => d?.vwap != null && d?.time != null)
              .map((d) => ({
                time: Number(d.time) + IST_OFFSET,
                value: Number(d.vwap),
              })),

            upper1: rows
              .filter((d) => d?.bands?.band1?.upper != null)
              .map((d) => ({
                time: Number(d.time) + IST_OFFSET,
                value: Number(d.bands.band1.upper),
              })),

            lower1: rows
              .filter((d) => d?.bands?.band1?.lower != null)
              .map((d) => ({
                time: Number(d.time) + IST_OFFSET,
                value: Number(d.bands.band1.lower),
              })),

            upper2: rows
              .filter((d) => d?.bands?.band2?.upper != null)
              .map((d) => ({
                time: Number(d.time) + IST_OFFSET,
                value: Number(d.bands.band2.upper),
              })),

            lower2: rows
              .filter((d) => d?.bands?.band2?.lower != null)
              .map((d) => ({
                time: Number(d.time) + IST_OFFSET,
                value: Number(d.bands.band2.lower),
              })),

            upper3: rows
              .filter((d) => d?.bands?.band3?.upper != null)
              .map((d) => ({
                time: Number(d.time) + IST_OFFSET,
                value: Number(d.bands.band3.upper),
              })),

            lower3: rows
              .filter((d) => d?.bands?.band3?.lower != null)
              .map((d) => ({
                time: Number(d.time) + IST_OFFSET,
                value: Number(d.bands.band3.lower),
              })),
          },
        };
      }

      case "PSAR":
        return {
          type: "single",
          data:
            response.data
              ?.filter((d) => d.sar != null && d.time != null)
              .map((d) => ({
                time: Number(d.time) + IST_OFFSET,
                value: d.sar,
              })) ?? [],
        };

      case "BBW":
        return {
          type: "multi",
          data: {
            bbw:
              response.data
                ?.filter((d) => d.bbw != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: Number(d.bbw),
                })) ?? [],

            highest:
              response.data
                ?.filter((d) => d.highestExpansion != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: Number(d.highestExpansion),
                })) ?? [],

            lowest:
              response.data
                ?.filter((d) => d.lowestContraction != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: Number(d.lowestContraction),
                })) ?? [],
          },
        };

      case "VP":
        return {
          type: "multi",
          data: {
            vp:
              response.volumeprofile
                ?.filter((d) => d.price != null && d.volume != null)
                .map((d) => ({
                  price: Number(d.price),
                  volume: Number(d.volume),
                })) ?? [],

            poc:
              response?.volumePoc != null ? Number(response.volumePoc) : null,

            vah:
              response?.volumevah != null ? Number(response.volumevah) : null,

            val:
              response?.volumeval != null ? Number(response.volumeval) : null,

            minPrice:
              response?.volumeminPrice != null
                ? Number(response.volumeminPrice)
                : null,

            maxPrice:
              response?.volumeMaxPrice != null
                ? Number(response.volumeMaxPrice)
                : null,
          },
        };

      case "SMA":
        return {
          type: "multi",
          data: {
            sma:
              response.data
                ?.filter((d) => d.sma != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: d.sma,
                })) ?? [],

            smoothingMA:
              response.data
                ?.filter((d) => d.smoothingMA != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: d.smoothingMA,
                })) ?? [],

            bbUpper:
              response.data
                ?.filter((d) => d.bbUpper != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: d.bbUpper,
                })) ?? [],

            bbLower:
              response.data
                ?.filter((d) => d.bbLower != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: d.bbLower,
                })) ?? [],
          },
        };

      case "SSL_HYBRID":
        return {
          type: "multi",
          data: {
            baseline:
              response?.data
                ?.filter((d) => d.baseline != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: d.baseline,
                })) ?? [],

            upperChannel:
              response.data
                ?.filter((d) => d.upperChannel != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: d.upperChannel,
                })) ?? [],

            lowerChannel:
              response.data
                ?.filter((d) => d.lowerChannel != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: d.lowerChannel,
                })) ?? [],

            ssl1:
              response.data
                ?.filter((d) => d.ssl1 != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: d.ssl1,
                })) ?? [],

            ssl2:
              response.data
                ?.filter((d) => d.ssl2 != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: d.ssl2,
                })) ?? [],

            atrUpper:
              response.data
                ?.filter((d) => d.atrUpper != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: d.atrUpper,
                })) ?? [],

            atrLower:
              response.data
                ?.filter((d) => d.atrLower != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: d.atrLower,
                })) ?? [],

            // sslExit:
            //   response.data
            //     ?.filter((d) => d.sslExit != null && d.time != null)
            //     .map((d) => ({
            //       time: Number(d.time) + IST_OFFSET,
            //       value: d.sslExit,
            //     })) ?? [],
          },
        };

      case "PVI":
        return {
          type: "multi",
          data: {
            pvi:
              response.data
                ?.filter((d) => d.pvi != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: d.pvi,
                })) ?? [],

            pviEma:
              response.data
                ?.filter((d) => d.pviEma != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: d.pviEma,
                })) ?? [],
          },
        };

      case "HV":
        return {
          type: "single",
          data: {
            hv:
              response.data
                ?.filter((d) => d.historical_Vol != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: Number(d.historical_Vol),
                })) ?? [],
          },
        };
      case "NVI":
        return {
          type: "single",
          data: {
            nvi:
              response.data
                ?.filter((d) => d.nvi != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: d.nvi,
                })) ?? [],

            nviEma:
              response.data
                ?.filter((d) => d.nviEma != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: d.nviEma,
                })) ?? [],
          },
        };
      case "EOM":
        return {
          type: "single",
          data:
            response.data
              ?.filter((d) => d.eom != null && d.time != null)
              .map((d) => ({
                time: Number(d.time) + IST_OFFSET,
                value: d.eom,
              })) ?? [],
        };

      case "CMF":
        return {
          type: "single",
          data: {
            cmf:
              response.data
                ?.filter((d) => d.cmf != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: d.cmf,
                })) ?? [],
          },
        };

      case "EMA":
        return {
          type: "multi",
          data: {
            ema:
              response.data
                ?.filter((d) => d.ema != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: d.ema,
                })) ?? [],

            smoothingMA:
              response.data
                ?.filter((d) => d.smoothingMA != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: d.smoothingMA,
                })) ?? [],

            bbUpper:
              response.data
                ?.filter((d) => d.bbUpper != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: d.bbUpper,
                })) ?? [],

            bbLower:
              response.data
                ?.filter((d) => d.bbLower != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: d.bbLower,
                })) ?? [],
          },
        };

      case "CCI": {
        const rows = Array.isArray(response?.data) ? response.data : [];

        const mapLineCCI = (field) =>
          rows
            .map((d) => ({
              time: Number(d.time) + IST_OFFSET,
              value: d[field] != null ? Number(d[field]) : null,
            }))
            .filter((d) => d.value !== null);

        const cciLine = mapLineCCI("cci");
        const cciMa = mapLineCCI("smoothingMA");
        const bbUpper = mapLineCCI("bbUpper");
        const bbLower = mapLineCCI("bbLower");

        return {
          type: "multi",
          data: {
            cciLine,
            cciMa,
            bbUpper,
            bbLower,
          },
        };
      }
      case "UO":
        return {
          type: "single",
          data: {
            series: (response?.data || [])
              .filter((d) => d.time != null && (d.uo ?? d.ultimate) != null)
              .map((d) => ({
                time: Number(d.time) + IST_OFFSET,
                uo: Number(d.uo ?? d.ultimate),
              })),
          },
        };

      case "CHOP":
        return {
          type: "multi",
          data: {
            chopLine:
              response.data
                ?.filter((d) => d.chop != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: d.chop,
                })) ?? [],
          },
        };

      case "CKS":
        return {
          type: "multi",
          data: {
            long:
              response.data
                ?.filter((d) => d.stopLong != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: Number(d.stopLong),
                })) ?? [],

            short:
              response.data
                ?.filter((d) => d.stopShort != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: Number(d.stopShort),
                })) ?? [],
          },
        };
      case "HMA":
        return {
          type: "multi",
          data: {
            hma:
              response.data
                ?.filter((d) => d.hma != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: d.hma,
                })) ?? [],
          },
        };
      case "DEMA":
        return {
          type: "multi",
          data: {
            dema:
              response.data
                ?.filter((d) => d.dema != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: d.dema,
                })) ?? [],
          },
        };

      case "TEMA":
        return {
          type: "multi",
          data: {
            tema:
              response.data
                ?.filter((d) => d.tema != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: d.tema,
                })) ?? [],
          },
        };
      case "KAMA":
        return {
          type: "multi",
          data: {
            kama:
              response.data
                ?.filter((d) => d.kama != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: d.kama,
                })) ?? [],
          },
        };
      case "AO":
        return {
          type: "single",
          data:
            response.data
              ?.filter((d) => d.aroonOsc != null && d.time != null)
              .map((d) => ({
                time: Number(d.time) + IST_OFFSET,
                value: d.aroonOsc,
              })) ?? [],
        };

      case "SUPERTREND":
        return {
          type: "multi",
          data: {
            upTrend:
              response.data?.map((d) => ({
                time: Number(d.time) + IST_OFFSET,
                value: d.upTrend ?? null,
              })) ?? [],
            downTrend:
              response.data?.map((d) => ({
                time: Number(d.time) + IST_OFFSET,
                value: d.downTrend ?? null,
              })) ?? [],
            bodyMiddle:
              response.data?.map((d) => ({
                time: Number(d.time) + IST_OFFSET,
                value: d.bodyMiddle ?? null,
              })) ?? [],
          },
        };
      case "MOM":
        return {
          type: "multi",
          data: {
            momentum:
              response.data
                ?.filter((d) => d.mom != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: d.mom,
                })) ?? [],
          },
        };

      case "DC":
        return {
          type: "multi",
          data: {
            upper:
              response.data
                ?.filter((d) => d.upper != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: d.upper,
                })) ?? [],

            lower:
              response.data
                ?.filter((d) => d.lower != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: d.lower,
                })) ?? [],

            basis:
              response.data
                ?.filter((d) => d.basis != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: d.basis,
                })) ?? [],
          },
        };
      case "TRIX":
        return {
          type: "single",
          data: {
            trix:
              response.data
                ?.filter((d) => d.trix != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: Number(d.trix),
                })) ?? [],
          },
        };

      case "ROC":
        return {
          type: "multi",
          data: {
            roc:
              response.data
                ?.filter((d) => d.roc != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: d.roc,
                })) ?? [],
          },
        };

      case "ZIGZAG":
        return {
          type: "multi",
          data: {
            zigzagLine:
              response.data?.series
                ?.filter((d) => d.value != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: d.value,
                })) ?? [],

            paneLabels:
              response.data?.pivots
                ?.filter((d) => d.price != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: d.price,
                  type: d.type,
                })) ?? [],
          },
        };

      case "ADX":
        return {
          type: "multi",
          data: {
            adx:
              response.data
                ?.filter((d) => d.ADX != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: d.ADX,
                })) ?? [],
          },
        };
      case "VOL":
        return {
          type: "multi",
          data: {
            volume:
              response?.data?.map((d) => ({
                time: Number(d.time) + IST_OFFSET,
                value: Number(d.volume),
                color: d.color || "#26A69A",
              })) ?? [],

            volumeMA:
              response?.data
                ?.filter((d) => d.volumeMA != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: Number(d.volumeMA),
                })) ?? [],
          },
        };
      case "PVO":
        return {
          type: "multi",
          data: {
            pvo:
              response.data
                ?.filter((d) => d.pvo != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: Number(d.pvo),
                })) ?? [],

            signal:
              response.data
                ?.filter((d) => d.signal != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: Number(d.signal),
                })) ?? [],

            hist:
              response.data
                ?.filter((d) => d.hist != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: Number(d.hist),
                })) ?? [],
          },
        };
      case "STDDEV":
        return {
          type: "single",
          data:
            response.data
              ?.filter((d) => d.value != null && d.time != null)
              .map((d) => ({
                time: Number(d.time) + IST_OFFSET,
                value: Number(d.value),
              })) ?? [],
        };

      case "OBV":
        return {
          type: "multi",
          data: {
            obv:
              response.data
                ?.filter((d) => d.obv != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: Number(d.obv),
                })) ?? [],

            smoothingMA:
              response.data
                ?.filter((d) => d.smoothingMA != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: Number(d.smoothingMA),
                })) ?? [],

            bbUpper:
              response.data
                ?.filter((d) => d.bbUpper != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: Number(d.bbUpper),
                })) ?? [],

            bbLower:
              response.data
                ?.filter((d) => d.bbLower != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: Number(d.bbLower),
                })) ?? [],
          },
        };

      case "VP":
        return {
          type: "multi",
          data: {
            volume:
              response.data?.map((d) => ({
                time: Number(d.time) + IST_OFFSET,
                value: Number(d.volume),
                color:
                  d.close >= d.open
                    ? "rgba(38,166,154,1)"
                    : "rgba(239,83,80,1)",
              })) ?? [],

            volumeMA:
              response.data?.map((d) => ({
                time: Number(d.time) + IST_OFFSET,
                value: Number(d.volumeMA),
              })) ?? [],
          },
        };
      case "MFI":
        return {
          type: "single",
          data: {
            mfi:
              response?.data
                ?.filter((d) => d.value != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: Number(d.value ?? d.mfi),
                })) ?? [],
          },
        };

      case "ATR":
        return {
          type: "single",

          data: (response.data ?? [])
            .filter((d) => d && d.atr != null && d.time != null)
            .map((d) => ({
              time: Number(d.time) + IST_OFFSET,
              value: Number(d.atr),
            })),
        };

      case "RSI":
        return {
          type: "multi",
          data: {
            rsi:
              response.data
                ?.filter((d) => d.rsi != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: d.rsi,
                })) ?? [],

            smoothingMA:
              response.data
                ?.filter((d) => d.smoothingMA != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: d.smoothingMA,
                })) ?? [],

            bbUpperBand:
              response.data
                ?.filter((d) => d.bbUpperBand != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: d.bbUpperBand,
                })) ?? [],

            bbLowerBand:
              response.data
                ?.filter((d) => d.bbLowerBand != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: d.bbLowerBand,
                })) ?? [],
          },
        };

      case "AROON":
        return {
          type: "multi",
          data: {
            aroonUp: response.data?.aroonUpSeries ?? [],
            aroonDown: response.data?.aroonDownSeries ?? [],
          },
        };
      case "TR":
        return {
          type: "single",
          data: {
            tr:
              response?.data
                ?.filter((d) => d.trueRange != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: Number(d.trueRange),
                })) ?? [],
          },
        };
      case "BBPERB":
        return {
          type: "multi",
          data: {
            percentB:
              response.data
                ?.filter((d) => d.percentB != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: Number(d.percentB),
                })) ?? [],
          },
        };
      case "VWMA":
        return {
          type: "single",
          data: {
            vwma:
              response?.data
                ?.filter((d) => d.vwma != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: Number(d.vwma),
                })) ?? [],
          },
        };
      case "RMA":
        return {
          type: "single",
          data: {
            rma:
              response?.data
                ?.filter((d) => d.rma != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: Number(d.rma),
                })) ?? [],
          },
        };
      case "TMA":
        return {
          type: "single",
          data: {
            tma:
              response?.data
                ?.filter((d) => d.tma != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: Number(d.tma),
                })) ?? [],
          },
        };
      case "WPR":
        return {
          type: "multi",
          data: {
            r:
              response.data?.series
                ?.filter((d) => d.williamPercentR != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: d.williamPercentR,
                })) ?? [],
          },
        };
      case "WMA":
        return {
          type: "multi",
          data: {
            wma:
              response.data
                ?.filter((d) => d.wma != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: d.wma,
                })) ?? [],
          },
        };

      case "PivotPoints(Standard)": {
        const d = response.data ?? {};

        console.log("Pivot Standard:", d);

        return {
          type: "pivot",
          data: [
            { label: "P", value: Number(d.P) },
            { label: "R1", value: Number(d.R1) },
            { label: "R2", value: Number(d.R2) },
            { label: "R3", value: Number(d.R3) },
            { label: "S1", value: Number(d.S1) },
            { label: "S2", value: Number(d.S2) },
            { label: "S3", value: Number(d.S3) },
          ].filter((level) => !Number.isNaN(level.value)),
        };
      }

      case "PivotPoints(Fibonacci)": {
        const d = response.data ?? {};

        console.log("PivotFibonacci:", d);

        return {
          type: "pivot",
          data: [
            { label: "P", value: Number(d.P) },
            { label: "R1", value: Number(d.R1) },
            { label: "R2", value: Number(d.R2) },
            { label: "R3", value: Number(d.R3) },
            { label: "S1", value: Number(d.S1) },
            { label: "S2", value: Number(d.S2) },
            { label: "S3", value: Number(d.S3) },
          ].filter((level) => !Number.isNaN(level.value)),
        };
      }
      case "PivotPoints(Camarilla)": {
        const d = response.data ?? {};

        console.log("Pivot Camarilla:", d);

        return {
          type: "pivot",
          data: [
            { label: "P", value: Number(d.P) },
            { label: "R1", value: Number(d.R1) },
            { label: "R2", value: Number(d.R2) },
            { label: "R3", value: Number(d.R3) },
            { label: "R4", value: Number(d.R4) }, // Camarilla often has R4/S4
            { label: "S1", value: Number(d.S1) },
            { label: "S2", value: Number(d.S2) },
            { label: "S3", value: Number(d.S3) },
            { label: "S4", value: Number(d.S4) },
          ].filter((level) => !Number.isNaN(level.value)),
        };
      }

      case "PivotPoints(Classic)": {
        const d = response.data ?? {};

        console.log("Pivot Classic:", d);

        return {
          type: "pivot",
          data: [
            { label: "P", value: Number(d.P) },
            { label: "R1", value: Number(d.R1) },
            { label: "R2", value: Number(d.R2) },
            { label: "R3", value: Number(d.R3) },
            { label: "S1", value: Number(d.S1) },
            { label: "S2", value: Number(d.S2) },
            { label: "S3", value: Number(d.S3) },
          ].filter((level) => !Number.isNaN(level.value)),
        };
      }

      case "AD":
        return {
          type: "single",
          data:
            response.data
              ?.filter((d) => d.ad != null && d.time != null)
              .map((d) => ({
                time: Number(d.time) + IST_OFFSET,
                value: Number(d.ad),
              })) ?? [],
        };

      /* ---------------- MULTI LINE ---------------- */

      case "ICHIMOKU":
        return {
          type: "multi",
          data: {
            conversionLine: mapLine(response.data, "conversionLine"),
            baseLine: mapLine(response.data, "baseLine"),

            leadLine1: mapLine(response.data, "leadLine1"),
            leadLine2: mapLine(response.data, "leadLine2"),

            laggingSpan: mapLine(response.data, "laggingSpan"),

            kumoCloudUpper: mapLine(response.data, "kumoCloudUpper"),
            kumoCloudLower: mapLine(response.data, "kumoCloudLower"),
          },
        };
      case "ChandeKrollStop":
        return {
          type: "multi",
          data: {
            longStop:
              response.data
                ?.filter((d) => d.longStop != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: d.longStop,
                })) ?? [],

            shortStop:
              response.data
                ?.filter((d) => d.shortStop != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: d.shortStop,
                })) ?? [],
          },
        };

      case "STOCH":
        return {
          type: "multi",
          data: {
            k:
              response.data
                ?.filter((d) => d.stochastick != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: Number(d.stochastick),
                })) ?? [],

            d:
              response.data
                ?.filter((d) => d.stochasticd != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: Number(d.stochasticd),
                })) ?? [],
          },
        };
      case "STOCHRSI":
        return {
          type: "multi",
          data: {
            kLine:
              response.data.candles
                ?.filter((d) => d.stochRsiK != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: d.stochRsiK,
                })) ?? [],

            dLine:
              response.data.candles
                ?.filter((d) => d.stochRsiD != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: d.stochRsiD,
                })) ?? [],
          },
        };

      case "MACD":
        return {
          type: "multi",
          data: {
            macd:
              response.data
                ?.filter((d) => d.macd != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: d.macd,
                })) ?? [],

            signal:
              response.data
                ?.filter((d) => d.signal != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: d.signal,
                })) ?? [],

            histogram:
              response.data
                ?.filter((d) => d.hist != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: d.hist,
                })) ?? [],
          },
        };

      case "CMO":
        return {
          type: "single",
          data: {
            cmo:
              response.data
                ?.filter((d) => d.cmo != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: Number(d.cmo),
                })) ?? [],
          },
        };

      case "KVO":
        return {
          type: "multi",
          data: {
            kvo:
              response?.data
                ?.filter((d) => d.kvo != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: Number(d.kvo),
                })) ?? [],

            signal:
              response?.data
                ?.filter((d) => d.signal != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: Number(d.signal),
                })) ?? [],
          },
        };
      case "BB":
        return {
          type: "triple",
          data: {
            upper:
              response.data
                ?.filter((d) => d.upper != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: Number(d.upper),
                })) ?? [],

            lower:
              response.data
                ?.filter((d) => d.lower != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: Number(d.lower),
                })) ?? [],

            basis:
              response.data
                ?.filter((d) => d.basis != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: Number(d.basis),
                })) ?? [],
          },
        };

      case "FT":
        return {
          type: "multi",
          data: {
            fisherLine:
              response.data
                ?.filter((d) => d.fish != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: d.fish,
                })) ?? [],

            triggerLine:
              response.data
                ?.filter((d) => d.trigger != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: d.trigger,
                })) ?? [],
          },
        };

      case "KC":
        return {
          type: "triple",
          data: {
            upper:
              response.data
                ?.filter((d) => d.upper != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: Number(d.upper),
                })) ?? [],

            lower:
              response.data
                ?.filter((d) => d.lower != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: Number(d.lower),
                })) ?? [],

            middle:
              response.data
                ?.filter((d) => d.middle != null && d.time != null)
                .map((d) => ({
                  time: Number(d.time) + IST_OFFSET,
                  value: Number(d.middle),
                })) ?? [],
          },
        };

      case "AWO":
        return {
          type: "single",
          data:
            response?.data
              ?.filter((d) => d.ao != null && d.time != null)
              .map((d) => ({
                time: Number(d.time) + IST_OFFSET,
                value: Number(d.ao),
              })) ?? [],
        };

      default:
        return {
          type: "single",
          data: [],
        };
    }
  } catch (error) {
    console.error("Indicator fetch error:", error);
    return { type: "error", data: [] };
  }
}
