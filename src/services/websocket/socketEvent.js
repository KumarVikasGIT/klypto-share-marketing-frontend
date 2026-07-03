const EVENTS = {
  CHART: {
    GET: "getManualHistoricalData",
    RESPONSE: "historicalDataResponse",
    ERROR: "historicalDataError",
    LIVETICKS: "liveticks",
  },
  INDICATOR: {
    GET: "getIndicatorDetails",
    RESPONSE: "indicatorDetailsResponse",
    ERROR: "indicatorDetailsError",
    LIVE: "getLiveIndicatorUpdate",
    LIVE_RESPONSE: "liveIndicatorResponse",
    UPDATE_RESPONSE: "updateIndicatorResponse",
  },
  ALERTS: {
    TRIGGERED: "alertTriggered",
  },
  BACKTEST: {
    DASHBOARD_RESPONSE: "backtestDashboardResponse",
  },
  STOCK_LIST: {
    STOCKS_LIST: "stocks",
    STOCK_UPDATE: "stockUpdate",
  },
  WATCHLIST: {
    GET: "getMasterWatchlist",
    RESPONSE: "masterWatchlistResponse",
  },
  OPTION_CHAIN: {
    LIST: "live-options-list",
    GET: "set-filter",
    RESPONSE: "option-chain-data",
  },
  OVERVIEW: {
    GET: "getLiveTick",
    RESPONSE: "strategyLiveTick",
  },
  STRATEGY: {
    PROGRESS: "scannerProgress",
    NEW_SIGNAL: "newScannerSignal",
    COMPLETE: "scannerComplete",
    ERROR:"scannerError",
    AI_PREDICTION_STATUS: "aiPredictionStatus",
    AI_TRADE_SIGNAL: "aiTradeSignal"
  }

  // --- INPUT EVENTS (Client to Server) ---
  // GET_HISTORICAL_DATA: "getManualHistoricalData",
  // GET_INDICATOR_DETAILS: "getIndicatorDetails",
  // GET_LIVE_INDICATOR: "getLiveIndicatorUpdate",
  // GET_RSI_SCANNER: "getRsiScanner",
  // SET_RSI_ALERT: "setRsiAlert",
  // GET_ALL_STOCKS: "getAllStocks",
  // SUBSCRIBE_OPTION_CHAIN: "subscribeOptionChain",

  // // --- OUTPUT EVENTS (Server to Client) ---
  // HISTORICAL_DATA_RESPONSE: "historicalDataResponse",
  // HISTORICAL_DATA_ERROR: "historicalDataError",

  // INDICATOR_DETAILS_RESPONSE: "indicatorDetailsResponse",
  // INDICATOR_DETAILS_ERROR: "indicatorDetailsError",

  // LIVE_INDICATOR_RESPONSE: "liveIndicatorResponse",

  // RSI_SCANNER_RESPONSE: "rsiScannerResponse",
  // RSI_SCANNER_ERROR: "rsiScannerError",

  // STOCKS_LIST: "stocks",
  // STOCK_UPDATE: "stockUpdate",
  // LIVE_TICK: "liveTick",
  // OPTION_CHAIN_UPDATE: "optionChainUpdate",

  // GOLD_UPDATE: "goldUpdate",
};

export default EVENTS;
