import { useEffect } from "react";
import { LineSeries, AreaSeries } from "lightweight-charts";

export default function BBPERBPlot({
  result,
  indicatorStyle,
  indicatorSeriesRef,
  addSeries,
}) {
  /* ================= CREATE ================= */

  useEffect(() => {
    const percentB = result?.data?.percentB;

    console.log(percentB, "----------------------->>>>>>>>>>>");

    if (!Array.isArray(percentB) || percentB?.length === 0) {
      console.log(":x: BBPERB not plotting", result);
      return;
    } // :fire: REMOVE OLD

    if (indicatorSeriesRef.current?.BBPERB) {
      Object.values(indicatorSeriesRef.current.BBPERB).forEach((s) => {
        try {
          s.setData([]);
        } catch {}
      });
      indicatorSeriesRef.current.BBPERB = null;
    } /* :large_blue_circle: %B LINE */

    const percentBSeries = addSeries("BBPERB", LineSeries, {
      color: indicatorStyle?.BBPERB?.percentB?.color ?? "rgba(33,150,243,1)",
      lineWidth: indicatorStyle?.BBPERB?.percentB?.width ?? 2,
      lineStyle: indicatorStyle?.BBPERB?.percentB?.lineStyle ?? 0,
      visible: indicatorStyle?.BBPERB?.percentB?.visible ?? true,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    percentBSeries.setData(percentB); // dynamic band values

    const overboughtVal = indicatorStyle?.BBPERB?.overbought?.value ?? 1;
    const middleVal = indicatorStyle?.BBPERB?.middleBand?.value ?? 0.5;
    const oversoldVal =
      indicatorStyle?.BBPERB?.oversold?.value ??
      0; /* :red_circle: OVERBOUGHT LINE */

    const overboughtSeries = addSeries("BBPERB", LineSeries, {
      color: indicatorStyle?.BBPERB?.overbought?.color ?? "rgba(244,67,54,1)",
      lineWidth: indicatorStyle?.BBPERB?.overbought?.width ?? 1,
      lineStyle: indicatorStyle?.BBPERB?.overbought?.lineStyle ?? 2,
      visible: indicatorStyle?.BBPERB?.overbought?.visible ?? true,
      priceLineVisible: false,
    });

    overboughtSeries.setData(
      percentB.map((d) => ({ time: d.time, value: overboughtVal })),
    ); /* :large_yellow_circle: MIDDLE LINE */

    const middleSeries = addSeries("BBPERB", LineSeries, {
      color: indicatorStyle?.BBPERB?.middleBand?.color ?? "rgba(255,193,7,1)",
      lineWidth: indicatorStyle?.BBPERB?.middleBand?.width ?? 1,
      lineStyle: indicatorStyle?.BBPERB?.middleBand?.lineStyle ?? 1,
      visible: indicatorStyle?.BBPERB?.middleBand?.visible ?? true,
      priceLineVisible: false,
    });

    middleSeries.setData(
      percentB.map((d) => ({ time: d.time, value: middleVal })),
    ); /* :large_green_circle: OVERSOLD LINE */

    const oversoldSeries = addSeries("BBPERB", LineSeries, {
      color: indicatorStyle?.BBPERB?.oversold?.color ?? "rgba(0,200,83,1)",
      lineWidth: indicatorStyle?.BBPERB?.oversold?.width ?? 1,
      lineStyle: indicatorStyle?.BBPERB?.oversold?.lineStyle ?? 2,
      visible: indicatorStyle?.BBPERB?.oversold?.visible ?? true,
      priceLineVisible: false,
    });

    oversoldSeries.setData(
      percentB.map((d) => ({ time: d.time, value: oversoldVal })),
    ); /* ================= :art: BACKGROUND FILLS ================= */ /* :red_circle: OVERBOUGHT BG */

    const overboughtBgSeries = addSeries("BBPERB", AreaSeries, {
      topColor:
        indicatorStyle?.BBPERB?.overboughtBg?.color ?? "rgba(244,67,54,0.1)",
      bottomColor: "rgba(0,0,0,0)",
      lineColor: "transparent",
      baseValue: { type: "price", price: overboughtVal },
      visible: indicatorStyle?.BBPERB?.overboughtBg?.visible ?? true,
    });

    overboughtBgSeries.setData(
      percentB.map((d) => ({ time: d.time, value: 2 })),
    ); /* :large_yellow_square: MIDDLE BG */

    const middleBgSeries = addSeries("BBPERB", AreaSeries, {
      topColor:
        indicatorStyle?.BBPERB?.middleBg?.color ?? "rgba(255,193,7,0.1)",
      bottomColor:
        indicatorStyle?.BBPERB?.middleBg?.color ?? "rgba(255,193,7,0.1)",
      lineColor: "transparent",
      baseValue: { type: "price", price: oversoldVal },
      visible: indicatorStyle?.BBPERB?.middleBg?.visible ?? true,
    });

    middleBgSeries.setData(
      percentB.map((d) => ({ time: d.time, value: overboughtVal })),
    ); /* :large_green_circle: OVERSOLD BG */

    const oversoldBgSeries = addSeries("BBPERB", AreaSeries, {
      topColor: "rgba(0,0,0,0)",
      bottomColor:
        indicatorStyle?.BBPERB?.oversoldBg?.color ?? "rgba(0,200,83,0.1)",
      lineColor: "transparent",
      baseValue: { type: "price", price: oversoldVal },
      visible: indicatorStyle?.BBPERB?.oversoldBg?.visible ?? true,
    });

    oversoldBgSeries.setData(
      percentB.map((d) => ({ time: d.time, value: -1 })),
    );

    indicatorSeriesRef.current.BBPERB = {
      percentB: percentBSeries,
      overbought: overboughtSeries,
      middleBand: middleSeries,
      oversold: oversoldSeries,
      overboughtBg: overboughtBgSeries,
      middleBg: middleBgSeries,
      oversoldBg: oversoldBgSeries,
    };

    console.log(":white_check_mark: BBPERB plotted SUCCESS");
  }, [result]); /* ================= STYLE UPDATE ================= */

  useEffect(() => {
    const group = indicatorSeriesRef.current?.BBPERB;
    if (!group) return;

    group.percentB?.applyOptions({
      color: indicatorStyle?.BBPERB?.percentB?.color,
      lineWidth: indicatorStyle?.BBPERB?.percentB?.width,
      lineStyle: indicatorStyle?.BBPERB?.percentB?.lineStyle ?? 0,
      visible: indicatorStyle?.BBPERB?.percentB?.visible,
    });

    group.overbought?.applyOptions({
      color: indicatorStyle?.BBPERB?.overbought?.color,
      lineWidth: indicatorStyle?.BBPERB?.overbought?.width,
      lineStyle: indicatorStyle?.BBPERB?.overbought?.lineStyle ?? 2,
      visible: indicatorStyle?.BBPERB?.overbought?.visible,
    });

    group.middleBand?.applyOptions({
      color: indicatorStyle?.BBPERB?.middleBand?.color,
      lineWidth: indicatorStyle?.BBPERB?.middleBand?.width,
      lineStyle: indicatorStyle?.BBPERB?.middleBand?.lineStyle ?? 1,
      visible: indicatorStyle?.BBPERB?.middleBand?.visible,
    });

    group.oversold?.applyOptions({
      color: indicatorStyle?.BBPERB?.oversold?.color,
      lineWidth: indicatorStyle?.BBPERB?.oversold?.width,
      lineStyle: indicatorStyle?.BBPERB?.oversold?.lineStyle ?? 2,
      visible: indicatorStyle?.BBPERB?.oversold?.visible,
    }); /* :art: BG STYLE UPDATE */

    group.overboughtBg?.applyOptions({
      topColor: indicatorStyle?.BBPERB?.overboughtBg?.color,
      visible: indicatorStyle?.BBPERB?.overboughtBg?.visible,
      baseValue: {
        type: "price",
        price: indicatorStyle?.BBPERB?.overbought?.value ?? 1,
      },
    });

    group.middleBg?.applyOptions({
      topColor: indicatorStyle?.BBPERB?.middleBg?.color,
      bottomColor: indicatorStyle?.BBPERB?.middleBg?.color,
      visible: indicatorStyle?.BBPERB?.middleBg?.visible,
      baseValue: {
        type: "price",
        price: indicatorStyle?.BBPERB?.oversold?.value ?? 0,
      },
    });

    group.oversoldBg?.applyOptions({
      bottomColor: indicatorStyle?.BBPERB?.oversoldBg?.color,
      visible: indicatorStyle?.BBPERB?.oversoldBg?.visible,
      baseValue: {
        type: "price",
        price: indicatorStyle?.BBPERB?.oversold?.value ?? 0,
      },
    }); // ===== :repeat: FORCE BG AREA RECALC =====

    const percentB = result?.data?.percentB;

    if (Array.isArray(percentB) && percentB?.length) {
      const overboughtVal = indicatorStyle?.BBPERB?.overbought?.value ?? 1;
      const oversoldVal = indicatorStyle?.BBPERB?.oversold?.value ?? 0;

      group.overboughtBg?.setData(
        percentB.map((d) => ({ time: d.time, value: 2 })),
      );

      group.middleBg?.setData(
        percentB.map((d) => ({ time: d.time, value: overboughtVal })),
      );

      group.oversoldBg?.setData(
        percentB.map((d) => ({ time: d.time, value: -1 })),
      );
    }
  }, [indicatorStyle?.BBPERB]);

  return null;
}
