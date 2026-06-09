def compute_sma(df):
    df['SMA_20'] = df['close'].rolling(20).mean()
    df['SMA_50'] = df['close'].rolling(50).mean()
    df['SMA_100'] = df['close'].rolling(100).mean()
    df['SMA_200'] = df['close'].rolling(200).mean()
    return df
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
        fd.loc[14,'RMA_Gain'] = ((fd.loc[13,'Avg Gain']*13)+fd.loc[14,'Gain'])/14
        fd.loc[14,'RMA_Loss'] = ((fd.loc[13,'Avg Loss']*13)+fd.loc[14,'Loss'])/14

        for i in range(15, len(fd)):
            fd.loc[i,'RMA_Gain'] = ((fd.loc[i-1,'RMA_Gain']*13)+fd.loc[i,'Gain'])/14
            fd.loc[i,'RMA_Loss'] = ((fd.loc[i-1,'RMA_Loss']*13)+fd.loc[i,'Loss'])/14

    fd['RS'] = fd['RMA_Gain'] / fd['RMA_Loss']
    fd['RSI'] = 100 - (100/(1+fd['RS']))

    return fd
# SSL Hybrid Code
# ==============================
# MOVING AVERAGES
# ==============================
def WMA(series, period):
    weights = np.arange(1, period + 1)
    return series.rolling(period).apply(lambda x: np.dot(x, weights)/weights.sum(), raw=True)

def EMA(series, period):
    return series.ewm(span=period, adjust=False).mean()

def SMA(series, period):
    return series.rolling(period).mean()

def HMA(series, period):
    half = int(period / 2)
    sqrt_len = int(np.sqrt(period))

    wma1 = WMA(series, half)
    wma2 = WMA(series, period)

    return WMA(2 * wma1 - wma2, sqrt_len)

# ==============================
# GENERIC MA (MATCH PINE)
# ==============================
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
        raise ValueError(f"Unsupported MA Type: {ma_type}")

# ==============================
# ATR (RMA - WILDER)
# ==============================
def compute_atr(df, period=14):
    high = df['high']
    low = df['low']
    close = df['close']

    tr = pd.concat([
        high - low,
        (high - close.shift()).abs(),
        (low - close.shift()).abs()
    ], axis=1).max(axis=1)

    atr = tr.ewm(alpha=1/period, adjust=False).mean()  # RMA
    return atr

# ==============================
# SSL CORE LOGIC (HLV)
# ==============================
def compute_hlv(close, high_ma, low_ma):
    hlv = np.zeros(len(close))

    for i in range(len(close)):
        if i == 0:
            hlv[i] = 1
            continue

        if close.iloc[i] > high_ma.iloc[i]:
            hlv[i] = 1
        elif close.iloc[i] < low_ma.iloc[i]:
            hlv[i] = -1
        else:
            hlv[i] = hlv[i-1]

    return hlv

# ==============================
# FULL SSL HYBRID
# ==============================
def compute_ssl_hybrid(df,baseline_type="HMA",baseline_len=60,ssl2_type="HMA",ssl2_len=5,
                       exit_type="HMA",exit_len=15,atr_period=14,atr_mult=1.0):
    df = df.copy()

    # ======================
    # BASELINE
    # ======================
    df['Baseline'] = compute_ma(df['close'], baseline_type, baseline_len)

    # ======================
    # SSL1 (MAIN)
    # ======================
    emaHigh = compute_ma(df['high'], baseline_type, baseline_len)
    emaLow  = compute_ma(df['low'], baseline_type, baseline_len)

    hlv = compute_hlv(df['close'], emaHigh, emaLow)

    df['SSL_Line'] = np.where(hlv < 0, emaHigh, emaLow)
    df['SSL_Trend'] = np.where(hlv == 1, 'UP', 'DOWN')

    # ======================
    # SSL2 (CONTINUATION)
    # ======================
    maHigh2 = compute_ma(df['high'], ssl2_type, ssl2_len)
    maLow2  = compute_ma(df['low'], ssl2_type, ssl2_len)

    hlv2 = compute_hlv(df['close'], maHigh2, maLow2)

    df['SSL2_Line'] = np.where(hlv2 < 0, maHigh2, maLow2)
    df['SSL2_Trend'] = np.where(hlv2 == 1, 'UP', 'DOWN')

    # ======================
    # EXIT LINE (SSL3)
    # ======================
    exitHigh = compute_ma(df['high'], exit_type, exit_len)
    exitLow  = compute_ma(df['low'], exit_type, exit_len)

    hlv3 = compute_hlv(df['close'], exitHigh, exitLow)

    df['SSL_Exit'] = np.where(hlv3 < 0, exitHigh, exitLow)
    df['SSL_Exit_Trend'] = np.where(hlv3 == 1, 'UP', 'DOWN')

    # ======================
    # ATR
    # ======================
    df['ATR'] = compute_atr(df, atr_period)

    df['ATR_Upper'] = df['close'] + atr_mult * df['ATR']
    df['ATR_Lower'] = df['close'] - atr_mult * df['ATR']

    return df
