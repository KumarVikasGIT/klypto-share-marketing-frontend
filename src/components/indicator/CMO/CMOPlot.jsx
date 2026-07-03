import { useEffect } from "react";
import { LineSeries } from "lightweight-charts";

export default function CMOPlot({
  result,
  indicatorStyle,
  indicatorSeriesRef,
  addSeries,
}) {
  /* ================= CREATE ================= */

  useEffect(() => {
    const cmoDataRaw = result?.data?.cmo;

    if (!Array.isArray(cmoDataRaw) || !cmoDataRaw?.length) {
      console.log(":x: CMO data missing", result);
      return;
    } // :fire: REMOVE OLD

    if (indicatorSeriesRef.current?.CMO) {
      Object.values(indicatorSeriesRef.current.CMO).forEach((s) => {
        try {
          s.setData([]);
        } catch {}
      });
      indicatorSeriesRef.current.CMO = null;
    }

    const map = (arr) =>
      arr.map((p) => ({
        time: Number(p.time),
        value: Number(p.value),
      }));

    const cmoData = map(cmoDataRaw);

    const style = indicatorStyle?.CMO; /* :fire: CMO LINE */

    const cmoSeries = addSeries("CMO", LineSeries, {
      color: style?.cmoLine?.color ?? "rgba(38,166,154,1)",
      lineWidth: style?.cmoLine?.width ?? 2,
      lineStyle: style?.cmoLine?.lineStyle ?? 0,
      visible: style?.cmoLine?.visible ?? true,
      priceLineVisible: false,
      lastValueVisible: true,
    }); /* :fire: ZERO LINE */

    const zeroSeries = addSeries("CMO", LineSeries, {
      color: style?.zeroLine?.color ?? "rgba(158,158,158,1)",
      lineWidth: style?.zeroLine?.width ?? 1,
      lineStyle: style?.zeroLine?.lineStyle ?? 2,
      visible: style?.zeroLine?.visible ?? true,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const zeroValue = style?.zeroLine?.value ?? 0;

    const zeroData = cmoData.map((p) => ({
      time: p.time,
      value: zeroValue,
    }));

    cmoSeries.setData(cmoData);
    zeroSeries.setData(zeroData);

    indicatorSeriesRef.current.CMO = {
      cmoLine: cmoSeries,
      zeroLine: zeroSeries,
      cmoData,
    };

    console.log(":white_check_mark: CMO plotted");
  }, [result]); /* ================= STYLE UPDATE ================= */

  useEffect(() => {
    const g = indicatorSeriesRef.current?.CMO;
    if (!g) return;

    const style = indicatorStyle?.CMO;
    if (!style) return; /* :fire: UPDATE ZERO LINE DATA */

    const zeroValue = style?.zeroLine?.value ?? 0;

    const zeroData = g.cmoData.map((p) => ({
      time: p.time,
      value: zeroValue,
    }));

    g.zeroLine?.setData(zeroData); /* :fire: APPLY STYLE */

    g.cmoLine?.applyOptions({
      color: style?.cmoLine?.color,
      lineWidth: style?.cmoLine?.width,
      lineStyle: style?.cmoLine?.lineStyle,
      visible: style?.cmoLine?.visible,
    });

    g.zeroLine?.applyOptions({
      color: style?.zeroLine?.color,
      lineWidth: style?.zeroLine?.width,
      lineStyle: style?.zeroLine?.lineStyle,
      visible: style?.zeroLine?.visible,
    });
  }, [indicatorStyle?.CMO]);

  return null;
}
