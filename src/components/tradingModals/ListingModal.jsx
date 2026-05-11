import { useState, useEffect, useRef } from "react";
import { IoCloseSharp } from "react-icons/io5";
import { FiSearch } from "react-icons/fi";
import { GrBitcoin } from "react-icons/gr";
import { Link } from "react-router-dom";
import { Form, InputGroup, ListGroup } from "react-bootstrap";
import { Spinner } from "./Spinner";
import apiService from "../../services/apiServices";
import { useDebounce } from "../../util/common";
import { getStockLogo } from "../../util/stockSymbol/helper";
import NSE from "../../assets/NSE.svg";
import BSE from "../../assets/BSE.svg";
import socket from "../../services/socket";
import SocketEvents from "../../services/socketEvent";

export const ListingModal = ({
  isOpen,
  onClose,
  title,
  selectedCurrency,
  setSelectedCurrency,
  selectedIndicator,
  setSelectedIndicator,
  toggleIndicator,
  setAlertResult,
  alertResult,
  renderActions,
}) => {
  const [indicators, setIndicators] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchIndicator, setSearchIndicator] = useState("");
  const [searchCurrency, setSearchCurrency] = useState("");

  const TABS = ["ALL", "EQUITY", "FUTURES", "OPTIONS"];
  const [activeTab, setActiveTab] = useState("ALL");
  const [equity, setEquity] = useState([]);
  const [futures, setFutures] = useState([]);
  const [options, setOptions] = useState([]);

  const [rsiValue, setRsiValue] = useState({
    condition: "crossesAbove",
    value: "",
  });
  const [alertLoading, setAlertLoading] = useState(false);
  const [alertError, setAlertError] = useState(null);
  const intervalRef = useRef(null);

  const handleSubmitAlert = () => {
    if (!rsiValue.value) return;

    setAlertLoading(true);
    setAlertError(null);
    setAlertResult([]);

    // clear old interval if any
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (!socket.connected) {
      console.warn("⚠️ Cannot start scanner: Socket is DISCONNECTED");
      setAlertError("Socket disconnected. Trying to reconnect...");
      socket.connect();
      return;
    }

    // 🔁 Emit via socket
    const scanParams = {
      rsi_threshold: Number(rsiValue.value),
      condition: rsiValue.condition,
      interval: "1d",
      fromDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      toDate: new Date().toISOString().split('T')[0]
    };
    
    console.log("🚀 STARTING RSI SCANNER VIA SOCKET:", scanParams);
    socket.emit(SocketEvents.GET_RSI_SCANNER, scanParams);

    setAlertLoading(false); // Socket is instant
  };
  const debouncedIndicator = useDebounce(searchIndicator, 500);

  // 🔥 Fetch Indicators
  async function fetchIndicators() {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.post(`/equity/getIndicators`);

      console.log("indicator API response:", response);

      setIndicators(response?.data || []);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to fetch indicators");
    } finally {
      setLoading(false);
    }
  }

  // 🔥 Fetch Stocks (Currencies replaced)
  async function fetchCurrencies() {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.get(`equity/stocks`);
      console.log("stocks API response:", response);

      setCurrencies(response?.stocks || []);
      setEquity(response?.stocks || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // 🔥 Fetch Futures
  async function fetchFutures() {
    try {
      setLoading(true);
      const res = await apiService.get("futures/symbols");
      console.log("FUTURES:", res);
      setFutures(res?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // 🔥 Fetch Options
  async function fetchOptions() {
    try {
      setLoading(true);
      const res = await apiService.get("equity/options");
      console.log("OPTIONS:", res);
      setOptions(res?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (title === "Indicators") {
      fetchIndicators();
      return;
    }

    if (title === "Symbol Search") {
      if (activeTab === "ALL") {
        if (equity.length === 0) fetchCurrencies();
        if (futures.length === 0) fetchFutures();
        if (options.length === 0) fetchOptions();
      }
      if (activeTab === "EQUITY" && equity.length === 0) {
        fetchCurrencies();
      }

      if (activeTab === "FUTURES" && futures.length === 0) {
        fetchFutures();
      }

      if (activeTab === "OPTIONS" && options.length === 0) {
        fetchOptions();
      }
    }
  }, [title, activeTab]);

  // 🔍 Indicator Filter
  const filteredIndicators = (indicators ?? []).filter((item) => {
    if (!searchIndicator) return true;

    const search = searchIndicator.toLowerCase().trim();

    const label = item?.label?.toLowerCase() || "";
    const slug = item?.slug?.toLowerCase() || "";

    // 🔥 initials support (RSI -> "rsi", Moving Average -> "ma")
    const getInitials = (text) =>
      text
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toLowerCase();

    return (
      label.includes(search) ||
      slug.includes(search) ||
      getInitials(label).includes(search)
    );
  });

  // 🔍 Stock Filter
  const filteredCurrencies = currencies
    ?.filter((curr) => {
      if (!searchCurrency) return true;
      const search = searchCurrency.toLowerCase().trim();

      const name = curr?.name?.toLowerCase() || "";
      const symbol = curr?.actualSymbol?.toLowerCase() || "";
      const code = curr?.userCode?.toLowerCase() || "";

      return (
        name.includes(search) ||
        symbol.includes(search) ||
        code.includes(search)
      );
    })
    .sort((a, b) => {
      if (!searchCurrency) return 0;
      const search = searchCurrency.toLowerCase().trim();

      const getScore = (item) => {
        const name = item?.name?.toLowerCase() || "";
        const symbol = item?.actualSymbol?.toLowerCase() || "";
        const code = item?.userCode?.toLowerCase() || "";

        if (name === search || symbol === search || code === search) return 3;
        if (
          name.startsWith(search) ||
          symbol.startsWith(search) ||
          code.startsWith(search)
        )
          return 2;
        return 1;
      };

      return getScore(b) - getScore(a);
    });

  // 🔥 Normalize + Merge
  const normalize = (item, type) => {
    if (type === "FUTURES") {
      return {
        name: item?.name,
        symbol: item?.symbol, // ✅ correct field
        token: item?.token,
        segment: item?.segment,
        type,
        expiry: item?.expiry, // optional but useful
        high: item?.high,
        low: item?.low,
        ltp: item?.ltp,
      };
    }

    // EQUITY / OPTIONS
    return {
      name: item?.name,
      symbol: item?.actualSymbol, // ✅ equity uses this
      token: item?.token,
      segment: item?.segment,
      type,
      high: item?.high,
      low: item?.low,
      ltp: item?.ltp,
    };
  };

  const mergedList = [
    ...equity.map((e) => normalize(e, "EQUITY")),
    ...futures.map((f) => normalize(f, "FUTURES")),
    ...options.map((o) => normalize(o, "OPTIONS")),
  ];

  // 🔥 Active List
  const getActiveList = () => {
    if (activeTab === "EQUITY")
      return equity.map((e) => normalize(e, "EQUITY"));
    if (activeTab === "FUTURES")
      return futures.map((f) => normalize(f, "FUTURES"));
    if (activeTab === "OPTIONS")
      return options.map((o) => normalize(o, "OPTIONS"));
    return mergedList;
  };

  // 🔍 Unified Filter
  const filteredList = getActiveList()?.filter((item) => {
    if (!searchCurrency) return true;

    const search = searchCurrency.toLowerCase();

    return (
      item?.name?.toLowerCase().includes(search) ||
      item?.symbol?.toLowerCase().includes(search) ||
      item?.segment?.toLowerCase().includes(search) ||
      item?.userCode?.toLowerCase().includes(search)
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-99 flex items-center justify-center bg-black/60">
      <div className="w-full px-5 py-4 max-w-3xl h-[90vh] rounded-md bg-white border border-slate-700 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl text-black">{title}</h2>
          <IoCloseSharp
            size={20}
            onClick={onClose}
            className="cursor-pointer text-slate-400"
          />
        </div>

        {/* ================= SYMBOL SEARCH ================= */}
        {title === "Symbol Search" && (
          <div className="py-3">
            {/* 🔥 Tabs */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0",
                marginBottom: "12px",
                borderBottom: "1px solid #2a2e39",
              }}
            >
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    position: "relative",
                    background: "transparent",
                    border: "none",
                    borderBottom:
                      activeTab === tab
                        ? "2px solid #2962ff"
                        : "2px solid white",
                    marginBottom: "-1px",
                    padding: "6px 14px",
                    fontSize: "12px",
                    fontWeight: activeTab === tab ? "600" : "400",
                    fontFamily: "'Trebuchet MS', sans-serif",
                    letterSpacing: "0.03em",
                    color: activeTab === tab ? "#25272bff" : "#6a7187",
                    cursor: "pointer",
                    transition: "color 0.15s ease, border-color 0.15s ease",
                    whiteSpace: "nowrap",
                    outline: "none",
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== tab)
                      e.currentTarget.style.color = "#9598a1";
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== tab)
                      e.currentTarget.style.color = "#6a7187";
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Search */}
            <InputGroup className="mb-3">
              <InputGroup.Text>
                <FiSearch />
              </InputGroup.Text>
              <Form.Control
                type="text"
                autoFocus
                placeholder="Search symbol..."
                value={searchCurrency}
                onChange={(e) => setSearchCurrency(e.target.value)}
              />
            </InputGroup>

            {/* List */}
            <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
              {loading ? (
                <Spinner />
              ) : filteredList?.length > 0 ? (
                <ListGroup variant="flush">
                  {filteredList.map((item, index) => {
                    // const logo = getStockLogo(item?.userCode);
                    return (
                      <ListGroup.Item
                        key={`${item.symbol}-${index}`}
                        action
                        onClick={() => {
                          if (!renderActions) {
                            setSelectedCurrency({
                              symbol: item.symbol,
                              name: item.name,
                              token: item.token,
                              segment: item.segment,
                              type: item.type,
                              userCode: item.userCode,
                            });
                            onClose();
                          }
                        }}
                        className="d-flex justify-content-between align-items-center"
                        style={{ cursor: "pointer" }}
                      >
                        <div className="d-flex align-items-center gap-2">
                          <img
                            src={getStockLogo(item?.userCode)}
                            width={24}
                            height={24}
                            style={{ borderRadius: "50%" }}
                            onError={(e) => {
                              e.target.onerror = null;
                            }}
                          />
                          <div className="text-uppercase fw-medium small">
                            {item?.name} ({item?.symbol})
                            {item?.type === "FUTURES" && (
                              <span
                                style={{
                                  fontSize: "11px",
                                  color: "#888",
                                  marginLeft: 6,
                                }}
                              >
                                {item.expiry}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-end d-flex gap-2 align-items-center">
                          {renderActions ? (
                            renderActions(item)
                          ) : (
                            <>
                              <small className="text-muted">
                                {item.segment}
                              </small>
                              <img
                                src={
                                  item.segment?.toLowerCase() === "nse"
                                    ? NSE
                                    : BSE
                                }
                                className="rounded-full"
                                alt={item.segment}
                              />
                            </>
                          )}
                        </div>
                      </ListGroup.Item>
                    );
                  })}
                </ListGroup>
              ) : (
                <p className="text-center text-dark py-3">No Data found</p>
              )}
            </div>
          </div>
        )}

        {/* ================= INDICATORS ================= */}
        {title === "Indicators" && (
          <div className="mt-3" style={{ maxHeight: "70vh" }}>
            {/* Search */}
            <InputGroup className="mb-3">
              <InputGroup.Text>
                <FiSearch />
              </InputGroup.Text>
              <Form.Control
                type="text"
                autoFocus
                placeholder="Search indicators"
                value={searchIndicator}
                onChange={(e) => setSearchIndicator(e.target.value)}
              />
            </InputGroup>

            {/* List */}
            <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
              {loading ? (
                <Spinner />
              ) : filteredIndicators.length > 0 ? (
                <ListGroup variant="flush">
                  {filteredIndicators.map((item, index) => (
                    <ListGroup.Item key={index}>
                      <Form.Check
                        type="checkbox"
                        label={`${item.label} -- ${item.slug}`}
                        checked={selectedIndicator.includes(item.slug)}
                        onChange={() => toggleIndicator(item.slug)}
                      />
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              ) : (
                <p className="text-muted">No Data found</p>
              )}
            </div>
          </div>
        )}

        {/* ================= ALERT ================= */}
        {title === "Alerts" && (
          <div className="mt-3" style={{ color: "black" }}>
            <h5>Create RSI Alert</h5>

            {/* Condition Dropdown */}
            <label className="small mb-1">Condition</label>
            <Form.Select
              className="mb-3"
              value={rsiValue.condition}
              onChange={(e) =>
                setRsiValue({
                  ...rsiValue,
                  condition: e.target.value,
                })
              }
            >
              <option value="crossesAbove">Crosses Above</option>
              <option value="crossesBelow">Crosses Below</option>
              <option value="greaterThan">Greater Than</option>
              <option value="lessThan">Less Than</option>
            </Form.Select>

            {/* RSI Value Input */}
            <label className="small mb-1">RSI Value</label>
            <InputGroup className="mb-3">
              <Form.Control
                type="number"
                placeholder="Enter RSI Value (e.g. 70)"
                value={rsiValue.value}
                onChange={(e) =>
                  setRsiValue({
                    ...rsiValue,
                    value: e.target.value,
                  })
                }
              />
            </InputGroup>

            {/* SUBMIT BUTTON */}
            <button
              className="btn btn-primary w-100"
              onClick={handleSubmitAlert}
              disabled={alertLoading}
            >
              {alertLoading ? "Scanning..." : "Start Scanner"}
            </button>

            {/* RESULT SECTION */}
            <div
              className="mt-3"
              style={{ maxHeight: "290px", overflowY: "auto" }}
            >
              {alertError && (
                <div className="text-danger small">{alertError}</div>
              )}

              {alertResult && (
                <pre style={{ fontSize: "12px" }}>
                  {JSON.stringify(alertResult, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
