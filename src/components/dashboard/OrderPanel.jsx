import React, { useEffect, useState, useRef } from "react";
import apiService from "../../services/apiServices";
import SearchSelect from "./SearchSelect";
import { s } from "../../util/common";
import OrderBook from "./OrderBook";
import socket from "../../services/socket";

const ACTIONS = [
  {
    key: "BUY_CALL",
    label: "Buy Call",
    sub: "▲ Long",
    bg: "var(--success-color)",
    text: "#fff",
  },
  {
    key: "SQ_CALL",
    label: "Sq. Off Call",
    sub: "Exit Long",
    bg: "var(--bg-secondary)",
    text: "var(--text-primary)",
  },
  {
    key: "BUY_PUT",
    label: "Buy Put",
    sub: "▼ Short",
    bg: "var(--danger-color)",
    text: "#fff",
  },
  {
    key: "SQ_PUT",
    label: "Sq. Off Put",
    sub: "Exit Short",
    bg: "var(--bg-secondary)",
    text: "var(--text-primary)",
  },
];

const ACTION_MAP = {
  BUY_CALL: "BUY",
  SQ_CALL: "SELL",
  BUY_PUT: "BUY",
  SQ_PUT: "SELL",
};

const getValidationError = ({
  stock,
  expiry,
  strategy,
  preference,
  product,
  orderType,
  qty,
}) => {
  if (!stock) return "Please select a Stock before proceeding.";
  if (!expiry) return "Please select an Expiry date.";
  if (!strategy) return "Please select a Strategy.";
  if (!preference) return "Please select a Preference (ATM / ITM / OTM).";
  if (!product)
    return "Please select a Product type (INTRADAY / CARRYFORWARD).";
  if (!orderType) return "Please select an Order Type (MARKET / LIMIT).";
  if (!qty || qty < 1) return "Quantity must be at least 1 lot.";
  return null;
};

const findATM = (strikes, ltp) =>
  strikes.reduce((prev, curr) =>
    Math.abs(curr - ltp) < Math.abs(prev - ltp) ? curr : prev,
  );

const fmt = (n) => (n != null ? Number(n).toLocaleString("en-IN") : "—");

const parseStrike = (formatted) => {
  if (!formatted || formatted === "—") return NaN;
  return Number(String(formatted).replace(/,/g, ""));
};

