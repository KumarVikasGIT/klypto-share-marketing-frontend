import React, { useEffect, useState } from "react";
import { Spinner } from "./Spinner";
import useSocket from "../../util/useSocket";
import EVENTS from "../../services/websocket/socketEvent";
import { FiBookOpen, FiBarChart2, FiTrendingUp, FiTrendingDown, FiShield, FiClock } from "react-icons/fi";

// ── Helpers ───────────────────────────────────────────────────────────────
const fmt = (v, digits = 2) => {
  if (v == null || isNaN(Number(v))) return "--";
  return Number(v).toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
};

const pct = (v) => {
  if (v == null || isNaN(Number(v))) return "--";
  return `${Number(v) > 0 ? "+" : ""}${Number(v).toFixed(2)}%`;
};

// ── Components ────────────────────────────────────────────────────────────

// Top Stat Item
function TopStat({ label, value, color }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, textAlign: "center" }}>
      <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{label}</span>
      <span style={{ fontSize: 16, fontWeight: 600, color: color || "var(--text-primary)" }}>
        {value}
      </span>
    </div>
  );
}

// Info Row in Market Information
function InfoRow({ label, value, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
      <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: color || "var(--text-primary)", textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}

// Depth Row
function DepthRow({ price, quantity, orders, maxQty, isBuy }) {
  const color = isBuy ? "var(--success-color)" : "var(--danger-color)";
  const width = maxQty > 0 ? `${(quantity / maxQty) * 100}%` : "0%";

  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", position: "relative" }}>
      {/* Background Bar */}
      <div style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        [isBuy ? "right" : "left"]: 0,
        width,
        background: `${color}20`,
        zIndex: 0,
        borderRadius: "2px"
      }} />

      <div style={{ flex: 1, color, fontWeight: 500, fontSize: 13, zIndex: 1, textAlign: "left" }}>
        {fmt(price)}
      </div>
      <div style={{ flex: 1, color: "var(--text-primary)", fontSize: 13, zIndex: 1, textAlign: "center" }}>
        {quantity}
      </div>
      <div style={{ flex: 1, color: "var(--text-secondary)", fontSize: 13, zIndex: 1, textAlign: "right" }}>
        {orders}
      </div>
    </div>
  );
}

