import { useEffect, useRef } from "react";
import { createChart } from "lightweight-charts";
import { ChartProprties } from "../util/common";
import { renderIndicatorContract } from "./IndicatorManager";

const LightweightChart = ({ contract, height = 260, onChartReady }) => {
  const hostRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!hostRef.current) return undefined;
    const chart = createChart(hostRef.current, {
      ...ChartProprties,
      autoSize: true,
      height,
    });
    chartRef.current = chart;
    onChartReady?.(chart);
    if (contract) {
      renderIndicatorContract(chart, contract);
    }
    return () => {
      chart.remove();
      chartRef.current = null;
      onChartReady?.(null);
    };
  }, [contract, height, onChartReady]);

  return <div ref={hostRef} style={{ width: "100%", height }} />;
};

export default LightweightChart;