def candle_filter(df, i, gap_threshold=0.01, body_threshold=0.015,wick_ratio=2):
    if i == 0:
        return False, 0, 0, 0, 0

    row = df.loc[i]
    prev_row = df.loc[i-1]

    open_ = row['open']
    close_ = row['close']
    high_ = row['high']
    low_ = row['low']
    prev_close = prev_row['close']

    # GAP
    gap_pct = (open_ - prev_close) / prev_close
    gap_flag = abs(gap_pct) > gap_threshold

    # BODY
    body = abs(close_ - open_)
    body_pct = body / open_
    body_flag = body_pct > body_threshold

    # WICKS
    upper_wick = high_ - max(open_, close_)
    lower_wick = min(open_, close_) - low_

    wick_flag = (
        (upper_wick > body * wick_ratio) or
        (lower_wick > body * wick_ratio)
    )

    reject = gap_flag or body_flag or wick_flag

    return reject, gap_pct, body_pct, upper_wick, lower_wick

def check_sma_conditions(df, idx, lookback=3):

    if idx < lookback:
        return None, None

    row = df.loc[idx]
    o, c = row['open'], row['close']

    smas = [row['SMA_20'], row['SMA_50'], row['SMA_100'], row['SMA_200']]
    max_sma = max(smas)   # "last" for UP
    min_sma = min(smas)   # "last" for DOWN

    # ---------- CURRENT (09:15) POSITION ----------
    above_all = c > max_sma
    below_all = c < min_sma

    # intrabar cross of "last SMA"
    cross_last_up   = (o <= max_sma <= c)
    cross_last_down = (c <= min_sma <= o)

    # must be either above_all or crosses last SMA (UP),
    # or below_all or crosses last SMA (DOWN)
    if not (above_all or cross_last_up or below_all or cross_last_down):
        return None, None

    # ---------- LAST 3 CANDLES ----------
    last3 = df.loc[idx-lookback:idx-1]

    below_all_cnt = 0
    above_all_cnt = 0
    cross_any = False

    for j in last3.index:
        prev = df.loc[j]
        pc = prev['close']
        prev_smas = [prev['SMA_20'], prev['SMA_50'], prev['SMA_100'], prev['SMA_200']]
        pmax, pmin = max(prev_smas), min(prev_smas)

        if pc < pmin:
            below_all_cnt += 1
        elif pc > pmax:
            above_all_cnt += 1
        else:
            cross_any = True

    # ---------- FINAL CONDITIONS ----------
    # UP side
    if (above_all or cross_last_up):
        if cross_any:
            return 'UP', 'CROSS_CONTINUATION'
        if below_all_cnt == lookback:
            return 'UP', 'REVERSAL'

    # DOWN side
    if (below_all or cross_last_down):
        if cross_any:
            return 'DOWN', 'CROSS_CONTINUATION'
        if above_all_cnt == lookback:
            return 'DOWN', 'REVERSAL'

    return None, None

def update_indicators(df):
    df = compute_sma(df)
    df = compute_rsi(df)
    df = compute_ssl_hybrid(df)


def run_trade_engine_on_all(df):
    trades = []
    
    df = update_indicators(df)
    
    for i in range(200, len(df)):

        row = df.loc[i]

        # =========================
        # ONLY 09:15
        # =========================
        if not (row['datetime'].hour == 9 and row['datetime'].minute == 15):
            continue

        trend, signal = check_sma_conditions(df, i)

        if trend is None:
            continue

        # =========================
        # RSI FILTER
        # =========================
        rsi = row['RSI']

        if pd.isna(rsi):
            continue

        if trend == 'UP' and rsi <= 70:
            continue

        if trend == 'DOWN' and rsi > 30:
            continue

        # =========================
        # Candle FILTER
        # =========================
        reject, gap_pct, body_pct, upper_wick, lower_wick = candle_filter(df, i)

        if reject:
            continue
        # =========================
        # SSL FILTER
        # =========================
        entry_open = row['open']
        entry_close = row['close']
        ssl_line = row['SSL_Line']

        ssl_between = (
            min(entry_open, entry_close) <= ssl_line <= max(entry_open, entry_close)
        )

        ssl_distance = abs(entry_open - ssl_line)
        ssl_pct = ssl_distance / entry_open

        if not (ssl_between or ssl_pct <= 0.005):
            continue

        # =========================
        # TRADE EXECUTION
        # =========================
        trade_type = 'CALL' if trend == 'UP' else 'PUT'

        trade_date = row['datetime'].date()

        prev_trend = row['SSL_Trend']

        exit_price = None
        exit_time = None

        for j in range(i+1, len(df)):

            r = df.loc[j]

            if r['datetime'].date() != trade_date:
                break

            curr_trend = r['SSL_Trend']

            # SSL EXIT
            if curr_trend != prev_trend:
                exit_price = r['close']
                exit_time = r['datetime']
                break

            # DAY END EXIT
            if r['datetime'].hour == 15 and r['datetime'].minute == 25:
                exit_price = r['close']
                exit_time = r['datetime']
                break

            prev_trend = curr_trend

        if exit_price is None:
            continue

        # =========================
        # PNL
        # =========================
        if trade_type == 'CALL':
            pnl = exit_price - entry_close
        else:
            pnl = entry_close - exit_price

        # =========================
        # STORE TRADE
        # =========================
        trades.append({
            'Date': trade_date,

            'Type': trade_type,

            'Entry_Time': row['datetime'],

            'Entry_Price': entry_close})
    return trades

plot(trades = run_trade_engine_on_all(data))