// Range Bar (for Day and 52W Range)
function RangeWidget({ title, low, high, current, icon: Icon }) {
  let clampedPct = 50;
  if (low != null && high != null && current != null && high !== low) {
    clampedPct = Math.min(100, Math.max(0, ((current - low) / (high - low)) * 100));
  }

  return (
    <div style={{ background: "var(--bg-secondary)", borderRadius: 8, padding: 16, border: "1px solid var(--border-color)", flex: 1, display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: 8, background: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center", color: "#3b82f6" }}>
        <Icon size={20} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
          {fmt(low, 2)} - {fmt(high, 2)}
        </div>
        <div style={{ position: "relative", height: 4, background: "var(--border-color)", borderRadius: 2 }}>
          <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: `${clampedPct}%`, background: "var(--success-color)", borderRadius: 2 }} />
          <div style={{ position: "absolute", top: "50%", left: `${clampedPct}%`, transform: "translate(-50%, -50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderBottom: "6px solid #fff" }} />
        </div>
      </div>
    </div>
  );
}

// Badge Widget
function BadgeWidget({ title, value, icon: Icon, iconColor, valueColor }) {
  return (
    <div style={{ background: "var(--bg-secondary)", borderRadius: 8, padding: 16, border: "1px solid var(--border-color)", flex: 1, display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: 8, background: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center", color: iconColor }}>
        <Icon size={20} />
      </div>
      <div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: valueColor || "var(--text-primary)" }}>
          {value}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────

const Overview = ({ selectedCurrency }) => {
  const [dataPayload, setDataPayload] = useState(null);
  const [loading, setLoading] = useState(true);

  const { emit } = useSocket({
    handleLiveTick: (payload) => {
      // payload from strategyLiveTick
      console.log(`[Overview Response] Event: ${EVENTS.OVERVIEW.RESPONSE}`, "Payload:", payload);
      const symbol = payload?.symbol || payload?.raw?.tradingSymbol || payload?.name;
      const targetSymbol = selectedCurrency?.name || selectedCurrency?.symbol;
      if (String(symbol) !== String(targetSymbol)) return;

      setDataPayload(payload);
      setLoading(false);
    }
  });

  useEffect(() => {
    if (!selectedCurrency?.name && !selectedCurrency?.symbol) return;
    setLoading(true);
    console.log(selectedCurrency, "nmaeeee",selectedCurrency?.symbol, "symbolll")
    // Request initial data using the symbol
    const targetSymbol = selectedCurrency?.name || selectedCurrency?.symbol;
    emit("getAllStocks");
    
    const payload = { symbol: targetSymbol };
    console.log(`[Overview Emit] Event: ${EVENTS.OVERVIEW.GET}`, "Payload:", payload);
    emit(EVENTS.OVERVIEW.GET, payload);
  }, [selectedCurrency, emit]);

  if (!selectedCurrency) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
        Select a currency/stock to view details.
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spinner />
      </div>
    );
  }

  if (!dataPayload) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
        Waiting for live data...
      </div>
    );
  }

  const raw = dataPayload.raw || {};
  const tick = dataPayload.tick || {};
  
  // Use tick as fallback for basic fields if raw is empty
  const ltp = raw.ltp ?? tick.close ?? "--";
  const netChange = raw.netChange ?? 0;
  const percentChange = raw.percentChange ?? 0;
  const open = raw.open ?? tick.open ?? "--";
  const high = raw.high ?? tick.high ?? "--";
  const low = raw.low ?? tick.low ?? "--";
  const close = raw.close ?? tick.close ?? "--";
  
  const isPositive = Number(netChange) >= 0;
  const changeColor = isPositive ? "var(--success-color)" : "var(--danger-color)";

  // Depth Parsing
  const buyDepth = raw?.depth?.buy || [];
  const sellDepth = raw?.depth?.sell || [];
  const maxBuyQty = Math.max(...buyDepth.map(b => Number(b.quantity)), 0);
  const maxSellQty = Math.max(...sellDepth.map(s => Number(s.quantity)), 0);
  
  const bestBuy = buyDepth.length > 0 ? buyDepth[0]?.price : null;
  const bestSell = sellDepth.length > 0 ? sellDepth[0]?.price : null;
  const spread = (bestSell != null && bestBuy != null) ? (bestSell - bestBuy) : null;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 20, background: "var(--bg-primary)", color: "var(--text-primary)", overflowY: "auto", gap: 16 }}>
      
      {/* ── HEADER ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Logo Placeholder */}
          <div style={{ width: 48, height: 48, background: "#fff", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#d32f2f", fontWeight: 800, fontSize: 18 }}>
            {raw.tradingSymbol ? raw.tradingSymbol.substring(0, 3).toUpperCase() : "SYM"}
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
              {raw.tradingSymbol || selectedCurrency?.name}
            </div>
            <div style={{ fontSize: 13, color: "var(--success-color)", fontWeight: 500 }}>
              {raw.exchange || "NSE"}
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>
            {fmt(ltp)}
          </div>
          <div style={{ fontSize: 14, color: changeColor, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
            {isPositive ? "▲" : "▼"} {fmt(Math.abs(netChange))} ({pct(percentChange)})
          </div>
        </div>
      </div>

      {/* ── TOP STATS ROW ── */}
      <div style={{ display: "flex", background: "var(--bg-secondary)", borderRadius: 10, padding: "16px 20px", border: "1px solid var(--border-color)", justifyContent: "space-between" }}>
        <TopStat label="Open" value={fmt(open)} />
        <div style={{ width: 1, background: "var(--border-color)" }} />
        <TopStat label="High" value={fmt(high)} color="var(--success-color)" />
        <div style={{ width: 1, background: "var(--border-color)" }} />
        <TopStat label="Low" value={fmt(low)} color="var(--danger-color)" />
        <div style={{ width: 1, background: "var(--border-color)" }} />
        <TopStat label="Prev Close" value={fmt(close)} />
        <div style={{ width: 1, background: "var(--border-color)" }} />
        <TopStat label="Avg Price" value={fmt(raw.avgPrice)} />
        <div style={{ width: 1, background: "var(--border-color)" }} />
        <TopStat label="Volume" value={fmt(raw.tradeVolume, 0)} />
        <div style={{ width: 1, background: "var(--border-color)" }} />
        <TopStat label="OI" value={fmt(raw.opnInterest, 0)} />
      </div>

      {/* ── MIDDLE PANELS ── */}
      <div style={{ display: "flex", gap: 16 }}>
        
        {/* MARKET INFORMATION */}
        <div style={{ flex: 1, background: "var(--bg-secondary)", borderRadius: 10, padding: 20, border: "1px solid var(--border-color)" }}>
          <div style={{ fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <FiTrendingUp color="#3b82f6" /> Market Information
          </div>
          <div style={{ display: "flex", gap: 32 }}>
            <div style={{ flex: 1 }}>
              <InfoRow label="Exchange" value={raw.exchange || "NSE"} />
              <InfoRow label="Trading Symbol" value={raw.tradingSymbol || dataPayload.symbol || "--"} />
              <InfoRow label="Symbol Token" value={raw.symbolToken || "--"} />
              <InfoRow label="Last Traded Price (LTP)" value={fmt(ltp)} color="var(--success-color)" />
              <InfoRow label="Net Change" value={fmt(netChange)} color={changeColor} />
              <InfoRow label="Percent Change" value={pct(percentChange)} color={changeColor} />
              <InfoRow label="Last Trade Quantity" value={fmt(raw.lastTradeQty, 0)} />
              <InfoRow label="Trade Volume" value={fmt(raw.tradeVolume, 0)} />
              <InfoRow label="Open Interest" value={fmt(raw.opnInterest, 0)} />
            </div>
            <div style={{ flex: 1 }}>
              <InfoRow label="Exchange Feed Time" value={raw.exchFeedTime} />
              <InfoRow label="Exchange Trade Time" value={raw.exchTradeTime} />
              <div style={{ height: 16 }} /> {/* Spacer */}
              <InfoRow label="Lower Circuit" value={fmt(raw.lowerCircuit)} color="var(--danger-color)" />
              <InfoRow label="Upper Circuit" value={fmt(raw.upperCircuit)} color="var(--success-color)" />
              <div style={{ height: 16 }} /> {/* Spacer */}
              <InfoRow label="52 Week Low" value={fmt(raw["52WeekLow"])} color="var(--danger-color)" />
              <InfoRow label="52 Week High" value={fmt(raw["52WeekHigh"])} color="var(--success-color)" />
              <div style={{ height: 16 }} /> {/* Spacer */}
              <InfoRow label="Total Buy Quantity" value={fmt(raw.totBuyQuan, 0)} />
              <InfoRow label="Total Sell Quantity" value={fmt(raw.totSellQuan, 0)} />
            </div>
          </div>
        </div>

        {/* MARKET DEPTH */}
        <div style={{ flex: 1, background: "var(--bg-secondary)", borderRadius: 10, padding: 20, border: "1px solid var(--border-color)" }}>
          <div style={{ fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <FiBookOpen color="#3b82f6" /> Market Depth (Top 5)
          </div>
          
          <div style={{ display: "flex", gap: 24 }}>
            {/* BUY ORDERS */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--success-color)", marginBottom: 12 }}>BUY ORDERS</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-secondary)", marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid var(--border-color)" }}>
                <span style={{ flex: 1, textAlign: "left" }}>Price</span>
                <span style={{ flex: 1, textAlign: "center" }}>Quantity</span>
                <span style={{ flex: 1, textAlign: "right" }}>Orders</span>
              </div>
              <div>
                {buyDepth.map((b, i) => (
                  <DepthRow key={i} price={b?.price} quantity={b?.quantity} orders={b?.orders} maxQty={maxBuyQty} isBuy={true} />
                ))}
              </div>
            </div>

            <div style={{ width: 1, background: "var(--border-color)" }} />

            {/* SELL ORDERS */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--danger-color)", marginBottom: 12 }}>SELL ORDERS</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-secondary)", marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid var(--border-color)" }}>
                <span style={{ flex: 1, textAlign: "left" }}>Price</span>
                <span style={{ flex: 1, textAlign: "center" }}>Quantity</span>
                <span style={{ flex: 1, textAlign: "right" }}>Orders</span>
              </div>
              <div>
                {sellDepth.map((s, i) => (
                  <DepthRow key={i} price={s?.price} quantity={s?.quantity} orders={s?.orders} maxQty={maxSellQty} isBuy={false} />
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border-color)" }}>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Best Buy</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--success-color)" }}>{fmt(bestBuy)}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Spread</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{fmt(spread)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Best Sell</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--danger-color)" }}>{fmt(bestSell)}</div>
            </div>
          </div>
        </div>

      </div>

      {/* ── BOTTOM WIDGETS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        <RangeWidget title="Day Range" low={low} high={high} current={ltp} icon={FiBarChart2} />
        <RangeWidget title="52 Week Range" low={raw["52WeekLow"]} high={raw["52WeekHigh"]} current={ltp} icon={FiTrendingUp} />
        <BadgeWidget title="Lower Circuit" value={fmt(raw.lowerCircuit)} icon={FiShield} iconColor="#eab308" valueColor="var(--danger-color)" />
        
        <BadgeWidget title="Upper Circuit" value={fmt(raw.upperCircuit)} icon={FiShield} iconColor="#22c55e" valueColor="var(--success-color)" />
        <BadgeWidget title="Total Buy Qty" value={fmt(raw.totBuyQuan, 0)} icon={FiClock} iconColor="#3b82f6" valueColor="var(--success-color)" />
        <BadgeWidget title="Total Sell Qty" value={fmt(raw.totSellQuan, 0)} icon={FiClock} iconColor="#ef4444" valueColor="var(--danger-color)" />
      </div>

    </div>
  );
};

export default Overview;
