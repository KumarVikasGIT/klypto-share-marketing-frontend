import pandas as pd
import numpy as np
import json

# =====================================================
# SMA
# =====================================================
def compute_sma(df):
    df['SMA_20'] = df['close'].rolling(20).mean()
    df['SMA_50'] = df['close'].rolling(50).mean()
    df['SMA_100'] = df['close'].rolling(100).mean()
    df['SMA_200'] = df['close'].rolling(200).mean()
    return df


# =====================================================
# RSI
# =====================================================
def compute_rsi(df):
    fd = df.copy().reset_index(drop=True)

    fd['Price_change'] = fd['close'].diff()
    fd['Gain'] = fd['Price_change'].clip(lower=0)
    fd['Loss'] = (-fd['Price_change']).clip(lower=0)

    fd['Avg Gain'] = fd['Gain'].rolling(14, min_periods=13).mean()
    fd['Avg Loss'] = fd['Loss'].rolling(14, min_periods=13).mean()

    fd['RMA_Gain'] = np.nan
    fd['RMA_Loss'] = np.nan

    if len(fd) > 14:
        fd.loc[14, 'RMA_Gain'] = ((fd.loc[13, 'Avg Gain'] * 13) + fd.loc[14, 'Gain']) / 14
        fd.loc[14, 'RMA_Loss'] = ((fd.loc[13, 'Avg Loss'] * 13) + fd.loc[14, 'Loss']) / 14

        for i in range(15, len(fd)):
            fd.loc[i, 'RMA_Gain'] = ((fd.loc[i-1, 'RMA_Gain'] * 13) + fd.loc[i, 'Gain']) / 14
            fd.loc[i, 'RMA_Loss'] = ((fd.loc[i-1, 'RMA_Loss'] * 13) + fd.loc[i, 'Loss']) / 14

    fd['RS'] = fd['RMA_Gain'] / fd['RMA_Loss']
    fd['RSI'] = 100 - (100 / (1 + fd['RS']))

    return fd


# =====================================================
# MA FUNCTIONS
# =====================================================
def WMA(series, period):
    weights = np.arange(1, period + 1)
    return series.rolling(period).apply(
        lambda x: np.dot(x, weights) / weights.sum(),
        raw=True
    )

def EMA(series, period):
    return series.ewm(span=period, adjust=False).mean()

def SMA(series, period):
    return series.rolling(period).mean()

def HMA(series, period):
    half = period // 2
    sqrt_len = int(np.sqrt(period))

    wma1 = WMA(series, half)
    wma2 = WMA(series, period)

    return WMA(2 * wma1 - wma2, sqrt_len)


def compute_ma(series, ma_type, length):
    if ma_type == "SMA":
        return SMA(series, length)
    elif ma_type == "EMA":
        return EMA(series, length)
    elif ma_type == "WMA":
        return WMA(series, length)
    elif ma_type == "HMA":
        return HMA(series, length)
    else:
        raise ValueError("Unsupported MA Type")


# =====================================================
# SSL + ATR
# =====================================================
def compute_atr(df, period=14):
    high = df['high']
    low = df['low']
    close = df['close']

    tr = pd.concat([
        high - low,
        (high - close.shift()).abs(),
        (low - close.shift()).abs()
    ], axis=1).max(axis=1)

    return tr.ewm(alpha=1 / period, adjust=False).mean()


def compute_hlv(close, high_ma, low_ma):
    hlv = np.zeros(len(close))

    for i in range(len(close)):
        if i == 0:
            hlv[i] = 1
        elif close.iloc[i] > high_ma.iloc[i]:
            hlv[i] = 1
        elif close.iloc[i] < low_ma.iloc[i]:
            hlv[i] = -1
        else:
            hlv[i] = hlv[i - 1]

    return hlv


def compute_ssl_hybrid(
    df,
    baseline_type="HMA",
    baseline_len=60,
    ssl2_type="HMA",
    ssl2_len=5,
    exit_type="HMA",
    exit_len=15,
    atr_period=14,
    atr_mult=1.0
):
    df = df.copy()

    df['Baseline'] = compute_ma(df['close'], baseline_type, baseline_len)

    emaHigh = compute_ma(df['high'], baseline_type, baseline_len)
    emaLow = compute_ma(df['low'], baseline_type, baseline_len)

    hlv = compute_hlv(df['close'], emaHigh, emaLow)

    df['SSL_Line'] = np.where(hlv < 0, emaHigh, emaLow)
    df['SSL_Trend'] = np.where(hlv == 1, 'UP', 'DOWN')

    df['ATR'] = compute_atr(df, atr_period)
    df['ATR_Upper'] = df['close'] + atr_mult * df['ATR']
    df['ATR_Lower'] = df['close'] - atr_mult * df['ATR']

    return df


