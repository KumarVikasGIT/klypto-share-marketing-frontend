import React, { useMemo, useState, useRef } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

/* -------------------------------------------------------------------------
   DUMMY DATA
   Replace this with your live WebSocket / Socket.IO feed. Shape is kept
   simple on purpose: one row per strike, with snapshot-at-open and
   current values so OI-change and IV-change can both be derived.
------------------------------------------------------------------------- */

const STOCK_LIST = [
  { symbol: "RELIANCE", ltp: 1318.1, change: 0.0, strikeStep: 10 },
  { symbol: "NIFTY", ltp: 23502.4, change: 0.42, strikeStep: 50 },
  { symbol: "BANKNIFTY", ltp: 50321.65, change: -0.18, strikeStep: 100 },
  { symbol: "TCS", ltp: 3845.2, change: 0.91, strikeStep: 20 },
  { symbol: "HDFCBANK", ltp: 1642.75, change: -0.34, strikeStep: 10 },
];

// Builds the strike ladder for a given stock: a fixed number of strikes
// centered on the nearest ATM strike, spaced by that symbol's strike step.
function getStrikesForSymbol(stock, countEachSide = 10) {
  const step = stock.strikeStep;
  const atm = Math.round(stock.ltp / step) * step;
  const strikes = [];
  for (let i = -countEachSide; i <= countEachSide; i++) {
    strikes.push(Math.round(atm + i * step));
  }
  return strikes;
}

// deterministic-ish pseudo-random generator so dummy data stays stable
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function buildDummyData(spot, strikes) {
  const rnd = seededRandom(Math.round(spot * 7));
  return strikes.map((strike) => {
    const distance = Math.abs(strike - spot);
    const span = Math.max(...strikes) - Math.min(...strikes) || 1;
    const proximityFactor = Math.max(0.15, 1 - distance / (span * 0.6));

    const callOpenOI = (rnd() * 30 + 10) * 1e5 * proximityFactor;
    const putOpenOI = (rnd() * 30 + 10) * 1e5 * proximityFactor;

    const callOIChg =
      (rnd() - 0.65) * 12 * 1e5 * proximityFactor * (strike > spot ? 1.4 : 0.8);
    const putOIChg =
      (rnd() - 0.45) * 10 * 1e5 * proximityFactor * (strike < spot ? 1.3 : 0.7);

    const callOICurrent = Math.max(callOpenOI + callOIChg, 0);
    const putOICurrent = Math.max(putOpenOI + putOIChg, 0);

    const callIVOpen = 14 + rnd() * 10;
    const putIVOpen = 14 + rnd() * 10;
    const callIVChg = (rnd() - 0.5) * 3.5;
    const putIVChg = (rnd() - 0.5) * 3.5;

    return {
      strike,
      callOI: { open: callOpenOI, chg: callOIChg, current: callOICurrent },
      putOI: { open: putOpenOI, chg: putOIChg, current: putOICurrent },
      callIV: { open: callIVOpen, chg: callIVChg, current: callIVOpen + callIVChg },
      putIV: { open: putIVOpen, chg: putIVChg, current: putIVOpen + putIVChg },
    };
  });
}

function fmtLakh(value) {
  const lakhs = value / 1e5;
  return `${lakhs.toFixed(2)}L`;
}

function fmtPct(value) {
  return `${value.toFixed(2)}%`;
}

/* -------------------------------------------------------------------------
   COMPONENT
------------------------------------------------------------------------- */

