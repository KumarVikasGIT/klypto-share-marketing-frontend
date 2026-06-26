import { useEffect } from "react";
import { LineSeries, BaselineSeries } from "lightweight-charts";

export default function CHOPPlot({
  result,
  rows,
  indicatorStyle,
  indicatorSeriesRef,
  addSeries,
}) {

  /* CREATE SERIES */

  useEffect(() => {
    if (!result?.data?.chopLine) return;

    const old = indicatorSeriesRef.current?.CHOP;

    if (indicatorSeriesRef.current?.CHOP) {
      Object.values(indicatorSeriesRef.current.CHOP).forEach((s) => {
        if (s?.setData) {
          try { s.setData([]); } catch {}
        }
      });
      indicatorSeriesRef.current.CHOP = null;
    }

    const grouped = {};

    const chopData = result.data.chopLine ?? [];
    if (!chopData?.length) return;

    const upper = indicatorStyle?.CHOP?.upper?.value ?? 61.8;
    const middle = indicatorStyle?.CHOP?.middle?.value ?? 50;
    const lower = indicatorStyle?.CHOP?.lower?.value ?? 38.2;

    const makeLevel = (v) =>
      chopData?.map((p) => ({
        time: p.time,
        value: v,
      }));


    /* CHOP LINE */

    const chopSeries = addSeries("CHOP", LineSeries, {
      color: indicatorStyle?.CHOP?.chopLine?.color,
      lineWidth: indicatorStyle?.CHOP?.chopLine?.width,
      lineStyle: indicatorStyle?.CHOP?.chopLine?.lineStyle ?? 0,
      visible: indicatorStyle?.CHOP?.chopLine?.visible,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    chopSeries?.setData(chopData);

    grouped.chopLine = chopSeries;


    /* BANDS */

    const upperSeries = addSeries("CHOP", LineSeries, {
      color: indicatorStyle?.CHOP?.upper?.color,
      lineWidth: indicatorStyle?.CHOP?.upper?.width,
      lineStyle: indicatorStyle?.CHOP?.upper?.lineStyle ?? 2,
      visible: indicatorStyle?.CHOP?.upper?.visible,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    upperSeries.setData(makeLevel(upper));


    const middleSeries = addSeries("CHOP", LineSeries, {
      color: indicatorStyle?.CHOP?.middle?.color,
      lineWidth: indicatorStyle?.CHOP?.middle?.width,
      lineStyle: indicatorStyle?.CHOP?.middle?.lineStyle ?? 2,
      visible: indicatorStyle?.CHOP?.middle?.visible,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    middleSeries.setData(makeLevel(middle));


    const lowerSeries = addSeries("CHOP", LineSeries, {
      color: indicatorStyle?.CHOP?.lower?.color,
      lineWidth: indicatorStyle?.CHOP?.lower?.width,
      lineStyle: indicatorStyle?.CHOP?.lower?.lineStyle ?? 2,
      visible: indicatorStyle?.CHOP?.lower?.visible,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    lowerSeries.setData(makeLevel(lower));


    grouped.upper = upperSeries;
    grouped.middle = middleSeries;
    grouped.lower = lowerSeries;


    /* BACKGROUND FILL */

    const bg = indicatorStyle?.CHOP?.bg;

    const bgSeries = addSeries("CHOP", BaselineSeries, {
      baseValue: { type: "price", price: lower },
      topFillColor1: bg?.topFillColor1,
      topFillColor2: bg?.topFillColor2,
      bottomFillColor1: "rgba(0,0,0,0)",
      bottomFillColor2: "rgba(0,0,0,0)",
      topLineColor: "transparent",
      bottomLineColor: "transparent",
      visible: bg?.visible ?? true,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    bgSeries.setData(makeLevel(upper));

    grouped.bg = bgSeries;

    grouped.chopData = chopData;

    indicatorSeriesRef.current.CHOP = grouped;

  }, [result]);


  /* STYLE + LEVEL UPDATE */

  useEffect(() => {

    const group = indicatorSeriesRef?.current?.CHOP;
    if (!group) return;

    const chopData = group.chopData ?? [];
    if (!chopData?.length) return;

    const upper = indicatorStyle?.CHOP?.upper?.value ?? 61.8;
    const middle = indicatorStyle?.CHOP?.middle?.value ?? 50;
    const lower = indicatorStyle?.CHOP?.lower?.value ?? 38.2;

    const makeLevel = (v) =>
      chopData.map((p) => ({ time: p.time, value: v }));


    /* UPDATE BAND LEVELS */

    group.upper?.setData(makeLevel(upper));
    group.middle?.setData(makeLevel(middle));
    group.lower?.setData(makeLevel(lower));


    /* UPDATE BG FILL (IMPORTANT FIX) */

    group.bg?.applyOptions({
      baseValue: { type: "price", price: lower },
      topFillColor1: indicatorStyle?.CHOP?.bg?.topFillColor1,
      topFillColor2: indicatorStyle?.CHOP?.bg?.topFillColor2,
      visible: indicatorStyle?.CHOP?.bg?.visible,
    });

    group.bg?.setData(makeLevel(upper));


    /* UPDATE STYLES */

    group.chopLine?.applyOptions({
      color: indicatorStyle?.CHOP?.chopLine?.color,
      lineWidth: indicatorStyle?.CHOP?.chopLine?.width,
      lineStyle: indicatorStyle?.CHOP?.chopLine?.lineStyle,
      visible: indicatorStyle?.CHOP?.chopLine?.visible,
    });

    group.upper?.applyOptions({
      color: indicatorStyle?.CHOP?.upper?.color,
      lineWidth: indicatorStyle?.CHOP?.upper?.width,
      lineStyle: indicatorStyle?.CHOP?.upper?.lineStyle,
      visible: indicatorStyle?.CHOP?.upper?.visible,
    });

    group.middle?.applyOptions({
      color: indicatorStyle?.CHOP?.middle?.color,
      lineWidth: indicatorStyle?.CHOP?.middle?.width,
      lineStyle: indicatorStyle?.CHOP?.middle?.lineStyle,
      visible: indicatorStyle?.CHOP?.middle?.visible,
    });

    group.lower?.applyOptions({
      color: indicatorStyle?.CHOP?.lower?.color,
      lineWidth: indicatorStyle?.CHOP?.lower?.width,
      lineStyle: indicatorStyle?.CHOP?.lower?.lineStyle,
      visible: indicatorStyle?.CHOP?.lower?.visible,
    });

  }, [indicatorStyle]);

  return null;
}