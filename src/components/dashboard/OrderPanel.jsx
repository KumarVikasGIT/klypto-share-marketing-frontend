import React, { useEffect, useState, useRef } from "react";
import apiService from "../../services/apiServices";
import SearchSelect from "./SearchSelect";
import { s } from "../../util/common";
import OrderBook from "./OrderBook";
import useSocket from "../../util/useSocket";
import EVENTS from "../../services/websocket/socketEvent";

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
  BUY_EQ: "BUY",
  SELL_EQ: "SELL",
};

const getValidationError = ({
  stock,
  expiry,
  strategy,
  preference,
  product,
  orderType,
  qty,
  instrumentType,
}) => {
  if (!stock) return "Please select a Stock before proceeding.";
  if (instrumentType === "OPTIONS") {
    if (!expiry) return "Please select an Expiry date.";
    if (!strategy) return "Please select a Strategy.";
    if (!preference) return "Please select a Preference (ATM / ITM / OTM).";
  }
  if (!product)
    return "Please select a Product type.";
  if (!orderType) return "Please select an Order Type (MARKET / LIMIT).";
  if (!qty || qty < 1) return "Quantity must be at least 1.";
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
  instrumentType,
  setInstrumentType,
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

    // Format 3: "ABB26JUN6750CE" (no spaces)
    const match3 = fullName.match(
      /^([A-Z][A-Z0-9&-]+?)(\d{1,2}[A-Z]{3}\d{0,4})(\d+(?:\.\d+)?)(CE|PE|CA|PA)$/i,
    );
    if (match3) {
      return {
        base: match3[1].trim(),
        expiry: match3[2].trim(),
        suffix: match3[3].trim() + " " + match3[4].trim(),
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
  const liveCe = wsRow?.ce ?? wsRow?.call;
  const livePe = wsRow?.pe ?? wsRow?.put;
  const liveCeLtp = liveCe?.ltp != null ? Number(liveCe.ltp) : null;
  const livePeLtp = livePe?.ltp != null ? Number(livePe.ltp) : null;

  // ── 1. Socket: master watchlist + live ticks ──
  const { emit } = useSocket({
    handleWatchlistResponse: (data) => {
      const payload = data?.data || data;
      let equity = [], futures = [], options = [], indices = [];
      
      if (Array.isArray(payload)) {
         equity = payload.map(i => ({...i, category: "EQ"}));
      } else if (payload) {
         equity = (payload.equity || []).map((i) => ({ ...i, category: "EQ" }));
         futures = (payload.futures || []).map((i) => ({ ...i, category: "FUT" }));
         options = (payload.trendingOptions || []).map((i) => ({ ...i, category: "OPT" }));
         indices = (payload.indices || []).map((i) => ({ ...i, category: "IDX" }));
      }
      
      setStocks([...indices, ...equity, ...futures, ...options]);
    },
    handleStockUpdate: (upd) => {
      if (!upd?.token) return;
      setStocks((prev) =>
        prev.map((s) => (s.token === upd.token ? { ...s, ...upd } : s)),
      );
    },
    handleLiveTick: (upd) => {
      if (!upd?.token) return;
      setStocks((prev) =>
        prev.map((s) => (s.token === upd.token ? { ...s, ...upd } : s)),
      );
    },
    handleOptionChainList: (response) => {
      // console.log("[OrderPanel] live-options-list raw response:", response);

      if (!response?.success && !Array.isArray(response?.data)) return;
      if (response?.symbol && response.symbol !== subscribedSymbolRef.current) return;

      const items = Array.isArray(response?.data) ? response.data : [];

      const rawExpiries = [
        ...new Set(
          items.map((item) => item.expiry ?? item.expiry_date).filter(Boolean),
        ),
      ];
      console.log("[OrderPanel] Extracted expiries:", rawExpiries);
      setExpiries(rawExpiries);
      
      setExpiry((prev) => {
        if (prev) return prev; // Do not auto-switch the expiry if it was already selected/passed down
        return rawExpiries.length > 0 ? rawExpiries[0] : "";
      });

      const spotPrice = items[0]?.spot_price ?? null;
      if (spotPrice != null && orderType === "MARKET") setCurrentPrice(Number(spotPrice));

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
    },
    handleOptionChainResponse: (response) => {
      // console.log("[OrderPanel] option-chain-data response:", response);

      const data = response?.data || response?.chain ? response : { chain: response };

      if (data?.symbol && data.symbol !== subscribedSymbolRef.current) return;

      const chainLtp = data?.spotPrice ?? data?.underlyingLtp ?? data?.underlyingValue ?? data?.ltp ?? null;
      if (chainLtp != null && orderType === "MARKET") {
        setCurrentPrice(Number(chainLtp));
      }

      let rawChain = data?.chain ?? data?.data ?? (Array.isArray(data) ? data : []);
      let formattedChain = rawChain;

      if (rawChain[0]?.strike_price !== undefined && rawChain[0]?.option_type !== undefined) {
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

      const strikes = formattedChain
        .map((c) => Number(c.strike))
        .filter((n) => !isNaN(n))
        .sort((a, b) => a - b);

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
    }
  });

  useEffect(() => {
    emit(EVENTS.WATCHLIST.GET);
  }, [emit]);

  // ── 2. Subscribe/unsubscribe option chain when stock changes ──
  useEffect(() => {
    if (subscribedSymbolRef.current) {
      emit("unsubscribeOptionChain", {
        symbol: subscribedSymbolRef.current,
      });
      subscribedSymbolRef.current = null;
      setWsChain(null);
    }

    if (!stock || instrumentType === "EQUITY") return;

    let symbolForChain;
    if (stock && typeof stock === "object" && stock.symbol) {
      symbolForChain = parseSymbolName(stock.symbol).base;
      setSelectedStockObj(stock);
      if (orderType === "MARKET") {
        if (stock.spot_price != null) setCurrentPrice(Number(stock.spot_price));
        else if (stock.ltp != null) setCurrentPrice(Number(stock.ltp));
      }
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
        setSelectedStockObj(stockObj);
        const rawSymbol =
          stockObj.symbol ??
          stockObj.name ??
          stockObj.userCode ??
          stockObj.actualSymbol;
        symbolForChain = parseSymbolName(rawSymbol).base;
      } else if (typeof stock === "string") {
        const { base } = parseSymbolName(stock);
        symbolForChain = base ?? stock;
      } else {
        return;
      }
    }

    subscribedSymbolRef.current = symbolForChain;

    emit(EVENTS.OPTION_CHAIN.LIST, { symbol: symbolForChain });
    const initialExpiry = stock && typeof stock === "object" && stock.expiry_date ? stock.expiry_date : (expiry || undefined);
    emit(EVENTS.OPTION_CHAIN.GET, { symbol: symbolForChain, expiry_date: initialExpiry });

  }, [stock, stocks, emit]);

  // ── 3. Keep selectedStockObj + live price in sync with ticks ──
  useEffect(() => {
    if (!stock || stocks.length === 0) return;
    const currentToken = stock?.token ?? stock;
    const match = stocks.find((s) => s.token === currentToken);
    if (!match) return;

    setSelectedStockObj((prev) => {
      if (!prev) return match;
      const next = { ...prev, ...match };
      // Prevent returning a new object reference if the data hasn't actually changed
      if (JSON.stringify(prev) === JSON.stringify(next)) return prev;
      return next;
    });

    const ltp = Number(match.ltp);
    if (!isNaN(ltp) && ltp > 0) {
      // Only update from stock tick if wsChain hasn't provided a spotPrice
      if (!wsChain?.spotPrice && orderType === "MARKET") {
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
    if (!stock || instrumentType === "EQUITY") return;

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
              (s.symbol ?? s.name ?? s.userCode ?? "").toUpperCase() ===
                base.toUpperCase() ||
              stock
                .toUpperCase()
                .startsWith(
                  (s.symbol ?? s.name ?? s.userCode ?? "").toUpperCase() + " ",
                ),
          );
        }
      }
      if (stockObj) {
        const rawSymbol =
          stockObj.symbol ??
          stockObj.name ??
          stockObj.userCode ??
          stockObj.actualSymbol;
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
          expiry: expiry,
        });
        console.log("[OrderPanel] chain API response:", response);
        setChainApiData(response);

        // ── Populate expiry dropdown from allExpiries ──
        const apiExpiries = response?.allExpiries ?? [];
        if (apiExpiries.length > 0) {
          setExpiries(apiExpiries);
          // Only set expiry if none is already chosen or it's not in the new list
          setExpiry((prev) => {
            if (prev) return prev; // Do not auto-switch the expiry if it was already selected/passed down
            return apiExpiries[0];
          });
        }
      } catch (err) {
        console.error("[OrderPanel] chain API error:", err);
        // Reset the guard so a retry can be attempted later
        lastChainRequestRef.current = null;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stock, stocks, expiry]);

  // ── 5a. Emit set-filters when expiry changes to get live updates for the new expiry ──
  useEffect(() => {
    if (subscribedSymbolRef.current && expiry && instrumentType === "OPTIONS") {
      emit(EVENTS.OPTION_CHAIN.GET, {
        symbol: subscribedSymbolRef.current,
        expiry_date: expiry,
      });
    }
  }, [expiry, emit]);

  // ── 5b. Rebuild strikeMap from chain API data whenever expiry changes ──
  useEffect(() => {
    if (!chainApiData || !expiry) return;

    // The chain array may be keyed or a plain array
    const allRows = Array.isArray(chainApiData)
      ? chainApiData
      : (chainApiData?.chain ?? chainApiData?.data ?? []);

    // Filter rows that belong to the currently selected expiry
    // Row structure: { strike, isATM, call: { symbol, ... }, put: { symbol, ... } }
    const rowsForExpiry = allRows.filter((row) => {
      let rowExpiry =
        row?.expiry ??
        row?.call?.expiry ??
        row?.put?.expiry ??
        null;

      if (!rowExpiry && (row?.call?.symbol || row?.put?.symbol)) {
        const parsed = parseSymbolName(row?.call?.symbol ?? row?.put?.symbol);
        if (parsed.hasExpiry) rowExpiry = parsed.expiry;
      }

      // If still no expiry field on row, check if the symbol includes the selected expiry's key parts
      if (!rowExpiry && expiry) {
        const symbolStr = (row?.call?.symbol ?? row?.put?.symbol ?? "").toUpperCase();
        const shortExpiryMatch = expiry.match(/^(\d{1,2})\s*([A-Za-z]{3})/);
        const shortExpiry = shortExpiryMatch ? (shortExpiryMatch[1] + shortExpiryMatch[2]).toUpperCase() : "";
        if (shortExpiry && !symbolStr.includes(shortExpiry)) {
           return false; // Definitely a mismatch
        }
        return true; // Assume it matches if we can't definitively rule it out
      }

      if (!rowExpiry) return true;

      // Normalize string comparisons
      const norm1 = rowExpiry.replace(/\s+/g, "").toUpperCase();
      const norm2 = expiry.replace(/\s+/g, "").toUpperCase();
      return norm1 === norm2 || norm1.startsWith(norm2) || norm2.startsWith(norm1);
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
      { strikes },
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
        stockObj = stocks.find((s) =>
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

    let contract;
    let tradingsymbol;
    let symboltoken;
    let contractLtp;
    let exchange;

    if (instrumentType === "EQUITY") {
      contract = stockObj;
      const baseSym = parseSymbolName(stockObj.symbol ?? stockObj.name ?? "").base;
      tradingsymbol = `${baseSym}-EQ`;
      symboltoken = stockObj.token;
      contractLtp = currentPrice;
      exchange = stockObj.segment;
    } else {
      const parsedStock = parseSymbolName(stockObj.symbol ?? stockObj.name ?? "");
      if (parsedStock.hasExpiry && stockObj.token) {
        // The user explicitly passed an option contract (e.g. from a watchlist). Use it directly!
        contract = stockObj;
        tradingsymbol = contract.symbol ?? contract.tradingsymbol ?? contract.name;
        symboltoken = contract.token ?? contract.symboltoken;
        contractLtp = currentPrice;
        exchange = contract.exch_seg ?? contract.exchange ?? stockObj.segment ?? "NFO";
      } else {
        const isCall = selectedAction.includes("CALL");
        const strikeNum = parseStrike(recommendedStrike);

      const wsChainRow = wsChain?.chain?.find(
        (c) => Number(c.strike) === strikeNum,
      );
      // ── wsContract matches the live data the user sees in the UI ──
      let wsContract = wsChainRow?.[isCall ? "ce" : "pe"] ?? wsChainRow?.[isCall ? "call" : "put"];

      // ── Fallback: REST chain API data ──
      const allRestRows = Array.isArray(chainApiData)
        ? chainApiData
        : (chainApiData?.chain ?? chainApiData?.data ?? []);

      let restChainRow = allRestRows?.find((c) => {
        let rowExpiry = c?.expiry ?? c?.call?.expiry ?? c?.put?.expiry ?? null;
        if (!rowExpiry && (c?.call?.symbol || c?.put?.symbol)) {
          const parsed = parseSymbolName(c?.call?.symbol ?? c?.put?.symbol);
          if (parsed.hasExpiry) rowExpiry = parsed.expiry;
        }

        let isExpiryMatch = false;
        if (!rowExpiry && expiry) {
          const symbolStr = (c?.call?.symbol ?? c?.put?.symbol ?? "").toUpperCase();
          const shortExpiryMatch = expiry.match(/^(\d{1,2})\s*([A-Za-z]{3})/);
          const shortExpiry = shortExpiryMatch ? (shortExpiryMatch[1] + shortExpiryMatch[2]).toUpperCase() : "";
          isExpiryMatch = shortExpiry ? symbolStr.includes(shortExpiry) : true;
        } else if (rowExpiry && expiry) {
          const norm1 = rowExpiry.replace(/\s+/g, "").toUpperCase();
          const norm2 = expiry.replace(/\s+/g, "").toUpperCase();
          isExpiryMatch = norm1 === norm2 || norm1.startsWith(norm2) || norm2.startsWith(norm1);
        } else {
          isExpiryMatch = true;
        }

        return (
          Number(c.strike) === strikeNum && isExpiryMatch
        );
      });

      // ── Fallback: Mirror the StrikeMap fallback. If strict expiry matching fails, just match the strike. ──
      if (!restChainRow) {
        restChainRow = allRestRows?.find((c) => Number(c.strike) === strikeNum);
      }

      const restContract = restChainRow?.[isCall ? "call" : "put"];
      contract = wsContract ?? restContract;

      if (!contract) {
        setValidationMsg(
          `Could not find ${isCall ? "CE" : "PE"} contract for strike ${recommendedStrike}.`,
        );
        return;
      }

      tradingsymbol =
        contract?.symbol ??
        contract?.name ??
        stockObj.userCode;
      symboltoken =
        contract?.token ?? contract?.symboltoken ?? stockObj.token;
      contractLtp = wsContract?.ltp != null ? Number(wsContract.ltp) : null;
      // Default to NFO for options
      exchange = contract?.exch_seg ?? contract?.exchange ?? "NFO";
      }
    }

    const isBuy = selectedAction === "BUY_CALL" || selectedAction === "BUY_PUT" || selectedAction === "BUY_EQ";
    const isSquareOff =
      selectedAction === "SQ_CALL" || selectedAction === "SQ_PUT" || selectedAction === "SELL_EQ";

    if (isBuy) {
      // ── BUY: dispatch order ──
      const payload = {
        variety: "NORMAL",
        tradingsymbol,
        symboltoken,
        transactiontype: ACTION_MAP[selectedAction],
        exchange,
        ordertype: orderType,
        producttype: product,
        duration: validity || "DAY",
        price:
          orderType === "MARKET"
            ? "0"
            : String(contractLtp ?? currentPrice ?? 0),
        quantity: instrumentType === "EQUITY" ? qty : qty * lotSize,
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
        console.log(
          "Simulating square off recording (no actual API call)",
          payload,
        );
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
      {/* ── INSTRUMENT TYPE TOGGLE ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {["EQUITY", "OPTIONS"].map((type) => (
          <button
            key={type}
            onClick={() => setInstrumentType(type)}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: "0.85rem",
              background: instrumentType === type ? "var(--accent-color)" : "var(--bg-secondary)",
              color: instrumentType === type ? "#fff" : "var(--text-secondary)",
              border: `1px solid ${instrumentType === type ? "transparent" : "var(--border-color)"}`,
              cursor: "pointer",
            }}
          >
            {type}
          </button>
        ))}
      </div>
      {/* ── STEP 1 ── */}
      <div style={s.sectionTitle}>
        <span style={s.sectionBar}>1</span>Select Stock & Expiry
      </div>
      <div style={s.card}>
        <div className="grid-3-col">
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
              // Show expiry whenever stock is set and we are in OPTIONS mode
              display: stock && instrumentType === "OPTIONS" ? "block" : "none",
            }}
          >
            <label style={s.label}>Expiry</label>
            <div
              style={{
                ...s.input,
                display: "flex",
                alignItems: "center",
                background: "var(--bg-secondary)",
                color: "var(--text-primary)",
                fontWeight: 700,
              }}
            >
              {expiry || "—"}
            </div>
          </div>
        </div>
      </div>

      {/* ── STEP 2 ── */}
      {instrumentType === "OPTIONS" && (
        <>
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
        <div className="grid-3-col">
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
      </>
      )}

      {/* ── STEP 3 ── */}
      <div style={s.sectionTitle}>
        <span style={s.sectionBar}>3</span>Order Details
      </div>
      <div style={s.card}>
        <div className="grid-5-col">
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
              {instrumentType === "EQUITY" ? (
                <>
                  <option>DELIVERY</option>
                  <option>INTRADAY</option>
                </>
              ) : (
                <>
                  <option>INTRADAY</option>
                  <option>CARRYFORWARD</option>
                </>
              )}
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
            <label style={s.label}>Quantity ({instrumentType === "EQUITY" ? "Shares" : "Lots"})</label>
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
                {instrumentType === "OPTIONS" && (
                  <span
                    style={{
                      fontSize: "0.65rem",
                      color: "var(--text-secondary)",
                      marginLeft: 4,
                    }}
                  >
                    × {lotSize}
                  </span>
                )}
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
              {instrumentType === "OPTIONS" ? `${qty * lotSize} shares total` : ""}
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
                ? `₹ ${(currentPrice * (instrumentType === "EQUITY" ? qty : qty * lotSize)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                : "—"}
            </div>
            {instrumentType === "OPTIONS" && (
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
            )}
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

      <div className={`grid-action-buttons ${instrumentType === "EQUITY" ? "equity" : ""}`}>
        {(instrumentType === "EQUITY" ? [
          {
            key: "BUY_EQ",
            label: "Buy",
            sub: "Long",
            bg: "var(--success-color)",
            text: "#fff",
          },
          {
            key: "SELL_EQ",
            label: "Sell",
            sub: "Short",
            bg: "var(--danger-color)",
            text: "#fff",
          },
        ] : ACTIONS).map(({ key, label, sub, bg, text }) => {
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
