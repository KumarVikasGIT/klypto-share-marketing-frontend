import React, { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries, LineSeries, AreaSeries } from 'lightweight-charts';
import axios from 'axios';

/**
 * SSL Hybrid Indicator Dashboard
 * A premium, TradingView-style interface for the SSL Hybrid Indicator.
 */

const MA_TYPES = ["SMA", "EMA", "DEMA", "TEMA", "LSMA", "WMA", "MF", "VAMA", "TMA", "HMA", "JMA", "Kijun v2", "EDSMA", "McGinley"];
const SMOOTHING_TYPES = ["RMA", "SMA", "EMA", "WMA"];
const DISPLAY_MODES = ["Full Display", "Baseline Only", "Baseline + SSL", "SSL Only", "Entry/Exit Only"];
const SOURCES = ["close", "open", "high", "low", "hl2", "hlc3", "ohlc4"];

const SSLHybridChart = () => {
    const chartContainerRef = useRef();
    const chartRef = useRef();
    
    // Series Refs
    const candleSeriesRef = useRef();
    const baselineSeriesRef = useRef();
    const upperChannelRef = useRef();
    const lowerChannelRef = useRef();
    const ssl1SeriesRef = useRef();
    const ssl2SeriesRef = useRef();
    const sslExitSeriesRef = useRef();
    const atrUpperRef = useRef();
    const atrLowerRef = useRef();
    const baselineFillRef = useRef(); // New Ref for the fill

    // State for Settings (TradingView Inputs)
    const [settings, setSettings] = useState({
        displayMode: "Full Display",
        colorBars: true,
        showSignals: true,
        showRiskTable: true,
        maType: "HMA",
        baseLen: 60,
        src: "close",
        multy: 0.2,
        useTrueRange: true,
        ssl2Type: "JMA",
        ssl2Len: 5,
        atrCrit: 0.9,
        ssl3Type: "HMA",
        ssl3Len: 15,
        atrLen: 14,
        atrMult: 1.0,
        atrSmoothing: "WMA",
        riskLookback: 100,
        riskSensitivity: 2.0,
        enableRiskGradient: true,
        // Style Settings
        ssl1Color: '#10b981',
        ssl2Color: '#f59e0b',
        baseColor: '#6366f1',
        fillColor: 'rgba(99, 102, 241, 0.1)',
        atrColor: '#94a3b8',
        showATR: false,
        ssl1Visible: true,
        ssl2Visible: true,
        baseVisible: true,
        exitVisible: true,
    });

    const [data, setData] = useState([]);
    const [indicatorData, setIndicatorData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastValue, setLastValue] = useState(null);
    const [activeTab, setActiveTab] = useState('Inputs');

    // Dummy Data Generation (if API fails or for initial load)
    const generateDummyData = () => {
        const result = [];
        let time = Math.floor(Date.now() / 1000) - 500 * 60;
        let price = 50000;
        for (let i = 0; i < 500; i++) {
            const open = price + (Math.random() - 0.5) * 100;
            const high = open + Math.random() * 50;
            const low = open - Math.random() * 50;
            const close = (high + low) / 2 + (Math.random() - 0.5) * 40;
            result.push({ time, open, high, low, close });
            time += 60;
            price = close;
        }
        return result;
    };

    // Fetch Indicator Data from Backend
    const fetchData = async () => {
        setLoading(true);
        try {
            // Using dummy data if no API response, but structure is ready for localhost:7000
            const dummyCandles = generateDummyData();
            
            const response = await axios.post('http://192.168.1.6:7000/api/indicator/ssl-hybrid', {
                candles: dummyCandles,
                options: settings
            });

            console.log(response);
            if (response.data) {
                setData(dummyCandles);
                setIndicatorData(response.data);
                setLastValue(response.data[response.data.length - 1]);
            }
        } catch (error) {
            console.error("API Error, falling back to dummy calculation:", error);
            // Fallback: If backend isn't running, we'd normally do local calc here
            // For now, let's just simulate a successful response with the dummy candles
            setData(generateDummyData());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [settings]);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        // Create Chart
        chartRef.current = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: 600,
            layout: {
                background: { color: '#0f172a' },
                textColor: '#94a3b8',
                fontFamily: 'Inter, sans-serif',
            },
            grid: {
                vertLines: { color: 'rgba(30, 41, 59, 0.3)' },
                horzLines: { color: 'rgba(30, 41, 59, 0.3)' },
            },
            crosshair: {
                mode: 0,
            },
            timeScale: {
                borderColor: '#1e293b',
                timeVisible: true,
                secondsVisible: false,
            },
        });

        // Initialize Series (Z-order: Bottom to Top)
        
        // 1. Fill Series (at the bottom)
        baselineFillRef.current = chartRef.current.addSeries(AreaSeries, {
            topColor: settings.fillColor,
            bottomColor: 'transparent',
            lineWidth: 0,
            lineVisible: false,
            title: 'Baseline Fill',
            lastValueVisible: false,
        });

        // 2. Indicators
        baselineSeriesRef.current = chartRef.current.addSeries(LineSeries, {
            color: settings.baseColor,
            lineWidth: 3,
            title: 'Baseline',
        });

        upperChannelRef.current = chartRef.current.addSeries(LineSeries, {
            color: 'rgba(99, 102, 241, 0.4)',
            lineWidth: 1,
            title: 'Upper Channel',
        });

        lowerChannelRef.current = chartRef.current.addSeries(LineSeries, {
            color: 'rgba(99, 102, 241, 0.4)',
            lineWidth: 1,
            title: 'Lower Channel',
        });

        ssl1SeriesRef.current = chartRef.current.addSeries(LineSeries, {
            color: settings.ssl1Color,
            lineWidth: 2,
            title: 'SSL1',
        });

        ssl2SeriesRef.current = chartRef.current.addSeries(LineSeries, {
            color: settings.ssl2Color,
            lineWidth: 4,
            lineStyle: 2, // Dotted
            title: 'SSL2 (Dots)',
            lastValueVisible: false,
        });

        sslExitSeriesRef.current = chartRef.current.addSeries(LineSeries, {
            color: '#ef4444',
            lineWidth: 1,
            lineStyle: 2,
            title: 'SSL Exit',
        });

        atrUpperRef.current = chartRef.current.addSeries(LineSeries, {
            color: settings.atrColor,
            lineWidth: 1,
            lineStyle: 2,
            title: '+ATR',
        });

        atrLowerRef.current = chartRef.current.addSeries(LineSeries, {
            color: settings.atrColor,
            lineWidth: 1,
            lineStyle: 2,
            title: '-ATR',
        });

        // 3. Candles (at the top)
        candleSeriesRef.current = chartRef.current.addSeries(CandlestickSeries, {
            upColor: '#00c3ff',
            downColor: '#ff0062',
            borderVisible: false,
            wickUpColor: '#00c3ff',
            wickDownColor: '#ff0062',
        });

        // Handle Resize
        const handleResize = () => {
            chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chartRef.current.remove();
        };
    }, []);

    // Update Chart Data
    useEffect(() => {
        if (!indicatorData.length || !candleSeriesRef.current) return;

        const { displayMode } = settings;

        // Plot Candles
        candleSeriesRef.current.setData(data);

        // Plot Baseline & Channels
        if (["Full Display", "Baseline Only", "Baseline + SSL"].includes(displayMode) && settings.baseVisible) {
            baselineSeriesRef.current.setData(indicatorData.map(d => ({ time: d.time, value: d.baseline })));
            upperChannelRef.current.setData(indicatorData.map(d => ({ time: d.time, value: d.upperChannel })));
            lowerChannelRef.current.setData(indicatorData.map(d => ({ time: d.time, value: d.lowerChannel })));
            baselineFillRef.current.setData(indicatorData.map(d => ({ time: d.time, value: d.upperChannel }))); // Simplified fill using upper
            baselineSeriesRef.current.applyOptions({ color: settings.baseColor });
            baselineFillRef.current.applyOptions({ topColor: settings.fillColor });
        } else {
            baselineSeriesRef.current.setData([]);
            upperChannelRef.current.setData([]);
            lowerChannelRef.current.setData([]);
            baselineFillRef.current.setData([]);
        }

        // Plot SSL1
        if (["Full Display", "Baseline + SSL", "SSL Only"].includes(displayMode) && settings.ssl1Visible) {
            ssl1SeriesRef.current.setData(indicatorData.map(d => ({ time: d.time, value: d.ssl1 })));
            ssl1SeriesRef.current.applyOptions({ color: settings.ssl1Color });
        } else {
            ssl1SeriesRef.current.setData([]);
        }

        // Plot SSL2 (Dots)
        if (["Full Display", "Baseline + SSL", "SSL Only"].includes(displayMode) && settings.ssl2Visible) {
            ssl2SeriesRef.current.setData(indicatorData.map(d => ({ time: d.time, value: d.ssl2 })));
            ssl2SeriesRef.current.applyOptions({ color: settings.ssl2Color });
        } else {
            ssl2SeriesRef.current.setData([]);
        }

        // Plot ATR Bands
        if (settings.showATR) {
            atrUpperRef.current.setData(indicatorData.map(d => ({ time: d.time, value: d.baseline + d.atr })));
            atrLowerRef.current.setData(indicatorData.map(d => ({ time: d.time, value: d.baseline - d.atr })));
            atrUpperRef.current.applyOptions({ color: settings.atrColor });
            atrLowerRef.current.applyOptions({ color: settings.atrColor });
        } else {
            atrUpperRef.current.setData([]);
            atrLowerRef.current.setData([]);
        }

        // Plot SSL Exit
        if (["Full Display", "Entry/Exit Only"].includes(displayMode) && settings.exitVisible) {
            sslExitSeriesRef.current.setData(indicatorData.map(d => ({ time: d.time, value: d.sslExit })));
        } else {
            sslExitSeriesRef.current.setData([]);
        }

        // Markers for Signals
        const markers = [];
        indicatorData.forEach(d => {
            if (settings.showSignals && d.candlesizeViolation) {
                markers.push({
                    time: d.time,
                    position: 'aboveBar',
                    color: '#ffffff',
                    shape: 'diamond',
                    size: 0.5,
                });
            }
            if (["Full Display", "Entry/Exit Only"].includes(displayMode)) {
                if (d.baseCrossLong) {
                    markers.push({
                        time: d.time,
                        position: 'belowBar',
                        color: '#00c3ff',
                        shape: 'arrowUp',
                        text: 'BUY',
                    });
                }
                if (d.baseCrossShort) {
                    markers.push({
                        time: d.time,
                        position: 'aboveBar',
                        color: '#ff0062',
                        shape: 'arrowDown',
                        text: 'SELL',
                    });
                }
            }
        });
        
        // Safety check for markers method
        if (candleSeriesRef.current && typeof candleSeriesRef.current.setMarkers === 'function') {
            candleSeriesRef.current.setMarkers(markers);
        }

    }, [indicatorData, settings]);

    const handleInputChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="min-h-screen bg-[#020617] text-slate-300 font-sans p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 px-4">
                <div>
                    <h1 className="text-2xl font-black bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent uppercase tracking-tighter">
                        SSL HYBRID <span className="text-slate-600 text-sm font-normal ml-2">Mihkel00 Precision Engine</span>
                    </h1>
                </div>
                <div className="flex gap-4 items-center">
                    <div className="bg-slate-900/50 rounded-full px-4 py-1 border border-slate-800 flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${loading ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                        <span className="text-xs font-mono uppercase tracking-widest">{loading ? 'Calculating...' : 'Live Engine Sync'}</span>
                    </div>
                </div>
            </div>

            <div className="flex gap-6">
                {/* Left Side: Chart */}
                <div className="flex-1 bg-slate-900/20 rounded-3xl border border-slate-800/50 backdrop-blur-xl overflow-hidden relative shadow-2xl">
                    <div ref={chartContainerRef} className="w-full" />
                    
                    {/* Risk Table Overlay */}
                    {settings.showRiskTable && lastValue && (
                        <div className="absolute bottom-10 right-10 bg-[#0f172a]/90 backdrop-blur-md border border-slate-800 p-6 rounded-2xl shadow-2xl min-w-[200px] z-10">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center gap-8">
                                    <span className="text-xs uppercase tracking-widest text-slate-500 font-bold">Risk Level</span>
                                    <span className={`text-sm font-black uppercase ${lastValue.riskLevel === 'High' ? 'text-rose-500' : lastValue.riskLevel === 'Low' ? 'text-emerald-500' : 'text-slate-300'}`}>
                                        {lastValue.riskLevel}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center gap-8">
                                    <span className="text-xs uppercase tracking-widest text-slate-500 font-bold">Entry Dist.</span>
                                    <span className={`text-sm font-black uppercase ${lastValue.entryDistance === 'Near' ? 'text-emerald-500' : lastValue.entryDistance === 'Far' ? 'text-rose-500' : 'text-amber-500'}`}>
                                        {lastValue.entryDistance}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center gap-8">
                                    <span className="text-xs uppercase tracking-widest text-slate-500 font-bold">Vol %ile</span>
                                    <span className="text-sm font-mono font-bold text-white">{lastValue.atrPercentile}%</span>
                                </div>
                                <div className="h-px bg-slate-800"></div>
                                <div className="flex justify-between items-center gap-8">
                                    <span className="text-xs uppercase tracking-widest text-slate-500 font-bold">ATR</span>
                                    <span className="text-sm font-mono font-bold text-indigo-400">{lastValue.atr}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Side: Settings Panel (TradingView Style) */}
                <div className="w-96 flex flex-col gap-4">
                    <div className="bg-slate-900/40 border border-slate-800/50 rounded-3xl backdrop-blur-xl h-full flex flex-col overflow-hidden shadow-xl">
                        {/* Tabs */}
                        <div className="flex border-b border-slate-800/50">
                            {['Inputs', 'Style', 'Visibility'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-400/5' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {/* Settings Scroll Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                            {activeTab === 'Inputs' && (
                                <>
                                    {/* Display Section */}
                                    <div className="space-y-4">
                                        <h3 className="text-[10px] text-blue-500 font-black uppercase tracking-[0.2em]">Display Controls</h3>
                                        <div className="space-y-3">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[11px] text-slate-500 font-bold">Display Mode</label>
                                                <select
                                                    value={settings.displayMode}
                                                    onChange={(e) => handleInputChange('displayMode', e.target.value)}
                                                    className="bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm focus:border-blue-500 outline-none"
                                                >
                                                    {DISPLAY_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                                                </select>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] text-slate-300">Color Bars</span>
                                                <input type="checkbox" checked={settings.colorBars} onChange={e => handleInputChange('colorBars', e.target.checked)} className="accent-blue-500" />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] text-slate-300">Show Signals</span>
                                                <input type="checkbox" checked={settings.showSignals} onChange={e => handleInputChange('showSignals', e.target.checked)} className="accent-blue-500" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Baseline Section */}
                                    <div className="space-y-4">
                                        <h3 className="text-[10px] text-indigo-500 font-black uppercase tracking-[0.2em]">Baseline Settings</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[11px] text-slate-500 font-bold">Type</label>
                                                <select
                                                    value={settings.maType}
                                                    onChange={(e) => handleInputChange('maType', e.target.value)}
                                                    className="bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs outline-none"
                                                >
                                                    {MA_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
                                                </select>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[11px] text-slate-500 font-bold">Length</label>
                                                <input
                                                    type="number"
                                                    value={settings.baseLen}
                                                    onChange={e => handleInputChange('baseLen', parseInt(e.target.value))}
                                                    className="bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs outline-none font-mono"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[11px] text-slate-500 font-bold">Source</label>
                                                <select
                                                    value={settings.src}
                                                    onChange={(e) => handleInputChange('src', e.target.value)}
                                                    className="bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs outline-none"
                                                >
                                                    {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[11px] text-slate-500 font-bold">Multiplier</label>
                                                <input
                                                    type="number"
                                                    step="0.05"
                                                    value={settings.multy}
                                                    onChange={e => handleInputChange('multy', parseFloat(e.target.value))}
                                                    className="bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs outline-none font-mono"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* SSL Settings */}
                                    <div className="space-y-4">
                                        <h3 className="text-[10px] text-amber-500 font-black uppercase tracking-[0.2em]">SSL Settings</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[11px] text-slate-500 font-bold">SSL2 Type</label>
                                                <select
                                                    value={settings.ssl2Type}
                                                    onChange={(e) => handleInputChange('ssl2Type', e.target.value)}
                                                    className="bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs outline-none"
                                                >
                                                    {MA_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
                                                </select>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[11px] text-slate-500 font-bold">SSL2 Length</label>
                                                <input
                                                    type="number"
                                                    value={settings.ssl2Len}
                                                    onChange={e => handleInputChange('ssl2Len', parseInt(e.target.value))}
                                                    className="bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs outline-none font-mono"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* ATR Settings */}
                                    <div className="space-y-4">
                                        <h3 className="text-[10px] text-rose-500 font-black uppercase tracking-[0.2em]">ATR Settings</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[11px] text-slate-500 font-bold">Period</label>
                                                <input
                                                    type="number"
                                                    value={settings.atrLen}
                                                    onChange={e => handleInputChange('atrLen', parseInt(e.target.value))}
                                                    className="bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs outline-none font-mono"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[11px] text-slate-500 font-bold">Smoothing</label>
                                                <select
                                                    value={settings.atrSmoothing}
                                                    onChange={(e) => handleInputChange('atrSmoothing', e.target.value)}
                                                    className="bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs outline-none"
                                                >
                                                    {SMOOTHING_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                            {activeTab === 'Style' && (
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <h3 className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Visibility & Colors</h3>
                                        <div className="space-y-4">
                                            {/* SSL 1 */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <input type="checkbox" checked={settings.ssl1Visible} onChange={e => handleInputChange('ssl1Visible', e.target.checked)} className="accent-emerald-500" />
                                                    <span className="text-[11px] text-slate-300">SSL 1 (Trend)</span>
                                                </div>
                                                <input type="color" value={settings.ssl1Color} onChange={e => handleInputChange('ssl1Color', e.target.value)} className="w-6 h-6 rounded-md bg-transparent border-none" />
                                            </div>
                                            {/* SSL 2 */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <input type="checkbox" checked={settings.ssl2Visible} onChange={e => handleInputChange('ssl2Visible', e.target.checked)} className="accent-amber-500" />
                                                    <span className="text-[11px] text-slate-300">SSL 2 (Dots)</span>
                                                </div>
                                                <input type="color" value={settings.ssl2Color} onChange={e => handleInputChange('ssl2Color', e.target.value)} className="w-6 h-6 rounded-md bg-transparent border-none" />
                                            </div>
                                            {/* Baseline */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <input type="checkbox" checked={settings.baseVisible} onChange={e => handleInputChange('baseVisible', e.target.checked)} className="accent-indigo-500" />
                                                    <span className="text-[11px] text-slate-300">Baseline</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <input type="color" value={settings.baseColor} onChange={e => handleInputChange('baseColor', e.target.value)} className="w-6 h-6 rounded-md bg-transparent border-none" />
                                                    <input type="color" value={settings.fillColor} onChange={e => handleInputChange('fillColor', e.target.value)} className="w-6 h-6 rounded-md bg-transparent border-none" title="Fill Color" />
                                                </div>
                                            </div>
                                            {/* SSL Exit */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <input type="checkbox" checked={settings.exitVisible} onChange={e => handleInputChange('exitVisible', e.target.checked)} className="accent-rose-500" />
                                                    <span className="text-[11px] text-slate-300">SSL Exit (Line)</span>
                                                </div>
                                            </div>
                                            {/* ATR Bands */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <input type="checkbox" checked={settings.showATR} onChange={e => handleInputChange('showATR', e.target.checked)} className="accent-slate-500" />
                                                    <span className="text-[11px] text-slate-300">Show ATR (+/-)</span>
                                                </div>
                                                <input type="color" value={settings.atrColor} onChange={e => handleInputChange('atrColor', e.target.value)} className="w-6 h-6 rounded-md bg-transparent border-none" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {/* Footer Buttons */}
                        <div className="p-6 border-t border-slate-800/50 bg-slate-950/50 flex gap-3">
                            <button onClick={() => setSettings({ ...settings })} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-900/20">
                                Apply Config
                            </button>
                            <button onClick={() => window.location.reload()} className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl transition-all">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path><path d="M3 21v-5h5"></path></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                input[type=number]::-webkit-inner-spin-button { opacity: 0; }
                select { appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%2364748b'%3e%3cpath fill-rule='evenodd' d='M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z'/%3e%3c/svg%3e"); background-repeat: no-repeat; background-position: right 0.75rem center; background-size: 10px; }
            `}} />
        </div>
    );
};

export default SSLHybridChart;
