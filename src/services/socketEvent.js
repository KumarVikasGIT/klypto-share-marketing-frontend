const SocketEvents = {
  // --- INPUT EVENTS (Client to Server) ---
  GET_HISTORICAL_DATA: "getManualHistoricalData",
  GET_INDICATOR_DETAILS: "getIndicatorDetails",
  GET_LIVE_INDICATOR: "getLiveIndicatorUpdate",
  GET_RSI_SCANNER: "getRsiScanner",
  SET_RSI_ALERT: "setRsiAlert",
  GET_ALL_STOCKS: "getAllStocks",

  // --- OUTPUT EVENTS (Server to Client) ---
  HISTORICAL_DATA_RESPONSE: "historicalDataResponse",
  HISTORICAL_DATA_ERROR: "historicalDataError",

  INDICATOR_DETAILS_RESPONSE: "indicatorDetailsResponse",
  INDICATOR_DETAILS_ERROR: "indicatorDetailsError",

  LIVE_INDICATOR_RESPONSE: "liveIndicatorResponse",

  RSI_SCANNER_RESPONSE: "rsiScannerResponse",
  RSI_SCANNER_ERROR: "rsiScannerError",

  STOCKS_LIST: "stocks",
  STOCK_UPDATE: "stockUpdate",
  LIVE_TICK: "liveTick",

  GOLD_UPDATE: "goldUpdate",
};

export default SocketEvents;