export default function OptionChainOIChart() {
  const [selectedSymbolIdx, setSelectedSymbolIdx] = useState(0);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expiry, setExpiry] = useState("30jun");
  const [chartMode, setChartMode] = useState("oi"); // "oi" | "iv"
  const [timeRange, setTimeRange] = useState([0, 100]); // % of session 9:15-3:30
  const [hoveredStrike, setHoveredStrike] = useState(null);
  const [selectedStrike, setSelectedStrike] = useState(null); // null = show all strikes
  const dragRef = useRef(null);

  const stock = STOCK_LIST[selectedSymbolIdx];

  // Strike ladder repopulates whenever the symbol changes
  const symbolStrikes = useMemo(() => getStrikesForSymbol(stock), [stock.symbol]);

  const atmStrike = useMemo(() => {
    return symbolStrikes.reduce((closest, s) =>
      Math.abs(s - stock.ltp) < Math.abs(closest - stock.ltp) ? s : closest
    );
  }, [symbolStrikes, stock.ltp]);

  const allData = useMemo(
    () => buildDummyData(stock.ltp, symbolStrikes),
    [stock.symbol, stock.ltp, symbolStrikes]
  );

  // Reset the strike-price dropdown back to "All strikes" whenever the symbol changes
  React.useEffect(() => {
    setSelectedStrike(null);
  }, [stock.symbol]);

  const visibleData = useMemo(
    () => (selectedStrike == null ? allData : allData.filter((d) => d.strike === selectedStrike)),
    [allData, selectedStrike]
  );



  /* ---------------- chart datasets ---------------- */

  const labels = visibleData.map((d) => String(d.strike));

  const chartData =
    chartMode === "oi"
      ? {
          labels,
          datasets: [
            {
              label: "Put OI chg",
              data: visibleData.map((d) => d.putOI.chg / 1e5),
              backgroundColor: visibleData.map((d) =>
                d.putOI.chg >= 0 ? "#089981" : "#f2364580"
              ),
              borderRadius: 3,
              borderSkipped: false,
              barPercentage: 0.42,
              categoryPercentage: 0.9,
            },
            {
              label: "Call OI chg",
              data: visibleData.map((d) => d.callOI.chg / 1e5),
              backgroundColor: visibleData.map((d) =>
                d.callOI.chg >= 0 ? "#f23645" : "#08998180"
              ),
              borderRadius: 3,
              borderSkipped: false,
              barPercentage: 0.42,
              categoryPercentage: 0.9,
            },
          ],
        }
      : {
          labels,
          datasets: [
            {
              label: "Put IV",
              data: visibleData.map((d) => d.putIV.current),
              backgroundColor: "#089981",
              borderRadius: 3,
              borderSkipped: false,
              barPercentage: 0.42,
              categoryPercentage: 0.9,
            },
            {
              label: "Call IV",
              data: visibleData.map((d) => d.callIV.current),
              backgroundColor: "#f23645",
              borderRadius: 3,
              borderSkipped: false,
              barPercentage: 0.42,
              categoryPercentage: 0.9,
            },
          ],
        };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    onHover: (_evt, elements) => {
      if (elements?.length) {
        setHoveredStrike(visibleData[elements[0].index]);
      }
    },
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: "#a8b0c4",
          usePointStyle: true,
          pointStyle: "circle",
          padding: 18,
          font: { family: "'DM Sans', sans-serif", size: 12 },
        },
      },
      tooltip: {
        backgroundColor: "#1a1a2e",
        borderColor: "#3B2F6280",
        borderWidth: 1,
        titleColor: "#e8eaf2",
        bodyColor: "#c7cbdb",
        titleFont: { family: "'DM Sans', sans-serif", weight: "600" },
        bodyFont: { family: "'JetBrains Mono', monospace", size: 11 },
        padding: 10,
        callbacks: {
          label: (ctx) => {
            if (chartMode === "oi") {
              return `${ctx.dataset.label}: ${ctx.raw >= 0 ? "+" : ""}${ctx.raw.toFixed(
                2
              )}L`;
            }
            return `${ctx.dataset.label}: ${ctx.raw.toFixed(2)}%`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: "#2a2a45", drawTicks: false },
        ticks: { color: "#8b91a8", font: { family: "'JetBrains Mono', monospace", size: 10 } },
      },
      y: {
        grid: { color: "#23233d" },
        ticks: {
          color: "#8b91a8",
          font: { family: "'JetBrains Mono', monospace", size: 10 },
          callback: (v) => (chartMode === "oi" ? `${v}L` : `${v}%`),
        },
      },
    },
  };

  /* ---------------- time range slider (visual, 9:15 - 3:30) ---------------- */

  const SESSION_START_MIN = 9 * 60 + 15;
  const SESSION_END_MIN = 15 * 60 + 30;
  const SESSION_TOTAL = SESSION_END_MIN - SESSION_START_MIN;

  function minutesToLabel(mins) {
    const h24 = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    const suffix = h24 >= 12 ? "PM" : "AM";
    let h12 = h24 % 12;
    if (h12 === 0) h12 = 12;
    return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
  }

  function pctToTime(pct) {
    return SESSION_START_MIN + (pct / 100) * SESSION_TOTAL;
  }

  function handleSliderDrag(e, handle) {
    const track = dragRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();

    const move = (moveEvt) => {
      const clientX =
        moveEvt.touches?.[0]?.clientX ?? moveEvt.clientX ?? 0;
      let pct = ((clientX - rect.left) / rect.width) * 100;
      pct = Math.max(0, Math.min(100, pct));
      setTimeRange((prev) => {
        if (handle === "start") {
          return [Math.min(pct, prev[1] - 2), prev[1]];
        }
        return [prev[0], Math.max(pct, prev[0] + 2)];
      });
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", move);
    window.addEventListener("touchend", up);
  }

  const quickRanges = [
    { label: "Last 5 mins", pct: [96, 100] },
    { label: "Last 10 mins", pct: [93, 100] },
    { label: "Last 15 mins", pct: [89, 100] },
    { label: "Last 30 mins", pct: [78, 100] },
    { label: "Last 1 Hr", pct: [78 - 14, 100] },
    { label: "Last 2 Hrs", pct: [55, 100] },
    { label: "Last 3 Hrs", pct: [33, 100] },
    { label: "Full Day", pct: [0, 100] },
  ];

  return (
    <div className="oc-shell">
      <style>{`
        .oc-shell {
          --oc-bg: #0c0c18;
          --oc-panel: #14142480;
          --oc-panel-solid: #14142a;
          --oc-border: #26264a;
          --oc-text: #e8eaf2;
          --oc-text-dim: #8b91a8;
          --oc-accent: #3B82F6;
          --oc-accent-soft: #3B82F633;
          --oc-purple: #7c3aed;
          --oc-green: #089981;
          --oc-red: #f23645;
          --oc-radius: 14px;
          font-family: 'DM Sans', -apple-system, sans-serif;
          background: radial-gradient(circle at 15% 0%, #1b1330 0%, var(--oc-bg) 55%);
          color: var(--oc-text);
          padding: 24px;
          min-height: 100vh;
          box-sizing: border-box;
        }
        .oc-shell * { box-sizing: border-box; }
        .oc-layout {
          display: grid;
          grid-template-columns: 300px 1fr;
          gap: 20px;
          max-width: 1400px;
          margin: 0 auto;
        }
        @media (max-width: 900px) {
          .oc-layout { grid-template-columns: 1fr; }
        }

        /* ---------- shared card ---------- */
        .oc-card {
          background: var(--oc-panel-solid);
          border: 1px solid var(--oc-border);
          border-radius: var(--oc-radius);
          padding: 18px;
        }

        /* ---------- side panel ---------- */
        .oc-side { display: flex; flex-direction: column; gap: 16px; }
        .oc-search-wrap { position: relative; }
        .oc-search-input {
          width: 100%;
          background: #0e0e1c;
          border: 1px solid var(--oc-border);
          border-radius: 10px;
          padding: 10px 38px 10px 14px;
          color: var(--oc-text);
          font-size: 14px;
          outline: none;
          transition: border-color .15s ease;
        }
        .oc-search-input:focus { border-color: var(--oc-accent); }
        .oc-search-icon {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          color: var(--oc-text-dim); font-size: 14px; pointer-events: none;
        }
        .oc-stock-list {
          margin-top: 8px;
          max-height: 160px;
          overflow-y: auto;
          display: flex; flex-direction: column; gap: 4px;
        }
        .oc-stock-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 9px 10px; border-radius: 8px; cursor: pointer;
          font-family: 'JetBrains Mono', monospace; font-size: 12.5px;
          transition: background .15s ease;
        }
        .oc-stock-row:hover { background: #1d1d38; }
        .oc-stock-row.active {
          background: linear-gradient(90deg, var(--oc-accent-soft), transparent);
          border: 1px solid #3B82F655;
        }
        .oc-stock-sym { color: var(--oc-text); font-weight: 600; }
        .oc-stock-ltp { color: var(--oc-text-dim); }
        .oc-chg-up { color: var(--oc-green); }
        .oc-chg-down { color: var(--oc-red); }

        .oc-select-wrap { position: relative; }
        .oc-select {
          width: 100%;
          background: #0e0e1c;
          border: 1px solid var(--oc-border);
          border-radius: 10px;
          padding: 10px 36px 10px 14px;
          color: var(--oc-text);
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          outline: none;
          appearance: none;
          -webkit-appearance: none;
          cursor: pointer;
          transition: border-color .15s ease;
        }
        .oc-select:focus { border-color: var(--oc-accent); }
        .oc-select option { background: #14142a; color: var(--oc-text); }
        .oc-select-caret {
          position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
          color: var(--oc-text-dim); font-size: 11px; pointer-events: none;
        }

        .oc-label {
          font-size: 11px; letter-spacing: .04em; text-transform: uppercase;
          color: var(--oc-text-dim); margin-bottom: 8px; display: block;
          font-weight: 600;
        }
        .oc-date-input {
          width: 100%;
          background: #0e0e1c;
          border: 1px solid var(--oc-border);
          border-radius: 10px;
          padding: 9px 12px;
          color: var(--oc-text);
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          outline: none;
          color-scheme: dark;
        }
        .oc-date-input:focus { border-color: var(--oc-accent); }
        .oc-hint { font-size: 11px; color: var(--oc-text-dim); margin-top: 6px; }

        .oc-checkbox-row {
          display: flex; align-items: center; gap: 10px;
          font-size: 13px; padding: 6px 0; cursor: pointer; color: var(--oc-text);
        }
        .oc-checkbox {
          width: 17px; height: 17px; border-radius: 5px;
          border: 1.5px solid var(--oc-border); display: flex; align-items: center;
          justify-content: center; flex-shrink: 0; transition: all .15s ease;
        }
        .oc-checkbox.checked { background: var(--oc-accent); border-color: var(--oc-accent); }
        .oc-checkbox.checked::after { content: '✓'; color: white; font-size: 11px; }

        .oc-range-row { display: flex; gap: 10px; }
        .oc-range-field { flex: 1; }
        .oc-stepper {
          display: flex; align-items: center; background: #0e0e1c;
          border: 1px solid var(--oc-border); border-radius: 10px; overflow: hidden;
        }
        .oc-stepper button {
          background: transparent; border: none; color: var(--oc-text-dim);
          width: 30px; height: 34px; cursor: pointer; font-size: 15px;
          transition: color .15s ease, background .15s ease;
        }
        .oc-stepper button:hover { color: var(--oc-accent); background: #17172e; }
        .oc-stepper input {
          flex: 1; text-align: center; background: transparent; border: none;
          color: var(--oc-text); font-family: 'JetBrains Mono', monospace;
          font-size: 13px; outline: none; width: 100%;
        }
        .oc-reset-link {
          background: none; border: none; color: var(--oc-accent); font-size: 12px;
          cursor: pointer; display: flex; align-items: center; gap: 4px; padding: 0;
        }
        .oc-side-head { display: flex; justify-content: space-between; align-items: center; }

        .oc-pill-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
        .oc-pill {
          padding: 7px 14px; border-radius: 999px; font-size: 12.5px;
          font-family: 'JetBrains Mono', monospace; cursor: pointer;
          border: 1px solid var(--oc-border); background: #0e0e1c; color: var(--oc-text-dim);
          transition: all .15s ease;
        }
        .oc-pill:hover { border-color: var(--oc-accent); color: var(--oc-text); transform: translateY(-1px); }
        .oc-pill.active {
          background: linear-gradient(135deg, var(--oc-accent), var(--oc-purple));
          color: white; border-color: transparent;
          box-shadow: 0 4px 14px var(--oc-accent-soft);
        }

        /* ---------- main panel ---------- */
        .oc-main { display: flex; flex-direction: column; gap: 16px; }
        .oc-main-card { background: var(--oc-panel-solid); border: 1px solid var(--oc-border); border-radius: var(--oc-radius); padding: 22px; }
        .oc-main-head {
          display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px;
          margin-bottom: 18px;
        }
        .oc-title-block h2 { margin: 0 0 4px; font-size: 19px; font-weight: 700; letter-spacing: -.01em; }
        .oc-spot-chip {
          display: inline-flex; align-items: center; gap: 8px; margin-top: 4px;
          font-family: 'JetBrains Mono', monospace; font-size: 12.5px; color: var(--oc-text-dim);
        }
        .oc-spot-chip b { color: var(--oc-text); font-size: 13px; }
        .oc-how-link { color: var(--oc-accent); font-size: 12.5px; text-decoration: none; }
        .oc-how-link:hover { text-decoration: underline; }

        .oc-toggle-wrap { display: flex; align-items: center; gap: 10px; }
        .oc-toggle {
          position: relative; width: 130px; height: 38px; border-radius: 999px;
          background: #0e0e1c; border: 1px solid var(--oc-border); cursor: pointer;
          display: flex; align-items: center; padding: 3px;
        }
        .oc-toggle-thumb {
          position: absolute; top: 3px; left: 3px; width: calc(50% - 3px); height: calc(100% - 6px);
          border-radius: 999px; background: linear-gradient(135deg, var(--oc-accent), var(--oc-purple));
          transition: transform .25s cubic-bezier(.4,0,.2,1);
          box-shadow: 0 2px 10px var(--oc-accent-soft);
        }
        .oc-toggle.iv .oc-toggle-thumb { transform: translateX(100%); }
        .oc-toggle-label {
          position: relative; z-index: 1; flex: 1; text-align: center;
          font-size: 12.5px; font-weight: 700; font-family: 'JetBrains Mono', monospace;
          color: var(--oc-text-dim); transition: color .2s ease;
        }
        .oc-toggle-label.on { color: white; }

        .oc-chart-area { position: relative; height: 420px; }
        .oc-hover-card {
          position: absolute; top: 0; right: 0; background: #1a1a2e;
          border: 1px solid #3B2F6280; border-radius: 12px; padding: 14px 16px;
          font-family: 'JetBrains Mono', monospace; font-size: 12px; min-width: 220px;
          box-shadow: 0 10px 30px rgba(0,0,0,.4); z-index: 5;
        }
        .oc-hover-title { font-family: 'DM Sans', sans-serif; font-weight: 700; font-size: 13px; margin-bottom: 8px; color: var(--oc-text); }
        .oc-hover-row { display: flex; justify-content: space-between; gap: 14px; padding: 3px 0; color: var(--oc-text-dim); }
        .oc-hover-row b { color: var(--oc-text); }
        .oc-hover-divider { height: 1px; background: var(--oc-border); margin: 6px 0; }

        /* ---------- time bar ---------- */
        .oc-timebar-card { padding: 18px 24px 22px; }
        .oc-timebar-labels { display: flex; justify-content: space-between; font-family: 'JetBrains Mono', monospace; font-size: 11.5px; color: var(--oc-text-dim); margin-bottom: 10px; }
        .oc-timebar-track {
          position: relative; height: 6px; border-radius: 999px; background: #1c1c33;
          margin: 0 6px;
        }
        .oc-timebar-fill {
          position: absolute; top: 0; bottom: 0; border-radius: 999px;
          background: linear-gradient(90deg, var(--oc-accent), var(--oc-purple));
        }
        .oc-timebar-handle {
          position: absolute; top: 50%; width: 18px; height: 18px; border-radius: 50%;
          background: white; border: 3px solid var(--oc-accent); transform: translate(-50%, -50%);
          cursor: grab; box-shadow: 0 2px 8px rgba(0,0,0,.4); z-index: 2;
        }
        .oc-timebar-handle:active { cursor: grabbing; }
        .oc-timebar-current {
          position: absolute; top: -26px; transform: translateX(-50%);
          font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: var(--oc-accent);
          background: #0e0e1c; padding: 2px 6px; border-radius: 6px; border: 1px solid var(--oc-border);
          white-space: nowrap;
        }
        .oc-quick-ranges { display: flex; gap: 8px; margin-top: 18px; flex-wrap: wrap; }
        .oc-quick-pill {
          flex: 1; min-width: 90px; text-align: center; padding: 8px 10px; border-radius: 9px;
          font-size: 12px; font-family: 'JetBrains Mono', monospace; cursor: pointer;
          border: 1px solid var(--oc-border); background: #0e0e1c; color: var(--oc-text-dim);
          transition: all .15s ease;
        }
        .oc-quick-pill:hover { color: var(--oc-text); border-color: var(--oc-accent); }
        .oc-quick-pill.active {
          background: linear-gradient(135deg, var(--oc-accent), var(--oc-purple)); color: white; border-color: transparent;
        }

        .oc-legend-strip { display: flex; gap: 20px; align-items: center; margin-top: 4px; }
        .oc-legend-dot { width: 10px; height: 10px; border-radius: 3px; display: inline-block; margin-right: 6px; }
      `}</style>

      <div className="oc-layout">
        {/* ============ SIDE PANEL ============ */}
        <aside className="oc-side">
          <div className="oc-card">
            <label className="oc-label">Symbol</label>
            <div className="oc-select-wrap">
              <select
                className="oc-select"
                value={selectedSymbolIdx}
                onChange={(e) => setSelectedSymbolIdx(Number(e.target.value))}
              >
                {STOCK_LIST.map((s, idx) => (
                  <option key={s.symbol} value={idx}>
                    {s.symbol} — {s.ltp.toFixed(2)} ({s.change >= 0 ? "+" : ""}
                    {s.change.toFixed(2)}%)
                  </option>
                ))}
              </select>
              <span className="oc-select-caret">▾</span>
            </div>
          </div>

          {/* <div className="oc-card">
            <label className="oc-label">Strike Price</label>
            <div className="oc-select-wrap">
              <select
                className="oc-select"
                value={selectedStrike ?? "all"}
                onChange={(e) =>
                  setSelectedStrike(e.target.value === "all" ? null : Number(e.target.value))
                }
              >
                <option value="all">All strikes</option>
                {symbolStrikes.map((strike) => (
                  <option key={strike} value={strike}>
                    {strike}
                    {strike === atmStrike ? " (ATM)" : ""}
                  </option>
                ))}
              </select>
              <span className="oc-select-caret">▾</span>
            </div>
            <p className="oc-hint">Strikes update automatically based on the selected symbol.</p>
          </div> */}

          <div className="oc-card">
            <label className="oc-label">Date</label>
            <input
              type="date"
              className="oc-date-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <p className="oc-hint">Showing data for the next 24 hrs from this date, in session time.</p>
          </div>

          {/* <div className="oc-card">
            <label className="oc-label">Expiries Included</label>
            <div
              className="oc-checkbox-row"
              onClick={() => setExpiry(expiry === "30jun" ? "" : "30jun")}
            >
              <span className={`oc-checkbox ${expiry === "30jun" ? "checked" : ""}`} />
              30 Jun (5 days)
            </div>
            <div
              className="oc-checkbox-row"
              onClick={() => setExpiry(expiry === "28jul" ? "28jul" : "")}
            >
              <span className={`oc-checkbox ${expiry === "28jul" ? "checked" : ""}`} />
              28 Jul (33 days)
            </div>
          </div>

          <div className="oc-card">
            <div className="oc-side-head">
              <label className="oc-label" style={{ marginBottom: 0 }}>Strike Range</label>
              <button className="oc-reset-link" onClick={resetStrikeRange}>↺ Reset</button>
            </div>
            <div className="oc-range-row">
              <div className="oc-range-field">
                <span className="oc-hint" style={{ marginBottom: 4 }}>Min</span>
                <div className="oc-stepper">
                  <button onClick={() => setStrikeMin((m) => Math.max(STRIKES[0], m - 10))}>−</button>
                  <input value={strikeMin} readOnly />
                  <button onClick={() => setStrikeMin((m) => Math.min(strikeMax - 10, m + 10))}>+</button>
                </div>
              </div>
              <div className="oc-range-field">
                <span className="oc-hint" style={{ marginBottom: 4 }}>Max</span>
                <div className="oc-stepper">
                  <button onClick={() => setStrikeMax((m) => Math.max(strikeMin + 10, m - 10))}>−</button>
                  <input value={strikeMax} readOnly />
                  <button onClick={() => setStrikeMax((m) => Math.min(STRIKES[STRIKES.length - 1], m + 10))}>+</button>
                </div>
              </div>
            </div>

            <label className="oc-label" style={{ marginTop: 16 }}>Strikes above and below ATM</label>
            <div className="oc-pill-grid">
              <button
                className={`oc-pill ${strikesAroundATM === null ? "active" : ""}`}
                onClick={resetStrikeRange}
              >
                Show All
              </button>
              {[5, 10, 15, 20, 25].map((n) => (
                <button
                  key={n}
                  className={`oc-pill ${strikesAroundATM === n ? "active" : ""}`}
                  onClick={() => applyStrikesAroundATM(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div> */}
        </aside>

        {/* ============ MAIN PANEL ============ */}
        <main className="oc-main">
          <div className="oc-main-card">
            <div className="oc-main-head">
              <div className="oc-title-block">
                <h2>
                  {chartMode === "oi" ? "OI Change" : "IV Change"} on{" "}
                  {new Date(date).toLocaleDateString("en-IN", {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                  })}
                </h2>
                <a className="oc-how-link" href="#">How to read this?</a>
                <div className="oc-spot-chip">
                  <span>{stock.symbol}</span>
                  <b>{stock.ltp.toFixed(2)}</b>
                  <span className={stock.change >= 0 ? "oc-chg-up" : "oc-chg-down"}>
                    {stock.change >= 0 ? "+" : ""}
                    {stock.change.toFixed(2)}%
                  </span>
                </div>
              </div>

              <div className="oc-toggle-wrap">
                <span className="oc-hint" style={{ marginTop: 0 }}>View</span>
                <div
                  className={`oc-toggle ${chartMode === "iv" ? "iv" : ""}`}
                  onClick={() => setChartMode((m) => (m === "oi" ? "iv" : "oi"))}
                  role="button"
                  aria-label="Toggle OI / IV chart"
                >
                  <div className="oc-toggle-thumb" />
                  <span className={`oc-toggle-label ${chartMode === "oi" ? "on" : ""}`}>OI</span>
                  <span className={`oc-toggle-label ${chartMode === "iv" ? "on" : ""}`}>IV</span>
                </div>
              </div>
            </div>

            <div className="oc-chart-area">
              <Bar data={chartData} options={chartOptions} />

              {hoveredStrike && (
                <div className="oc-hover-card">
                  <div className="oc-hover-title">Strike {hoveredStrike.strike}</div>
                  {chartMode === "oi" ? (
                    <>
                      <div className="oc-hover-row"><span>Put OI at open</span><b>{fmtLakh(hoveredStrike.putOI.open)}</b></div>
                      <div className="oc-hover-row"><span>Put OI chg</span><b style={{ color: hoveredStrike.putOI.chg >= 0 ? "var(--oc-green)" : "var(--oc-red)" }}>{hoveredStrike.putOI.chg >= 0 ? "+" : ""}{fmtLakh(hoveredStrike.putOI.chg)}</b></div>
                      <div className="oc-hover-row"><span>Put OI now</span><b>{fmtLakh(hoveredStrike.putOI.current)}</b></div>
                      <div className="oc-hover-divider" />
                      <div className="oc-hover-row"><span>Call OI at open</span><b>{fmtLakh(hoveredStrike.callOI.open)}</b></div>
                      <div className="oc-hover-row"><span>Call OI chg</span><b style={{ color: hoveredStrike.callOI.chg >= 0 ? "var(--oc-red)" : "var(--oc-green)" }}>{hoveredStrike.callOI.chg >= 0 ? "+" : ""}{fmtLakh(hoveredStrike.callOI.chg)}</b></div>
                      <div className="oc-hover-row"><span>Call OI now</span><b>{fmtLakh(hoveredStrike.callOI.current)}</b></div>
                    </>
                  ) : (
                    <>
                      <div className="oc-hover-row"><span>Put IV open</span><b>{fmtPct(hoveredStrike.putIV.open)}</b></div>
                      <div className="oc-hover-row"><span>Put IV chg</span><b style={{ color: hoveredStrike.putIV.chg >= 0 ? "var(--oc-green)" : "var(--oc-red)" }}>{hoveredStrike.putIV.chg >= 0 ? "+" : ""}{fmtPct(hoveredStrike.putIV.chg)}</b></div>
                      <div className="oc-hover-divider" />
                      <div className="oc-hover-row"><span>Call IV open</span><b>{fmtPct(hoveredStrike.callIV.open)}</b></div>
                      <div className="oc-hover-row"><span>Call IV chg</span><b style={{ color: hoveredStrike.callIV.chg >= 0 ? "var(--oc-red)" : "var(--oc-green)" }}>{hoveredStrike.callIV.chg >= 0 ? "+" : ""}{fmtPct(hoveredStrike.callIV.chg)}</b></div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="oc-legend-strip">
              <span className="oc-hint" style={{ margin: 0 }}>
                <span className="oc-legend-dot" style={{ background: "var(--oc-green)" }} />
                Put {chartMode === "oi" ? "OI chg" : "IV"}
              </span>
              <span className="oc-hint" style={{ margin: 0 }}>
                <span className="oc-legend-dot" style={{ background: "var(--oc-red)" }} />
                Call {chartMode === "oi" ? "OI chg" : "IV"}
              </span>
              <span className="oc-hint" style={{ margin: 0 }}>
                ATM strike: <b style={{ color: "var(--oc-text)" }}>{atmStrike}</b>
              </span>
            </div>
          </div>

          {/* ============ TIME RANGE BAR ============ */}
          <div className="oc-card oc-timebar-card">
            <div className="oc-timebar-labels">
              <span>9:15 AM</span>
              <span>3:30 PM</span>
            </div>
            <div className="oc-timebar-track" ref={dragRef}>
              <div
                className="oc-timebar-fill"
                style={{ left: `${timeRange[0]}%`, right: `${100 - timeRange[1]}%` }}
              />
              <div
                className="oc-timebar-handle"
                style={{ left: `${timeRange[0]}%` }}
                onMouseDown={(e) => handleSliderDrag(e, "start")}
                onTouchStart={(e) => handleSliderDrag(e, "start")}
              >
                <span className="oc-timebar-current">{minutesToLabel(pctToTime(timeRange[0]))}</span>
              </div>
              <div
                className="oc-timebar-handle"
                style={{ left: `${timeRange[1]}%` }}
                onMouseDown={(e) => handleSliderDrag(e, "end")}
                onTouchStart={(e) => handleSliderDrag(e, "end")}
              >
                <span className="oc-timebar-current">{minutesToLabel(pctToTime(timeRange[1]))}</span>
              </div>
            </div>

            <div className="oc-quick-ranges">
              {quickRanges.map((r) => (
                <button
                  key={r.label}
                  className={`oc-quick-pill ${
                    timeRange[0] === r.pct[0] && timeRange[1] === r.pct[1] ? "active" : ""
                  }`}
                  onClick={() => setTimeRange(r.pct)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}