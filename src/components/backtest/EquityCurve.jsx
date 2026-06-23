import React, { useEffect, useRef } from "react";
import { createChart, LineSeries } from "lightweight-charts";

const EquityCurve = ({ equityData, benchmarkData }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: 'solid', color: 'transparent' },
        textColor: '#787b86',
      },
      grid: {
        vertLines: { color: 'rgba(120, 123, 134, 0.15)' },
        horzLines: { color: 'rgba(120, 123, 134, 0.15)' },
      },
      timeScale: { borderColor: '#2e3347', timeVisible: true },
      rightPriceScale: { borderColor: '#2e3347' },
      crosshair: { mode: 1 },
    });
    chartRef.current = chart;

    const equitySeries = chart.addSeries(LineSeries, {
      color: '#089981',
      lineWidth: 2,
      title: 'Equity',
    });
    equitySeries.setData(equityData);

    const benchmarkSeries = chart.addSeries(LineSeries, {
      color: '#f7931a',
      lineWidth: 1,
      lineStyle: 2,
      title: 'Benchmark',
    });
    benchmarkSeries.setData(benchmarkData);

    chart.timeScale().fitContent();

    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [equityData, benchmarkData]);

  return (
    <div className="equity-curve-container">
      <div className="ec-header">
        <span className="ec-title">Equity Curve <span className="info-icon">ⓘ</span></span>
        <div className="ec-legend">
          <span className="legend-item"><span className="legend-color" style={{background: 'var(--success-color)'}}></span> Equity</span>
          <span className="legend-item"><span className="legend-color" style={{background: 'var(--text-secondary)', height: '2px', width: '12px'}}></span> Buy & Hold Benchmark</span>
        </div>
      </div>
      <div ref={chartContainerRef} style={{ flex: 1, minHeight: '300px' }} />

      <style>{`
        .equity-curve-container {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          display: flex;
          flex-direction: column;
          height: 100%;
          padding: 12px;
        }
        .ec-header {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 12px;
        }
        .ec-title {
          font-size: 13px;
          color: var(--text-primary);
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .ec-legend {
          display: flex;
          gap: 16px;
          font-size: 11px;
          color: var(--text-primary);
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .legend-color {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }
        .info-icon {
          color: var(--text-secondary);
          font-size: 10px;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default EquityCurve;
