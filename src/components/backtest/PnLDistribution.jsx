import React, { useEffect, useRef } from "react";
import { createChart, HistogramSeries } from "lightweight-charts";

const PnLDistribution = ({ data }) => {
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
        vertLines: { visible: false },
        horzLines: { color: 'rgba(120, 123, 134, 0.15)' },
      },
      timeScale: { borderColor: '#2e3347', timeVisible: false },
      rightPriceScale: { borderColor: '#2e3347' },
      crosshair: { mode: 1 },
    });
    chartRef.current = chart;

    const histogramSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
    });
    histogramSeries.setData(data);

    chart.timeScale().fitContent();

    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data]);

  return (
    <div className="pnl-dist-container">
      <div className="dist-header">
        <span className="dist-title">PnL Distribution <span className="info-icon">ⓘ</span></span>
      </div>
      <div ref={chartContainerRef} style={{ flex: 1, minHeight: '150px' }} />

      <style>{`
        .pnl-dist-container {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          display: flex;
          flex-direction: column;
          height: 100%;
          padding: 12px;
        }
        .dist-header {
          margin-bottom: 12px;
        }
        .dist-title {
          font-size: 13px;
          color: var(--text-primary);
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 4px;
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

export default PnLDistribution;