# =====================================================
# FILTERS
# =====================================================
def candle_filter(df, i, gap_threshold=0.01, body_threshold=0.015, wick_ratio=2):
    if i == 0:
        return False, 0, 0, 0, 0

    row = df.iloc[i]
    prev_row = df.iloc[i - 1]

    open_ = row['open']
    close_ = row['close']
    high_ = row['high']
    low_ = row['low']
    prev_close = prev_row['close']

    gap_pct = (open_ - prev_close) / prev_close
    body_pct = abs(close_ - open_) / open_

    upper_wick = high_ - max(open_, close_)
    lower_wick = min(open_, close_) - low_

    reject = (
        abs(gap_pct) > gap_threshold or
        body_pct > body_threshold or
        upper_wick > abs(close_ - open_) * wick_ratio or
        lower_wick > abs(close_ - open_) * wick_ratio
    )

    return reject, gap_pct, body_pct, upper_wick, lower_wick


def check_sma_conditions(df, idx, lookback=3):
    if idx < lookback:
        return None, None

    row = df.iloc[idx]

    smas = [row['SMA_20'], row['SMA_50'], row['SMA_100'], row['SMA_200']]
    max_sma = max(smas)
    min_sma = min(smas)

    o, c = row['open'], row['close']

    above_all = c > max_sma
    below_all = c < min_sma

    cross_up = o <= max_sma <= c
    cross_down = c <= min_sma <= o

    last3 = df.iloc[idx - lookback:idx]

    below_cnt = 0
    above_cnt = 0
    cross_any = False

    for _, prev in last3.iterrows():
        prev_smas = [prev['SMA_20'], prev['SMA_50'], prev['SMA_100'], prev['SMA_200']]
        pmax, pmin = max(prev_smas), min(prev_smas)

        if prev['close'] > pmax:
            above_cnt += 1
        elif prev['close'] < pmin:
            below_cnt += 1
        else:
            cross_any = True

    if above_all or cross_up:
        if cross_any:
            return "UP", "CONTINUATION"
        if below_cnt == lookback:
            return "UP", "REVERSAL"

    if below_all or cross_down:
        if cross_any:
            return "DOWN", "CONTINUATION"
        if above_cnt == lookback:
            return "DOWN", "REVERSAL"

    return None, None


# =====================================================
# MAIN ENGINE
# =====================================================
def update_indicators(df):
    df = compute_sma(df)
    df = compute_rsi(df)
    df = compute_ssl_hybrid(df)
    return df


def run_trade_engine_on_all(df):
    trades = []

    df = update_indicators(df)

    for i in range(200, len(df)):

        row = df.iloc[i]

        if not (row['datetime'].hour == 9 and row['datetime'].minute == 15):
            continue

        trend, signal = check_sma_conditions(df, i)
        if trend is None:
            continue

        rsi = row['RSI']
        if pd.isna(rsi):
            continue

        if trend == "UP" and rsi >= 70:
            continue
        if trend == "DOWN" and rsi < 30:
            continue

        reject, *_ = candle_filter(df, i)
        if reject:
            continue

        trade_type = "CALL" if trend == "UP" else "PUT"

        exit_price = None
        exit_time = None

        for j in range(i + 1, len(df)):
            r = df.iloc[j]

            if r['datetime'].date() != row['datetime'].date():
                break

            if r['datetime'].hour == 15 and r['datetime'].minute == 25:
                exit_price = r['close']
                exit_time = r['datetime']
                break

        if exit_price is None:
            continue

        pnl = (
            (exit_price - row['close'])
            if trade_type == "CALL"
            else (row['close'] - exit_price)
        )

        trades.append({
            "Date": row['datetime'].date(),
            "Type": trade_type,
            "Entry_Time": row['datetime'],
            "Entry_Price": row['close'],
            "Exit_Time": exit_time,
            "Exit_Price": exit_price,
            "PnL": pnl
        })

    return trades


# =====================================================
# ENTRY POINT
# =====================================================
trades = run_trade_engine_on_all(df)

print("Trades:", len(trades))
print(json.dumps(trades, default=str))