const OrderPanel = ({
  stock,
  setStock,
  expiry,
  setExpiry,
  strategy,
  setStrategy,
  preference,
  setPreference,
  product,
  setProduct,
  orderType,
  setOrderType,
  qty,
  setQty,
  validity,
  setValidity,
  action,
  setAction,
  orders,
  setOrders,
  price: passedPrice, // ← initial price passed from navigation state
}) => {
  // const parseSymbolName = (fullName) => {
  //   if (!fullName || typeof fullName !== "string")
  //     return { base: fullName, hasExpiry: false };
  //   const match = fullName.match(
  //     /^([A-Z-]+)\s?(\d{1,2}[A-Z]{3}\d{2,4})\s?(.*)$/i,
  //   );
  //   if (match) {
  //     return {
  //       base: match[1].trim(),
  //       expiry: match[2],
  //       suffix: match[3].trim(),
  //       hasExpiry: true,
  //     };
  //   }
  //   return { base: fullName, hasExpiry: false };
  // };

  const parseSymbolName = (fullName) => {
    if (!fullName || typeof fullName !== "string")
      return { base: fullName, hasExpiry: false };

    // Format 1: "ADANIPORTS 30JUN2026 1720 CE" (compact, no spaces in date)
    const match1 = fullName.match(
      /^([A-Z][A-Z0-9&-]+?)\s+(\d{1,2}[A-Z]{3}\d{2,4})\s*(.*)$/i,
    );
    if (match1) {
      return {
        base: match1[1].trim(),
        expiry: match1[2].trim(),
        suffix: match1[3].trim(),
        hasExpiry: true,
      };
    }

    // Format 2: "ADANIPORTS 30 Jun 2026 1720 CE" (spaced month name, e.g. from OptionChain)
    const match2 = fullName.match(
      /^([A-Z][A-Z0-9&-]+?)\s+(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})\s*(.*)$/i,
    );
    if (match2) {
      return {
        base: match2[1].trim(),
        expiry: match2[2].trim(),
        suffix: match2[3].trim(),
        hasExpiry: true,
      };
    }

    // No date found — treat entire string as the base symbol
    return { base: fullName, hasExpiry: false };
  };

  const [stocks, setStocks] = useState([]);
  const [validationMsg, setValidationMsg] = useState("");
  const [chainLoading, setChainLoading] = useState(false);
  const [rawChainData, setRawChainData] = useState(null);

  const [currentPrice, setCurrentPrice] = useState(passedPrice ?? null);
  const [priceChange, setPriceChange] = useState(null);
  const [priceChangePct, setPriceChangePct] = useState(null);
  const [expiries, setExpiries] = useState([]);
  const [strikeMap, setStrikeMap] = useState({});
  const [lotSize, setLotSize] = useState(75);

  const [selectedStockObj, setSelectedStockObj] = useState(null);

  // ── Live option chain from websocket ──
  const [wsChain, setWsChain] = useState(null);

  const fetchedChainStockRef = useRef(null);
  const subscribedSymbolRef = useRef(null);
  const lastChainRequestRef = useRef(null);

  const recommendedStrike = strikeMap[strategy]?.[preference] ?? "—";

  // Derived: live CE/PE LTP for the recommended strike from websocket
  const strikeNum = parseStrike(recommendedStrike);
  const wsRow = wsChain?.chain?.find((c) => Number(c.strike) === strikeNum);
  const liveCeLtp = wsRow?.ce?.ltp != null ? Number(wsRow.ce.ltp) : null;
  const livePeLtp = wsRow?.pe?.ltp != null ? Number(wsRow.pe.ltp) : null;

  // ── 1. Socket: master watchlist + live ticks ──
  useEffect(() => {
    socket.emit("getMasterWatchlist");

    const handleStocks = (data) => {
      const equity = (data?.data?.equity || []).map((i) => ({
        ...i,
        category: "EQ",
      }));
      const futures = (data?.data?.futures || []).map((i) => ({
        ...i,
        category: "FUT",
      }));
      const options = (data?.data?.trendingOptions || []).map((i) => ({
        ...i,
        category: "OPT",
      }));
      const indices = (data?.data?.indices || []).map((i) => ({
        ...i,
        category: "IDX",
      }));
      setStocks([...indices, ...equity, ...futures, ...options]);
    };

    const patchStocks = (upd) => {
      if (!upd?.token) return;
      setStocks((prev) =>
        prev.map((s) => (s.token === upd.token ? { ...s, ...upd } : s)),
      );
    };

    socket.on("masterWatchlistResponse", handleStocks);
    socket.on("stockUpdate", patchStocks);
    socket.on("liveTick", patchStocks);

    return () => {
      socket.off("masterWatchlistResponse", handleStocks);
      socket.off("stockUpdate", patchStocks);
      socket.off("liveTick", patchStocks);
    };
  }, []);

  // ── 2. Subscribe/unsubscribe option chain when stock changes ──
  useEffect(() => {
    // Unsubscribe previous symbol if any
    if (subscribedSymbolRef.current) {
      socket.emit("unsubscribeOptionChain", {
        symbol: subscribedSymbolRef.current,
      });
      subscribedSymbolRef.current = null;
      setWsChain(null);
    }

    if (!stock) return;

    // stock can be:
    //  (a) a token string/number  → look up in masterWatchlist stocks[]
    //  (b) a contract object from OptionChain (has .symbol but no matching token in stocks[])
    let symbolForChain;
    if (stock && typeof stock === "object" && stock.symbol) {
      // Contract object passed directly from OptionChain navigation
      symbolForChain = parseSymbolName(stock.symbol).base;
      setSelectedStockObj(stock);
      // Set price from contract if available
      if (stock.spot_price != null) setCurrentPrice(Number(stock.spot_price));
      else if (stock.ltp != null) setCurrentPrice(Number(stock.ltp));
    } else {
      // stock can be a token string, token number, or a display string like
      // "ADANIPORTS 30 Jun 2026 1720 CE" (passed via sessionStorage)
      const currentToken = stock?.token ?? stock;

      // 1) Try exact token match
      let stockObj = stocks.find((s) => s.token === currentToken);

      // 2) Fallback: parse the display string and match by base symbol name
      if (!stockObj && typeof stock === "string") {
        const { base } = parseSymbolName(stock);
        if (base) {
          stockObj = stocks.find(
            (s) =>
              // Stock's symbol matches the parsed base (e.g. "ADANIPORTS" === "ADANIPORTS")
              (s.symbol ?? s.name ?? s.userCode ?? "")
                .toUpperCase() === base.toUpperCase()
              // or stock string starts with the stock's symbol
              || stock.toUpperCase().startsWith(
                  (s.symbol ?? s.name ?? s.userCode ?? "").toUpperCase() + " "
                ),
          );
        }
      }

      if (stockObj) {
        setSelectedStockObj(stockObj);
        const rawSymbol =
          stockObj.symbol ??
          stockObj.name ??
          stockObj.userCode ??
          stockObj.actualSymbol;
        symbolForChain = parseSymbolName(rawSymbol).base;
      } else if (typeof stock === "string") {
        // Still can't find in watchlist — use the parsed base symbol directly
        // so we can still subscribe to live-options-list
        const { base } = parseSymbolName(stock);
        symbolForChain = base ?? stock;
      } else {
        return;
      }
    }

    // Track which symbol we subscribed to (used to filter incoming events)
    subscribedSymbolRef.current = symbolForChain;

    // Handler for live option chain updates
    const handleOptionChainUpdate = (response) => {
      console.log("[OrderPanel] option-chain-data response:", response);

      // The event option-chain-data might send response.data or response
      const data =
        response?.data || response?.chain ? response : { chain: response };

      // If backend sends symbol, match it
      if (data?.symbol && data.symbol !== subscribedSymbolRef.current) return;

      const chainLtp =
        data?.spotPrice ??
        data?.underlyingLtp ??
        data?.underlyingValue ??
        data?.ltp ??
        null;
      if (chainLtp != null) {
        setCurrentPrice(Number(chainLtp));
      }

      let rawChain =
        data?.chain ?? data?.data ?? (Array.isArray(data) ? data : []);
      let formattedChain = rawChain;

      // Group flat array into {strike, ce, pe} if necessary
      if (
        rawChain[0]?.strike_price !== undefined &&
        rawChain[0]?.option_type !== undefined
      ) {
        const chainMap = {};
        rawChain.forEach((item) => {
          const strike = Number(item.strike_price);
          if (!chainMap[strike])
            chainMap[strike] = { strike, ce: null, pe: null };
          if (item.option_type === "CE") chainMap[strike].ce = item;
          else if (item.option_type === "PE") chainMap[strike].pe = item;
        });
        formattedChain = Object.values(chainMap).sort(
          (a, b) => a.strike - b.strike,
        );
      }

      setWsChain({ ...data, chain: formattedChain });
      setRawChainData({ ...data, chain: formattedChain });

      // if (data?.lotSize) setLotSize(data.lotSize);

      // const rawExpiries = data?.allExpiries ?? data?.expiries ?? [];
      // const uniqueExpiries = [...new Set(rawExpiries)];
      // setExpiries(uniqueExpiries);
      // // We don't overwrite expiry if the user already selected one
      // setExpiry(
      //   (prev) => prev || (uniqueExpiries.length > 0 ? uniqueExpiries[0] : ""),
      // );

      // Build strike map from chain (used for ATM/ITM/OTM labels)
      const strikes = formattedChain
        .map((c) => Number(c.strike))
        .filter((n) => !isNaN(n))
        .sort((a, b) => a - b);

      // Filter out duplicate strikes
      const uniqueStrikes = [...new Set(strikes)];

      const ltpToUse = chainLtp != null ? Number(chainLtp) : currentPrice;
      if (uniqueStrikes.length > 0 && ltpToUse) {
        const atm = findATM(uniqueStrikes, ltpToUse);
        const atmIdx = uniqueStrikes.indexOf(atm);
        setStrikeMap({
          "Nearest ATM": {
            ATM: fmt(uniqueStrikes[atmIdx]),
            ITM: fmt(uniqueStrikes[atmIdx - 1]),
            OTM: fmt(uniqueStrikes[atmIdx + 1]),
          },
          "OTM +1": {
            ATM: fmt(uniqueStrikes[atmIdx + 1]),
            ITM: fmt(uniqueStrikes[atmIdx]),
            OTM: fmt(uniqueStrikes[atmIdx + 2]),
          },
        });
      } else if (uniqueStrikes.length > 0) {
        const mid = Math.floor(uniqueStrikes.length / 2);
        setStrikeMap({
          "Nearest ATM": {
            ATM: fmt(uniqueStrikes[mid]),
            ITM: fmt(uniqueStrikes[mid - 1]),
            OTM: fmt(uniqueStrikes[mid + 1]),
          },
          "OTM +1": {
            ATM: fmt(uniqueStrikes[mid + 1]),
            ITM: fmt(uniqueStrikes[mid]),
            OTM: fmt(uniqueStrikes[mid + 2]),
          },
        });
      }
    };

    // ── live-options-list: register BEFORE emit so we don't miss the response ──
    const handleOptionsList = (response) => {
      // console.log("[OrderPanel] live-options-list raw response:", response);

      // Backend: {success: true, symbol, totalRecords, data: Array}
      if (!response?.success && !Array.isArray(response?.data)) return;

      // If it's for a different symbol, ignore
      if (response?.symbol && response.symbol !== subscribedSymbolRef.current)
        return;

      const items = Array.isArray(response?.data) ? response.data : [];

      // Extract unique expiries from the array items
      const rawExpiries = [
        ...new Set(
          items.map((item) => item.expiry ?? item.expiry_date).filter(Boolean),
        ),
      ];
      console.log("[OrderPanel] Extracted expiries:", rawExpiries);
      setExpiries(rawExpiries);
      // Honor the already-selected expiry (e.g. passed from OptionChain) if valid in list;
      // otherwise default to the first available expiry
      setExpiry((prev) => {
        if (prev && rawExpiries.includes(prev)) return prev;
        return rawExpiries.length > 0 ? rawExpiries[0] : "";
      });

      // Set spot price from the first item
      const spotPrice = items[0]?.spot_price ?? null;
      if (spotPrice != null) setCurrentPrice(Number(spotPrice));

      // Build strike map from these items
      const strikes = [
        ...new Set(
          items
            .map((item) => Number(item.strike ?? item.strike_price))
            .filter((n) => !isNaN(n)),
        ),
      ].sort((a, b) => a - b);
      const ltpToUse = spotPrice != null ? Number(spotPrice) : currentPrice;
      if (strikes.length > 0 && ltpToUse) {
        const atm = findATM(strikes, ltpToUse);
        const atmIdx = strikes.indexOf(atm);
        setStrikeMap({
          "Nearest ATM": {
            ATM: fmt(strikes[atmIdx]),
            ITM: fmt(strikes[atmIdx - 1]),
            OTM: fmt(strikes[atmIdx + 1]),
          },
          "OTM +1": {
            ATM: fmt(strikes[atmIdx + 1]),
            ITM: fmt(strikes[atmIdx]),
            OTM: fmt(strikes[atmIdx + 2]),
          },
        });
      }

      // Group into wsChain format { chain: [{strike, ce, pe}] }
      const chainMap = {};
      items.forEach((item) => {
        const strike = Number(item.strike ?? item.strike_price);
        if (!chainMap[strike])
          chainMap[strike] = { strike, ce: null, pe: null };
        if (item.option_type === "CE") chainMap[strike].ce = item;
        else if (item.option_type === "PE") chainMap[strike].pe = item;
      });
      const formattedChain = Object.values(chainMap).sort(
        (a, b) => a.strike - b.strike,
      );
      setWsChain({ symbol: response?.symbol, chain: formattedChain });
      setRawChainData({ symbol: response?.symbol, chain: formattedChain });
    };

    socket.on("live-options-list", handleOptionsList);
    socket.on("option-chain-data", handleOptionChainUpdate);

    // Emit AFTER registering the listener
    socket.emit("live-options-list", { symbol: symbolForChain });
    // set-filters with expiry if available
    const initialExpiry = stock && typeof stock === "object" && stock.expiry_date ? stock.expiry_date : (expiry || undefined);
    socket.emit("set-filters", { symbol: symbolForChain, expiry_date: initialExpiry });

    return () => {
      socket.off("option-chain-data", handleOptionChainUpdate);
      socket.off("live-options-list", handleOptionsList);
    };
  }, [stock, stocks]);

  // ── 3. Keep selectedStockObj + live price in sync with ticks ──
  useEffect(() => {
    if (!stock || stocks.length === 0) return;
    const currentToken = stock?.token ?? stock;
    const match = stocks.find((s) => s.token === currentToken);
    if (!match) return;

    setSelectedStockObj((prev) => (prev ? { ...prev, ...match } : match));

    const ltp = Number(match.ltp);
    if (!isNaN(ltp) && ltp > 0) {
      // Only update from stock tick if wsChain hasn't provided a spotPrice
      if (!wsChain?.spotPrice) {
        setCurrentPrice(ltp);
      }
      if (match.change != null) setPriceChange(Number(match.change));
      if (match.percent_change != null)
        setPriceChangePct(Number(match.percent_change));
    }
  }, [stock, stocks, wsChain]);

  // ── 4. Reset states when stock changes / auto-populate expiry from stock string ──
  useEffect(() => {
    if (!stock) {
      setCurrentPrice(null);
      setPriceChange(null);
      setPriceChangePct(null);
      setExpiries([]);
      setStrikeMap({});
      setExpiry("");
      setStrategy("");
      setPreference("");
      setLotSize(75);
      setRawChainData(null);
      setSelectedStockObj(null);
      setWsChain(null);
    } else {
      const stockStr =
        typeof stock === "string"
          ? stock
          : (stock?.name ?? stock?.symbol ?? "");
      const parsed = parseSymbolName(stockStr);
      if (parsed.hasExpiry && parsed.expiry) {
        setExpiry(parsed.expiry);
        setExpiries((prev) =>
          prev.includes(parsed.expiry) ? prev : [parsed.expiry, ...prev],
        );
      }
      // If stock is an object (from OptionChain), expiry is already set
      // from passedExpiry in Dashboard — don't touch it here
    }
  }, [stock]);

  // ── 5. Fetch chain API on stock change → populate expiries + full chain data ──
  const [chainApiData, setChainApiData] = useState(null);

  useEffect(() => {
    if (!stock) return;

    // Resolve the base symbol name (same logic as effect #2)
    let symbolForChain;
    if (stock && typeof stock === "object" && stock.symbol) {
      symbolForChain = parseSymbolName(stock.symbol).base;
    } else {
      const currentToken = stock?.token ?? stock;
      let stockObj = stocks.find((s) => s.token === currentToken);
      if (!stockObj && typeof stock === "string") {
        const { base } = parseSymbolName(stock);
        if (base) {
          stockObj = stocks.find(
            (s) =>
              (s.symbol ?? s.name ?? s.userCode ?? "")
                .toUpperCase() === base.toUpperCase() ||
              stock.toUpperCase().startsWith(
                (s.symbol ?? s.name ?? s.userCode ?? "").toUpperCase() + " "
              )
          );
        }
      }
      if (stockObj) {
        const rawSymbol =
          stockObj.symbol ?? stockObj.name ?? stockObj.userCode ?? stockObj.actualSymbol;
        symbolForChain = parseSymbolName(rawSymbol).base;
      } else if (typeof stock === "string") {
        const { base } = parseSymbolName(stock);
        symbolForChain = base ?? stock;
      } else {
        return;
      }
    }

    if (!symbolForChain) return;

    // Avoid repeated requests for the same symbol+expiry
    const requestKey = `${symbolForChain}|${expiry ?? ""}`;
    if (lastChainRequestRef.current === requestKey) return;
    lastChainRequestRef.current = requestKey;

    console.log(`[OrderPanel] Fetching chain API → symbol=${symbolForChain}`);

    (async () => {
      try {
        const currentSymbol = symbolForChain;
        const response = await apiService.get("/options/chain", {
          symbol: currentSymbol,
        });
        console.log("[OrderPanel] chain API response:", response);
        setChainApiData(response);

        // ── Populate expiry dropdown from allExpiries ──
        const apiExpiries = response?.allExpiries ?? [];
        if (apiExpiries.length > 0) {
          setExpiries(apiExpiries);
          // Only set expiry if none is already chosen or it's not in the new list
          setExpiry((prev) => {
            if (prev && apiExpiries.includes(prev)) return prev;
            return apiExpiries[0];
          });
        }
      } catch (err) {
        console.error("[OrderPanel] chain API error:", err);
        // Reset the guard so a retry can be attempted later
        lastChainRequestRef.current = null;
      }
    })();
  }, [stock, stocks]);

  // ── 5a. Emit set-filters when expiry changes to get live updates for the new expiry ──
  useEffect(() => {
    if (subscribedSymbolRef.current && expiry) {
      socket.emit("set-filters", {
        symbol: subscribedSymbolRef.current,
        expiry_date: expiry,
      });
    }
  }, [expiry]);

  // ── 5b. Rebuild strikeMap from chain API data whenever expiry changes ──
  useEffect(() => {
    if (!chainApiData || !expiry) return;

    // The chain array may be keyed or a plain array
    const allRows = Array.isArray(chainApiData)
      ? chainApiData
      : chainApiData?.chain ?? chainApiData?.data ?? [];

    // Filter rows that belong to the currently selected expiry
    // Row structure: { strike, isATM, call: { symbol, ... }, put: { symbol, ... } }
    const rowsForExpiry = allRows.filter((row) => {
      const rowExpiry =
        row?.expiry ??
        row?.call?.expiry ??
        row?.put?.expiry ??
        // Try parsing from call symbol e.g. "ADANIPORTS26JUN1800CE"
        null;

      // If no expiry field on row, include all (API may already filter by expiry)
      if (!rowExpiry) return true;

      // Normalize: "25JUN2026" → match against selected expiry
      return rowExpiry === expiry;
    });

    const rows = rowsForExpiry.length > 0 ? rowsForExpiry : allRows;

    if (rows.length === 0) return;

    // Find ATM row using isATM flag
    const atmRow = rows.find((r) => r.isATM === true);
    const strikes = rows
      .map((r) => Number(r.strike))
      .filter((n) => !isNaN(n))
      .sort((a, b) => a - b);

    if (strikes.length === 0) return;

    let atmStrike;
    if (atmRow) {
      atmStrike = Number(atmRow.strike);
    } else {
      // Fallback: use middle strike
      atmStrike = strikes[Math.floor(strikes.length / 2)];
    }

    const atmIdx = strikes.indexOf(atmStrike);

    setStrikeMap({
      "Nearest ATM": {
        ATM: fmt(strikes[atmIdx]),
        ITM: fmt(strikes[atmIdx - 1]),
        OTM: fmt(strikes[atmIdx + 1]),
      },
      "OTM +1": {
        ATM: fmt(strikes[atmIdx + 1]),
        ITM: fmt(strikes[atmIdx]),
        OTM: fmt(strikes[atmIdx + 2]),
      },
    });

    console.log(
      `[OrderPanel] StrikeMap built for expiry=${expiry}, ATM=${atmStrike}`,
      { strikes }
    );
  }, [chainApiData, expiry]);

  // ── 6. Place order ──
  // const handlePlaceOrder = async (selectedAction) => {
  //   const error = getValidationError({
  //     stock,
  //     expiry,
  //     strategy,
  //     preference,
  //     product,
  //     orderType,
  //     qty,
  //   });
  //   if (error) {
  //     setValidationMsg(error);
  //     return;
  //   }

  //   setValidationMsg("");
  //   setAction(selectedAction);

  //   const currentToken = stock?.token ?? stock;
  //   const stockObj =
  //     selectedStockObj ?? stocks.find((s) => s.token === currentToken);
  //   if (!stockObj) {
  //     setValidationMsg("Selected stock not found. Please re-select.");
  //     return;
  //   }

  //   const isCall = selectedAction.includes("CALL");
  //   const strikeNum = parseStrike(recommendedStrike);

  //   // ── Primary: websocket chain (live, has ce/pe keys) ──
  //   const wsChainRow = wsChain?.chain?.find(
  //     (c) => Number(c.strike) === strikeNum,
  //   );
  //   const wsContract = wsChainRow?.[isCall ? "ce" : "pe"];

  //   // ── Fallback: REST chain (has call/put keys) ──
  //   const restChainRow = rawChainData?.chain?.find(
  //     (c) => Number(c.strike) === strikeNum,
  //   );
  //   const restContract = restChainRow?.[isCall ? "call" : "put"];

  //   const contract = wsContract ?? restContract;

  //   console.log("strikeNum", strikeNum);
  //   console.log("wsChainRow", wsChainRow);
  //   console.log("wsContract", wsContract);
  //   console.log("restContract", restContract);
  //   console.log("contract", contract);

  //   if (!contract) {
  //     setValidationMsg(
  //       `Could not find ${isCall ? "CE" : "PE"} contract for strike ${recommendedStrike}. Please check your selection.`,
  //     );
  //     return;
  //   }

  //   const tradingsymbol =
  //     contract?.symbol ??
  //     contract?.tradingsymbol ??
  //     contract?.name ??
  //     stockObj.userCode;

  //   const symboltoken =
  //     contract?.token ?? contract?.symboltoken ?? stockObj.token;

  //   // For LIMIT orders — use live contract LTP from websocket, fallback to spot price
  //   const contractLtp = wsContract?.ltp != null ? Number(wsContract.ltp) : null;

  //   const payload = {
  //     variety: "NORMAL",
  //     tradingsymbol,
  //     symboltoken,
  //     transactiontype: ACTION_MAP[selectedAction],
  //     exchange:
  //       contract?.exch_seg ?? contract?.exchange ?? stockObj?.segment ?? "NFO",
  //     ordertype: orderType,
  //     producttype: product,
  //     duration: validity || "DAY",
  //     price:
  //       orderType === "MARKET" ? "0" : String(contractLtp ?? currentPrice ?? 0),
  //     quantity: qty * lotSize,
  //     squareoff: "0",
  //   };

  //   console.log("🚀 DISPATCH PAYLOAD:", payload);

  //   // try {
  //   //   const res = await apiService.post("equity/dispatchOrder", payload);
  //   //   console.log("✅ Order placed:", res);
  //   //   setValidationMsg("");
  //   // } catch (err) {
  //   //   console.error("❌ Order failed:", err);
  //   //   setValidationMsg(err?.response?.data?.message || "Order placement failed");
  //   // }
  // };

  const handlePlaceOrder = async (selectedAction) => {
    const error = getValidationError({
      stock,
      expiry,
      strategy,
      preference,
      product,
      orderType,
      qty,
    });
    if (error) {
      setValidationMsg(error);
      return;
    }

    setValidationMsg("");
    setAction(selectedAction);

    // Resolve the stock object:
    //   (a) already set via effect #2 → use selectedStockObj
    //   (b) contract object passed directly → use stock itself
    //   (c) display string "SYMBOL DATE STRIKE TYPE" → match by base symbol
    const isContractObj = stock && typeof stock === "object" && stock.symbol;
    let stockObj;
    if (selectedStockObj) {
      stockObj = selectedStockObj;
    } else if (isContractObj) {
      stockObj = stock;
    } else {
      const currentToken = stock?.token ?? stock;
      stockObj = stocks.find((s) => s.token === currentToken);
      if (!stockObj && typeof stock === "string") {
        const { base } = parseSymbolName(stock);
        stockObj = stocks.find(
          (s) =>
            (s.symbol ?? s.name ?? s.userCode ?? "")
              .toUpperCase()
              .startsWith((base ?? "").toUpperCase()),
        );
      }
    }
    if (!stockObj) {
      setValidationMsg("Selected stock not found. Please re-select.");
      return;
    }

    const isCall = selectedAction.includes("CALL");
    const strikeNum = parseStrike(recommendedStrike);

    const wsChainRow = wsChain?.chain?.find(
      (c) => Number(c.strike) === strikeNum,
    );
    // wsContract might be from the wrong expiry if wsChain wasn't filtered, so check expiry if possible
    let wsContract = wsChainRow?.[isCall ? "ce" : "pe"];
    if (wsContract && wsContract.expiry_date && expiry && wsContract.expiry_date !== expiry && wsContract.expiry !== expiry) {
      wsContract = null; // Mismatch expiry
    }

    // ── Fallback: REST chain API data ──
    const allRestRows = Array.isArray(chainApiData)
      ? chainApiData
      : chainApiData?.chain ?? chainApiData?.data ?? [];
      
    const restChainRow = allRestRows?.find((c) => {
      const rowExpiry = c?.expiry ?? c?.call?.expiry ?? c?.put?.expiry ?? null;
      return Number(c.strike) === strikeNum && (!rowExpiry || rowExpiry === expiry);
    });
    
    const restContract = restChainRow?.[isCall ? "call" : "put"];
    const contract = wsContract ?? restContract;

    if (!contract) {
      setValidationMsg(
        `Could not find ${isCall ? "CE" : "PE"} contract for strike ${recommendedStrike}.`,
      );
      return;
    }

    const tradingsymbol =
      contract?.symbol ??
      contract?.tradingsymbol ??
      contract?.name ??
      stockObj.userCode;
    const symboltoken =
      contract?.token ?? contract?.symboltoken ?? stockObj.token;
    const contractLtp = wsContract?.ltp != null ? Number(wsContract.ltp) : null;

    const isBuy = selectedAction === "BUY_CALL" || selectedAction === "BUY_PUT";
    const isSquareOff =
      selectedAction === "SQ_CALL" || selectedAction === "SQ_PUT";

    if (isBuy) {
      // ── BUY: dispatch order ──
      const payload = {
        variety: "NORMAL",
        tradingsymbol,
        symboltoken,
        transactiontype: ACTION_MAP[selectedAction],
        exchange:
          contract?.exch_seg ??
          contract?.exchange ??
          stockObj?.segment ??
          "NFO",
        ordertype: orderType,
        producttype: product,
        duration: validity || "DAY",
        price:
          orderType === "MARKET"
            ? "0"
            : String(contractLtp ?? currentPrice ?? 0),
        quantity: qty * lotSize,
        squareoff: "0",
      };

      console.log("🚀 BUY PAYLOAD:", payload);

      try {
        console.log("Simulating order placement (no actual API call)", payload);
        // const res = await apiService.post("equity/dispatchOrder", payload);
        // console.log("✅ Order placed:", res);
        setValidationMsg("");
      } catch (err) {
        console.error("❌ Order failed:", err);
        setValidationMsg(
          err?.response?.data?.message || "Order placement failed",
        );
      }
    } else if (isSquareOff) {
      // ── SQUARE OFF: post to backtest dashboard ──
      const entryPrice = contractLtp ?? currentPrice ?? 0;
      const exitPrice = contractLtp ?? currentPrice ?? 0; // update if you track entry separately
      const pnlValue = (exitPrice - entryPrice) * qty * lotSize;
      const pnlPercentage =
        entryPrice > 0 ? ((exitPrice - entryPrice) / entryPrice) * 100 : 0;

      const payload = {
        initialCapital: 50000,
        riskFreeRate: 0.07,
        symbol: parseSymbolName(stockObj.symbol ?? stockObj.name ?? "").base,
        trades: [
          {
            id: Date.now(),
            entryTime: new Date().toISOString(), // replace with actual entry time if tracked
            exitTime: new Date().toISOString(),
            direction: selectedAction === "SQ_CALL" ? "Long" : "Short",
            symbol: parseSymbolName(stockObj.symbol ?? stockObj.name ?? "")
              .base,
            entryPrice,
            exitPrice,
            pnlValue,
            pnlPercentage: parseFloat(pnlPercentage.toFixed(2)),
          },
        ],
      };

      console.log("📤 SQUARE OFF PAYLOAD:", payload);

      try {
        console.log("Simulating square off recording (no actual API call)", payload);
        // const res = await apiService.post("api/backtest/dashboard", payload);
        // console.log("✅ Square off recorded:", res);
        setValidationMsg("");
      } catch (err) {
        console.error("❌ Square off failed:", err);
        setValidationMsg(err?.response?.data?.message || "Square off failed");
      }
    }
  };

  const pricePositive = !priceChange || Number(priceChange) >= 0;
  const priceColor = pricePositive
    ? "var(--success-color)"
    : "var(--danger-color)";

  return (
    <div
      style={{
        color: "var(--text-primary)",
        fontFamily: "'DM Sans', sans-serif",
        marginLeft: 10,
        padding: "10px 0px",
      }}
    >
      {/* ── STEP 1 ── */}
      <div style={s.sectionTitle}>
        <span style={s.sectionBar}>1</span>Select Stock & Expiry
      </div>
      <div style={s.card}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 14,
          }}
        >
          <div>
            <label style={s.label}>Stock</label>
            {stock ? (
              <div
                style={{
                  width: "100%",
                  height: 34,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  color: "var(--success-color)",
                  borderBottom: "1.5px solid var(--border-color)",
                  background: "transparent",
                  padding: "0 4px",
                }}
              >
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {(() => {
                    const fullName =
                      selectedStockObj?.name ??
                      selectedStockObj?.symbol ??
                      stock?.name ??
                      stock;
                    const parsed = parseSymbolName(fullName);
                    return parsed.base;
                  })()}
                </span>
                {/* <span
                  onClick={() => {
                    setStock("");
                    setSelectedStockObj(null);
                    setValidationMsg("");
                  }}
                  style={{
                    fontSize: "0.6rem",
                    background: "var(--success-color)22",
                    color: "var(--success-color)",
                    padding: "2px 8px",
                    borderRadius: 6,
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                  title="Change stock"
                >
                  ✕ CHANGE
                </span> */}
              </div>
            ) : (
              // {/* SearchSelect dropdown hidden — stock is set externally/from parent */}
              // <SearchSelect
              //   stocks={stocks}
              //   stock={stock}
              //   setStock={(obj) => {
              //     setStock(obj);
              //     setValidationMsg("");
              //   }}
              //   onSelect={(obj) => {
              //     setSelectedStockObj(obj);
              //     setValidationMsg("");
              //   }}
              //   style={{ ...s.select, fontSize: "0.85rem", fontWeight: 700 }}
              // />
              <div
                style={{
                  ...s.select,
                  color: "var(--text-secondary)",
                  fontSize: "0.85rem",
                }}
              >
                No stock selected
              </div>
            )}
          </div>

          <div>
            <label style={s.label}>Current Price</label>
            {chainLoading ? (
              <div
                style={{ fontSize: "0.95rem", color: "var(--text-secondary)" }}
              >
                Loading…
              </div>
            ) : currentPrice != null ? (
              <div>
                <div
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    color: priceColor,
                    lineHeight: 1,
                  }}
                >
                  {Number(currentPrice).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </div>
                {priceChange != null && (
                  <div
                    style={{
                      fontSize: "0.65rem",
                      color: priceColor,
                      marginTop: 2,
                    }}
                  >
                    {pricePositive ? "▲" : "▼"}{" "}
                    {Number(priceChange) >= 0 ? "+" : ""}
                    {Number(priceChange).toFixed(2)}
                    {priceChangePct != null &&
                      ` (${Number(priceChangePct).toFixed(2)}%)`}
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}
              >
                {stock ? "Waiting for price…" : "—"}
              </div>
            )}
          </div>

          <div
          style={{
            // Show expiry whenever stock is set (contract strings always have expiry)
            display: stock ? "block" : "none",
          }}
          >
            <label style={s.label}>Expiry</label>
            <select
              style={s.select}
              value={expiry}
              onChange={(e) => {
                setExpiry(e.target.value);
                setValidationMsg("");
              }}
              disabled={chainLoading}
            >
              <option value="">
                {chainLoading ? "Loading…" : "Select expiry"}
              </option>
              {/* Always include the current expiry as an option, even while expiries[] loads */}
              {[...new Set([...(expiry ? [expiry] : []), ...expiries])].map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── STEP 2 ── */}
      <div style={s.sectionTitle}>
        <span style={s.sectionBar}>2</span>Auto Strike Selection
        <span
          style={{
            fontSize: "0.55rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            background: "#f0b90b22",
            color: "#f0b90b",
            border: "1px solid #f0b90b44",
            borderRadius: 4,
            padding: "2px 7px",
          }}
        >
          SMART MODE
        </span>
      </div>
      <div style={s.card}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 14,
            alignItems: "start",
          }}
        >
          <div>
            <label style={s.label}>Strategy</label>
            <select
              style={s.select}
              value={strategy}
              onChange={(e) => {
                setStrategy(e.target.value);
                setValidationMsg("");
              }}
              // disabled={Object.keys(strikeMap).length === 0}
            >
              <option value="">Select strategy</option>
              {Object.keys(strikeMap).map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={s.label}>Preference</label>
            <select
              style={s.select}
              value={preference}
              onChange={(e) => {
                setPreference(e.target.value);
                setValidationMsg("");
              }}
            >
              <option value="">Select preference</option>
              <option>ATM</option>
              <option>ITM</option>
              <option>OTM</option>
            </select>
          </div>

          <div>
            <label style={s.label}>Recommended Strike</label>
            <div
              style={{
                background: "rgba(16,185,129,0.06)",
                border: "1px solid rgba(16,185,129,0.25)",
                borderRadius: 8,
                padding: "6px 10px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "0.6rem",
                  color: "var(--text-secondary)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Strike
              </div>
              <div
                style={{
                  fontSize: "1.2rem",
                  fontWeight: 700,
                  color:
                    strategy && preference
                      ? "var(--success-color)"
                      : "var(--text-secondary)",
                }}
              >
                {strategy && preference ? recommendedStrike : "—"}
                {strategy && preference && recommendedStrike !== "—" && (
                  <span
                    style={{ fontSize: "0.65rem", opacity: 0.5, marginLeft: 4 }}
                  >
                    {preference}
                  </span>
                )}
              </div>

              {/* ── Live CE / PE premiums from websocket ── */}
              {wsRow && (liveCeLtp != null || livePeLtp != null) && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: 12,
                    marginTop: 5,
                  }}
                >
                  {liveCeLtp != null && (
                    <span
                      style={{
                        fontSize: "0.65rem",
                        fontWeight: 600,
                        background: "rgba(16,185,129,0.12)",
                        color: "var(--success-color)",
                        padding: "2px 7px",
                        borderRadius: 5,
                      }}
                    >
                      CE ₹{liveCeLtp.toFixed(2)}
                    </span>
                  )}
                  {livePeLtp != null && (
                    <span
                      style={{
                        fontSize: "0.65rem",
                        fontWeight: 600,
                        background: "rgba(239,68,68,0.12)",
                        color: "var(--danger-color)",
                        padding: "2px 7px",
                        borderRadius: 5,
                      }}
                    >
                      PE ₹{livePeLtp.toFixed(2)}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── STEP 3 ── */}
      <div style={s.sectionTitle}>
        <span style={s.sectionBar}>3</span>Order Details
      </div>
      <div style={s.card}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "0.8fr 1fr 1.1fr 1fr 0.8fr",
            gap: 14,
            alignItems: "start",
          }}
        >
          <div>
            <label style={s.label}>Product Type</label>
            <select
              style={s.select}
              value={product}
              onChange={(e) => {
                setProduct(e.target.value);
                setValidationMsg("");
              }}
            >
              <option value="">Select</option>
              <option>INTRADAY</option>
              <option>CARRYFORWARD</option>
            </select>
          </div>

          <div>
            <label style={s.label}>Order Type</label>
            <select
              style={s.select}
              value={orderType}
              onChange={(e) => {
                setOrderType(e.target.value);
                setValidationMsg("");
              }}
            >
              <option value="">Select</option>
              <option>MARKET</option>
              <option>LIMIT</option>
            </select>
          </div>

          <div>
            <label style={s.label}>Quantity (Lots)</label>
            <div style={{ display: "flex", alignItems: "center" }}>
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                style={{
                  width: 32,
                  height: 34,
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "6px 0 0 6px",
                  color: "var(--text-primary)",
                  fontSize: "1rem",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                −
              </button>
              <div
                style={{
                  flex: 1,
                  height: 34,
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-color)",
                  borderLeft: "none",
                  borderRight: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                }}
              >
                {qty}{" "}
                <span
                  style={{
                    fontSize: "0.65rem",
                    color: "var(--text-secondary)",
                    marginLeft: 4,
                  }}
                >
                  × {lotSize}
                </span>
              </div>
              <button
                onClick={() => setQty((q) => q + 1)}
                style={{
                  width: 32,
                  height: 34,
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "0 6px 6px 0",
                  color: "var(--text-primary)",
                  fontSize: "1rem",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                +
              </button>
            </div>
            <div
              style={{
                fontSize: "0.65rem",
                color: "var(--text-secondary)",
                marginTop: 4,
                textAlign: "center",
              }}
            >
              {qty * lotSize} shares total
            </div>
          </div>

          <div>
            <label style={s.label}>Price</label>
            <input
              style={s.input}
              placeholder={orderType === "MARKET" ? "Market Price" : "0.00"}
              value={currentPrice != null ? currentPrice : ""}
              readOnly={orderType === "MARKET"}
              onChange={(e) => {
                const val = e.target.value;
                if (/^\d*\.?\d*$/.test(val)) setCurrentPrice(val);
              }}
            />
          </div>

          <div>
            <label style={s.label}>Total Value</label>
            <div
              style={{
                height: 34,
                background: "rgba(16,185,129,0.07)",
                border: "1px solid rgba(16,185,129,0.3)",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "0.88rem",
                color: "var(--success-color)",
              }}
            >
              {currentPrice != null
                ? `₹ ${(currentPrice * qty * lotSize).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                : "—"}
            </div>
            <div
              style={{
                fontSize: "0.6rem",
                color: "var(--text-secondary)",
                marginTop: 3,
                textAlign: "center",
              }}
            >
              {qty} lot{qty !== 1 ? "s" : ""} × {lotSize} shares
            </div>
          </div>

          <div>
            <label style={s.label}>Validity</label>
            <select
              style={s.select}
              value={validity}
              onChange={(e) => setValidity(e.target.value)}
            >
              <option>DAY</option>
              <option>IOC</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── STEP 4 ── */}
      <div style={s.sectionTitle}>
        <span style={s.sectionBar}>4</span>Select Action
      </div>

      {validationMsg && (
        <div
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 8,
            padding: "9px 14px",
            marginBottom: 10,
            fontSize: "0.78rem",
            color: "var(--danger-color)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: "0.9rem" }}>⚠</span>
          {validationMsg}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: 10,
          marginBottom: 4,
        }}
      >
        {ACTIONS.map(({ key, label, sub, bg, text }) => {
          const isSelected = action === key;
          return (
            <button
              key={key}
              onClick={() => handlePlaceOrder(key)}
              style={{
                width: "100%",
                padding: "12px 10px",
                borderRadius: 8,
                fontWeight: 700,
                fontSize: "0.8rem",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                transition: "all 0.15s",
                background: isSelected ? bg : `${bg}22`,
                color: isSelected
                  ? text
                  : bg === "var(--bg-secondary)"
                    ? "var(--text-secondary)"
                    : bg,
                border: isSelected
                  ? "none"
                  : `1px solid ${bg === "var(--bg-secondary)" ? "var(--border-color)" : bg + "55"}`,
                boxShadow:
                  isSelected && bg !== "var(--bg-secondary)"
                    ? `0 4px 14px ${bg}44`
                    : "none",
              }}
              onMouseEnter={(e) => {
                if (!isSelected) e.currentTarget.style.background = `${bg}44`;
              }}
              onMouseLeave={(e) => {
                if (!isSelected) e.currentTarget.style.background = `${bg}22`;
              }}
              onMouseDown={(e) =>
                (e.currentTarget.style.transform = "scale(0.97)")
              }
              onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              <span>{label}</span>
              <span
                style={{ fontSize: "0.6rem", fontWeight: 500, opacity: 0.7 }}
              >
                {sub}
              </span>
            </button>
          );
        })}
      </div>

      <div>
        <OrderBook orders={orders} setOrders={setOrders} />
      </div>
    </div>
  );
};

export default OrderPanel;
