import React, { useEffect, useRef, useState } from 'react';
import { CandlestickSeries, createChart, LineSeries } from 'lightweight-charts';
import io from 'socket.io-client';
import { Modal, Button } from 'react-bootstrap';

const GoldChart = () => {
    const chartContainerRef = useRef();
    const chartRef = useRef();
    const seriesRef = useRef();
    const indicatorSeriesRef = useRef({});
    const lastTimeRef = useRef(0);
    const socketRef = useRef(null);

    const [selectedSymbol, setSelectedSymbol] = useState('RELIANCE');
    const [selectedInterval, setSelectedInterval] = useState('1d');
    const [livePrice, setLivePrice] = useState(0);
    const [isConnected, setIsConnected] = useState(false);
    const [stocks, setStocks] = useState([]);
    const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
    const [rsiThreshold, setRsiThreshold] = useState(60);
    const [activeIndicators, setActiveIndicators] = useState([]);
    const [showIndicatorModal, setShowIndicatorModal] = useState(false);

    const demoIndicators = [
        { label: "SMA (9)", value: "SMA", type: "overlay", color: "#6366f1" },
        { label: "EMA (9)", value: "EMA", type: "overlay", color: "#ec4899" },
        { label: "VWAP", value: "VWAP", type: "overlay", color: "#f59e0b" },
        { label: "Bollinger Bands", value: "BB", type: "overlay", color: "#06b6d4" },
        { label: "RSI (14)", value: "RSI", type: "oscillator", color: "#8b5cf6" },
        { label: "MACD", value: "MACD", type: "oscillator", color: "#10b981" },
        { label: "ATR", value: "ATR", type: "oscillator", color: "#f43f5e" },
        { label: "Supertrend", value: "SUPERTREND", type: "overlay", color: "#fbbf24" },
        { label: "Standard Deviation", value: "STDDEV", type: "oscillator", color: "#94a3b8" },
        { label: "Momentum", value: "MOM", type: "oscillator", color: "#2dd4bf" },
    ];

    const intervals = [
        { label: "1m", value: "1m", sec: 60 },
        { label: "5m", value: "5m", sec: 300 },
        { label: "15m", value: "15m", sec: 900 },
        { label: "1h", value: "1h", sec: 3600 },
        { label: "1d", value: "1d", sec: 86400 },
    ];

    useEffect(() => {
        if (!chartContainerRef.current) return;

        chartRef.current = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: 550,
            layout: {
                background: { color: '#020617' },
                textColor: '#94a3b8',
            },
            grid: {
                vertLines: { color: '#1e293b' },
                horzLines: { color: '#1e293b' },
            },
            priceScale: { borderColor: '#334155' },
            timeScale: {
                borderColor: '#334155',
                timeVisible: true,
                secondsVisible: false,
            },
        });

        seriesRef.current = chartRef.current.addSeries(CandlestickSeries, {
            upColor: '#10b981',
            downColor: '#ef4444',
            borderDownColor: '#ef4444',
            borderUpColor: '#10b981',
            wickDownColor: '#ef4444',
            wickUpColor: '#10b981',
        });

        const socket = io("http://192.168.1.9:7000");
        socketRef.current = socket;

        socket.on("connect", () => {
            setIsConnected(true);
        });

        socket.on("disconnect", () => setIsConnected(false));

        socket.on("rsiScannerResponse", (payload) => {
            if (payload.success) {
                const mappedStocks = payload.data.map(s => ({
                    name: s.symbol,
                    price: s.ltp,
                    change: `RSI: ${s.rsi}`,
                    sentiment:
                        parseFloat(s.rsi) > 70
                            ? "bullish"
                            : parseFloat(s.rsi) < 30
                            ? "bearish"
                            : "neutral"
                }));

                setStocks(mappedStocks);

                if (!payload.isAuto) {
                    setIsAlertModalOpen(false);
                }
            }
        });

        const fDate = "2024-01-01";
        const tDate = new Date().toISOString().split('T')[0];

        socket.emit("getManualHistoricalData", {
            symbol: selectedSymbol,
            interval: selectedInterval,
            fromDate: fDate,
            toDate: tDate
        });

        activeIndicators.forEach(ind => {
            socket.emit("getIndicatorDetails", {
                type: ind.value,
                symbol: selectedSymbol,
                interval: selectedInterval,
                fromDate: fDate,
                toDate: tDate
            });
        });

        socket.on("historicalDataResponse", (payload) => {
            console.log("Historical data response:", payload);
            if (payload.success && payload.data?.length > 0 && seriesRef.current) {
                const formattedData = payload.data
                    .map(c => ({
                        time: Number(c.time),
                        open: parseFloat(c.open),
                        high: parseFloat(c.high),
                        low: parseFloat(c.low),
                        close: parseFloat(c.close),
                    }))
                    .sort((a, b) => a.time - b.time);

                seriesRef.current.setData(formattedData);
                setLivePrice(formattedData[formattedData.length - 1].close);
                lastTimeRef.current = formattedData[formattedData.length - 1].time;
            }
        });

        socket.on("indicatorDetailsResponse", (payload) => {
            const indValue = payload.message.split('fetched by ')[1];
            const indConfig = demoIndicators.find(i => i.value === indValue);

            if (!indConfig || !payload.data) return;

            if (indicatorSeriesRef.current[indConfig.value]) {
                chartRef.current.removeSeries(indicatorSeriesRef.current[indConfig.value]);
            }

            const isActive = activeIndicators.some(i => i.value === indValue);

            if (!isActive) return;

            const newSeries = chartRef.current.addSeries(LineSeries, {
                color: indConfig.color,
                lineWidth: 2,
                priceScaleId: indConfig.type === "overlay" ? "right" : "left",
            });

            const indicatorData = payload.data
                .map(d => ({
                    time: Number(d.time),
                    value:
                        d[indConfig.value.toLowerCase()] ||
                        d.value ||
                        d.sma ||
                        d.ema ||
                        d.rsi ||
                        d.macd ||
                        d.vwap ||
                        d.atr ||
                        d.supertrend ||
                        0
                }))
                .filter(d => d.value !== 0 && !isNaN(d.time))
                .sort((a, b) => a.time - b.time);

            newSeries.setData(indicatorData);
            indicatorSeriesRef.current[indConfig.value] = newSeries;
        });

        socket.on("liveTick", (tick) => {
            if (tick.symbol === selectedSymbol && seriesRef.current) {
                const intervalSec =
                    intervals.find(i => i.value === selectedInterval)?.sec || 60;

                const normalizedTime =
                    Math.floor(Number(tick.data.time) / intervalSec) * intervalSec;

                if (normalizedTime < lastTimeRef.current) return;

                const latestTick = { ...tick.data, time: normalizedTime };

                seriesRef.current.update(latestTick);

                setLivePrice(tick.data.close);

                lastTimeRef.current = normalizedTime;

                activeIndicators.forEach(ind => {
                    socket.emit("getLiveIndicatorUpdate", {
                        type: ind.value,
                        symbol: selectedSymbol,
                        interval: selectedInterval,
                        latestTick: latestTick,
                        fromDate: fDate,
                        toDate: tDate
                    });
                });
            }
        });

        socket.on("liveIndicatorResponse", (payload) => {
            if (
                payload.symbol === selectedSymbol &&
                indicatorSeriesRef.current[payload.type]
            ) {
                const series = indicatorSeriesRef.current[payload.type];

                series.update({
                    time: Number(payload.data.time),
                    value: parseFloat(payload.data.value)
                });
            }
        });

        const handleResize = () => {
            if (chartRef.current && chartContainerRef.current) {
                chartRef.current.applyOptions({
                    width: chartContainerRef.current.clientWidth
                });
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            socket.disconnect();
            window.removeEventListener('resize', handleResize);

            if (chartRef.current) chartRef.current.remove();

            indicatorSeriesRef.current = {};
        };
    }, [selectedSymbol, selectedInterval, activeIndicators]);

    const handleScan = () => {
        if (socketRef.current) {
            setStocks([]);

            socketRef.current.emit("getRsiScanner", {
                rsi_threshold: rsiThreshold,
                interval: selectedInterval
            });

            socketRef.current.emit("setRsiAlert", {
                rsi_threshold: rsiThreshold,
                interval: selectedInterval
            });
        }
    };

    const toggleIndicator = (ind) => {
        setActiveIndicators(prev => {
            const exists = prev.find(i => i.value === ind.value);

            if (exists) {
                if (indicatorSeriesRef.current[ind.value]) {
                    chartRef.current.removeSeries(
                        indicatorSeriesRef.current[ind.value]
                    );

                    delete indicatorSeriesRef.current[ind.value];
                }

                return prev.filter(i => i.value !== ind.value);
            }

            return [...prev, ind];
        });
    };

    return (
        <div className="flex h-[700px] bg-[#020617] text-slate-200 font-sans overflow-hidden border border-slate-800 rounded-3xl m-4 shadow-2xl">

            {/* Watchlist */}
            <aside className="w-72 border-r border-slate-800/50 flex flex-col bg-slate-900/20 backdrop-blur-xl">
                <div className="p-5 border-b border-slate-800/50">
                    <h2 className="text-xl font-black bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                        Scanner Result
                    </h2>

                    <p className="text-[10px] text-slate-500 font-mono mt-1">
                        {stocks.length} SYMBOLS MATCHED
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                    {stocks.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                            <div className="w-12 h-12 rounded-full border border-dashed border-slate-600 mb-4 flex items-center justify-center">
                                <svg
                                    className="w-6 h-6"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                    />
                                </svg>
                            </div>

                            <p className="text-xs">No active scans.</p>
                            <p className="text-[10px]">Use the bell icon to scan.</p>
                        </div>
                    ) : (
                        stocks.map((stock, i) => (
                            <div
                                key={i}
                                onClick={() => setSelectedSymbol(stock.name)}
                                className={`p-4 rounded-2xl border cursor-pointer transition-all duration-300 group ${
                                    selectedSymbol === stock.name
                                        ? 'bg-blue-600/10 border-blue-500/50 shadow-lg'
                                        : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50'
                                }`}
                            >
                                <div className="flex justify-between items-start">
                                    <span className="font-bold tracking-tight text-white">
                                        {stock.name}
                                    </span>

                                    <span className="text-sm font-mono text-blue-400">
                                        ₹{stock.price}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center mt-2 text-[10px] font-bold uppercase tracking-wider">
                                    <span
                                        className={
                                            stock.sentiment === 'bullish'
                                                ? 'text-emerald-400'
                                                : stock.sentiment === 'bearish'
                                                ? 'text-rose-400'
                                                : 'text-slate-400'
                                        }
                                    >
                                        {stock.change}
                                    </span>

                                    <span className="text-slate-500 opacity-60">
                                        {stock.sentiment}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </aside>

            {/* Main Area */}
            <main className="flex-1 flex flex-col relative bg-slate-950/20">

                <header className="h-20 border-b border-slate-800/50 flex items-center justify-between px-8 bg-slate-900/40 backdrop-blur-md z-10">

                    <div className="flex items-center gap-8">

                        <div className="flex flex-col">
                            <h1 className="text-2xl font-black tracking-tighter text-white">
                                {selectedSymbol}
                            </h1>

                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>

                                <span className="text-xs font-mono text-emerald-400">
                                    ₹{livePrice.toLocaleString()}
                                </span>
                            </div>
                        </div>

                        <div className="flex bg-slate-800/50 p-1 rounded-xl border border-slate-700/50">
                            {intervals.map((int) => (
                                <button
                                    key={int.value}
                                    onClick={() => setSelectedInterval(int.value)}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                                        selectedInterval === int.value
                                            ? 'bg-blue-600 text-white shadow-lg'
                                            : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    {int.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">

                        <button
                            onClick={() => setIsAlertModalOpen(true)}
                            className="p-3 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all shadow-xl shadow-indigo-900/10 group"
                        >
                            <svg
                                className="w-5 h-5 group-hover:rotate-12 transition-transform"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                                />
                            </svg>
                        </button>

                        {/* Bootstrap Indicator Modal Button */}
                        <button
                            onClick={() => setShowIndicatorModal(true)}
                            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 text-white font-black text-xs hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/20 uppercase tracking-widest"
                        >
                            <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                />
                            </svg>

                            Indicators
                        </button>
                    </div>
                </header>

                <div ref={chartContainerRef} className="flex-1" />

                {/* RSI Modal */}
                {isAlertModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
                        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-3xl overflow-hidden scale-in-center">

                            <div className="p-8 border-b border-slate-800 bg-gradient-to-br from-indigo-600/10 to-transparent">
                                <div className="flex items-center gap-4 mb-4">

                                    <div className="p-4 rounded-2xl bg-indigo-500/10 text-indigo-400">
                                        <svg
                                            className="w-8 h-8"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M13 10V3L4 14h7v7l9-11h-7z"
                                            />
                                        </svg>
                                    </div>

                                    <div>
                                        <h3 className="text-2xl font-black text-white tracking-tight">
                                            RSI Scanner
                                        </h3>

                                        <p className="text-xs text-slate-400">
                                            Set threshold for bulk symbol scan
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 space-y-6">

                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                                        Target RSI Level
                                    </label>

                                    <input
                                        type="number"
                                        value={rsiThreshold}
                                        onChange={(e) => setRsiThreshold(e.target.value)}
                                        className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono text-2xl"
                                    />
                                </div>

                                <div className="p-5 bg-blue-500/5 rounded-3xl border border-blue-500/10 flex gap-4">

                                    <svg
                                        className="w-6 h-6 text-blue-400 shrink-0"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>

                                    <p className="text-[11px] leading-relaxed text-blue-300">
                                        Scanning will look for RSI {'>'} {rsiThreshold}
                                        across all tracked instruments on the{" "}
                                        {selectedInterval} timeframe.
                                    </p>
                                </div>
                            </div>

                            <div className="p-8 bg-slate-900/50 flex gap-4 border-t border-slate-800">

                                <button
                                    onClick={() => setIsAlertModalOpen(false)}
                                    className="flex-1 px-8 py-4 rounded-2xl bg-slate-800 text-slate-400 font-black text-xs uppercase tracking-widest hover:bg-slate-750 transition-all"
                                >
                                    Close
                                </button>

                                <button
                                    onClick={handleScan}
                                    className="flex-1 px-8 py-4 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-2xl shadow-indigo-900/40"
                                >
                                    Execute Scan
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Bootstrap Indicator Modal */}
                <Modal
                    show={showIndicatorModal}
                    onHide={() => setShowIndicatorModal(false)}
                    centered
                    size="md"
                >
                    <Modal.Header closeButton>
                        <Modal.Title>Indicators</Modal.Title>
                    </Modal.Header>

                    <Modal.Body style={{ background: "#0f172a", color: "white" }}>
                        <div className="space-y-4">
                            {demoIndicators.map((ind) => (
                                <div
                                    key={ind.value}
                                    className="flex items-center justify-between border-b border-slate-700 pb-3"
                                >
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={activeIndicators.some(
                                                i => i.value === ind.value
                                            )}
                                            onChange={() => toggleIndicator(ind)}
                                        />

                                        <span>{ind.label}</span>
                                    </label>

                                    <div
                                        style={{
                                            width: "10px",
                                            height: "10px",
                                            borderRadius: "50%",
                                            backgroundColor: ind.color
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    </Modal.Body>

                    <Modal.Footer>
                        <Button
                            variant="secondary"
                            onClick={() => setShowIndicatorModal(false)}
                        >
                            Close
                        </Button>
                    </Modal.Footer>
                </Modal>
            </main>
        </div>
    );
};

export default GoldChart;